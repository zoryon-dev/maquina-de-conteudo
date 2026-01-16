/**
 * Fontes de Conteúdo - Document Management
 *
 * Gerenciamento completo de documentos para RAG com:
 * - Upload e organização de documentos
 * - Visualização de embeddings
 * - Busca semântica
 * - Coleções/pastas para organizar documentos
 */

"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  Globe,
  FileText,
  Search,
  BarChart3,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Import tab components
import { DocumentsTab } from "./components/documents-tab"
import { SemanticSearchTab } from "./components/semantic-search-tab"
import { StatsTab } from "./components/stats-tab"
import { CollectionsSidebar } from "./components/collections-sidebar"

/**
 * Tab configuration
 */
interface TabConfig {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const TABS: TabConfig[] = [
  {
    id: "documents",
    name: "Documentos",
    icon: FileText,
    description: "Gerencie seus documentos para RAG",
  },
  {
    id: "search",
    name: "Buscar Semântica",
    icon: Search,
    description: "Faça buscas inteligentes no conteúdo",
  },
  {
    id: "stats",
    name: "Estatísticas",
    icon: BarChart3,
    description: "Visualize métricas e índices",
  },
]

export default function SourcesPage() {
  const [activeTab, setActiveTab] = React.useState("documents")
  const [selectedCollectionId, setSelectedCollectionId] = React.useState<number | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Force refresh of all tabs
  const handleRefresh = React.useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <div className="space-y-6 pt-[25px] pb-[25px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Fontes de Conteúdo
          </h1>
          <p className="text-sm text-white/60">
            Gerencie documentos para RAG e organize em coleções
          </p>
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex gap-6">
        {/* Collections Sidebar */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-6 rounded-xl bg-white/[0.02] border border-white/10 p-3">
            <CollectionsSidebar
              selectedCollectionId={selectedCollectionId}
              onSelectCollection={setSelectedCollectionId}
              onRefresh={handleRefresh}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Enhanced Tabs Navigation */}
          <div className="p-1 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="grid sm:grid-cols-3 gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex flex-col sm:flex-row items-center sm:gap-3 gap-2 px-4 py-3 rounded-lg transition-all duration-200 text-left",
                      isActive
                        ? "bg-primary/10 text-white"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {/* Active indicator - left border on desktop, top on mobile */}
                    {isActive && (
                      <motion.div
                        layoutId="active-indicator-sources"
                        className={cn(
                          "absolute bg-primary rounded-full",
                          "sm:left-0 sm:top-2 sm:bottom-2 sm:w-0.5 sm:h-auto",
                          "top-0 left-2 right-2 h-0.5 w-auto sm:hidden"
                        )}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    {/* Mobile-only active glow */}
                    {isActive && (
                      <motion.div
                        layoutId="glow-sources"
                        className="absolute inset-0 bg-primary/5 rounded-lg -z-10 sm:block hidden"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    <Icon className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-primary" : ""
                    )} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tab.name}</p>
                      <p className={cn(
                        "text-xs hidden sm:block",
                        isActive ? "text-white/60" : "text-white/30"
                      )}>
                        {tab.description}
                      </p>
                    </div>

                    {/* Active checkmark */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="hidden sm:block"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <X className="h-3 w-3 text-black" />
                        </div>
                      </motion.div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <motion.div
            key={`${activeTab}-${refreshKey}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "documents" && (
              <DocumentsTab
                selectedCollectionId={selectedCollectionId}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === "search" && <SemanticSearchTab />}
            {activeTab === "stats" && <StatsTab />}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
