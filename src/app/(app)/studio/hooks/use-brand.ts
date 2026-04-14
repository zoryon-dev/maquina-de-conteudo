"use client"

import { useEffect, useState } from "react"
import type { BrandConfig } from "@/lib/brands/schema"

/**
 * Fetcha a brand ativa do usuário via `/api/brands/current`. Retorna
 * `undefined` enquanto carrega (ou em caso de erro) e o config assim
 * que a resposta chega. Cleanup com `alive` evita setState depois do
 * unmount (edge case em Strict Mode dev).
 */
export function useBrand(): BrandConfig | undefined {
  const [brand, setBrand] = useState<BrandConfig | undefined>(undefined)

  useEffect(() => {
    let alive = true
    fetch("/api/brands/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { brand?: BrandConfig | null } | null) => {
        if (!alive) return
        if (data?.brand) setBrand(data.brand)
      })
      .catch(() => {
        // Silenciar: se a API falhar, cai no fallback hardcoded dos templates.
      })
    return () => {
      alive = false
    }
  }, [])

  return brand
}
