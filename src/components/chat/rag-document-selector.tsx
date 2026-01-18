/**
 * RAG Document & Collection Selector
 *
 * Allows users to manually select specific collections and documents
 * to include in RAG context for chat queries.
 *
 * Features:
 * - Fetches collections and documents from API
 * - Nested tree view: Collections → Documents
 * - Individual document selection
 * - Collection-level selection (selects all documents)
 * - Search/filter functionality
 * - Persists selection in localStorage
 */

"use client"

import * as React from "react"
import { Database, ChevronDown, ChevronRight, File, Folder, FolderOpen, Check, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

/** Storage key for localStorage persistence */
const STORAGE_KEY = "rag-selected-documents"

/** Document with selection state */
interface DocumentWithSelection {
  id: number
  title: string
  category: string | null
  embedded: boolean
  selected: boolean
}

/** Collection with documents and selection state */
interface CollectionWithSelection {
  id: number
  name: string
  color: string | null
  icon: string | null
  itemCount: number
  selected: boolean
  expanded: boolean
  documents: DocumentWithSelection[]
}

/** RAG selection state */
export interface RagSelection {
  collectionIds: number[]
  documentIds: number[]
}

/**
 * Parse stored selections from localStorage
 */
function parseStoredSelections(): RagSelection {
  if (typeof window === "undefined") return { collectionIds: [], documentIds: [] }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as RagSelection
    }
  } catch {
    // Ignore storage errors
  }
  return { collectionIds: [], documentIds: [] }
}

/**
 * Save selections to localStorage
 */
function saveSelections(selection: RagSelection) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
  } catch {
    // Ignore storage errors
  }
}

/**
 * RAG Document Selector Props
 */
