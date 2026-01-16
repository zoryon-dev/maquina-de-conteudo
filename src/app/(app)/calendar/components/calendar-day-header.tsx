/**
 * Calendar Day Header Component
 *
 * Displays weekday names (Dom, Seg, Ter, Qua, Qui, Sex, Sáb)
 * at the top of the calendar grid.
 */

"use client"

import { WEEKDAY_ABBREVS } from "@/types/calendar"

export function CalendarDayHeader() {
  return (
    <div className="grid grid-cols-7 gap-1 mb-2">
      {WEEKDAY_ABBREVS.map((day) => (
        <div
          key={day}
          className="text-center text-xs font-medium text-white/60 uppercase py-2"
        >
          {day}
        </div>
      ))}
    </div>
  )
}
