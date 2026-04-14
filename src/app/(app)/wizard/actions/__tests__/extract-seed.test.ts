/**
 * Testes extract-seed server actions
 *
 * Cobertura:
 *  - rejeita sem userId
 *  - rejeita quando wizard não existe / não pertence ao user
 *  - extrai com sucesso + persiste append no seeds[] existente
 *  - falha na extração não persiste
 *  - input validation (zod): URL inválida, YouTube não-YT, keyword curto
 *  - concorrência: dois extractSeedAction simultâneos preservam ambas seeds
 *    (atomic JSONB append)
 *  - ownership na UPDATE clause (defesa em profundidade)
 *  - removeSeedAction(wizardId, seedId) remove por seedId
 *  - updateSeedBriefingAction: happy path, seedId inexistente, oversized,
 *    auth-required
 *
 * Assume mudanças em StoredSeed (`id: string`), removeSeedAction(wizardId,
 * seedId), updateSeedBriefingAction novo, e SQL atomic append no UPDATE.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const authMock = vi.fn()
const extractMock = vi.fn()
const dbUpdateSpy = vi.fn()
const dbUpdateWhereSpy = vi.fn()
const dbSelectState: { row: unknown } = { row: null }

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}))

vi.mock("@/lib/wizard-services/content-extractor.service", () => ({
  extractSeedAsBriefing: (...a: unknown[]) => extractMock(...a),
}))

// Mock drizzle db — fluent chain retorna `dbSelectState.row` em select, captura
// .set() values em dbUpdateSpy e .where() args em dbUpdateWhereSpy.
vi.mock("@/db", () => ({
  db: {
    update: (_table: unknown) => ({
      set: (values: unknown) => ({
        where: (cond: unknown) => {
          dbUpdateSpy(values)
          dbUpdateWhereSpy(cond)
          return Promise.resolve()
        },
      }),
    }),
    select: (_fields: unknown) => ({
      from: (_table: unknown) => ({
        where: (_cond: unknown) => ({
          limit: async (_n: number) =>
            dbSelectState.row ? [dbSelectState.row] : [],
        }),
      }),
    }),
  },
}))

vi.mock("@/db/schema", () => ({
  contentWizards: { id: "id", userId: "userId", seeds: "seeds" },
}))

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ __eq: true, col, val }),
  and: (...args: unknown[]) => ({ __and: args }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    __sql: true,
    strings: Array.from(strings),
    values,
  }),
}))

// Import via namespace + cast porque parte da API (updateSeedBriefingAction,
// removeSeedAction(wizardId, seedId)) está em PR paralelo do server agent.
// Os testes assumem pós-fix — se você rodar antes do merge, falhas são
// anticipatórias e esperadas (documentado no PR).
import * as actions from "../extract-seed"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

type SeedInputLocal =
  | { type: "link"; url: string }
  | { type: "youtube"; url: string }
  | { type: "keyword"; value: string }
  | { type: "theme"; value: string }
  | { type: "insight"; value: string }

type ExtractShape = {
  extractSeedAction: (
    wizardId: number,
    seed: SeedInputLocal,
  ) => Promise<ActionResult<unknown>>
  removeSeedAction: (
    wizardId: number,
    seedId: string,
  ) => Promise<ActionResult<{ removed: string }>>
  updateSeedBriefingAction: (
    wizardId: number,
    seedId: string,
    briefing: string,
  ) => Promise<ActionResult<unknown>>
}

const {
  extractSeedAction,
  removeSeedAction,
  updateSeedBriefingAction,
} = actions as unknown as ExtractShape

describe("extractSeedAction", () => {
  beforeEach(() => {
    authMock.mockReset()
    extractMock.mockReset()
    dbUpdateSpy.mockReset()
    dbUpdateWhereSpy.mockReset()
    dbSelectState.row = null
  })

  it("rejeita request sem user", async () => {
    authMock.mockResolvedValue({ userId: null })
    const r = await extractSeedAction(1, { type: "theme", value: "x" })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error).toMatch(/auth/i)
  })

  it("rejeita quando wizard não pertence ao user (select retorna vazio)", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = null
    const r = await extractSeedAction(1, { type: "theme", value: "xyz" })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error).toMatch(/not found/i)
  })

  it("extrai e persiste seed (append em seeds vazio)", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = { id: 1, userId: "user_1", seeds: [] }
    extractMock.mockResolvedValue({
      success: true,
      data: {
        seed: { type: "theme", value: "marketing digital" },
        briefing: "marketing digital",
        metadata: { source: "direct" },
      },
    })

    const r = await extractSeedAction(1, {
      type: "theme",
      value: "marketing digital",
    })
    expect(r.success).toBe(true)
    expect(extractMock).toHaveBeenCalledWith({
      type: "theme",
      value: "marketing digital",
    })
    expect(dbUpdateSpy).toHaveBeenCalledTimes(1)
  })

  it("usa url como value pra seeds do tipo link/youtube", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = { id: 1, userId: "user_1", seeds: [] }
    extractMock.mockResolvedValue({
      success: true,
      data: {
        seed: { type: "link", url: "https://x.com/article" },
        briefing: "conteúdo extraído",
        metadata: { source: "firecrawl" },
      },
    })

    const r = await extractSeedAction(1, {
      type: "link",
      url: "https://x.com/article",
    })
    expect(r.success).toBe(true)
    expect(dbUpdateSpy).toHaveBeenCalledTimes(1)
  })

  it("falha na extração não persiste", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = { id: 1, userId: "user_1", seeds: [] }
    extractMock.mockResolvedValue({ success: false, error: "Firecrawl offline" })

    const r = await extractSeedAction(1, { type: "link", url: "https://x.com" })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error).toBe("Firecrawl offline")
    expect(dbUpdateSpy).not.toHaveBeenCalled()
  })

  describe("input validation (zod)", () => {
    beforeEach(() => {
      authMock.mockResolvedValue({ userId: "user_1" })
      dbSelectState.row = { id: 1, userId: "user_1", seeds: [] }
    })

    it("rejeita link com URL inválida", async () => {
      const r = await extractSeedAction(1, { type: "link", url: "not-a-url" })
      expect(r.success).toBe(false)
      if (r.success) return
      expect(r.error).toMatch(/url|inválid/i)
      expect(extractMock).not.toHaveBeenCalled()
      expect(dbUpdateSpy).not.toHaveBeenCalled()
    })

    it("rejeita youtube com URL não-YouTube", async () => {
      const r = await extractSeedAction(1, {
        type: "youtube",
        url: "https://google.com",
      })
      expect(r.success).toBe(false)
      if (r.success) return
      expect(r.error).toMatch(/youtube/i)
      expect(dbUpdateSpy).not.toHaveBeenCalled()
    })

    it("rejeita keyword muito curto", async () => {
      const r = await extractSeedAction(1, { type: "keyword", value: "a" })
      expect(r.success).toBe(false)
      expect(dbUpdateSpy).not.toHaveBeenCalled()
    })

    it("aceita keyword válido", async () => {
      extractMock.mockResolvedValue({
        success: true,
        data: {
          seed: { type: "keyword", value: "marketing digital" },
          briefing: "marketing digital",
          metadata: { source: "direct" },
        },
      })
      const r = await extractSeedAction(1, {
        type: "keyword",
        value: "marketing digital",
      })
      expect(r.success).toBe(true)
    })

    it("aceita youtube com URL do YouTube", async () => {
      extractMock.mockResolvedValue({
        success: true,
        data: {
          seed: { type: "youtube", url: "https://youtube.com/watch?v=abc123" },
          briefing: "TRANSCRICAO: hello",
          metadata: { source: "apify" },
        },
      })
      const r = await extractSeedAction(1, {
        type: "youtube",
        url: "https://youtube.com/watch?v=abc123",
      })
      expect(r.success).toBe(true)
    })
  })

  describe("ownership (defesa em profundidade)", () => {
    it("UPDATE clause inclui userId além do wizardId", async () => {
      authMock.mockResolvedValue({ userId: "user_1" })
      dbSelectState.row = { id: 1, userId: "user_1", seeds: [] }
      extractMock.mockResolvedValue({
        success: true,
        data: {
          seed: { type: "theme", value: "tema valido" },
          briefing: "tema valido",
          metadata: { source: "direct" },
        },
      })

      await extractSeedAction(1, { type: "theme", value: "tema valido" })

      expect(dbUpdateWhereSpy).toHaveBeenCalledTimes(1)
      const whereArg = dbUpdateWhereSpy.mock.calls[0][0] as {
        __and?: unknown[]
        __eq?: boolean
      }
      // A UPDATE deve usar `and(eq(id, wizardId), eq(userId, userId))` — não
      // basta um eq(id). Se o server agent só aplicar eq(id), esse teste falha.
      expect(whereArg.__and).toBeDefined()
      expect(Array.isArray(whereArg.__and)).toBe(true)
      expect(whereArg.__and?.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("concurrent extractions (atomic append)", () => {
    it("dois extractSeedAction simultâneos ambos retornam success + 2 UPDATEs", async () => {
      authMock.mockResolvedValue({ userId: "user_1" })
      dbSelectState.row = { id: 1, userId: "user_1", seeds: [] }
      extractMock.mockImplementation(async (seed: { type: string; value: string }) => ({
        success: true,
        data: {
          seed,
          briefing: seed.value,
          metadata: { source: "direct" },
        },
      }))

      const [r1, r2] = await Promise.all([
        extractSeedAction(1, { type: "theme", value: "primeira A" }),
        extractSeedAction(1, { type: "theme", value: "segunda BB" }),
      ])

      expect(r1.success).toBe(true)
      expect(r2.success).toBe(true)
      // Ambas UPDATEs foram chamadas — nenhuma rollback. Na versão atómica
      // (SQL || operator) não há race: mesmo que o SELECT veja seeds=[], o
      // UPDATE usa `seeds || new::jsonb` no DB.
      expect(dbUpdateSpy).toHaveBeenCalledTimes(2)
    })

    it("UPDATE set clause NÃO contém array literal spread (deve ser sql atomic)", async () => {
      authMock.mockResolvedValue({ userId: "user_1" })
      dbSelectState.row = { id: 1, userId: "user_1", seeds: [{ id: "existing", type: "link", value: "x" }] }
      extractMock.mockResolvedValue({
        success: true,
        data: {
          seed: { type: "theme", value: "novo seed" },
          briefing: "novo seed",
          metadata: { source: "direct" },
        },
      })

      await extractSeedAction(1, { type: "theme", value: "novo seed" })

      expect(dbUpdateSpy).toHaveBeenCalledTimes(1)
      const setValue = dbUpdateSpy.mock.calls[0][0] as {
        seeds: unknown
        updatedAt?: unknown
      }
      // Atomic append: seeds deve ser um objeto sql (com __sql marker) OU
      // um objeto sem "length" de array. Se for plain array [...existing, new],
      // é read-modify-write (race-prone) — teste falha.
      const seedsField = setValue.seeds as { __sql?: boolean } | unknown[]
      if (Array.isArray(seedsField)) {
        // Plain array spread = NÃO atômico. Se o server agent ainda não aplicou
        // o fix SQL ||, documente aqui a expectativa anticipatória:
        throw new Error(
          "seeds no UPDATE ainda é array literal — server agent precisa aplicar SQL atomic append (jsonb || operator)"
        )
      }
      expect((seedsField as { __sql?: boolean }).__sql).toBe(true)
    })
  })
})

describe("removeSeedAction (seedId-based)", () => {
  beforeEach(() => {
    authMock.mockReset()
    dbUpdateSpy.mockReset()
    dbUpdateWhereSpy.mockReset()
    dbSelectState.row = null
  })

  it("rejeita sem user", async () => {
    authMock.mockResolvedValue({ userId: null })
    const r = await removeSeedAction(1, "seed-abc")
    expect(r.success).toBe(false)
  })

  it("remove por seedId e persiste", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = {
      id: 1,
      userId: "user_1",
      seeds: [
        { id: "s1", type: "link", value: "a" },
        { id: "s2", type: "theme", value: "b" },
        { id: "s3", type: "keyword", value: "c" },
      ],
    }

    const r = await removeSeedAction(1, "s2")
    expect(r.success).toBe(true)
    expect(dbUpdateSpy).toHaveBeenCalledTimes(1)

    const call = dbUpdateSpy.mock.calls[0][0] as {
      seeds: Array<{ id: string }>
    }
    expect(call.seeds).toHaveLength(2)
    expect(call.seeds.map((s) => s.id)).toEqual(["s1", "s3"])
  })

  it("seedId inexistente degrada gracefully (no-op)", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = {
      id: 1,
      userId: "user_1",
      seeds: [{ id: "s1", type: "link", value: "a" }],
    }

    const r = await removeSeedAction(1, "missing-id")
    // Aceita sucesso (array inalterado) — implementação é graceful no-op.
    expect(r.success).toBe(true)
  })
})

describe("updateSeedBriefingAction", () => {
  beforeEach(() => {
    authMock.mockReset()
    dbUpdateSpy.mockReset()
    dbUpdateWhereSpy.mockReset()
    dbSelectState.row = null
  })

  it("atualiza briefing por seedId", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = {
      id: 1,
      userId: "user_1",
      seeds: [{ id: "abc", type: "theme", value: "x", briefing: "old" }],
    }
    const r = await updateSeedBriefingAction(1, "abc", "novo briefing")
    expect(r.success).toBe(true)
    expect(dbUpdateSpy).toHaveBeenCalledTimes(1)

    const call = dbUpdateSpy.mock.calls[0][0] as {
      seeds: Array<{ id: string; briefing?: string }>
    }
    const updated = call.seeds.find((s) => s.id === "abc")
    expect(updated?.briefing).toBe("novo briefing")
  })

  it("falha se seedId não existe", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = {
      id: 1,
      userId: "user_1",
      seeds: [{ id: "xyz", type: "link", value: "x" }],
    }
    const r = await updateSeedBriefingAction(1, "abc", "x briefing")
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error).toMatch(/seed.*não encontrada|not found/i)
    expect(dbUpdateSpy).not.toHaveBeenCalled()
  })

  it("rejeita briefing oversized (>20000 chars)", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = {
      id: 1,
      userId: "user_1",
      seeds: [{ id: "abc", type: "theme", value: "x" }],
    }
    const r = await updateSeedBriefingAction(1, "abc", "a".repeat(20001))
    expect(r.success).toBe(false)
    expect(dbUpdateSpy).not.toHaveBeenCalled()
  })

  it("aceita briefing no limite (20000 chars)", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = {
      id: 1,
      userId: "user_1",
      seeds: [{ id: "abc", type: "theme", value: "x" }],
    }
    const r = await updateSeedBriefingAction(1, "abc", "a".repeat(20000))
    expect(r.success).toBe(true)
  })

  it("requer auth", async () => {
    authMock.mockResolvedValue({ userId: null })
    const r = await updateSeedBriefingAction(1, "abc", "briefing")
    expect(r.success).toBe(false)
    expect(dbUpdateSpy).not.toHaveBeenCalled()
  })

  it("rejeita quando wizard não pertence ao user", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = null
    const r = await updateSeedBriefingAction(1, "abc", "briefing")
    expect(r.success).toBe(false)
  })
})
