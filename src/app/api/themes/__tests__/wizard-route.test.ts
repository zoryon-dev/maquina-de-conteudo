import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_1" }),
}))
vi.mock("@/lib/wizard/create-wizard", () => ({
  createWizardFromTheme: vi.fn().mockResolvedValue({
    wizardId: 42,
    redirectPath: "/wizard/brandsdecoded/42",
  }),
}))
vi.mock("@/lib/features", () => ({
  isFeatureEnabled: vi.fn().mockReturnValue(true),
}))

import { POST } from "../[id]/wizard/route"
import { auth } from "@clerk/nextjs/server"
import { createWizardFromTheme } from "@/lib/wizard/create-wizard"
import { isFeatureEnabled } from "@/lib/features"

describe("POST /api/themes/[id]/wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any)
    vi.mocked(isFeatureEnabled).mockReturnValue(true)
    vi.mocked(createWizardFromTheme).mockResolvedValue({
      wizardId: 42,
      redirectPath: "/wizard/brandsdecoded/42",
    })
  })

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
    vi.mocked(createWizardFromTheme).mockResolvedValue({
      wizardId: 42,
      redirectPath: "/wizard/42",
    })
    const req = new Request("http://x/api/themes/1/wizard", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(200)
    // Verify motor defaulted correctly
    expect(vi.mocked(createWizardFromTheme)).toHaveBeenCalledWith(1, "tribal_v4", "user_1")
  })

  it("rejeita motor inválido", async () => {
    const req = new Request("http://x/api/themes/1/wizard", {
      method: "POST",
      body: JSON.stringify({ motor: "invalid" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(400)
  })

  it("retorna 401 quando não autenticado", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ userId: null } as any)
    const req = new Request("http://x/api/themes/1/wizard", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(401)
  })

  it("retorna 403 quando motor=brandsdecoded_v4 e flag desligada", async () => {
    vi.mocked(isFeatureEnabled).mockReturnValueOnce(false)
    const req = new Request("http://x/api/themes/1/wizard", {
      method: "POST",
      body: JSON.stringify({ motor: "brandsdecoded_v4" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(403)
  })
})
