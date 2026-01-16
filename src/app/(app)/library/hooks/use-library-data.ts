/**
 * useLibraryData Hook
 *
 * Busca dados da biblioteca com cache inteligente para evitar infinite loops.
 */

"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { getLibraryItemsAction } from "../actions/library-actions"
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

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getLibraryItemsAction(filters, viewMode)
      setItems(result)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao carregar conteúdo"
      setError(errorMessage)
      console.error("Error fetching library data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [filters, viewMode])

  useEffect(() => {
    // Comparar_deps via JSON.stringify para evitar re-renders infinitos
    const deps = JSON.stringify({ filters, viewMode })
    if (deps !== prevDepsRef.current) {
      prevDepsRef.current = deps
      fetchData()
    }
  }, [fetchData, filters, viewMode])

  return { items, isLoading, error, refetch: fetchData }
}
