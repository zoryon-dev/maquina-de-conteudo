/**
 * Articles List Page — Client Component
 *
 * Lists user articles with filters (status, category), search, sort,
 * status badges, delete with confirmation, and quick status change.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  FileText,
  Search,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trash2,
  ArrowUpDown,
  Tag,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { INPUT_CLASSES } from "./shared/input-classes"
import type { Article, ArticleCategory } from "@/db/schema"

// ─── Step Configs ───────────────────────────────────────

const STEP_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  inputs: { label: "Rascunho", color: "text-white/50", icon: Clock },
  research: { label: "Pesquisa", color: "text-blue-400", icon: Loader2 },
  outline: { label: "Outline", color: "text-blue-400", icon: Loader2 },
  production: { label: "Produção", color: "text-yellow-400", icon: Loader2 },
  assembly: { label: "Montagem", color: "text-yellow-400", icon: Loader2 },
  seo_geo_check: { label: "SEO Check", color: "text-orange-400", icon: Loader2 },
  optimization: { label: "Otimização", color: "text-orange-400", icon: Loader2 },
  metadata: { label: "Metadados", color: "text-purple-400", icon: Loader2 },
  cross_format: { label: "Derivações", color: "text-purple-400", icon: Loader2 },
  completed: { label: "Concluído", color: "text-green-400", icon: CheckCircle2 },
  abandoned: { label: "Abandonado", color: "text-red-400", icon: XCircle },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Rascunho", color: "text-white/60", bg: "bg-white/10" },
  planned: { label: "Planejado", color: "text-blue-400", bg: "bg-blue-400/10" },
  published: { label: "Publicado", color: "text-green-400", bg: "bg-green-400/10" },
}

const SORT_OPTIONS = [
  { value: "createdAt", label: "Data de criação" },
  { value: "updatedAt", label: "Última edição" },
  { value: "title", label: "Título (A-Z)" },
]

// ─── Sub-components ─────────────────────────────────────

function StepBadge({ step }: { step: string }) {
  const config = STEP_LABELS[step] || { label: step, color: "text-white/50", icon: Clock }
  const Icon = config.icon
  const isProcessing = step !== "inputs" && step !== "completed" && step !== "abandoned"

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", config.color)}>
      <Icon size={12} className={isProcessing ? "animate-spin" : ""} />
      {config.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status || "draft"
  const config = STATUS_CONFIG[s] || STATUS_CONFIG.draft
  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", config.bg, config.color)}>
      {config.label}
    </span>
  )
}

function CategoryBadge({ category }: { category: ArticleCategory | null }) {
  if (!category) return null
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${category.color ?? "#a3e635"}15`, color: category.color ?? "#a3e635" }}
    >
      {category.name}
    </span>
  )
}

// ─── Delete Confirmation Dialog ─────────────────────────

function DeleteDialog({
  articleTitle,
  isOpen,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  articleTitle: string
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[#1a1a2e] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
      >
        <h3 className="text-white font-semibold text-lg mb-2">Excluir artigo?</h3>
        <p className="text-white/50 text-sm mb-6">
          O artigo <strong className="text-white/70">&ldquo;{articleTitle}&rdquo;</strong> será
          movido para a lixeira.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
            className="border-white/10 text-white/70 hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {isDeleting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Trash2 size={14} className="mr-1" />}
            Excluir
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────

export function ArticlesListPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<ArticleCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Filters
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState("createdAt")
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Status change
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null)

  const fetchArticles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: "50", sort: sortBy, order: sortBy === "title" ? "asc" : "desc" })
      if (filterStatus) params.set("status", filterStatus)
      if (filterCategory) params.set("categoryId", filterCategory.toString())
      if (searchQuery) params.set("search", searchQuery)

      const response = await fetch(`/api/articles?${params}`)
      if (!response.ok) throw new Error("Failed to fetch articles")
      const data = await response.json()
      setArticles(data.articles)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar artigos")
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, filterCategory, sortBy, searchQuery])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/articles/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories)
      }
    } catch (err) {
      console.warn("[ArticlesList] Failed to load categories:", err)
    }
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/articles/${deleteTarget.id}`, { method: "DELETE" })
      if (res.ok) {
        setArticles((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Falha ao excluir artigo")
      }
    } catch (err) {
      console.error("[ArticlesList] Delete failed:", err)
      setError("Falha ao excluir artigo. Tente novamente.")
    }
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const handleStatusChange = async (article: Article, newStatus: string) => {
    setChangingStatusId(article.id)
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setArticles((prev) =>
          prev.map((a) => (a.id === article.id ? { ...a, status: newStatus as Article["status"] } : a)),
        )
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Falha ao alterar status")
      }
    } catch (err) {
      console.error("[ArticlesList] Status change failed:", err)
      setError("Falha ao alterar status. Tente novamente.")
    }
    setChangingStatusId(null)
  }

  const getCategoryById = (id: number | null) =>
    id ? categories.find((c) => c.id === id) ?? null : null

  const hasActiveFilters = !!filterStatus || !!filterCategory

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Artigos</h1>
          <p className="text-sm text-white/50 mt-1">
            Crie artigos otimizados para SEO com o pipeline de IA
          </p>
        </div>
        <Button
          onClick={() => router.push("/articles/new")}
          className="bg-primary text-black hover:bg-primary/90 font-medium"
        >
          <Plus size={16} className="mr-2" />
          Novo Artigo
        </Button>
      </div>

      {/* Toolbar: Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input
            placeholder="Buscar por título ou keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(INPUT_CLASSES, "pl-10")}
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { value: null, label: "Todos" },
            { value: "draft", label: "Rascunho" },
            { value: "planned", label: "Planejado" },
            { value: "published", label: "Publicado" },
          ].map((opt) => (
            <button
              key={opt.value ?? "all"}
              onClick={() => setFilterStatus(opt.value)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full transition-colors border",
                filterStatus === opt.value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70",
              )}
            >
              {opt.label}
            </button>
          ))}

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <Tag size={12} className="text-white/30" />
              <select
                value={filterCategory ?? ""}
                onChange={(e) => setFilterCategory(e.target.value ? parseInt(e.target.value) : null)}
                className="text-xs bg-transparent border border-white/10 text-white/60 rounded-lg px-2 py-1.5 focus:border-primary/50 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#1a1a2e]">Todas categorias</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#1a1a2e]">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 px-2 py-1.5 border border-white/10 rounded-lg transition-colors"
            >
              <ArrowUpDown size={12} />
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a2e] border border-white/10 rounded-lg py-1 min-w-[160px] shadow-xl">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setShowSortMenu(false) }}
                      className={cn(
                        "w-full text-left text-xs px-3 py-2 hover:bg-white/5 transition-colors",
                        sortBy === opt.value ? "text-primary" : "text-white/60",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={() => { setFilterStatus(null); setFilterCategory(null) }}
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Limpar filtros
        </button>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-white/70">{error}</p>
          <Button variant="outline" onClick={fetchArticles} className="border-white/10 text-white hover:bg-white/5">
            Tentar novamente
          </Button>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <FileText size={48} className="text-white/20" />
          <div className="text-center">
            <p className="text-white/70 text-lg font-medium">
              {hasActiveFilters || searchQuery ? "Nenhum artigo encontrado" : "Nenhum artigo criado"}
            </p>
            <p className="text-white/40 text-sm mt-1">
              {hasActiveFilters || searchQuery
                ? "Tente ajustar os filtros ou busca"
                : "Crie seu primeiro artigo otimizado para SEO"}
            </p>
          </div>
          {!hasActiveFilters && !searchQuery && (
            <Button onClick={() => router.push("/articles/new")} className="mt-2 bg-primary text-black hover:bg-primary/90">
              <Plus size={16} className="mr-2" />
              Criar Artigo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {articles.map((article) => {
              const category = getCategoryById(article.categoryId)

              return (
                <motion.div
                  key={article.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-all duration-200 group">
                    {/* Click area */}
                    <button
                      onClick={() => router.push(`/articles/${article.id}`)}
                      className="w-full text-left p-5 pb-3"
                    >
                      {/* Top row: step badge + SEO score */}
                      <div className="flex items-center justify-between mb-3">
                        <StepBadge step={article.currentStep} />
                        <div className="flex items-center gap-2">
                          {article.seoScore != null && (
                            <span className="text-xs font-mono text-primary">SEO {article.seoScore}</span>
                          )}
                        </div>
                      </div>

                      {/* Title / Keyword */}
                      <h3 className="text-white font-medium text-sm line-clamp-2 mb-2">
                        {article.title || article.primaryKeyword || "Sem título"}
                      </h3>

                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <StatusBadge status={article.status} />
                        <CategoryBadge category={category} />
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>{article.articleType || "guia"}</span>
                        {article.targetWordCount && (
                          <span>{article.targetWordCount}w</span>
                        )}
                        <span className="ml-auto">
                          {new Date(article.updatedAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </button>

                    {/* Actions row */}
                    <div className="flex items-center border-t border-white/5 px-3 py-2">
                      {/* Quick status */}
                      <select
                        value={article.status || "draft"}
                        onChange={(e) => handleStatusChange(article, e.target.value)}
                        disabled={changingStatusId === article.id}
                        className="text-[10px] bg-transparent border-none text-white/40 hover:text-white/60 focus:outline-none cursor-pointer appearance-none pr-4"
                        title="Mudar status"
                      >
                        <option value="draft" className="bg-[#1a1a2e]">Rascunho</option>
                        <option value="planned" className="bg-[#1a1a2e]">Planejado</option>
                        <option value="published" className="bg-[#1a1a2e]">Publicado</option>
                      </select>

                      <div className="flex items-center gap-1 ml-auto">
                        {article.currentStep === "completed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/articles/${article.id}`) }}
                            className="p-1.5 text-white/30 hover:text-primary transition-colors rounded-md hover:bg-white/5"
                            title="Editar artigo"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(article) }}
                          className="p-1.5 text-white/30 hover:text-red-400 transition-colors rounded-md hover:bg-white/5"
                          title="Excluir artigo"
                        >
                          <Trash2 size={12} />
                        </button>
                        <ArrowRight
                          size={14}
                          className="ml-1 text-white/20 group-hover:text-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        articleTitle={deleteTarget?.title || deleteTarget?.primaryKeyword || "Sem título"}
        isOpen={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  )
}
