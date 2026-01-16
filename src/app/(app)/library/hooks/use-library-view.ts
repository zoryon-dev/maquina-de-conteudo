/**
 * useLibraryView Hook
 *
 * Gerencia o modo de visualização (grid/list) e ordenação.
 */

"use client"

import { useState, useCallback } from "react"
import type { ViewMode } from "@/types/library"

export interface UseLibraryViewReturn {
  viewMode: ViewMode
  toggleViewMode: () => void
  setSortBy: (sortBy: ViewMode["sortBy"]) => void
  toggleSortOrder: () => void
}

const DEFAULT_VIEW_MODE: ViewMode = {
  mode: "grid",
  sortBy: "createdAt",
  sortOrder: "desc",
}

export function useLibraryView(
  initialViewMode?: Partial<ViewMode>
): UseLibraryViewReturn {
  const [viewMode, setViewMode] = useState<ViewMode>({
    ...DEFAULT_VIEW_MODE,
    ...initialViewMode,
  })

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => ({
      ...prev,
      mode: prev.mode === "grid" ? "list" : "grid",
    }))
  }, [])

  const setSortBy = useCallback((sortBy: ViewMode["sortBy"]) => {
    setViewMode((prev) => ({ ...prev, sortBy }))
  }, [])

  const toggleSortOrder = useCallback(() => {
    setViewMode((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
    }))
  }, [])

  return {
    viewMode,
    toggleViewMode,
    setSortBy,
    toggleSortOrder,
  }
}
