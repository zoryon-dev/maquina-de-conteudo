/**
 * View Switcher Component
 *
 * Toggle between month, week, and day views.
 * Uses segmented control pattern with active state highlight.
 */

"use client"

import { Calendar, CalendarDays, CalendarClock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CalendarView } from "@/types/calendar"

interface ViewSwitcherProps {
  currentView: CalendarView
  onViewChange: (view: CalendarView) => void
}

const views: { value: CalendarView; label: string; icon: typeof Calendar }[] = [
  { value: "month", label: "Mês", icon: Calendar },
  { value: "week", label: "Semana", icon: CalendarDays },
  { value: "day", label: "Dia", icon: CalendarClock },
]

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="relative flex items-center bg-white/[0.02] border border-white/10 rounded-lg p-1">
      {views.map((view) => {
        const Icon = view.icon
        const isActive = currentView === view.value

        return (
          <button
            key={view.value}
            onClick={() => onViewChange(view.value)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
              "hover:text-white",
              isActive
                ? "bg-primary text-black shadow-lg shadow-primary/20"
                : "text-white/60"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{view.label}</span>
          </button>
        )
      })}
    </div>
  )
}
