/**
 * Documents Tab
 *
 * Lista e gerenciamento de documentos com ações de editar, excluir e upload.
 */

"use client"

import * as React from "react"
import {
  FileText,
  Folder,
  Sparkles,
  RefreshCw,
  Filter,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DocumentCard,
  type DocumentWithEmbeddings as DocumentCardProps,
} from "./document-card"
import { UploadDialog } from "./upload-dialog"
import {
  getDocumentsByCollectionAction,
  getDocumentStatsAction,
  type DocumentStats,
} from "../actions/sources-actions"

/**
 * Category configuration - matches DOCUMENT_CATEGORIES from system-prompts.ts
 */
const CATEGORIES: Record<string, { label: string; color: string; icon: any }> = {
  general: { label: "Geral", color: "bg-gray-500/10 text-gray-400", icon: Folder },
  products: { label: "Catálogo", color: "bg-blue-500/10 text-blue-400", icon: FileText },
  offers: { label: "Ofertas", color: "bg-orange-500/10 text-orange-400", icon: FileText },
  brand: { label: "Marca", color: "bg-purple-500/10 text-purple-400", icon: FileText },
  audience: { label: "Público", color: "bg-green-500/10 text-green-400", icon: FileText },
  competitors: { label: "Concorrentes", color: "bg-red-500/10 text-red-400", icon: FileText },
  content: { label: "Conteúdo", color: "bg-amber-500/10 text-amber-400", icon: FileText },
}

/**
 * Stat Card Component
 */
interface StatCardProps {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/5">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-semibold text-white">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  )
}

/**
 * Main Documents Tab Component Props
 */
export interface DocumentsTabProps {
  selectedCollectionId?: number | null
  onRefresh?: () => void
}

/**
 * Main Documents Tab Component
 */
export function DocumentsTab({ selectedCollectionId, onRefresh }: DocumentsTabProps) {
  const [documents, setDocuments] = React.useState<DocumentCardProps[]>([])
  const [stats, setStats] = React.useState<DocumentStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false)

  // Fetch documents and stats
  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [docsData, statsData] = await Promise.all([
        getDocumentsByCollectionAction(selectedCollectionId ?? null),
        getDocumentStatsAction(),
      ])
      setDocuments(docsData)
      setStats(statsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCollectionId])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter documents
  const filteredDocuments = React.useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory = !selectedCategory || doc.category === selectedCategory
      const matchesSearch =
        !searchQuery ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [documents, selectedCategory, searchQuery])

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Documentos"
            value={stats.totalDocuments}
            icon={FileText}
            color="bg-blue-500/10 text-blue-400"
          />
          <StatCard
            label="Indexados"
            value={stats.embeddedDocuments}
            icon={Sparkles}
            color="bg-cyan-500/10 text-cyan-400"
          />
          <StatCard
            label="Chunks"
            value={stats.totalChunks}
            icon={Folder}
            color="bg-purple-500/10 text-purple-400"
          />
          <StatCard
            label="Categorias"
            value={stats.categories.length}
            icon={Folder}
            color="bg-green-500/10 text-green-400"
          />
        </div>
      )}

      {/* Filters and Search with Upload Button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 flex-1">
          <Filter className="h-4 w-4 text-white/40 shrink-0" />
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
              !selectedCategory
                ? "bg-primary text-black"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            Todos
          </button>
          {Object.entries(CATEGORIES).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedCategory(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                selectedCategory === key
                  ? "bg-primary text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Search Input and Upload Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar documentos..."
              className="w-full sm:w-56 px-4 py-2 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          </div>
          <Button
            type="button"
            onClick={() => setUploadDialogOpen(true)}
            className="bg-primary text-black hover:bg-primary/90 whitespace-nowrap"
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
        </div>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-white/40 text-sm">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Carregando documentos...
          </div>
        </div>
      ) : filteredDocuments.length > 0 ? (
        <div className="grid gap-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onUpdate={fetchData}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <FileText className="h-8 w-8 text-white/20" />
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">
                {searchQuery || selectedCategory
                  ? "Nenhum documento encontrado"
                  : "Nenhum documento cadastrado"}
              </p>
              <p className="text-white/40 text-xs mt-1">
                {searchQuery || selectedCategory
                  ? "Tente ajustar os filtros de busca"
                  : "Adicione documentos para começar a usar o RAG"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Notice */}
      {documents.length > 0 && (
        <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
          <p className="text-xs text-white/60">
            <span className="font-medium text-cyan-400">💡 RAG Ativo:</span> Documentos
            indexados com <span className="text-white/80">✓</span> estão disponíveis para
            busca semântica. Documentos não indexados não aparecerão nos resultados.
          </p>
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={fetchData}
        collectionId={selectedCollectionId}
      />
    </div>
  )
}
