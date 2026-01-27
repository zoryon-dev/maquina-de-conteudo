/**
 * Quick Actions
 *
 * Grid de atalhos rápidos para as principais ações do estúdio de conteúdo.
 */

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Plus,
  Sparkles,
  Calendar,
  BookOpen,
  ChevronRight,
  Film,
} from "lucide-react"

interface QuickAction {
  label: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Novo Vídeo",
    description: "Criar roteiro e thumbnail",
    href: "/wizard?type=video",
    icon: Film,
    color: "bg-red-500/10 text-red-400",
  },
  {
    label: "Novo Post",
    description: "Criar conteúdo com IA",
    href: "/wizard",
    icon: Plus,
    color: "bg-primary/10 text-primary",
  },
  {
    label: "Chat IA",
    description: "Conversar com assistente",
    href: "/chat",
    icon: Sparkles,
    color: "bg-purple-500/10 text-purple-400",
  },
  {
    label: "Calendário",
    description: "Ver agenda",
    href: "/calendar",
    icon: Calendar,
    color: "bg-amber-500/10 text-amber-400",
  },
  {
    label: "Biblioteca",
    description: "Meus conteúdos",
    href: "/library",
    icon: BookOpen,
    color: "bg-blue-500/10 text-blue-400",
  },
]

interface QuickActionCardProps {
  action: QuickAction
}

function QuickActionCard({ action }: QuickActionCardProps) {
  const Icon = action.icon

  return (
    <Link
      href={action.href}
      className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20 transition-all h-full"
    >
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          action.color
        )}
      >
        <Icon className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white transition-colors">
          {action.label}
        </p>
        <p className="text-xs text-white/50">{action.description}</p>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
    </Link>
  )
}

interface QuickActionsProps {
  className?: string
}

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Ações Rápidas</h3>
        <span className="text-xs text-white/40">
          Acesso rápido
        </span>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <QuickActionCard key={action.href} action={action} />
        ))}
      </div>
    </div>
  )
}
