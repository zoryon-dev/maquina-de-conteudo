import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mock do db (@/db) ANTES de importar o módulo sob teste.
// O módulo real usa neon-http com Proxy lazy — aqui substituímos por um fake
// que captura chamadas e permite configurar retornos.
// ---------------------------------------------------------------------------

// Estado controlado pelos testes
const dbState: {
  brandBySlug: Record<string, unknown>
  brandById: Record<number, unknown>
  versionById: Record<number, unknown>
  selectResult: unknown[]
  insertReturning: unknown[]
  updateReturning: unknown[]
  batchResult: unknown[]
} = {
  brandBySlug: {},
  brandById: {},
  versionById: {},
  selectResult: [],
  insertReturning: [],
  updateReturning: [],
  batchResult: [],
}

function resetDbState() {
  dbState.brandBySlug = {}
  dbState.brandById = {}
  dbState.versionById = {}
  dbState.selectResult = []
  dbState.insertReturning = []
  dbState.updateReturning = []
  dbState.batchResult = []
}

// Spies globais para asserts
const selectSpy = vi.fn()
const insertSpy = vi.fn()
const updateSpy = vi.fn()
const batchSpy = vi.fn()

// Query builder chainable — retorna thenable final com dados preconfigurados
function makeSelectChain() {
  const chain: Record<string, (...args: unknown[]) => unknown> = {}
  const methods = ["from", "where", "orderBy", "limit", "leftJoin", "innerJoin"]
  const finalPromise = Promise.resolve(dbState.selectResult)
  for (const m of methods) {
    chain[m] = () => chain
  }
  ;(chain as unknown as { then: Promise<unknown>["then"] }).then =
    finalPromise.then.bind(finalPromise)
  ;(chain as unknown as { catch: Promise<unknown>["catch"] }).catch =
    finalPromise.catch.bind(finalPromise)
  return chain
}

function makeInsertChain() {
  return {
    values: () => ({
      returning: () => Promise.resolve(dbState.insertReturning),
    }),
  }
}

function makeUpdateChain() {
  return {
    set: () => ({
      where: () => ({
        returning: () => Promise.resolve(dbState.updateReturning),
      }),
    }),
  }
}

type MockDb = {
  select: (...args: unknown[]) => ReturnType<typeof makeSelectChain>
  insert: (...args: unknown[]) => ReturnType<typeof makeInsertChain>
  update: (...args: unknown[]) => ReturnType<typeof makeUpdateChain>
  batch: (queries: unknown[]) => Promise<unknown>
  transaction: (fn: (tx: MockDb) => Promise<unknown>) => Promise<unknown>
}

vi.mock("@/db", () => {
  const db: MockDb = {
    select: (...args: unknown[]) => {
      selectSpy(...args)
      return makeSelectChain()
    },
    insert: (...args: unknown[]) => {
      insertSpy(...args)
      return makeInsertChain()
    },
    update: (...args: unknown[]) => {
      updateSpy(...args)
      return makeUpdateChain()
    },
    batch: (queries: unknown[]) => {
      batchSpy(queries)
      return Promise.resolve(dbState.batchResult)
    },
    transaction: async (fn) => fn(db),
  }
  return { db, getDb: () => db }
})

// Mock do schema — só precisamos que seja importável
vi.mock("@/db/schema", () => ({
  brands: { id: "id", slug: "slug", isDefault: "isDefault", name: "name" },
  brandVersions: { id: "id", brandId: "brandId", createdAt: "createdAt" },
}))

// Agora podemos importar
import * as queries from "../queries"
import { NotFoundError } from "@/lib/errors"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validConfig = {
  identity: {
    mission: "",
    vision: "",
    values: [],
    positioning: "",
    antiPositioning: "",
    beliefs: [],
  },
  voice: {
    atributos: {
      direto: 80,
      acessivel: 70,
      firme: 75,
      humano: 75,
      tecnico: 30,
    },
    tom: "",
    vocabulario: { use: [], avoid: [] },
    crencasCombatidas: [],
    antiPatterns: [],
  },
  visual: {
    tokens: { colors: {}, fonts: {}, spacing: {}, shadows: {} },
    logoUrl: "",
    logoAltUrl: "",
  },
  audience: { avatares: [], antiAvatar: "" },
  offer: {
    setores: [],
    pricing: { setupMin: 0, setupMax: 0, recMin: 0, recMax: 0 },
    courses: [],
  },
  journey: { motorServicos: [], motorEducacao: [] },
  content: { pilares: [], canais: [] },
  meta: {
    seedVersion: "1.0.0",
    seededAt: "2026-01-01T00:00:00.000Z",
    qaEnabled: true,
  },
}

