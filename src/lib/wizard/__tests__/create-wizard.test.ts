import { describe, it, expect, vi } from "vitest"

// ============================================================================
// DB MOCK (exact pattern from plan)
// ============================================================================

const dbInsertMock = vi.fn()
const themeFetchMock = vi.fn()

vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: (v: unknown) => ({
        returning: async () => {
          dbInsertMock(v)
          return [{ id: 99 }]
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [await themeFetchMock()] }),
      }),
    }),
  },
}))

import { createWizardFromTheme } from "../create-wizard"

// ============================================================================
// HELPERS
// ============================================================================

function makeTheme(overrides: Partial<{
  id: number
  title: string
  context: string | null
  sourceType: string
  sourceUrl: string | null
}> = {}) {
  return {
    id: 1,
    title: "Tema de Teste",
    context: "Contexto do tema",
    sourceType: "perplexity",
    sourceUrl: null,
    ...overrides,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe("createWizardFromTheme", () => {
  it("tribal_v4 → redirect /wizard/{id}, motor=tribal_v4, theme=title, referenceUrl set", async () => {
    themeFetchMock.mockResolvedValueOnce(
      makeTheme({ sourceUrl: "https://example.com/article" })
    )
    dbInsertMock.mockClear()

    const result = await createWizardFromTheme(1, "tribal_v4", "user_abc")

    expect(result.wizardId).toBe(99)
    expect(result.redirectPath).toBe("/wizard/99")

    const inserted = dbInsertMock.mock.calls[0][0]
    expect(inserted.motor).toBe("tribal_v4")
    expect(inserted.theme).toBe("Tema de Teste")
    expect(inserted.referenceUrl).toBe("https://example.com/article")
  })

  it("brandsdecoded_v4 + referenceUrl (non-youtube) → redirect /wizard/brandsdecoded/{id}, seed type=link", async () => {
    themeFetchMock.mockResolvedValueOnce(
      makeTheme({ sourceUrl: "https://example.com/post", sourceType: "perplexity" })
    )
    dbInsertMock.mockClear()

    const result = await createWizardFromTheme(1, "brandsdecoded_v4", "user_abc")

    expect(result.redirectPath).toBe("/wizard/brandsdecoded/99")

    const inserted = dbInsertMock.mock.calls[0][0]
    expect(inserted.seeds).toHaveLength(1)
    expect(inserted.seeds[0].type).toBe("link")
    expect(inserted.seeds[0].value).toBe("https://example.com/post")
    expect(inserted.seeds[0].id).toBeTruthy()
    expect(inserted.seeds[0].extractedAt).toBeTruthy()
  })

  it("brandsdecoded_v4 + source=youtube → seed type=youtube", async () => {
    themeFetchMock.mockResolvedValueOnce(
      makeTheme({
        sourceType: "youtube",
        sourceUrl: "https://www.youtube.com/watch?v=abc123",
      })
    )
    dbInsertMock.mockClear()

    const result = await createWizardFromTheme(1, "brandsdecoded_v4", "user_abc")

    expect(result.redirectPath).toBe("/wizard/brandsdecoded/99")

    const inserted = dbInsertMock.mock.calls[0][0]
    expect(inserted.seeds[0].type).toBe("youtube")
    expect(inserted.seeds[0].value).toBe("https://www.youtube.com/watch?v=abc123")
  })

  it("brandsdecoded_v4 + no URL → seed type=theme, value=title", async () => {
    themeFetchMock.mockResolvedValueOnce(
      makeTheme({ sourceUrl: null, sourceType: "manual" })
    )
    dbInsertMock.mockClear()

    const result = await createWizardFromTheme(1, "brandsdecoded_v4", "user_abc")

    expect(result.redirectPath).toBe("/wizard/brandsdecoded/99")

    const inserted = dbInsertMock.mock.calls[0][0]
    expect(inserted.seeds[0].type).toBe("theme")
    expect(inserted.seeds[0].value).toBe("Tema de Teste")
  })
})
