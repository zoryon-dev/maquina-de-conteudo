/**
 * Calendar Page
 *
 * Main editorial calendar page for viewing and managing scheduled posts.
 * Features month/week/day views, filters, and drag-and-drop rescheduling.
 */

"use client"

import { useState } from "react"
import { CalendarHeader } from "./components/calendar-header"
import { CalendarGrid } from "./components/calendar-grid"
import { PostDialog } from "./components/post-dialog"
import { useCalendarNavigation } from "./hooks/use-calendar-navigation"
import { useCalendarFilters } from "./hooks/use-calendar-filters"
import { useCalendarPosts } from "./hooks/use-calendar-posts"
import { getDateRange } from "@/lib/calendar-utils"
import type { CalendarPost, PostFormData } from "@/types/calendar"

/**
 * Calendar Client Component
 *
 * Contains all the interactive logic for the calendar page.
 * Navigation, filters, posts fetching, and dialog management.
 */
function CalendarClient() {
  // Navigation state (date, view)
  const { currentDate, view, goToPrevious, goToNext, goToToday, updateView } =
    useCalendarNavigation()

  // Filter state
  const { filters, updateFilters } = useCalendarFilters()

  // Get date range for current view
  const dateRange = getDateRange(currentDate, view)

  // Fetch posts for current range and filters
  const { posts, isLoading, error, refetch } = useCalendarPosts(
    dateRange,
    filters
  )

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<CalendarPost | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)

  // Handle new post
  const handleNewPost = () => {
    setEditingPost(undefined)
    setDialogOpen(true)
  }

  // Handle post click (view details)
  const handlePostClick = (post: CalendarPost) => {
    setEditingPost(post)
    setDialogOpen(true)
  }

  // Handle post edit
  const handlePostEdit = (post: CalendarPost) => {
    setEditingPost(post)
    setDialogOpen(true)
  }

  // Handle post delete
  const handlePostDelete = async (postId: number) => {
    if (!confirm("Tem certeza que deseja excluir este post?")) return

    try {
      await fetch(`/api/calendar/posts/${postId}`, { method: "DELETE" })
      refetch()
    } catch (error) {
      // Silent fail - delete post error
    }
  }

  // Handle post duplicate
  const handlePostDuplicate = async (postId: number) => {
    try {
      await fetch(`/api/calendar/posts/${postId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      refetch()
    } catch (error) {
      // Silent fail - duplicate post error
    }
  }

  // Handle post drop (reschedule)
  const handlePostDrop = async (postId: number, newDate: Date) => {
    try {
      await fetch(`/api/calendar/posts/${postId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newDate: newDate.toISOString() }),
      })
      refetch()
    } catch (error) {
      // Silent fail - reschedule post error
    }
  }

  // Handle save (create or update)
  const handleSave = async (data: PostFormData) => {
    setIsSaving(true)
    try {
      if (editingPost) {
        await fetch(`/api/calendar/posts/${editingPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      } else {
        await fetch("/api/calendar/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      }
      refetch()
    } catch (error) {
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        filters={filters}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onToday={goToToday}
        onViewChange={updateView}
        onFiltersChange={updateFilters}
        onNewPost={handleNewPost}
      />

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300">
          <p className="font-medium">Erro ao carregar posts</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Calendar Grid */}
      <CalendarGrid
        currentDate={currentDate}
        view={view}
        posts={posts}
        dateRange={dateRange}
        isLoading={isLoading}
        onPostClick={handlePostClick}
        onPostEdit={handlePostEdit}
        onPostDelete={handlePostDelete}
        onPostDuplicate={handlePostDuplicate}
        onPostDrop={handlePostDrop}
      />

      {/* Post Dialog */}
      <PostDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        post={editingPost}
        isLoading={isSaving}
      />
    </div>
  )
}

/**
 * Calendar Page Component
 */
export default function CalendarPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">
          Calendário Editorial
        </h1>
        <p className="text-sm text-white/60">
          Planeje e agende seus posts para redes sociais
        </p>
      </div>

      {/* Calendar Client */}
      <CalendarClient />
    </div>
  )
}
