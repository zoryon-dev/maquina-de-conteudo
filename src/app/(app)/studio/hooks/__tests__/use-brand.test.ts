/**
 * @vitest-environment jsdom
 *
 * T4 — Hook useBrand: fetch /api/brands/current + estados.
 *
 * Contract pós C1+C2 fix (prod agent):
 *   - 200 + { brand }         → setBrand com o config
 *   - 401                     → setBrand(undefined) e console.warn
 *   - 500                     → setBrand(undefined) e console.error
 *   - network error (reject)  → setBrand(undefined) e console.error
 *
 * Os dois primeiros cenários já passam hoje (warn/error distinctness
 * depende do fix); os de 500/network são antecipatórios.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useBrand } from "../use-brand"

describe("useBrand", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchMock = vi.fn()
    ;(globalThis as { fetch: unknown }).fetch = fetchMock
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it("retorna brand quando resposta 200 traz config", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ brand: { identity: { positioning: "X" } } }),
    })

    const { result } = renderHook(() => useBrand())
    await waitFor(() => expect(result.current).toBeDefined())
    expect(result.current?.identity.positioning).toBe("X")
  })

  it("retorna undefined quando resposta é 200 mas brand=null", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ brand: null }),
    })

    const { result } = renderHook(() => useBrand())
    // Dá tempo para o effect rodar
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // Como brand veio null, não faz setBrand → permanece undefined
    expect(result.current).toBeUndefined()
  })

  // ANTICIPATORY (C1): hoje o hook silencia 401 sem logar. Após o fix,
  // console.warn deve ser chamado com contexto de "não autenticado".
  it("retorna undefined em 401 e loga console.warn (C1)", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        brand: null,
        error: "Não autenticado",
        code: "AUTH_ERROR",
      }),
    })

    const { result } = renderHook(() => useBrand())
    await waitFor(() => expect(warnSpy).toHaveBeenCalled())
    expect(result.current).toBeUndefined()
  })

  // 500 é non-OK response (não thrown) → loga warn com status/code/error.
  // Apenas exceções (network, parse) logam error.
  it("retorna undefined em 500 e loga console.warn", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        brand: null,
        error: "Internal error",
        code: "BRAND_CURRENT_FAILED",
      }),
    })

    const { result } = renderHook(() => useBrand())
    await waitFor(() => expect(warnSpy).toHaveBeenCalled())
    expect(result.current).toBeUndefined()
  })

  // ANTICIPATORY (C1+C2): hoje o .catch é silencioso. Pós fix, network
  // errors precisam logar console.error (não warn).
  it("retorna undefined em network error e loga console.error", async () => {
    fetchMock.mockRejectedValue(new Error("Network down"))

    const { result } = renderHook(() => useBrand())
    await waitFor(() => expect(errorSpy).toHaveBeenCalled())
    expect(result.current).toBeUndefined()
  })
})
