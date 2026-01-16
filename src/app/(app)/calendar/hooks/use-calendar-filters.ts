/**
 * useCalendarFilters Hook
 *
 * Custom hook for managing calendar filter state.
 */

"use client"

import { useState, useCallback } from "react"
import type { CalendarFilters, Platform } from "@/types/calendar"
import type { ContentStatus } from "@/db/schema"

interface UseCalendarFiltersReturn {
  filters: CalendarFilters
  updateFilters: (newFilters: CalendarFilters) => void
  togglePlatform: (platform: Platform) => void
  toggleStatus: (status: ContentStatus) => void
  isPlatformActive: (platform: Platform) => boolean
  isStatusActive: (status: ContentStatus) => boolean
}

export function useCalendarFilters(): UseCalendarFiltersReturn {
  const [filters, setFilters] = useState<CalendarFilters>({})

  /**
   * Update filters
   */
  const updateFilters = useCallback((newFilters: CalendarFilters) => {
    setFilters(newFilters)
  }, [])

  /**
   * Toggle a platform filter
   */
  const togglePlatform = useCallback(
    (platform: Platform) => {
      setFilters((prev) => {
        const current = prev.platforms || []
        const isActive = current.includes(platform)

        if (isActive) {
          const updated = current.filter((p) => p !== platform)
          return {
            ...prev,
            platforms: updated.length > 0 ? updated : undefined,
          }
        } else {
          return {
            ...prev,
            platforms: [...current, platform],
          }
        }
      })
    },
    []
  )

  /**
   * Toggle a status filter
   */
  const toggleStatus = useCallback((status: ContentStatus) => {
    setFilters((prev) => {
      const current = prev.statuses || []
      const isActive = current.includes(status)

      if (isActive) {
        const updated = current.filter((s) => s !== status)
        return {
          ...prev,
          statuses: updated.length > 0 ? updated : undefined,
        }
      } else {
        return {
          ...prev,
          statuses: [...current, status],
        }
      }
    })
  }, [])

  /**
   * Check if a platform is currently filtered
   */
  const isPlatformActive = useCallback(
    (platform: Platform): boolean => {
      return filters.platforms?.includes(platform) || false
    },
    [filters.platforms]
  )

  /**
   * Check if a status is currently filtered
   */
  const isStatusActive = useCallback(
    (status: ContentStatus): boolean => {
      return filters.statuses?.includes(status) || false
    },
    [filters.statuses]
  )

  return {
    filters,
    updateFilters,
    togglePlatform,
    toggleStatus,
    isPlatformActive,
    isStatusActive,
  }
}
