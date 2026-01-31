/**
 * Statistics Tab
 *
 * Visualização de estatísticas e métricas sobre documentos e embeddings.
 */

"use client"

import * as React from "react"
import {
  BarChart3,
  FileText,
  Sparkles,
  Folder,
  Database,
  TrendingUp,
  PieChart,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Type definition (client-safe)
export interface DocumentStats {
  totalDocuments: number
  embeddedDocuments: number
  totalChunks: number
  categories: CategoryCount[]
}

export interface CategoryCount {
  category: string | null
  count: number
}

/**
 * Stat Card Component
 */
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
      <p className="text-xs text-white/50 mb-2">{label}</p>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs",
          trend.positive ? "text-green-400" : "text-red-400"
        )}>
          <TrendingUp className="h-3 w-3" />
          {trend.value}
        </div>
      )}
    </div>
  )
}

/**
 * Category Bar Component
 */
interface CategoryBarProps {
  category: string
  count: number
  total: number
  color: string
}

function CategoryBar({ category, count, total, color }: CategoryBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  const categoryLabels: Record<string, string> = {
    general: "Geral",
    products: "Catálogo",
    offers: "Ofertas",
    brand: "Marca",
    audience: "Público",
    competitors: "Concorrentes",
    content: "Conteúdo",
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70">{categoryLabels[category] || category}</span>
        <span className="text-white/50">{count} docs</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Main Stats Tab Component
 */
export function StatsTab() {
  const [stats, setStats] = React.useState<DocumentStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/sources/stats")
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        // Silent fail - stats fetch error
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-white/40 text-sm">
          <Sparkles className="h-4 w-4 animate-spin" />
          Carregando estatísticas...
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-white/40 text-sm">Não foi possível carregar as estatísticas.</p>
      </div>
    )
  }

  // Calculate percentages
  const indexedPercentage = stats.totalDocuments > 0
    ? Math.round((stats.embeddedDocuments / stats.totalDocuments) * 100)
    : 0

  const avgChunksPerDoc = stats.embeddedDocuments > 0
    ? (stats.totalChunks / stats.embeddedDocuments).toFixed(1)
    : "0"

  // Sort categories by count
  const sortedCategories = [...stats.categories].sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total de Documentos"
          value={stats.totalDocuments}
          icon={FileText}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label="Documentos Indexados"
          value={stats.embeddedDocuments}
          icon={Sparkles}
          color="bg-cyan-500/10 text-cyan-400"
          trend={{ value: `${indexedPercentage}% do total`, positive: true }}
        />
        <StatCard
          label="Chunks de Embeddings"
          value={stats.totalChunks}
          icon={Database}
          color="bg-purple-500/10 text-purple-400"
        />
        <StatCard
          label="Média Chunks/Doc"
          value={avgChunksPerDoc}
          icon={BarChart3}
          color="bg-green-500/10 text-green-400"
        />
      </div>

      {/* Categories Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Categories Breakdown */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
          <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-4">
            <Folder className="h-4 w-4 text-purple-400" />
            Distribuição por Categoria
          </h3>

          {sortedCategories.length > 0 ? (
            <div className="space-y-4">
              {sortedCategories.map((cat) => (
                <CategoryBar
                  key={cat.category || "null"}
                  category={cat.category || "general"}
                  count={cat.count}
                  total={stats.totalDocuments}
                  color="bg-primary"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Folder className="h-10 w-10 mx-auto text-white/10 mb-2" />
              <p className="text-sm text-white/40">Sem categorias</p>
            </div>
          )}
        </div>

        {/* Indexing Status */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
          <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-4">
            <PieChart className="h-4 w-4 text-amber-400" />
            Status de Indexação
          </h3>

          <div className="space-y-4">
            {/* Indexed */}
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Indexados</span>
                <span className="text-lg font-semibold text-green-400">
                  {stats.embeddedDocuments}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${indexedPercentage}%` }}
                />
              </div>
            </div>

            {/* Pending */}
            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Pendentes</span>
                <span className="text-lg font-semibold text-amber-400">
                  {stats.totalDocuments - stats.embeddedDocuments}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${100 - indexedPercentage}%` }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
              <p className="text-xs text-white/60">
                <span className="font-medium text-cyan-400">ℹ️ Embeddings:</span> Documentos
                indexados estão disponíveis para busca semântica usando
                <span className="text-white/80"> Voyage AI (voyage-large-2)</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Info */}
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
        <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-4">
          <Database className="h-4 w-4 text-purple-400" />
          Informações de Armazenamento
        </h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-white/40 mb-1">Modelo de Embedding</p>
            <p className="text-sm text-white font-medium">voyage-large-2</p>
            <p className="text-xs text-white/50 mt-1">1024 dimensões</p>
          </div>

          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-white/40 mb-1">Total de Vetores</p>
            <p className="text-sm text-white font-medium">{stats.totalChunks}</p>
            <p className="text-xs text-white/50 mt-1">~{stats.totalChunks * 4}KB estimado</p>
          </div>

          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-white/40 mb-1">Database</p>
            <p className="text-sm text-white font-medium">Neon PostgreSQL</p>
            <p className="text-xs text-white/50 mt-1">pgvector extension</p>
          </div>
        </div>
      </div>
    </div>
  )
}
