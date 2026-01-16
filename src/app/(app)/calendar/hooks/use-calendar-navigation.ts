/**
 * useCalendarNavigation Hook
 *
 * Custom hook for managing calendar navigation state.
 */

"use client"

import { useState, useCallback } from "react"
import type { CalendarView } from "@/types/calendar"
import { addMonths, addDays } from "@/lib/calendar-utils"

interface UseCalendarNavigationReturn {
  currentDate: Date
  view: CalendarView
  goToPrevious: () => void
  goToNext: () => void
  goToToday: () => void
  updateView: (view: CalendarView) => void
}

export function useCalendarNavigation(
  initialView?: CalendarView
): UseCalendarNavigationReturn {
  const [view, setView] = useState<CalendarView>(initialView || "month")
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())

  /**
   * Navigate to previous period
   */
  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      switch (view) {
        case "month":
          return addMonths(prev, -1)
        case "week":
          return addDays(prev, -7)
        case "day":
          return addDays(prev, -1)
        default:
          return addMonths(prev, -1)
      }
    })
  }, [view])

  /**
   * Navigate to next period
   */
  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      switch (view) {
        case "month":
          return addMonths(prev, 1)
        case "week":
          return addDays(prev, 7)
        case "day":
          return addDays(prev, 1)
        default:
          return addMonths(prev, 1)
      }
    })
  }, [view])

  /**
   * Go to today
   */
  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  /**
   * Update view
   */
  const updateView = useCallback((newView: CalendarView) => {
    setView(newView)
  }, [])

  return {
    currentDate,
    view,
    goToPrevious,
    goToNext,
    goToToday,
    updateView,
  }
}
