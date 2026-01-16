/**
 * Calendar Day Component
 *
 * A single day cell in the calendar grid.
 * Displays day number, today highlight, and posts for that day.
 * Handles drag & drop for rescheduling posts.
 */

"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CalendarDayCell, CalendarPost } from "@/types/calendar"
import { isToday } from "@/lib/calendar-utils"
import { PostCard } from "./post-card"

interface CalendarDayProps {
  day: CalendarDayCell
  onPostClick?: (post: CalendarPost) => void
  onPostEdit?: (post: CalendarPost) => void
  onPostDelete?: (postId: number) => void
  onPostDuplicate?: (postId: number) => void
  onPostDrop?: (postId: number, newDate: Date) => void
}

export function CalendarDay({
  day,
  onPostClick,
  onPostEdit,
  onPostDelete,
  onPostDuplicate,
  onPostDrop,
}: CalendarDayProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const { date, isCurrentMonth, posts } = day

  const dayNumber = date.getDate()

  // Handle drag enter
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  // Handle drop
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const postId = parseInt(e.dataTransfer.getData("text/plain"))
      if (!isNaN(postId) && onPostDrop) {
        onPostDrop(postId, date)
      }
    },
    [date, onPostDrop]
  )

  // Posts to display (limit to 3, show "X mais" for more)
  const displayPosts = posts.slice(0, 3)
  const remainingCount = posts.length - 3

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "calendar-day min-h-[120px] p-2 relative rounded-lg border",
        "transition-all duration-200",
        "border-white/5 hover:border-white/10",
        // Styling for non-current month days
        !isCurrentMonth && "text-white/30 bg-white/[0.01]",
        // Styling for current month days - add subtle background
        isCurrentMonth && "bg-white/[0.02]",
        // Styling for today
        isToday(date) && "bg-primary/10 border-primary/30",
        // Styling for drag over
        isDragOver && "bg-primary/15 ring-1 ring-primary/40"
      )}
    >
      {/* Day Number - More prominent */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-base font-bold",
            isToday(date) && "bg-primary text-black w-7 h-7 rounded-full flex items-center justify-center text-sm",
            !isToday(date) && isCurrentMonth && "text-white/90",
            !isCurrentMonth && "text-white/30"
          )}
        >
          {dayNumber}
        </span>

        {/* Post Count Badge - More visible */}
        {posts.length > 0 && (
          <Badge
            variant="outline"
            className={cn(
              "text-xs h-6 px-2 border-0 font-semibold",
              isToday(date)
                ? "bg-primary text-black"
                : "bg-primary/20 text-primary"
            )}
          >
            {posts.length}
          </Badge>
        )}
      </div>

      {/* Posts */}
      <div className="space-y-1">
        {displayPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onClick={onPostClick}
            onEdit={onPostEdit}
            onDelete={onPostDelete}
            onDuplicate={onPostDuplicate}
          />
        ))}

        {/* "X mais" indicator */}
        {remainingCount > 0 && (
          <div className="text-xs text-white/60 text-center py-1 hover:text-white/80 cursor-pointer">
            +{remainingCount} {remainingCount === 1 ? "post" : "posts"}
          </div>
        )}
      </div>

      {/* Drop Zone Indicator (visible when dragging) */}
      {isDragOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-primary/20 rounded-lg pointer-events-none"
        />
      )}
    </div>
  )
}
