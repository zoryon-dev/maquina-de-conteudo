/**
 * Semantic Search Tab
 *
 * Interface para testar buscas semânticas nos documentos indexados.
 * TODO: Implementar busca vetorial real com Voyage AI.
 */

"use client"

import * as React from "react"
import {
  Search,
  Sparkles,
  FileText,
  TrendingUp,
  Filter,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  searchDocumentsAction,
} from "../actions/sources-actions"

/**
 * Search Result Component
 */
interface SearchResultProps {
  title: string
  content: string
  category: string | null
  score?: number
}

function SearchResult({ title, content, category, score }: SearchResultProps) {
  const categoryConfig: Record<string, { label: string; color: string }> = {
    general: { label: "Geral", color: "bg-gray-500/10 text-gray-400" },
    products: { label: "Catálogo", color: "bg-blue-500/10 text-blue-400" },
    offers: { label: "Ofertas", color: "bg-orange-500/10 text-orange-400" },
    brand: { label: "Marca", color: "bg-purple-500/10 text-purple-400" },
    audience: { label: "Público", color: "bg-green-500/10 text-green-400" },
    competitors: { label: "Concorrentes", color: "bg-red-500/10 text-red-400" },
    content: { label: "Conteúdo", color: "bg-amber-500/10 text-amber-400" },
  }

  const config = categoryConfig[category || ""] || categoryConfig.general

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
      <FileText className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-white truncate">{title}</h4>
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", config.color)}>
            {config.label}
          </span>
          {score !== undefined && (
            <span className="ml-auto text-xs text-white/40">
              {(score * 100).toFixed(0)}% similaridade
            </span>
          )}
        </div>
        <p className="text-xs text-white/60 line-clamp-2">{content}</p>
      </div>
    </div>
  )
}

/**
 * Main Semantic Search Tab Component
 */
export function SemanticSearchTab() {
  const [query, setQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
  const [results, setResults] = React.useState<any[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)

  const categories = [
    { value: null, label: "Todas" },
    { value: "general", label: "Geral" },
    { value: "products", label: "Catálogo" },
    { value: "offers", label: "Ofertas" },
    { value: "brand", label: "Marca" },
    { value: "audience", label: "Público" },
    { value: "competitors", label: "Concorrentes" },
    { value: "content", label: "Conteúdo" },
  ]

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      // TODO: Replace with actual semantic search using embeddings
      const searchResults = await searchDocumentsAction(
        query,
        selectedCategory,
        10
      )
      setResults(searchResults)
    } catch (error) {
      console.error("Search error:", error)
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
              conteúdo relevante usando buscas por significado, não apenas por palavras-chave.
            </p>
            <p className="text-white/60 text-xs">
              A IA usa embeddings para entender o contexto e retornar os trechos mais relevantes,
              mesmo que não usem exatamente as mesmas palavras.
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
              key={cat.value || "all"}
              type="button"
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                selectedCategory === cat.value
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
              <Sparkles className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
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
              {results.map((doc, i) => (
                <SearchResult
                  key={doc.id || i}
                  title={doc.title}
                  content={doc.content}
                  category={doc.category}
                  score={doc.score}
                />
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
                    Tente usar termos diferentes ou selecione outra categoria
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Usage Tips */}
      {results.length > 0 && (
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
