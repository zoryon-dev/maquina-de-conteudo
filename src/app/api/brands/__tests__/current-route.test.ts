/**
 * T5 — Contract test do GET /api/brands/current.
 *
 * Mocka clerk auth e brand queries. Verifica:
 *   - 401 quando não autenticado (corpo: { brand: null, error })
 *   - 200 com { brand: null } quando user não tem default brand
 *   - 200 com { brand: <config> } quando há brand resolvida
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }))
vi.mock("@/lib/brands/queries", () => ({
  resolveBrandIdForUser: vi.fn(),
  getBrandConfig: vi.fn(),
}))

import { auth } from "@clerk/nextjs/server"
import { resolveBrandIdForUser, getBrandConfig } from "@/lib/brands/queries"
import { GET } from "../current/route"

describe("GET /api/brands/current", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(resolveBrandIdForUser).mockReset()
    vi.mocked(getBrandConfig).mockReset()
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it("retorna 401 quando não autenticado", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)

    const r = await GET()
    expect(r.status).toBe(401)
    const body = await r.json()
    expect(body.brand).toBeNull()
    expect(typeof body.error).toBe("string")
  })

  it("retorna { brand: null } quando user não tem default brand", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as never)
    vi.mocked(resolveBrandIdForUser).mockResolvedValue(null)

    const r = await GET()
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.brand).toBeNull()
    // Não deve ter consultado o config quando brandId é null
    expect(vi.mocked(getBrandConfig)).not.toHaveBeenCalled()
  })

  it("retorna brand quando resolvida com sucesso", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as never)
    vi.mocked(resolveBrandIdForUser).mockResolvedValue(42)
    vi.mocked(getBrandConfig).mockResolvedValue({
      identity: { positioning: "test" },
    } as never)

    const r = await GET()
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.brand).toEqual({ identity: { positioning: "test" } })
    expect(vi.mocked(getBrandConfig)).toHaveBeenCalledWith(42)
  })

  it("retorna 500 com code/error quando getBrandConfig lança", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as never)
    vi.mocked(resolveBrandIdForUser).mockResolvedValue(42)
    vi.mocked(getBrandConfig).mockRejectedValue(new Error("DB down"))

    const r = await GET()
    expect(r.status).toBe(500)
    const body = await r.json()
    expect(body.brand).toBeNull()
    expect(body.code).toBeDefined()
    expect(errorSpy).toHaveBeenCalled()
  })
})