export interface RagDocumentSelectorProps {
  /** Currently selected collections and documents */
  value?: RagSelection
  /** Callback when selection changes */
  onValueChange?: (selection: RagSelection) => void
  /** Whether to show compact version (icon only when closed) */
  compact?: boolean
  /** Custom className */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

/**
 * RAG Document Selector Component
 *
 * Dropdown menu for selecting specific collections and documents
 * to include in RAG context during chat.
 */
export function RagDocumentSelector({
  value: controlledValue,
  onValueChange,
  compact = false,
  className = "",
  disabled = false,
}: RagDocumentSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [collections, setCollections] = React.useState<CollectionWithSelection[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // Internal state for selections
  const [selection, setSelection] = React.useState<RagSelection>(() => parseStoredSelections())

  // Use controlled value if provided
  const currentSelection = controlledValue ?? selection

  // Calculate total selected items
  const selectedCount = React.useMemo(() => {
    return currentSelection.collectionIds.length + currentSelection.documentIds.length
  }, [currentSelection])

  // Fetch collections and documents
  const fetchCollections = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch collections
      const collectionsResponse = await fetch("/api/sources/collections")
      const collectionsData = await collectionsResponse.json()

      // Fetch all documents
      const documentsResponse = await fetch("/api/sources/documents")
      const documentsData = await documentsResponse.json()

      if (collectionsData.success && documentsData.success) {
        const collectionsList: CollectionWithSelection[] = collectionsData.collections.map(
          (col: { id: number; name: string; color: string | null; icon: string | null; itemCount: number }) => ({
            ...col,
            selected: currentSelection.collectionIds.includes(col.id),
            expanded: false,
            documents: [],
          })
        )

        // Group documents by collections
        const documentsByCollection = new Map<number, DocumentWithSelection[]>()
        documentsData.documents.forEach((doc: {
          id: number
          title: string
          category: string | null
          embedded: boolean
          collections?: { id: number }[]
        }) => {
          const docWithSelection: DocumentWithSelection = {
            ...doc,
            selected: currentSelection.documentIds.includes(doc.id),
          }

          // Add to each collection the document belongs to
          if (doc.collections && doc.collections.length > 0) {
            doc.collections.forEach((col) => {
              if (!documentsByCollection.has(col.id)) {
                documentsByCollection.set(col.id, [])
              }
              documentsByCollection.get(col.id)!.push(docWithSelection)
            })
          } else {
            // Uncategorized documents - add to a virtual collection
            if (!documentsByCollection.has(0)) {
              documentsByCollection.set(0, [])
            }
            documentsByCollection.get(0)!.push(docWithSelection)
          }
        })

        // Merge documents into collections
        const mergedCollections = collectionsList.map((col) => ({
          ...col,
          documents: documentsByCollection.get(col.id) || [],
        }))

        // Add uncategorized collection if there are any
        if (documentsByCollection.has(0)) {
          mergedCollections.unshift({
            id: 0,
            name: "Sem pasta",
            color: null,
            icon: null,
            itemCount: documentsByCollection.get(0)!.length,
            selected: false,
            expanded: true,
            documents: documentsByCollection.get(0) || [],
          })
        }

        setCollections(mergedCollections)
      }
    } catch (error) {
      console.error("Failed to fetch RAG sources:", error)
    } finally {
      setIsLoading(false)
    }
  }, [currentSelection])

  // Fetch data when dropdown opens
  React.useEffect(() => {
    if (open && collections.length === 0) {
      fetchCollections()
    }
  }, [open, collections.length, fetchCollections])

  // Toggle collection expansion
  const toggleExpand = (collectionId: number) => {
    setCollections((prev) =>
      prev.map((col) =>
        col.id === collectionId ? { ...col, expanded: !col.expanded } : col
      )
    )
  }

  // Toggle collection selection (selects/deselects all documents in collection)
  const toggleCollection = (collectionId: number) => {
    const collection = collections.find((c) => c.id === collectionId)
    if (!collection) return

    const newCollectionIds = currentSelection.collectionIds.includes(collectionId)
      ? currentSelection.collectionIds.filter((id) => id !== collectionId)
      : [...currentSelection.collectionIds, collectionId]

    // Also select/deselect all documents in this collection
    const documentIdsInCollection = collection.documents.map((d) => d.id)
    const newDocumentIds = currentSelection.collectionIds.includes(collectionId)
      ? currentSelection.documentIds.filter((id) => !documentIdsInCollection.includes(id))
      : [
          ...currentSelection.documentIds.filter((id) => !documentIdsInCollection.includes(id)),
          ...documentIdsInCollection,
        ]

    const newSelection: RagSelection = {
      collectionIds: newCollectionIds,
      documentIds: newDocumentIds,
    }

    setSelection(newSelection)
    saveSelections(newSelection)
    onValueChange?.(newSelection)

    // Update UI state
    setCollections((prev) =>
      prev.map((col) =>
        col.id === collectionId
          ? { ...col, selected: !col.selected, documents: col.documents.map((d) => ({ ...d, selected: !col.selected })) }
          : col
      )
    )
  }

  // Toggle individual document selection
  const toggleDocument = (collectionId: number, documentId: number) => {
    const newDocumentIds = currentSelection.documentIds.includes(documentId)
      ? currentSelection.documentIds.filter((id) => id !== documentId)
      : [...currentSelection.documentIds, documentId]

    // Check if all documents in collection are now selected
    const collection = collections.find((c) => c.id === collectionId)
    const allSelected = collection
      ? collection.documents.every((d) => newDocumentIds.includes(d.id))
      : false

    const newCollectionIds = allSelected
      ? [...new Set([...currentSelection.collectionIds, collectionId])]
      : currentSelection.collectionIds.filter((id) => id !== collectionId)

    const newSelection: RagSelection = {
      collectionIds: newCollectionIds,
      documentIds: newDocumentIds,
    }

    setSelection(newSelection)
    saveSelections(newSelection)
    onValueChange?.(newSelection)

    // Update UI state
    setCollections((prev) =>
      prev.map((col) => {
        if (col.id === collectionId) {
          const newDocuments = col.documents.map((d) =>
            d.id === documentId ? { ...d, selected: !d.selected } : d
          )
          return {
            ...col,
            selected: allSelected,
            documents: newDocuments,
          }
        }
        return col
      })
    )
  }

  // Clear all selections
  const clearAll = () => {
    const newSelection: RagSelection = { collectionIds: [], documentIds: [] }
    setSelection(newSelection)
    saveSelections(newSelection)
    onValueChange?.(newSelection)
    setCollections((prev) =>
      prev.map((col) => ({
        ...col,
        selected: false,
        documents: col.documents.map((d) => ({ ...d, selected: false })),
      }))
    )
  }

  // Filter collections based on search
  const filteredCollections = React.useMemo(() => {
    if (!searchQuery.trim()) return collections

    const query = searchQuery.toLowerCase()
    return collections
      .map((col) => ({
        ...col,
        documents: col.documents.filter(
          (doc) =>
            doc.title.toLowerCase().includes(query) ||
            (doc.category && doc.category.toLowerCase().includes(query))
        ),
      }))
      .filter((col) => col.name.toLowerCase().includes(query) || col.documents.length > 0)
  }, [collections, searchQuery])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 px-2.5 py-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group",
            compact && "px-2",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          title="Fontes de contexto RAG"
        >
          <Database className="w-4 h-4" />
          {!compact && <span className="text-xs hidden sm:inline">Fontes</span>}
          {selectedCount > 0 && (
            <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
              {selectedCount}
            </span>
          )}
          <ChevronDown className="w-3 h-3 opacity-50" />
          <span className="absolute inset-0 bg-white/[0.05] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 bg-[#1a1a2e] border-white/10 max-h-[400px] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-3 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/90">Fontes de Contexto</span>
            <span className="text-[10px] text-white/40">{selectedCount} selecionados</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar documentos..."
              className="h-8 pl-8 pr-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Collections & Documents */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="py-8 text-center">
              <Database className="w-8 h-8 text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/40">
                {searchQuery ? "Nenhum documento encontrado" : "Nenhum documento disponível"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCollections.map((collection) => (
                <div key={collection.id} className="space-y-0.5">
                  {/* Collection header */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(collection.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                      "hover:bg-white/5"
                    )}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(collection.id)
                      }}
                      className="shrink-0"
                    >
                      {collection.expanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleCollection(collection.id)
                      }}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                        collection.selected
                          ? "bg-primary border-primary text-black"
                          : "border-white/20"
                      )}
                    >
                      {collection.selected && <Check className="w-3 h-3" />}
                    </button>

                    {collection.expanded ? (
                      <FolderOpen className="w-3.5 h-3.5 text-white/60 shrink-0" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-white/60 shrink-0" />
                    )}

                    <span className="text-xs text-white/80 truncate flex-1">
                      {collection.name}
                    </span>

                    <span className="text-[10px] text-white/30">
                      {collection.documents.length}
                    </span>
                  </button>

                  {/* Documents (when expanded) */}
                  {collection.expanded && collection.documents.length > 0 && (
                    <div className="ml-6 space-y-0.5">
                      {collection.documents.map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          onClick={() => toggleDocument(collection.id, document.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors",
                            "hover:bg-white/5",
                            document.selected && "bg-primary/5"
                          )}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleDocument(collection.id, document.id)
                            }}
                            className={cn(
                              "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0",
                              document.selected
                                ? "bg-primary border-primary text-black"
                                : "border-white/20"
                            )}
                          >
                            {document.selected && <Check className="w-2.5 h-2.5" />}
                          </button>

                          <File className="w-3 h-3 text-white/40 shrink-0" />

                          <span className="text-xs text-white/60 truncate flex-1">
                            {document.title}
                          </span>

                          {!document.embedded && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-white/30">
                              não indexado
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedCount > 0 && (
          <div className="p-2 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={clearAll}
              className="w-full py-1.5 text-[10px] text-white/50 hover:text-white/80 hover:bg-white/5 rounded transition-colors"
            >
              Limpar seleção
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Hook to manage RAG document selection
 */
export function useRagDocuments() {
  const [selection, setSelection] = React.useState<RagSelection>(() => parseStoredSelections())

  const updateSelection = React.useCallback((newSelection: RagSelection) => {
    setSelection(newSelection)
    saveSelections(newSelection)
  }, [])

  const clearSelection = React.useCallback(() => {
    const empty: RagSelection = { collectionIds: [], documentIds: [] }
    setSelection(empty)
    saveSelections(empty)
  }, [])

  const selectedCount = React.useMemo(
    () => selection.collectionIds.length + selection.documentIds.length,
    [selection]
  )

  return {
    selection,
    setSelection: updateSelection,
    clearSelection,
    selectedCount,
  }
}
