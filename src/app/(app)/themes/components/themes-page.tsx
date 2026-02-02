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
  ExternalLink,
  Edit,
  Archive,
  CheckCircle,
  FileText,
  Tag,
  User,
  Folder,
  List,
  Grid as GridIcon,
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Pagination } from "@/components/ui/pagination"
import { ThemesList } from "./themes-list"
import type { Theme, ThemeStatus, ThemeSourceType } from "@/db/schema"

// ============================================================================
// TYPES
// ============================================================================

interface FilterOptions {
  status?: ThemeStatus
  search?: string
}

type ViewMode = "grid" | "list"

interface PaginatedThemesResponse {
  items: Theme[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================================
// FILTER BAR COMPONENT
// ============================================================================

interface FilterBarProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  resultCount: number
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

function FilterBar({ filters, onFiltersChange, resultCount, viewMode, onViewModeChange }: FilterBarProps) {
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
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
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

      {/* View mode toggle */}
      <div className="flex items-center border border-white/10 rounded-md">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`px-2 py-1.5 transition-colors ${
            viewMode === "grid"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white hover:bg-white/5"
          }`}
          title="Visualização em grade"
        >
          <GridIcon className="size-4" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`px-2 py-1.5 transition-colors ${
            viewMode === "list"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white hover:bg-white/5"
          }`}
          title="Visualização em lista"
        >
          <List className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// THEME CARD COMPONENT
// ============================================================================

interface ThemeCardProps {
  theme: Theme
  onClick: (theme: Theme) => void
  onDelete?: (id: number) => void
  onCreateWizard?: (id: number) => void
}

function ThemeCard({ theme, onClick, onDelete, onCreateWizard }: ThemeCardProps) {
  const platformIcon =
    theme.sourceType === "youtube" ? (
      <Youtube className="size-4 text-red-500" />
    ) : theme.sourceType === "instagram" ? (
      <Instagram className="size-4 text-pink-500" />
    ) : (
      <Sparkles className="size-4 text-purple-400" />
    )

  const statusColors: Record<ThemeStatus, string> = {
    draft: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    active: "bg-green-500/20 text-green-500 border-green-500/30",
    archived: "bg-white/10 text-white/70 border-white/10",
  }

  return (
    <Card
      className="group overflow-hidden border-white/10 bg-white/[0.02] backdrop-blur-xl transition-all hover:border-primary/50 text-white cursor-pointer"
      onClick={() => onClick(theme)}
    >
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
            <h3 className="mt-2 truncate font-semibold text-white group-hover:!text-primary transition-colors">
              {theme.title}
            </h3>
            <p className="mt-1 text-sm text-white/90">{theme.theme}</p>
          </div>

          {/* Actions Menu */}
          <div onClick={(e) => e.stopPropagation()}>
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
          </div>
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

interface EmptyStateProps {
  onCreateManual: () => void
  onDiscover: () => void
}

function EmptyState({ onCreateManual, onDiscover }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
        <Sparkles className="size-8 text-primary" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-white">
        Nenhum tema salvo
      </h2>
      <p className="mt-2 text-white/90">
        Adicione temas manualmente ou descubra trending topics.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onCreateManual} className="gap-2">
          <Plus className="size-4" />
          Adicionar Manual
        </Button>
        <Button variant="outline" onClick={onDiscover} className="gap-2">
          <TrendingUp className="size-4" />
          Descobrir Novos
        </Button>
      </div>
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
// CREATE THEME DIALOG
// ============================================================================

interface CreateThemeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface CreateThemeForm {
  title: string
  theme: string
  context: string
  targetAudience: string
  category: string
  briefing: string
  keyPoints: string
  angles: string
  sourceUrl: string
  tags: string
  status: ThemeStatus
}

function CreateThemeDialog({ open, onOpenChange, onSuccess }: CreateThemeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState<CreateThemeForm>({
    title: "",
    theme: "",
    context: "",
    targetAudience: "",
    category: "",
    briefing: "",
    keyPoints: "",
    angles: "",
    sourceUrl: "",
    tags: "",
    status: "active",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!form.title.trim() || !form.theme.trim()) {
      toast.error("Título e tema são obrigatórios")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          theme: form.theme.trim(),
          context: form.context.trim() || undefined,
          targetAudience: form.targetAudience.trim() || undefined,
          category: form.category.trim() || undefined,
          briefing: form.briefing.trim() || undefined,
          keyPoints: form.keyPoints
            ? form.keyPoints.split("\n").map((p) => p.trim()).filter(Boolean)
            : [],
          angles: form.angles
            ? form.angles.split("\n").map((p) => p.trim()).filter(Boolean)
            : [],
          sourceType: "manual" as ThemeSourceType,
          sourceUrl: form.sourceUrl.trim() || undefined,
          tags: form.tags
            ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
          status: form.status,
        }),
      })

      if (!response.ok) throw new Error("Failed to create theme")

      toast.success("Tema criado com sucesso!")
      onOpenChange(false)
      onSuccess()

      // Reset form
      setForm({
        title: "",
        theme: "",
        context: "",
        targetAudience: "",
        category: "",
        briefing: "",
        keyPoints: "",
        angles: "",
        sourceUrl: "",
        tags: "",
        status: "active",
      })
    } catch (error) {
      toast.error("Erro ao criar tema")
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = (field: keyof CreateThemeForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0f0f1a] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Adicionar Tema Manual</DialogTitle>
          <DialogDescription className="text-white/90">
            Crie um novo tema manualmente com o mesmo padrão dos temas descobertos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/90">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Ex: Marketing Digital para 2025"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              required
            />
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label htmlFor="theme" className="text-white/90">
              Tema <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="theme"
              placeholder="Descreva o tema principal..."
              value={form.theme}
              onChange={(e) => updateField("theme", e.target.value)}
              required
              rows={2}
            />
          </div>

          {/* Context */}
          <div className="space-y-2">
            <Label htmlFor="context" className="text-white/90">
              Contexto
            </Label>
            <Textarea
              id="context"
              placeholder="Contexto adicional sobre o tema..."
              value={form.context}
              onChange={(e) => updateField("context", e.target.value)}
              rows={2}
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="text-white/90">
              Público-Alvo
            </Label>
            <Input
              id="targetAudience"
              placeholder="Ex: Jovens adultos interessados em marketing"
              value={form.targetAudience}
              onChange={(e) => updateField("targetAudience", e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-white/90">
              Categoria
            </Label>
            <Input
              id="category"
              placeholder="Ex: Marketing, Tecnologia, Lifestyle..."
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
            />
          </div>

          {/* Briefing */}
          <div className="space-y-2">
            <Label htmlFor="briefing" className="text-white/90">
              Briefing
            </Label>
            <Textarea
              id="briefing"
              placeholder="Descrição detalhada do tema para orientar a criação de conteúdo..."
              value={form.briefing}
              onChange={(e) => updateField("briefing", e.target.value)}
              rows={3}
            />
          </div>

          {/* Key Points */}
          <div className="space-y-2">
            <Label htmlFor="keyPoints" className="text-white/90">
              Pontos Chave (um por linha)
            </Label>
            <Textarea
              id="keyPoints"
              placeholder="Ponto 1&#10;Ponto 2&#10;Ponto 3"
              value={form.keyPoints}
              onChange={(e) => updateField("keyPoints", e.target.value)}
              rows={3}
            />
          </div>

          {/* Angles */}
          <div className="space-y-2">
            <Label htmlFor="angles" className="text-white/90">
              Ângulos (um por linha)
            </Label>
            <Textarea
              id="angles"
              placeholder="Ângulo 1&#10;Ângulo 2&#10;Ângulo 3"
              value={form.angles}
              onChange={(e) => updateField("angles", e.target.value)}
              rows={3}
            />
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <Label htmlFor="sourceUrl" className="text-white/90">
              URL de Origem
            </Label>
            <Input
              id="sourceUrl"
              type="url"
              placeholder="https://..."
              value={form.sourceUrl}
              onChange={(e) => updateField("sourceUrl", e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-white/90">
              Tags (separadas por vírgula)
            </Label>
            <Input
              id="tags"
              placeholder="tag1, tag2, tag3"
              value={form.tags}
              onChange={(e) => updateField("tags", e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-white/90">
              Status
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {form.status === "active" && "Ativo"}
                  {form.status === "draft" && "Rascunho"}
                  {form.status === "archived" && "Arquivado"}
                  <Filter className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => updateField("status", "active")}>
                  Ativo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateField("status", "draft")}>
                  Rascunho
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateField("status", "archived")}>
                  Arquivado
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Criar Tema
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// THEME DETAIL DIALOG
// ============================================================================

interface ThemeDetailDialogProps {
  theme: Theme | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
  onDelete: (id: number) => void
  onCreateWizard: (id: number) => void
}

function ThemeDetailDialog({
  theme,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onCreateWizard,
}: ThemeDetailDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleStatusChange = async (newStatus: ThemeStatus) => {
    if (!theme) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/themes/${theme.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error("Failed to update status")

      toast.success(`Status alterado para ${newStatus === "active" ? "ativo" : newStatus === "draft" ? "rascunho" : "arquivado"}!`)
      onUpdate()
      onOpenChange(false)
    } catch (error) {
      toast.error("Erro ao alterar status")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = () => {
    if (!theme) return
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (!theme) return
    onDelete(theme.id!)
    setShowDeleteConfirm(false)
    onOpenChange(false)
  }

  const handleCreateWizard = () => {
    if (!theme) return
    onCreateWizard(theme.id!)
  }

  if (!theme) return null

  const platformIcon =
    theme.sourceType === "youtube" ? (
      <Youtube className="size-5 text-red-500" />
    ) : theme.sourceType === "instagram" ? (
      <Instagram className="size-5 text-pink-500" />
    ) : (
      <Sparkles className="size-5 text-purple-400" />
    )

  const statusColors: Record<ThemeStatus, string> = {
    draft: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    active: "bg-green-500/20 text-green-500 border-green-500/30",
    archived: "bg-white/10 text-white/70 border-white/10",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto border-white/10 bg-[#0f0f1a] max-w-2xl w-full">
        {/* Header */}
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {platformIcon}
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-white text-xl truncate">
                  {theme.title}
                </DialogTitle>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize shrink-0 ${statusColors[theme.status || "active"]}`}
                  >
                    {theme.status === "active" && "Ativo"}
                    {theme.status === "draft" && "Rascunho"}
                    {theme.status === "archived" && "Arquivado"}
                  </Badge>
                  {theme.category && (
                    <Badge variant="outline" className="text-xs text-white/70 border-white/10 shrink-0">
                      <Folder className="size-3 mr-1" />
                      {theme.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-6 py-4 overflow-x-hidden">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-white/90 flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4" />
                Informações Básicas
              </Label>
              
              <div className="space-y-3 pl-6">
                {/* Theme Description */}
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Tema</Label>
                  <p className="text-white/90 text-sm leading-relaxed">{theme.theme}</p>
                </div>

                {/* Target Audience */}
                {theme.targetAudience && (
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs flex items-center gap-1.5">
                      <User className="size-3" />
                      Público-Alvo
                    </Label>
                    <p className="text-white/90 text-sm leading-relaxed">{theme.targetAudience}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Context */}
            {theme.context && (
              <div className="space-y-2 rounded-lg bg-white/5 border border-white/10 p-4">
                <Label className="text-white/90 flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-4" />
                  Contexto
                </Label>
                <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {theme.context.replace(/\*\*/g, '').replace(/###/g, '').trim()}
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* Conteúdo Criativo */}
          {(theme.briefing || theme.keyPoints?.length || theme.angles?.length) && (
            <div className="space-y-4">
              <Label className="text-white/90 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4" />
                Conteúdo Criativo
              </Label>

              <div className="space-y-4 pl-6">
                {/* Briefing */}
                {theme.briefing && (
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs flex items-center gap-1.5">
                      <Edit className="size-3" />
                      Briefing
                    </Label>
                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {theme.briefing}
                    </p>
                  </div>
                )}

                {/* Key Points */}
                {theme.keyPoints && theme.keyPoints.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs flex items-center gap-1.5">
                      <CheckCircle className="size-3" />
                      Pontos Chave
                    </Label>
                    <ul className="space-y-2">
                      {theme.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-white/80 text-sm">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Angles */}
                {theme.angles && theme.angles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs flex items-center gap-1.5">
                      <Sparkles className="size-3" />
                      Ângulos Sugeridos
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {theme.angles.map((angle, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-white/80 border-white/20 bg-white/5 text-xs"
                        >
                          {angle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {theme.tags && theme.tags.length > 0 && (
            <>
              <Separator className="bg-white/10" />
              <div className="space-y-2">
                <Label className="text-white/90 flex items-center gap-2 text-sm font-semibold">
                  <Tag className="size-4" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2 pl-6">
                  {theme.tags.map((tag, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-white/80 border-white/20 bg-white/5 text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator className="bg-white/10" />

          {/* Metadata e Links */}
          <div className="space-y-4">
            <Label className="text-white/90 flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4" />
              Informações Técnicas
            </Label>

            <div className="grid grid-cols-2 gap-4 text-sm pl-6">
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Fonte</Label>
                <p className="text-white/80 capitalize">
                  {theme.sourceType === "youtube" && "YouTube"}
                  {theme.sourceType === "instagram" && "Instagram"}
                  {theme.sourceType === "perplexity" && "Perplexity"}
                  {theme.sourceType === "manual" && "Manual"}
                  {!theme.sourceType && "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Criado em</Label>
                <p className="text-white/80">
                  {new Date(theme.createdAt!).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {theme.engagementScore && (
                <div className="space-y-1">
                  <Label className="text-white/60 text-xs">Engajamento</Label>
                  <p className="text-white/80 flex items-center gap-1">
                    <TrendingUp className="size-3" />
                    {theme.engagementScore.toFixed(0)} pts
                  </p>
                </div>
              )}
              {theme.trendingAt && (
                <div className="space-y-1">
                  <Label className="text-white/60 text-xs">Trending em</Label>
                  <p className="text-white/80">
                    {new Date(theme.trendingAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </div>

            {/* Source URL */}
            {theme.sourceUrl && (
              <div className="space-y-2 pl-6">
                <Label className="text-white/70 text-xs flex items-center gap-1.5">
                  <ExternalLink className="size-3" />
                  URL de Origem
                </Label>
                <a
                  href={theme.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-primary hover:underline break-all"
                >
                  {theme.sourceUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="flex-col sm:flex-row gap-2 flex-wrap border-t border-white/10 pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" 
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Edit className="size-4" />
                )}
                <span className="hidden sm:inline">Mudar Status</span>
                <span className="sm:hidden">Status</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleStatusChange("active")}
                disabled={theme.status === "active"}
              >
                <CheckCircle className="size-4 mr-2" />
                Ativo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange("draft")}
                disabled={theme.status === "draft"}
              >
                <Edit className="size-4 mr-2" />
                Rascunho
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange("archived")}
                disabled={theme.status === "archived"}
              >
                <Archive className="size-4 mr-2" />
                Arquivado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleCreateWizard} className="gap-2 shrink-0 bg-primary text-black hover:bg-primary/90">
            <Wand2 className="size-4" />
            <span className="hidden sm:inline">Criar no Wizard</span>
            <span className="sm:hidden">Wizard</span>
          </Button>

          <Button
            variant="destructive"
            onClick={handleDelete}
            className="gap-2 shrink-0"
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Excluir</span>
            <span className="sm:hidden hidden">Excluir</span>
          </Button>
        </DialogFooter>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 rounded-lg p-4">
            <div className="bg-[#0f0f1a] border border-white/10 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-white mb-2">
                Excluir tema?
              </h3>
              <p className="text-white/70 text-sm mb-4">
                Esta ação não pode ser desfeita. O tema será removido permanentemente.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  className="flex-1"
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        )}
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(12)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  // Fetch themes
  const fetchThemes = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.search) params.append("search", filters.search)
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      const response = await fetch(`/api/themes?${params}`)
      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()

      // Check if response is paginated or array
      if ("items" in data) {
        const paginatedData = data as PaginatedThemesResponse
        setThemes(paginatedData.items)
        setTotal(paginatedData.total)
        setTotalPages(paginatedData.totalPages)
      } else {
        // Backward compatibility
        setThemes(data as Theme[])
        setTotal((data as Theme[]).length)
        setTotalPages(1)
      }
    } catch (error) {
      toast.error("Erro ao carregar temas")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchThemes()
  }, [filters.status, filters.search, page, limit])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [filters.status, filters.search])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

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

      router.push(`/wizard?wizardId=${data.wizardId}`)
    } catch (error) {
      toast.error("Erro ao criar Wizard")
    }
  }

  const openDeleteDialog = (id: number) => {
    setDeleteId(id)
    setDeleteDialogOpen(true)
  }

  const handleThemeClick = (theme: Theme) => {
    setSelectedTheme(theme)
    setDetailDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Temas</h1>
          <p className="mt-1 text-white/90">
            Biblioteca de temas salvos e manuais
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Adicionar Tema
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
              <Sparkles className="size-4" />
              Adicionar Manual
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/discover")}>
              <TrendingUp className="size-4" />
              Descobrir Novos
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={total}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-8" />
        </div>
      ) : themes.length === 0 ? (
        <EmptyState
          onCreateManual={() => setCreateDialogOpen(true)}
          onDiscover={() => router.push("/discover")}
        />
      ) : (
        <>
          {/* Grid or List view */}
          {viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {themes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  onClick={handleThemeClick}
                  onDelete={openDeleteDialog}
                  onCreateWizard={handleCreateWizard}
                />
              ))}
            </div>
          ) : (
            <ThemesList
              themes={themes}
              onClick={handleThemeClick}
              onDelete={openDeleteDialog}
              onCreateWizard={handleCreateWizard}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                isLoading={isLoading}
              />
            </div>
          )}
        </>
      )}

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />

      {/* Create Theme Dialog */}
      <CreateThemeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchThemes}
      />

      {/* Theme Detail Dialog */}
      <ThemeDetailDialog
        theme={selectedTheme}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onUpdate={fetchThemes}
        onDelete={openDeleteDialog}
        onCreateWizard={handleCreateWizard}
      />
    </div>
  )
}
