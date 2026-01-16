/**
 * useLibraryFilters Hook
 *
 * Gerencia os filtros da biblioteca de conteúdo.
 */

"use client"

import { useState, useCallback } from "react"
import type { LibraryFilters } from "@/types/library"
import type { PostType, ContentStatus } from "@/db/schema"

export interface UseLibraryFiltersReturn {
  filters: LibraryFilters
  updateFilters: (newFilters: LibraryFilters) => void
  clearFilters: () => void
  activeFilterCount: number
  toggleType: (type: PostType) => void
  toggleStatus: (status: ContentStatus) => void
  toggleCategory: (categoryId: number) => void
  toggleTag: (tagId: number) => void
  setSearch: (search: string) => void
  setDateRange: (start: Date, end: Date) => void
  isTypeActive: (type: PostType) => boolean
  isStatusActive: (status: ContentStatus) => boolean
  isCategoryActive: (categoryId: number) => boolean
  isTagActive: (tagId: number) => boolean
}

const DEFAULT_FILTERS: LibraryFilters = {}

export function useLibraryFilters(
  initialFilters: LibraryFilters = DEFAULT_FILTERS
): UseLibraryFiltersReturn {
  const [filters, setFilters] = useState<LibraryFilters>(initialFilters)

  const updateFilters = useCallback((newFilters: LibraryFilters) => {
    setFilters(newFilters)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const toggleType = useCallback((type: PostType) => {
    setFilters((prev) => {
      const current = prev.types || []
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type]
      return { ...prev, types: updated.length > 0 ? updated : undefined }
    })
  }, [])

  const toggleStatus = useCallback((status: ContentStatus) => {
    setFilters((prev) => {
      const current = prev.statuses || []
      const updated = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status]
      return { ...prev, statuses: updated.length > 0 ? updated : undefined }
    })
  }, [])

  const toggleCategory = useCallback((categoryId: number) => {
    setFilters((prev) => {
      const current = prev.categories || []
      const updated = current.includes(categoryId)
        ? current.filter((c) => c !== categoryId)
        : [...current, categoryId]
      return { ...prev, categories: updated.length > 0 ? updated : undefined }
    })
  }, [])

  const toggleTag = useCallback((tagId: number) => {
    setFilters((prev) => {
      const current = prev.tags || []
      const updated = current.includes(tagId)
        ? current.filter((t) => t !== tagId)
        : [...current, tagId]
      return { ...prev, tags: updated.length > 0 ? updated : undefined }
    })
  }, [])

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({
      ...prev,
      search: search || undefined,
    }))
  }, [])

  const setDateRange = useCallback((start: Date, end: Date) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { start, end },
    }))
  }, [])

  const isTypeActive = useCallback(
    (type: PostType) => {
      return filters.types?.includes(type) ?? false
    },
    [filters.types]
  )

  const isStatusActive = useCallback(
    (status: ContentStatus) => {
      return filters.statuses?.includes(status) ?? false
    },
    [filters.statuses]
  )

  const isCategoryActive = useCallback(
    (categoryId: number) => {
      return filters.categories?.includes(categoryId) ?? false
    },
    [filters.categories]
  )

  const isTagActive = useCallback(
    (tagId: number) => {
      return filters.tags?.includes(tagId) ?? false
    },
    [filters.tags]
  )

  // Count active filters
  const activeFilterCount =
    (filters.types?.length ?? 0) +
    (filters.statuses?.length ?? 0) +
    (filters.categories?.length ?? 0) +
    (filters.tags?.length ?? 0) +
    (filters.search?.length ?? 0) +
    (filters.dateRange ? 1 : 0)

  return {
    filters,
    updateFilters,
    clearFilters,
    activeFilterCount,
    toggleType,
    toggleStatus,
    toggleCategory,
    toggleTag,
    setSearch,
    setDateRange,
    isTypeActive,
    isStatusActive,
    isCategoryActive,
    isTagActive,
  }
}
