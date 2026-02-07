/**
 * Articles List Page — Client Component
 *
 * Lists user articles with filters, search, and status badges.
 * Follows the Library page pattern.
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Article } from "@/db/schema"

const STEP_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  inputs: { label: "Rascunho", color: "text-white/50", icon: Clock },
  research: { label: "Pesquisa", color: "text-blue-400", icon: Loader2 },
  outline: { label: "Outline", color: "text-blue-400", icon: Loader2 },
  production: { label: "Produção", color: "text-yellow-400", icon: Loader2 },
  assembly: { label: "Montagem", color: "text-yellow-400", icon: Loader2 },
  seo_geo_check: { label: "SEO Check", color: "text-orange-400", icon: Loader2 },
  optimization: { label: "Otimização", color: "text-orange-400", icon: Loader2 },
  metadata: { label: "Metadados", color: "text-purple-400", icon: Loader2 },
  completed: { label: "Concluído", color: "text-green-400", icon: CheckCircle2 },
  abandoned: { label: "Abandonado", color: "text-red-400", icon: XCircle },
}

function StepBadge({ step }: { step: string }) {
  const config = STEP_LABELS[step] || { label: step, color: "text-white/50", icon: Clock }
  const Icon = config.icon

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", config.color)}>
      <Icon size={12} className={step !== "inputs" && step !== "completed" && step !== "abandoned" ? "animate-spin" : ""} />
      {config.label}
    </span>
  )
}

export function ArticlesListPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchArticles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/articles?limit=50")
      if (!response.ok) throw new Error("Failed to fetch articles")
      const data = await response.json()
      setArticles(data.articles)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar artigos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  const filteredArticles = articles.filter((a) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      a.title?.toLowerCase().includes(q) ||
      a.primaryKeyword?.toLowerCase().includes(q)
    )
  })

  const handleNewArticle = () => {
    router.push("/articles/new")
  }

  const handleOpenArticle = (id: number) => {
    router.push(`/articles/${id}`)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Artigos</h1>
          <p className="text-sm text-white/50 mt-1">
            Crie artigos otimizados para SEO com o pipeline de IA
          </p>
        </div>
        <Button
          onClick={handleNewArticle}
          className="bg-primary text-black hover:bg-primary/90 font-medium"
        >
          <Plus size={16} className="mr-2" />
          Novo Artigo
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Buscar por título ou keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse"
            />
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
      ) : filteredArticles.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <FileText size={48} className="text-white/20" />
          <div className="text-center">
            <p className="text-white/70 text-lg font-medium">
              {searchQuery ? "Nenhum artigo encontrado" : "Nenhum artigo criado"}
            </p>
            <p className="text-white/40 text-sm mt-1">
              {searchQuery
                ? "Tente buscar por outro termo"
                : "Crie seu primeiro artigo otimizado para SEO"}
            </p>
          </div>
          {!searchQuery && (
            <Button
              onClick={handleNewArticle}
              className="mt-2 bg-primary text-black hover:bg-primary/90"
            >
              <Plus size={16} className="mr-2" />
              Criar Artigo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredArticles.map((article) => (
              <motion.div
                key={article.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => handleOpenArticle(article.id)}
                  className="w-full text-left group"
                >
                  <div className="relative rounded-xl border border-white/5 bg-white/[0.02] p-5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-200">
                    {/* Step badge */}
                    <div className="flex items-center justify-between mb-3">
                      <StepBadge step={article.currentStep} />
                      {article.seoScore != null && (
                        <span className="text-xs font-mono text-primary">
                          SEO {article.seoScore}
                        </span>
                      )}
                    </div>

                    {/* Title / Keyword */}
                    <h3 className="text-white font-medium text-sm line-clamp-2 mb-1">
                      {article.title || article.primaryKeyword || "Sem título"}
                    </h3>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-white/40 mt-3">
                      <span>{article.articleType || "guia"}</span>
                      {article.targetWordCount && (
                        <span>{article.targetWordCount} palavras</span>
                      )}
                    </div>

                    {/* Arrow */}
                    <ArrowRight
                      size={16}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors"
                    />
                  </div>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
