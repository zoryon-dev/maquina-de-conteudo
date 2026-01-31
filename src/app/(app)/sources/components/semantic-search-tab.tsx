/**
 * Semantic Search Tab
 *
 * Interface para testar buscas semânticas nos documentos indexados.
 * Usa Voyage AI embeddings para busca por significado.
 */

"use client"

import * as React from "react"
import {
  Search,
  Sparkles,
  TrendingUp,
  Filter,
  Send,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RAG_CATEGORIES, type RagCategory } from "@/lib/rag"

/**
 * Semantic search result with chunk information
 */
interface SemanticSearchResult {
  documentId: number
  documentTitle: string
  chunkIndex: number
  text: string
  score: number
  category: string
  startPosition?: number
  endPosition?: number
}

/**
 * Search Result Component
 */
interface SearchResultProps {
  result: SemanticSearchResult
}

function SearchResult({ result }: SearchResultProps) {
  const categoryConfig: Record<string, { label: string; color: string }> = {
    general: { label: "Geral", color: "bg-gray-500/10 text-gray-400" },
    products: { label: "Catálogo", color: "bg-blue-500/10 text-blue-400" },
    offers: { label: "Ofertas", color: "bg-orange-500/10 text-orange-400" },
    brand: { label: "Marca", color: "bg-purple-500/10 text-purple-400" },
    audience: { label: "Público", color: "bg-green-500/10 text-green-400" },
    competitors: { label: "Concorrentes", color: "bg-red-500/10 text-red-400" },
    content: { label: "Conteúdo", color: "bg-amber-500/10 text-amber-400" },
  }

  const config = categoryConfig[result.category] || categoryConfig.general

  // Score color
  const scoreColor = result.score >= 0.8
    ? "text-green-400"
    : result.score >= 0.6
      ? "text-yellow-400"
      : "text-orange-400"

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 shrink-0 mt-0.5">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4 className="text-sm font-medium text-white truncate">{result.documentTitle}</h4>
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", config.color)}>
            {config.label}
          </span>
          <span className={cn("ml-auto text-xs font-mono", scoreColor)}>
            {(result.score * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-xs text-white/60 line-clamp-3">{result.text}</p>
        <p className="text-[10px] text-white/30 mt-1">
          Chunk {result.chunkIndex}
        </p>
      </div>
    </div>
  )
}

/**
 * Main Semantic Search Tab Component
 */
export function SemanticSearchTab() {
  const [query, setQuery] = React.useState("")
  const [selectedCategories, setSelectedCategories] = React.useState<Set<RagCategory>>(new Set(RAG_CATEGORIES))
  const [results, setResults] = React.useState<SemanticSearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [selectedResult, setSelectedResult] = React.useState<SemanticSearchResult | null>(null)

  const categories = [
    { value: "general", label: "Geral" },
    { value: "products", label: "Catálogo" },
    { value: "offers", label: "Ofertas" },
    { value: "brand", label: "Marca" },
    { value: "audience", label: "Público" },
    { value: "competitors", label: "Concorrentes" },
    { value: "content", label: "Conteúdo" },
  ]

  const toggleCategory = (cat: RagCategory) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(cat)) {
      // Don't allow deselecting all
      if (newSelected.size > 1) {
        newSelected.delete(cat)
      }
    } else {
      newSelected.add(cat)
    }
    setSelectedCategories(newSelected)
  }

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    setSelectedResult(null)

    try {
      const response = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          categories: Array.from(selectedCategories),
          threshold: 0.5,
          maxChunks: 10,
          includeSources: false,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Search failed")
      }

      const data = await response.json()

      if (data.available === false) {
        toast.error("Nenhum documento indexado encontrado. Indexe alguns documentos primeiro.")
        setResults([])
        return
      }

      // Transform results to SemanticSearchResult format
      const searchResults: SemanticSearchResult[] = data.sources?.map((source: any, idx: number) => ({
        documentId: source.id,
        documentTitle: source.title,
        chunkIndex: idx, // Approximate
        text: "", // Will be populated from context
        score: source.score,
        category: source.category || "general",
      })) || []

      setResults(searchResults)

      // If we have context, parse it for full chunk display
      if (data.context && data.chunksIncluded > 0) {
        // Parse context to extract individual chunks
        const chunkPattern = /\[([^\]]+)\]\n([\s\S]+?)(?=\n\n---|\n*$)/g
        const chunks: SemanticSearchResult[] = []
        let match

        while ((match = chunkPattern.exec(data.context)) !== null) {
          const titleMatch = match[1].match(/^(.+) \((\w+)\)$/)
          if (titleMatch) {
            chunks.push({
              documentTitle: titleMatch[1],
              category: titleMatch[2],
              text: match[2].trim(),
              score: 0.8, // Default score for context results
              chunkIndex: chunks.length,
              documentId: 0,
            })
          }
        }

        if (chunks.length > 0) {
          setResults(chunks)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro na busca")
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="space-y-6">
      {/* Info Notice */}
      <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="text-white/90">
              <span className="font-medium text-cyan-300">Busca Semântica:</span> Encontre
              conteúdo relevante usando IA que entende significado e contexto.
            </p>
            <p className="text-white/60 text-xs">
              A IA usa embeddings Voyage AI para comparar sua pergunta com todos os documentos
              e retornar os trechos mais relevantes, mesmo que não usem exatamente as mesmas palavras.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="space-y-3">
        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-white/40 shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => toggleCategory(cat.value as RagCategory)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                selectedCategories.has(cat.value as RagCategory)
                  ? "bg-primary text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Query Input */}
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="O que você está procurando? Ex: &quot;produtos para pele sensível&quot; ou &quot;promoções de verão&quot;"
            rows={3}
            className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <Button
            type="button"
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="absolute bottom-3 right-3 h-8 w-8 p-0 bg-primary text-black hover:bg-primary/90"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {hasSearched && !selectedResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Resultados da Busca
            </h3>
            <span className="text-xs text-white/40">
              {results.length} encontrado{results.length !== 1 ? "s" : ""}
            </span>
          </div>

          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((result, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedResult(result)}
                  className="cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                >
                  <SearchResult result={result} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <Search className="h-8 w-8 text-white/20" />
                </div>
                <div>
                  <p className="text-white/70 text-sm font-medium">
                    Nenhum resultado encontrado
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    Tente usar termos diferentes ou selecione outras categorias
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded Result View */}
      {selectedResult && (
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedResult(null)}
            className="text-white/60 hover:text-white"
          >
            ← Voltar para resultados
          </Button>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-medium text-white">{selectedResult.documentTitle}</h4>
              <span className="text-xs text-white/40">
                Similaridade: {(selectedResult.score * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-3 rounded-lg bg-black/30 text-sm text-white/80 whitespace-pre-wrap">
              {selectedResult.text}
            </div>
          </div>
        </div>
      )}

      {/* Usage Tips */}
      {hasSearched && results.length > 0 && !selectedResult && (
        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
          <p className="text-xs text-white/60">
            <span className="font-medium text-purple-400">💡 Dica:</span> Quanto mais específica
            for sua busca, melhores serão os resultados. Tente fazer perguntas completas
            como &quot;Quais produtos têm proteção solar?&quot; em vez de apenas &quot;sol&quot;.
          </p>
        </div>
      )}
    </div>
  )
}
