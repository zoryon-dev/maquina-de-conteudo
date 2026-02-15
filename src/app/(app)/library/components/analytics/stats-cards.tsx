/**
 * Stats Cards Component
 *
 * 4 stat cards showing key library metrics:
 * Total, Published, Scheduled, Drafts.
 * Glassmorphism style with subtle icons.
 */

"use client"

import { FileText, CheckCircle2, Clock, File } from "lucide-react"
import type { LibraryOverview } from "../../actions/analytics-actions"

interface StatsCardsProps {
  overview: LibraryOverview
}

interface StatCardData {
  label: string
  value: number
  icon: typeof FileText
  iconColor: string
  iconBg: string
  subtitle?: string
}

export function StatsCards({ overview }: StatsCardsProps) {
  const cards: StatCardData[] = [
    {
      label: "Total de Conteudos",
      value: overview.totalItems,
      icon: FileText,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      subtitle: `${overview.createdThisMonth} este mes`,
    },
    {
      label: "Publicados",
      value: overview.byStatus.published || 0,
      icon: CheckCircle2,
      iconColor: "text-green-400",
      iconBg: "bg-green-500/10",
    },
    {
      label: "Agendados",
      value: overview.byStatus.scheduled || 0,
      icon: Clock,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
    },
    {
      label: "Rascunhos",
      value: overview.byStatus.draft || 0,
      icon: File,
      iconColor: "text-white/60",
      iconBg: "bg-white/5",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg, subtitle }: StatCardData) {
  return (
    <div className="relative overflow-hidden backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-lg p-5 transition-all hover:border-white/20">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-white/60">{label}</p>
          {subtitle && (
            <p className="text-xs text-white/40">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}