const makeBrand = (id: number, slug: string) => ({
  id,
  slug,
  name: "Test Brand",
  config: validConfig,
  ownerUserId: null,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateBrandConfig", () => {
  beforeEach(() => {
    resetDbState()
    selectSpy.mockClear()
    insertSpy.mockClear()
    updateSpy.mockClear()
    batchSpy.mockClear()
  })

  it("inserts into brand_versions AND updates brands in a single batch", async () => {
    const brand = makeBrand(1, "test")
    // O batch retorna [insertResult, updateReturningResult]
    dbState.batchResult = [{}, [brand]]

    const result = await queries.updateBrandConfig(1, {
      config: validConfig,
      message: "atualiza tom",
      updatedByUserId: "user_123",
    })

    expect(batchSpy).toHaveBeenCalledTimes(1)
    const batchArg = batchSpy.mock.calls[0][0] as unknown[]
    expect(Array.isArray(batchArg)).toBe(true)
    expect(batchArg).toHaveLength(2)

    // insert em brand_versions e update em brands foram preparados
    expect(insertSpy).toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalled()

    expect(result).toEqual(brand)
  })

  it("runs atomically via db.batch (neon-http does not support interactive tx)", async () => {
    // Este teste documenta a decisão arquitetural: usamos db.batch, NÃO
    // db.transaction. Se alguém refatorar para transaction, este teste falha.
    const brand = makeBrand(2, "another")
    dbState.batchResult = [{}, [brand]]

    await queries.updateBrandConfig(2, { config: validConfig })

    expect(batchSpy).toHaveBeenCalledTimes(1)
  })

  it("throws NotFoundError when update returns no rows", async () => {
    dbState.batchResult = [{}, []]

    await expect(
      queries.updateBrandConfig(999, { config: validConfig })
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe("restoreBrandVersion", () => {
  beforeEach(() => {
    resetDbState()
    selectSpy.mockClear()
    insertSpy.mockClear()
    updateSpy.mockClear()
    batchSpy.mockClear()
  })

  it("throws NotFoundError when version.brandId !== brandId", async () => {
    // getBrandVersion retorna uma version com brandId diferente
    dbState.selectResult = [
      { id: 10, brandId: 999, config: validConfig, createdAt: new Date() },
    ]

    await expect(queries.restoreBrandVersion(1, 10)).rejects.toBeInstanceOf(
      NotFoundError
    )
  })

  it("throws NotFoundError when version does not exist", async () => {
    dbState.selectResult = []
    await expect(queries.restoreBrandVersion(1, 10)).rejects.toBeInstanceOf(
      NotFoundError
    )
  })
})

describe("upsertBrandBySlug", () => {
  beforeEach(() => {
    resetDbState()
    selectSpy.mockClear()
    insertSpy.mockClear()
    updateSpy.mockClear()
    batchSpy.mockClear()
  })

  it("calls updateBrandConfig when brand exists", async () => {
    const existing = makeBrand(5, "zoryon")
    // getBrandBySlug faz select().from().where().limit(1) e retorna o thenable
    dbState.selectResult = [existing]
    // updateBrandConfig faz db.batch → [insertResult, updateReturning]
    dbState.batchResult = [{}, [existing]]

    const result = await queries.upsertBrandBySlug({
      slug: "zoryon",
      name: "Zoryon",
      config: validConfig,
    })

    expect(batchSpy).toHaveBeenCalledTimes(1)
    expect(insertSpy).toHaveBeenCalled() // insert em brand_versions
    expect(updateSpy).toHaveBeenCalled() // update em brands
    expect(result).toEqual(existing)
  })

  it("calls createBrand when brand does not exist", async () => {
    const created = makeBrand(6, "novidade")
    dbState.selectResult = [] // getBrandBySlug → null
    dbState.insertReturning = [created]

    const result = await queries.upsertBrandBySlug({
      slug: "novidade",
      name: "Novidade",
      config: validConfig,
    })

    expect(insertSpy).toHaveBeenCalled()
    // create não usa batch
    expect(batchSpy).not.toHaveBeenCalled()
    expect(result).toEqual(created)
  })
})
