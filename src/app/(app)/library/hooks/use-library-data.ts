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
  total: number
  page: number
  limit: number
  totalPages: number
  setPage: (page: number) => void
  setLimit: (limit: number) => void
}

export interface UseLibraryDataProps {
  filters: LibraryFilters
  viewMode: ViewMode
  page?: number
  limit?: number
}

export function useLibraryData(
  props: UseLibraryDataProps
): UseLibraryDataReturn {
  const { filters, viewMode, page: pageProp = 1, limit: limitProp = 12 } = props
  const [items, setItems] = useState<LibraryItemWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(pageProp)
  const [limit, setLimit] = useState(limitProp)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

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
      params.set("page", page.toString())
      params.set("limit", limit.toString())

      const response = await fetch(`/api/library?${params.toString()}`)
      const result = await response.json()

      // Check if response is paginated
      if ("items" in result) {
        setItems(result.items || [])
        // Handle both nested pagination format and direct format
        if (result.pagination) {
          setTotal(result.pagination.total || 0)
          setTotalPages(result.pagination.totalPages || 1)
        } else {
          setTotal(result.total || 0)
          setTotalPages(result.totalPages || 1)
        }
      } else {
        // Backward compatibility
        setItems(result || [])
        setTotal(result.length || 0)
        setTotalPages(1)
      }
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
    const deps = JSON.stringify({ filters, viewMode, page, limit })
    if (deps !== prevDepsRef.current) {
      prevDepsRef.current = deps
      fetchData()
    }
  }, [filters, viewMode, page, limit])

  return { items, isLoading, error, refetch: fetchData, total, page, limit, totalPages, setPage, setLimit }
}
