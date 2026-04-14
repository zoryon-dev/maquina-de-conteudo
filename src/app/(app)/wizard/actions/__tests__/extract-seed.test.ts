/**
 * Testes extract-seed server actions
 *
 * Cobertura:
 *  - rejeita sem userId
 *  - rejeita quando wizard não existe / não pertence ao user
 *  - extrai com sucesso + persiste append no seeds[] existente
 *  - falha na extração não persiste
 *  - removeSeedAction remove por índice
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const authMock = vi.fn()
const extractMock = vi.fn()
const dbUpdateSpy = vi.fn()
const dbSelectState: { row: unknown } = { row: null }

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}))

vi.mock("@/lib/wizard-services/content-extractor.service", () => ({
  extractSeedAsBriefing: (...a: unknown[]) => extractMock(...a),
}))

// Mock drizzle db — fluent chain que retorna `dbSelectState.row` em select
// e captura args do update em `dbUpdateSpy`.
vi.mock("@/db", () => ({
  db: {
    update: (_table: unknown) => ({
      set: (values: unknown) => ({
        where: (_cond: unknown) => {
          dbUpdateSpy(values)
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

// Mock db/schema — eq/and são do drizzle-orm (não precisa mock), mas
// contentWizards só precisa existir como objeto opaco pros callers.
vi.mock("@/db/schema", () => ({
  contentWizards: { id: "id", userId: "userId", seeds: "seeds" },
}))

vi.mock("drizzle-orm", () => ({
  eq: (_a: unknown, _b: unknown) => ({ __eq: true }),
  and: (...args: unknown[]) => ({ __and: args }),
}))

import { extractSeedAction, removeSeedAction } from "../extract-seed"

describe("extractSeedAction", () => {
  beforeEach(() => {
    authMock.mockReset()
    extractMock.mockReset()
    dbUpdateSpy.mockReset()
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
    dbSelectState.row = null // select retorna []
    const r = await extractSeedAction(1, { type: "theme", value: "x" })
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
        seed: { type: "theme", value: "x" },
        briefing: "x",
        metadata: { source: "direct" },
      },
    })

    const r = await extractSeedAction(1, { type: "theme", value: "x" })
    expect(r.success).toBe(true)
    expect(extractMock).toHaveBeenCalledWith({ type: "theme", value: "x" })

    // Validar que o update foi chamado com seeds contendo 1 item.
    expect(dbUpdateSpy).toHaveBeenCalledTimes(1)
    const call = dbUpdateSpy.mock.calls[0][0] as {
      seeds: Array<{ type: string; value: string; briefing: string }>
    }
    expect(call.seeds).toHaveLength(1)
    expect(call.seeds[0].type).toBe("theme")
    expect(call.seeds[0].value).toBe("x")
    expect(call.seeds[0].briefing).toBe("x")
  })

  it("append NÃO sobrescreve seeds existentes", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = {
      id: 1,
      userId: "user_1",
      seeds: [{ type: "link", value: "https://a.com", briefing: "A" }],
    }
    extractMock.mockResolvedValue({
      success: true,
      data: {
        seed: { type: "theme", value: "novo" },
        briefing: "novo",
        metadata: { source: "direct" },
      },
    })

    await extractSeedAction(1, { type: "theme", value: "novo" })

    const call = dbUpdateSpy.mock.calls[0][0] as {
      seeds: Array<{ type: string; value: string }>
    }
    expect(call.seeds).toHaveLength(2)
    expect(call.seeds[0].type).toBe("link")
    expect(call.seeds[1].type).toBe("theme")
  })

  it("usa url como value pra seeds do tipo link/youtube", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = { id: 1, userId: "user_1", seeds: [] }
    extractMock.mockResolvedValue({
      success: true,
      data: {
        seed: { type: "link", url: "https://x.com" },
        briefing: "conteúdo",
        metadata: { source: "firecrawl" },
      },
    })

    await extractSeedAction(1, { type: "link", url: "https://x.com" })

    const call = dbUpdateSpy.mock.calls[0][0] as {
      seeds: Array<{ value: string }>
    }
    expect(call.seeds[0].value).toBe("https://x.com")
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
})

describe("removeSeedAction", () => {
  beforeEach(() => {
    authMock.mockReset()
    dbUpdateSpy.mockReset()
    dbSelectState.row = null
  })

  it("rejeita sem user", async () => {
    authMock.mockResolvedValue({ userId: null })
    const r = await removeSeedAction(1, 0)
    expect(r.success).toBe(false)
  })

  it("remove por índice e persiste", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    dbSelectState.row = {
      seeds: [
        { type: "link", value: "a" },
        { type: "theme", value: "b" },
        { type: "keyword", value: "c" },
      ],
    }

    const r = await removeSeedAction(1, 1)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.removed).toBe(1)

    const call = dbUpdateSpy.mock.calls[0][0] as {
      seeds: Array<{ type: string; value: string }>
    }
    expect(call.seeds).toHaveLength(2)
    expect(call.seeds[0].value).toBe("a")
    expect(call.seeds[1].value).toBe("c")
  })
})
