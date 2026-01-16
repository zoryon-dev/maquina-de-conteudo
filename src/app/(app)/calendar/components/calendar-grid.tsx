/**
 * Calendar Grid Component
 *
 * Main calendar grid displaying day cells with posts.
 * Supports month, week, and day views with animations.
 */

"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { CalendarView, CalendarPost } from "@/types/calendar"
import { generateCalendarDays, groupPostsByDate } from "@/lib/calendar-utils"
import { CalendarDayHeader } from "./calendar-day-header"
import { CalendarDay } from "./calendar-day"
import type { CalendarDateRange } from "@/types/calendar"

interface CalendarGridProps {
  currentDate: Date
  view: CalendarView
  posts: CalendarPost[]
  dateRange: CalendarDateRange
  isLoading?: boolean
  onPostClick?: (post: CalendarPost) => void
  onPostEdit?: (post: CalendarPost) => void
  onPostDelete?: (postId: number) => void
  onPostDuplicate?: (postId: number) => void
  onPostDrop?: (postId: number, newDate: Date) => void
}

export function CalendarGrid({
  currentDate,
  view,
  posts,
  isLoading = false,
  onPostClick,
  onPostEdit,
  onPostDelete,
  onPostDuplicate,
  onPostDrop,
}: CalendarGridProps) {

  // Group posts by date for efficient lookup
  const postsByDate = useMemo(() => {
    const grouped = groupPostsByDate(posts)
    Object.keys(grouped).forEach((key) => {
      grouped[key] = grouped[key].map((p) => ({
        ...p,
        scheduledFor: new Date(p.scheduledFor!), // Ensure Date object
      }))
    })
    return grouped
  }, [posts])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = generateCalendarDays(currentDate, view)

    // Attach posts to each day
    return days.map((day) => {
      const dateKey = new Date(day.date)
      dateKey.setHours(0, 0, 0, 0)
      const key = dateKey.toISOString()

      return {
        ...day,
        posts: (postsByDate[key] || []).map((p) => ({
          ...p,
          scheduledFor: new Date(p.scheduledFor!), // Ensure Date object
        })),
      }
    })
  }, [currentDate, view, postsByDate])

  // Grid classes based on view
  const gridClasses = cn(
    "calendar-grid",
    view === "month" && "grid-cols-7",
    view === "week" && "grid-cols-7",
    view === "day" && "grid-cols-1"
  )

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
      },
    },
  } satisfies object

  const cellVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
      },
    },
  } satisfies object

  return (
    <div className="space-y-4">
      {/* Day Headers */}
      {(view === "month" || view === "week") && <CalendarDayHeader />}

      {/* Calendar Grid */}
      {isLoading ? (
        <LoadingGrid view={view} />
      ) : (
        <motion.div
          key={`${currentDate.toISOString()}-${view}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            "grid gap-1 bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden",
            gridClasses
          )}
        >
          <AnimatePresence mode="popLayout">
            {calendarDays.map((day) => (
              <motion.div
                key={day.date.toISOString()}
                layout
                variants={cellVariants}
                transition={{
                  layout: { type: "spring", stiffness: 300, damping: 30 },
                }}
              >
                <CalendarDay
                  day={day}
                  onPostClick={onPostClick}
                  onPostEdit={onPostEdit}
                  onPostDelete={onPostDelete}
                  onPostDuplicate={onPostDuplicate}
                  onPostDrop={onPostDrop}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Loading skeleton grid
 */
function LoadingGrid({ view }: { view: CalendarView }) {
  const cellCount = view === "month" ? 42 : view === "week" ? 7 : 24

  return (
    <div
      className={cn(
        "grid gap-1 bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden",
        view === "month" && "grid-cols-7",
        view === "week" && "grid-cols-7",
        view === "day" && "grid-cols-1"
      )}
    >
      {Array.from({ length: cellCount }).map((_, i) => (
        <div
          key={i}
          className="min-h-[120px] p-2 animate-pulse bg-white/[0.03]"
        />
      ))}
    </div>
  )
}
