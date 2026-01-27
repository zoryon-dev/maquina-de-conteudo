/**
 * Themes List Component
 *
 * Visualização em lista/tabela dos temas.
 */

"use client"

import { Youtube, Instagram, Sparkles, Calendar, TrendingUp, MoreVertical, Wand2, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Theme, ThemeStatus } from "@/db/schema"

// ============================================================================
// TYPES
// ============================================================================

interface ThemesListProps {
  themes: Theme[]
  onClick: (theme: Theme) => void
  onDelete?: (id: number) => void
  onCreateWizard?: (id: number) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ThemesList({ themes, onClick, onDelete, onCreateWizard }: ThemesListProps) {
  if (themes.length === 0) {
    return null
  }

  const getStatusColors = (status: ThemeStatus) => {
    const colors: Record<ThemeStatus, string> = {
      draft: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      active: "bg-green-500/20 text-green-500 border-green-500/30",
      archived: "bg-white/10 text-white/70 border-white/10",
    }
    return colors[status] || colors.active
  }

  const getStatusLabel = (status: ThemeStatus) => {
    const labels: Record<ThemeStatus, string> = {
      draft: "Rascunho",
      active: "Ativo",
      archived: "Arquivado",
    }
    return labels[status] || "Ativo"
  }

  const getPlatformIcon = (sourceType: string) => {
    if (sourceType === "youtube") {
      return <Youtube className="size-4 text-red-500" />
    }
    if (sourceType === "instagram") {
      return <Instagram className="size-4 text-pink-500" />
    }
    return <Sparkles className="size-4 text-purple-400" />
  }

  const getSourceLabel = (sourceType: string) => {
    if (sourceType === "youtube") return "YouTube"
    if (sourceType === "instagram") return "Instagram"
    if (sourceType === "perplexity") return "Perplexity"
    if (sourceType === "manual") return "Manual"
    return "N/A"
  }

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-white/[0.02] border-b border-white/10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider w-10">
                {/* Icon column */}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                Tema
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                Fonte
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                Data
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider w-10">
                {/* Actions column */}
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-white/10">
            {themes.map((theme) => (
              <tr
                key={theme.id}
                className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                onClick={() => onClick(theme)}
              >
                {/* Icon */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center">
                    {getPlatformIcon(theme.sourceType || "")}
                  </div>
                </td>

                {/* Theme */}
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate group-hover:text-primary transition-colors">
                      {theme.title}
                    </p>
                    <p className="text-sm text-white/60 truncate mt-0.5">
                      {theme.theme}
                    </p>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3">
                  {theme.category ? (
                    <span className="text-sm text-white/80">{theme.category}</span>
                  ) : (
                    <span className="text-sm text-white/40">-</span>
                  )}
                </td>

                {/* Source */}
                <td className="px-4 py-3">
                  <span className="text-sm text-white/70 capitalize">
                    {getSourceLabel(theme.sourceType || "")}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${getStatusColors(theme.status || "active")}`}
                  >
                    {getStatusLabel(theme.status || "active")}
                  </Badge>
                </td>

                {/* Date */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    {theme.engagementScore && (
                      <span className="flex items-center gap-1" title="Engajamento">
                        <TrendingUp className="size-3" />
                        {theme.engagementScore.toFixed(0)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(theme.createdAt!).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onCreateWizard && (
                        <DropdownMenuItem onClick={() => onCreateWizard(theme.id!)}>
                          <Wand2 className="size-4" />
                          Criar no Wizard
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={() => onDelete(theme.id!)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-white/40">
          {themes.length} tema{themes.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}
