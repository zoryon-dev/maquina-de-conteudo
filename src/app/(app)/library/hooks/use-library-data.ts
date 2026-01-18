/**
 * useLibraryData Hook
 *
 * Busca dados da biblioteca com cache inteligente para evitar infinite loops.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import type { LibraryItemWithRelations, LibraryFilters, ViewMode } from "@/types/library"

export interface UseLibraryDataReturn {
  items: LibraryItemWithRelations[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useLibraryData(
  filters: LibraryFilters,
  viewMode: ViewMode
): UseLibraryDataReturn {
  const [items, setItems] = useState<LibraryItemWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ref para evitar infinite loops com dependências de objeto
  const prevDepsRef = useRef<string>("")

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Build query params
      const params = new URLSearchParams()
      if (filters.types && filters.types.length > 0) {
        params.set("types", filters.types.join(","))
      }
      if (filters.statuses && filters.statuses.length > 0) {
        params.set("statuses", filters.statuses.join(","))
      }
      if (filters.categories && filters.categories.length > 0) {
        params.set("categories", filters.categories.join(","))
      }
      if (filters.search) {
        params.set("search", filters.search)
      }
      params.set("viewMode", viewMode.mode)
      params.set("sortBy", viewMode.sortBy)
      params.set("sortOrder", viewMode.sortOrder)

      const response = await fetch(`/api/library?${params.toString()}`)
      const result = await response.json()
      setItems(result)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao carregar conteúdo"
      setError(errorMessage)
      console.error("Error fetching library data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Comparar_deps via JSON.stringify para evitar re-renders infinitos
    const deps = JSON.stringify({ filters, viewMode })
    if (deps !== prevDepsRef.current) {
      prevDepsRef.current = deps
      fetchData()
    }
  }, [filters, viewMode])

  return { items, isLoading, error, refetch: fetchData }
}
