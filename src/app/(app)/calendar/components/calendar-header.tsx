/**
 * Calendar Header Component
 *
 * Top section of the calendar page with navigation,
 * view switcher, and filters.
 */

"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MonthNavigation } from "./month-navigation"
import { ViewSwitcher } from "./view-switcher"
import { FilterBar } from "./filter-bar"
import type { CalendarView, CalendarFilters } from "@/types/calendar"

interface CalendarHeaderProps {
  currentDate: Date
  view: CalendarView
  filters: CalendarFilters
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
  onFiltersChange: (filters: CalendarFilters) => void
  onNewPost: () => void
}

export function CalendarHeader({
  currentDate,
  view,
  filters,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  onFiltersChange,
  onNewPost,
}: CalendarHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <MonthNavigation
          currentDate={currentDate}
          view={view}
          onPrevious={onPrevious}
          onNext={onNext}
          onToday={onToday}
        />

        <div className="flex items-center gap-2">
          <ViewSwitcher currentView={view} onViewChange={onViewChange} />
          <Button
            onClick={onNewPost}
            className="bg-primary text-black hover:bg-primary/90"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Post
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onFiltersChange={onFiltersChange} />
    </div>
  )
}
