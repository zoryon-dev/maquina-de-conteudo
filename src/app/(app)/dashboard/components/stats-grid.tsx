/**
 * Stats Grid
 *
 * Grid de 4 cards de estatísticas focado em publicações.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import type { LibraryStats } from "@/types/library"
import {
  Calendar,
  CheckCircle,
  Image as ImageIcon,
  Linkedin,
} from "lucide-react"

// Custom Instagram icon (Lucide's Instagram is deprecated)
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
  trend?: { value: string; positive: boolean }
}

function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/5">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-semibold text-white mb-1">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs mt-2",
          trend.positive ? "text-green-400" : "text-white/40"
        )}>
          {trend.value}
        </div>
      )}
    </div>
  )
}

interface StatsGridProps {
  stats: LibraryStats | null
  isLoading?: boolean
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8 rounded-xl bg-white/[0.02] border border-white/5">
        <p className="text-sm text-white/40">Não foi possível carregar as estatísticas.</p>
      </div>
    )
  }

  // Calcular publicados na semana (total - agendados - rascunhos - arquivados)
  // Para simplificar, vamos usar uma estimativa baseada no scheduledThisMonth
  const publishedThisWeek = Math.max(0, stats.byStatus.published || 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Agendados (Semana)"
        value={stats.scheduledThisWeek}
        icon={Calendar}
        color="bg-amber-500/10 text-amber-400"
      />
      <StatCard
        label="Publicados (Semana)"
        value={publishedThisWeek}
        icon={CheckCircle}
        color="bg-green-500/10 text-green-400"
      />
      <StatCard
        label="Instagram"
        value={stats.byPlatform.instagram || 0}
        icon={InstagramIcon}
        color="bg-pink-500/10 text-pink-400"
      />
      <StatCard
        label="LinkedIn"
        value={stats.byPlatform.linkedin || 0}
        icon={Linkedin}
        color="bg-blue-500/10 text-blue-400"
      />
    </div>
  )
}
