import { describe, it, expect, vi, beforeEach } from "vitest"

const authMock = vi.fn()
const dbInsertMock = vi.fn()

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}))

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
  },
}))

import { createNewWizardAction } from "../actions/create-wizard"

describe("createNewWizardAction", () => {
  beforeEach(() => {
    authMock.mockReset()
    dbInsertMock.mockReset()
    authMock.mockResolvedValue({ userId: "user_1" })
  })

  it("retorna erro quando não autenticado", async () => {
    authMock.mockResolvedValue({ userId: null })
    const r = await createNewWizardAction({ type: "carousel", motor: "tribal_v4" })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toMatch(/auth/i)
  })

  it("tribal_v4 → retorna redirectPath /wizard/[id]", async () => {
    const r = await createNewWizardAction({ type: "carousel", motor: "tribal_v4" })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.redirectPath).toBe("/wizard/99")
      expect(r.data.wizardId).toBe(99)
    }
    expect(dbInsertMock).toHaveBeenCalled()
    const values = dbInsertMock.mock.calls[0][0]
    expect(values.motor).toBe("tribal_v4")
  })

  it("brandsdecoded_v4 → retorna redirectPath /wizard/brandsdecoded/[id]", async () => {
    const r = await createNewWizardAction({ type: "carousel", motor: "brandsdecoded_v4" })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.redirectPath).toBe("/wizard/brandsdecoded/99")
    }
    const values = dbInsertMock.mock.calls[0][0]
    expect(values.motor).toBe("brandsdecoded_v4")
  })

  it("schedule type → persiste como 'text'", async () => {
    const r = await createNewWizardAction({ type: "schedule", motor: "tribal_v4" })
    expect(r.success).toBe(true)
    const values = dbInsertMock.mock.calls[0][0]
    expect(values.contentType).toBe("text")
  })
})
