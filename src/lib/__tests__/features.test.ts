import { describe, it, expect, vi, beforeEach } from "vitest"
import { isFeatureEnabled } from "../features"

describe("isFeatureEnabled", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it("retorna true quando env = 'true'", () => {
    vi.stubEnv("MY_FLAG", "true")
    expect(isFeatureEnabled("MY_FLAG")).toBe(true)
  })

  it("retorna false quando env = 'false'", () => {
    vi.stubEnv("MY_FLAG", "false")
    expect(isFeatureEnabled("MY_FLAG")).toBe(false)
  })

  it("retorna false pra valor não-'true' (ex: '1', 'yes')", () => {
    vi.stubEnv("MY_FLAG", "1")
    expect(isFeatureEnabled("MY_FLAG")).toBe(false)
  })

  it("usa defaultValue quando env ausente", () => {
    expect(isFeatureEnabled("MISSING_FLAG_A", true)).toBe(true)
    expect(isFeatureEnabled("MISSING_FLAG_B", false)).toBe(false)
  })

  it("default implícito é false quando flag ausente", () => {
    expect(isFeatureEnabled("MISSING_FLAG_C")).toBe(false)
  })
})
