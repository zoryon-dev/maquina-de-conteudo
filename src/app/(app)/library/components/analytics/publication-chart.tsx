/**
 * Publication Chart Component
 *
 * CSS-only bar chart showing content created per day.
 * No external chart libraries - pure CSS with divs.
 * Lime green bars with hover tooltips.
 */

"use client"

import { useState } from "react"
import type { TimelineEntry } from "../../actions/analytics-actions"

interface PublicationChartProps {
  data: TimelineEntry[]
}

export function PublicationChart({ data }: PublicationChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Show last 14 days for a cleaner chart (or all if less)
  const displayData = data.length > 14 ? data.slice(-14) : data

  const maxCount = Math.max(...displayData.map((d) => d.count), 1)
  const totalInPeriod = displayData.reduce((sum, d) => sum + d.count, 0)

  if (displayData.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white/90 mb-4">Conteudos Criados</h3>
        <p className="text-sm text-white/40 text-center py-8">
          Nenhum dado disponivel para o periodo selecionado.
        </p>
      </div>
    )
  }

  return (
    <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-white/90">Conteudos Criados</h3>
        <span className="text-xs text-white/40">
          {totalInPeriod} no periodo
        </span>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Y-axis grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 w-full">
              <span className="text-[10px] text-white/30 w-6 text-right shrink-0">
                {Math.round((maxCount * (3 - i)) / 3) || ""}
              </span>
              <div className="flex-1 border-b border-white/[0.04]" />
            </div>
          ))}
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] text-white/30 w-6 text-right shrink-0">0</span>
            <div className="flex-1 border-b border-white/[0.04]" />
          </div>
        </div>

        {/* Bars */}
        <div className="relative flex items-end gap-1 h-40 pl-8">
          {displayData.map((entry, index) => {
            const height = maxCount > 0 ? (entry.count / maxCount) * 100 : 0
            const isHovered = hoveredIndex === index
            const date = new Date(entry.date + "T12:00:00")
            const dayLabel = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
            const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" })

            return (
              <div
                key={entry.date}
                className="relative flex-1 flex flex-col items-center"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 z-10 bg-[#1a1a2e] border border-white/20 rounded-md px-3 py-2 shadow-xl pointer-events-none whitespace-nowrap">
                    <p className="text-xs font-medium text-white">{entry.count} {entry.count === 1 ? "conteudo" : "conteudos"}</p>
                    <p className="text-[10px] text-white/50">{dayLabel} ({weekday})</p>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20" />
                  </div>
                )}

                {/* Bar */}
                <div className="w-full flex justify-center" style={{ height: "160px" }}>
                  <div
                    className="w-full max-w-[24px] rounded-t-sm transition-all duration-200 cursor-pointer"
                    style={{
                      height: `${Math.max(height, entry.count > 0 ? 4 : 0)}%`,
                      backgroundColor: isHovered
                        ? "hsl(84 76% 55%)"
                        : entry.count > 0
                          ? "hsl(84 76% 55% / 0.6)"
                          : "transparent",
                      marginTop: "auto",
                    }}
                  />
                </div>

                {/* X-axis label */}
                <span className="text-[10px] text-white/30 mt-2 select-none">
                  {dayLabel}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
