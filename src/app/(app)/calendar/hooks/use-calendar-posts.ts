/**
 * useCalendarPosts Hook
 *
 * Custom hook for fetching calendar posts with caching.
 * Uses server actions to fetch posts for a given date range.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import type { CalendarPost, CalendarFilters } from "@/types/calendar"
import type { CalendarDateRange } from "@/types/calendar"
import { getCalendarPostsAction } from "../actions/calendar-actions"

interface UseCalendarPostsReturn {
  posts: CalendarPost[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCalendarPosts(
  dateRange: CalendarDateRange,
  filters: CalendarFilters = {}
): UseCalendarPostsReturn {
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use ref to track previous values and avoid infinite loops
  const prevDepsRef = useRef<string>("")

  const fetchPosts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getCalendarPostsAction(dateRange, filters)
      setPosts(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar posts"
      setError(message)
      console.error("Error fetching calendar posts:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Create a stable string representation of dependencies
    const deps = JSON.stringify({ dateRange, filters })

    // Only fetch if dependencies actually changed
    if (deps !== prevDepsRef.current) {
      prevDepsRef.current = deps
      fetchPosts()
    }
  }, [dateRange, filters])

  return {
    posts,
    isLoading,
    error,
    refetch: fetchPosts,
  }
}
