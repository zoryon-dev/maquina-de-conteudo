/**
 * useCalendarPosts Hook
 *
 * Custom hook for fetching calendar posts with caching.
 * Uses API routes to fetch posts for a given date range.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import type { CalendarPost, CalendarFilters } from "@/types/calendar"
import type { CalendarDateRange } from "@/types/calendar"

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
      // Build query params
      const params = new URLSearchParams()
      params.set("start", dateRange.start.toISOString())
      params.set("end", dateRange.end.toISOString())

      if (filters.platforms && filters.platforms.length > 0) {
        params.set("platforms", filters.platforms.join(","))
      }
      if (filters.statuses && filters.statuses.length > 0) {
        params.set("statuses", filters.statuses.join(","))
      }
      if (filters.types && filters.types.length > 0) {
        params.set("types", filters.types.join(","))
      }

      const response = await fetch(`/api/calendar/posts?${params.toString()}`)
      const result = await response.json()
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
