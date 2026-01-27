/**
 * Status Breakdown
 *
 * Cards em grid mostrando a distribuição de conteúdos por status.
 */

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { LibraryStats } from "@/types/library"
import type { ContentStatus } from "@/db/schema"
import { FileText, File, Clock, CheckCircle, Archive } from "lucide-react"

const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: {
    label: "Rascunhos",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    icon: File,
  },
  scheduled: {
    label: "Agendados",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    icon: Clock,
  },
  published: {
    label: "Publicados",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    icon: CheckCircle,
  },
  archived: {
    label: "Arquivados",
    color: "text-white/40",
    bgColor: "bg-white/5",
    icon: Archive,
  },
}

interface StatusCardProps {
  status: ContentStatus
  count: number
  total: number
}

function StatusCard({ status, count, total }: StatusCardProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all">
      {/* Icon + Label */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bgColor)}>
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
        <span className="text-2xl font-semibold text-white">{count}</span>
      </div>

      {/* Label */}
      <p className="text-xs text-white/50 mb-2">{config.label}</p>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", config.color.replace("text-", "bg-").replace("-400", "/20").replace("-500/20", "-400"))}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Percentage */}
      <p className="text-xs text-white/30 mt-2 text-right">
        {percentage}% do total
      </p>
    </div>
  )
}

interface StatusBreakdownProps {
  stats: LibraryStats | null
  isLoading?: boolean
}

export function StatusBreakdown({ stats, isLoading }: StatusBreakdownProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-32 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8 rounded-xl bg-white/[0.02] border border-white/5">
        <p className="text-sm text-white/40">Não foi possível carregar os status.</p>
      </div>
    )
  }

  const total = stats.totalItems
  const statuses: ContentStatus[] = ["draft", "scheduled", "published", "archived"]

  return (
    <div className="space-y-3">
      {/* Header */}
      <h3 className="text-sm font-medium text-white px-1 flex items-center gap-2">
        <FileText className="h-4 w-4 text-white/40" />
        Status de Publicação
      </h3>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-4 gap-3">
        {statuses.map((status) => (
          <StatusCard
            key={status}
            status={status}
            count={(stats.byStatus as Record<string, number>)[status] || 0}
            total={total}
          />
        ))}
      </div>
    </div>
  )
}
