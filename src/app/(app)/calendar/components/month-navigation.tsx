/**
 * Month Navigation Component
 *
 * Navigation controls for moving between months/weeks/days.
 * Shows current period label and Previous/Today/Next buttons.
 */

"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatMonthLabel, formatWeekLabel, formatDayLabel } from "@/lib/calendar-utils"
import type { CalendarView } from "@/types/calendar"

interface MonthNavigationProps {
  currentDate: Date
  view: CalendarView
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

export function MonthNavigation({
  currentDate,
  view,
  onPrevious,
  onNext,
  onToday,
}: MonthNavigationProps) {
  // Format label based on view
  const getPeriodLabel = () => {
    switch (view) {
      case "month":
        return formatMonthLabel(currentDate)
      case "week":
        return formatWeekLabel(currentDate)
      case "day":
        return formatDayLabel(currentDate)
    }
  }

  const getNavigationLabel = () => {
    switch (view) {
      case "month":
        return "Mês"
      case "week":
        return "Semana"
      case "day":
        return "Dia"
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Today Button */}
      <Button
        onClick={onToday}
        variant="outline"
        size="sm"
        className="border-white/10 hover:bg-white/5 hover:border-white/20"
      >
        Hoje
      </Button>

      {/* Navigation Arrows + Label */}
      <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 rounded-lg p-1">
        <Button
          onClick={onPrevious}
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 hover:bg-white/5",
            "text-white/70 hover:text-white"
          )}
          aria-label={`${getNavigationLabel()} anterior`}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <span className="px-3 text-sm font-medium text-white min-w-[180px] text-center">
          {getPeriodLabel()}
        </span>

        <Button
          onClick={onNext}
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 hover:bg-white/5",
            "text-white/70 hover:text-white"
          )}
          aria-label={`${getNavigationLabel()} seguinte`}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
