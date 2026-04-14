import { describe, it, expect, vi } from "vitest"

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: "user_1" }),
}))
vi.mock("@/lib/wizard/create-wizard", () => ({
  createWizardFromTheme: vi.fn().mockResolvedValue({
    wizardId: 42,
    redirectPath: "/wizard/brandsdecoded/42",
  }),
}))

import { POST } from "../[id]/wizard/route"

describe("POST /api/themes/[id]/wizard", () => {
  it("aceita motor=brandsdecoded_v4", async () => {
    const req = new Request("http://x/api/themes/1/wizard", {
      method: "POST",
      body: JSON.stringify({ motor: "brandsdecoded_v4" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) })
    const json = await res.json()
    expect(json.redirectPath).toBe("/wizard/brandsdecoded/42")
  })

  it("default tribal_v4 quando body vazio", async () => {
    const req = new Request("http://x/api/themes/1/wizard", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(200)
  })

  it("rejeita motor inválido", async () => {
    const req = new Request("http://x/api/themes/1/wizard", {
      method: "POST",
      body: JSON.stringify({ motor: "invalid" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(400)
  })
})
