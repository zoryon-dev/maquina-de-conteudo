/**
 * Themes Page Component
 *
 * Client Component for the themes library.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  Filter,
  Trash2,
  Wand2,
  MoreVertical,
  Loader2,
  Sparkles,
  Calendar,
  TrendingUp,
  Youtube,
  Instagram,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Theme, ThemeStatus } from "@/db/schema"

// ============================================================================
// TYPES
// ============================================================================

interface FilterOptions {
  status?: ThemeStatus
  search?: string
}

// ============================================================================
// FILTER BAR COMPONENT
// ============================================================================

interface FilterBarProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  resultCount: number
}

function FilterBar({ filters, onFiltersChange, resultCount }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Buscar temas..."
          value={filters.search || ""}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-10"
        />
      </div>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="size-4" />
            {filters.status === "active" && "Ativos"}
            {filters.status === "draft" && "Rascunhos"}
            {filters.status === "archived" && "Arquivados"}
            {!filters.status && "Todos"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, status: undefined })}>
            Todos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, status: "active" })}>
            Ativos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, status: "draft" })}>
            Rascunhos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, status: "archived" })}>
            Arquivados
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Result count */}
      <span className="text-sm text-white/70">
        {resultCount} tema{resultCount !== 1 ? "s" : ""}
      </span>
    </div>
  )
}

// ============================================================================
// THEME CARD COMPONENT
// ============================================================================

interface ThemeCardProps {
  theme: Theme
  onDelete: (id: number) => void
  onCreateWizard: (id: number) => void
}

function ThemeCard({ theme, onDelete, onCreateWizard }: ThemeCardProps) {
  const platformIcon =
    theme.sourceType === "youtube" ? (
      <Youtube className="size-4" />
    ) : theme.sourceType === "instagram" ? (
      <Instagram className="size-4" />
    ) : (
      <Sparkles className="size-4" />
    )

  const statusColors: Record<ThemeStatus, string> = {
    draft: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    active: "bg-green-500/20 text-green-500 border-green-500/30",
    archived: "bg-white/10 text-white/70 border-white/10",
  }

  return (
    <Card className="group overflow-hidden border-white/10 bg-white/[0.02] backdrop-blur-xl transition-all hover:border-primary/50">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {platformIcon}
              <Badge
                variant="outline"
                className={`text-xs capitalize ${statusColors[theme.status || "active"]}`}
              >
                {theme.status || "ativo"}
              </Badge>
            </div>
            <h3 className="mt-2 truncate font-semibold text-white group-hover:text-primary transition-colors">
              {theme.title}
            </h3>
            <p className="mt-1 text-sm text-white/90">{theme.theme}</p>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateWizard(theme.id!)}>
                <Wand2 className="size-4" />
                Criar no Wizard
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(theme.id!)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Briefing */}
        {theme.briefing && (
          <p className="mt-3 line-clamp-2 text-sm text-white/70">{theme.briefing}</p>
        )}

        {/* Key Points */}
        {theme.keyPoints && theme.keyPoints.length > 0 && (
          <ul className="mt-3 space-y-1">
            {theme.keyPoints.slice(0, 2).map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/90">
                <span className="mt-1 size-0.5 shrink-0 rounded-full bg-primary/70" />
                <span className="line-clamp-1">{point}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/40">
          <div className="flex items-center gap-3">
            {theme.engagementScore && (
              <span className="flex items-center gap-1">
                <TrendingUp className="size-3" />
                {theme.engagementScore.toFixed(0)}
              </span>
            )}
            {theme.trendingAt && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {new Date(theme.trendingAt).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
          <span>{new Date(theme.createdAt!).toLocaleDateString("pt-BR")}</span>
        </div>
      </div>
    </Card>
  )
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
        <Sparkles className="size-8 text-primary" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-white">
        Nenhum tema salvo
      </h2>
      <p className="mt-2 text-white/90">
        Use a página de Discovery para encontrar e salvar temas.
      </p>
      <Button
        onClick={() => (window.location.href = "/discover")}
        className="mt-6"
      >
        Ir para Discovery
      </Button>
    </div>
  )
}

// ============================================================================
// DELETE CONFIRMATION DIALOG
// ============================================================================

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

function DeleteConfirmDialog({ open, onOpenChange, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0f0f1a]">
        <DialogHeader>
          <DialogTitle className="text-white">Excluir tema?</DialogTitle>
          <DialogDescription className="text-white/90">
            Esta ação não pode ser desfeita. O tema será removido permanentemente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export function ThemesPage() {
  const router = useRouter()
  const [themes, setThemes] = useState<Theme[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<FilterOptions>({})
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Fetch themes
  const fetchThemes = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.search) params.append("search", filters.search)

      const response = await fetch(`/api/themes?${params}`)
      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      setThemes(data)
    } catch (error) {
      console.error("Fetch error:", error)
      toast.error("Erro ao carregar temas")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchThemes()
  }, [filters.status, filters.search])

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/themes/${deleteId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete")

      toast.success("Tema excluído!")
      setDeleteDialogOpen(false)
      fetchThemes()
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Erro ao excluir tema")
    }
  }

  // Handle create wizard
  const handleCreateWizard = async (id: number) => {
    try {
      const response = await fetch(`/api/themes/${id}/wizard`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to create wizard")

      const data = await response.json()
      toast.success("Wizard criado!")

      router.push(`/wizard?edit=${data.wizardId}`)
    } catch (error) {
      console.error("Wizard error:", error)
      toast.error("Erro ao criar Wizard")
    }
  }

  const openDeleteDialog = (id: number) => {
    setDeleteId(id)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Temas</h1>
          <p className="mt-1 text-white/90">
            Biblioteca de temas descobertos
          </p>
        </div>
        <Button onClick={() => router.push("/discover")} className="gap-2">
          <Plus className="size-4" />
          Descobrir Novos
        </Button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={themes.length}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-8" />
        </div>
      ) : themes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              onDelete={openDeleteDialog}
              onCreateWizard={handleCreateWizard}
            />
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  )
}
