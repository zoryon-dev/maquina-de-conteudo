/**
 * Document Selector Dialog
 *
 * Dialog for selecting documents and collections for manual RAG mode.
 * Shows only documents that have embeddings (embedded=true).
 *
 * v2.0 - Improved UX with better scroll, select all, and filtering
 */

"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  FileText,
  Folder,
  Search,
  Check,
  Sparkles,
  Loader2,
  Filter,
  X,
  ExternalLink,
  CheckSquare,
  Square,
  Eye,
  ListFilter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Document {
  id: number;
  title: string;
  category: string;
  embedded: boolean;
  contentPreview?: string;
  chunksCount?: number;
  createdAt?: string;
  updatedAt?: string;
  _count: {
    embeddings: number | null;
  };
}

export interface Collection {
  id: number;
  name: string;
  description?: string | null;
  _count: {
    documents: number;
  };
}

export interface RagSelection {
  documents: number[];
  collections: number[];
}

interface DocumentSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSelection?: RagSelection;
  onSave: (selection: RagSelection) => void;
}

/**
 * Category configuration
 */
const CATEGORIES: Record<string, { label: string; color: string }> = {
  general: { label: "Geral", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  products: { label: "Catálogo", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  offers: { label: "Ofertas", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  brand: { label: "Marca", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  audience: { label: "Público", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  competitors: { label: "Concorrentes", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  content: { label: "Conteúdo", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

export function DocumentSelectorDialog({
  open,
  onOpenChange,
  initialSelection,
  onSave,
}: DocumentSelectorDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Selection state
  const [selectedDocs, setSelectedDocs] = useState<Set<number>>(
    new Set(initialSelection?.documents ?? [])
  );
  const [selectedCollections, setSelectedCollections] = useState<Set<number>>(
    new Set(initialSelection?.collections ?? [])
  );

  // Fetch documents and collections when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/rag/documents");
        if (!response.ok) {
          throw new Error("Failed to fetch documents");
        }

        const data = await response.json();
        setDocuments(data.documents || []);
        setCollections(data.collections || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load documents");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open]);

  // Filter documents based on search, category, and selection filter
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchQuery === "" ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === null || doc.category === selectedCategory;

      const matchesSelectionFilter =
        !showOnlySelected || selectedDocs.has(doc.id);

      return matchesSearch && matchesCategory && matchesSelectionFilter;
    });
  }, [documents, searchQuery, selectedCategory, showOnlySelected, selectedDocs]);

  // Filter collections based on search and selection filter
  const filteredCollections = useMemo(() => {
    return collections.filter((col) => {
      const matchesSearch =
        searchQuery === "" ||
        col.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSelectionFilter =
        !showOnlySelected || selectedCollections.has(col.id);

      return matchesSearch && matchesSelectionFilter;
    });
  }, [collections, searchQuery, showOnlySelected, selectedCollections]);

  // Get unique categories from documents
  const categories = useMemo(() => {
    return Array.from(new Set(documents.map((doc) => doc.category))).sort();
  }, [documents]);

  // Toggle handlers
  const handleToggleDocument = (docId: number) => {
    setSelectedDocs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleToggleCollection = (collectionId: number) => {
    setSelectedCollections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId);
      } else {
        newSet.add(collectionId);
      }
      return newSet;
    });
  };

  // Select all/none handlers for filtered items
  const handleToggleAllDocuments = () => {
    const allFilteredIds = filteredDocuments.map((d) => d.id);
    const allSelected = allFilteredIds.every((id) => selectedDocs.has(id));

    if (allSelected) {
      // Deselect all filtered
      setSelectedDocs((prev) => {
        const newSet = new Set(prev);
        allFilteredIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all filtered
      setSelectedDocs((prev) => {
        const newSet = new Set(prev);
        allFilteredIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  };

  const handleToggleAllCollections = () => {
    const allFilteredIds = filteredCollections.map((c) => c.id);
    const allSelected = allFilteredIds.every((id) => selectedCollections.has(id));

    if (allSelected) {
      setSelectedCollections((prev) => {
        const newSet = new Set(prev);
        allFilteredIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedCollections((prev) => {
        const newSet = new Set(prev);
        allFilteredIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedDocs(new Set());
    setSelectedCollections(new Set());
  };

  // Check if all filtered items are selected
  const allDocsSelected = filteredDocuments.length > 0 &&
    filteredDocuments.every((d) => selectedDocs.has(d.id));
  const someDocsSelected = filteredDocuments.some((d) => selectedDocs.has(d.id));

  const allCollectionsSelected = filteredCollections.length > 0 &&
    filteredCollections.every((c) => selectedCollections.has(c.id));
  const someCollectionsSelected = filteredCollections.some((c) => selectedCollections.has(c.id));

  // Count selections
  const totalSelected = selectedDocs.size + selectedCollections.size;

  // Handle save
  const handleSave = () => {
    onSave({
      documents: Array.from(selectedDocs),
      collections: Array.from(selectedCollections),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col bg-[#0a0a0f] border-white/10 text-white p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Selecionar Documentos para RAG
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Escolha quais documentos e coleções usar para enriquecer seu conteúdo.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-white/5 flex-shrink-0 space-y-3 bg-white/[0.01]">
          {/* Search and Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Buscar documentos ou coleções..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 bg-white/[0.02] border-white/10 text-white placeholder:text-white/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Show only selected toggle */}
            <Button
              variant={showOnlySelected ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlySelected(!showOnlySelected)}
              className={cn(
                "h-9 gap-1.5",
                showOnlySelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              Selecionados ({totalSelected})
            </Button>

            {/* Clear all */}
            {totalSelected > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-9 text-white/50 hover:text-white/80"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <ListFilter className="w-3.5 h-3.5 text-white/40" />
            <Button
              variant={selectedCategory === null ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "h-6 text-xs px-2",
                selectedCategory === null
                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                  : "text-white/50 hover:text-white/70 hover:bg-white/5"
              )}
            >
              Todos ({documents.length})
            </Button>
            {categories.map((cat) => {
              const count = documents.filter((d) => d.category === cat).length;
              if (count === 0) return null;
              const catInfo = CATEGORIES[cat] || CATEGORIES.general;

              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "h-6 text-xs px-2",
                    selectedCategory === cat
                      ? "bg-primary/20 text-primary hover:bg-primary/30"
                      : "text-white/50 hover:text-white/70 hover:bg-white/5"
                  )}
                >
                  {catInfo.label} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-white/60">Carregando documentos...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-sm text-red-400">Erro: {error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          {!isLoading && !error && (
            <div className="h-full overflow-y-auto px-6 py-4 space-y-6">
              {/* Collections Section */}
              {filteredCollections.length > 0 && (
                <div className="space-y-2">
                  {/* Section Header with Select All */}
                  <div className="flex items-center justify-between sticky top-0 bg-[#0a0a0f] py-1 z-10">
                    <button
                      type="button"
                      onClick={handleToggleAllCollections}
                      className="flex items-center gap-2 text-xs text-white/60 hover:text-white/80 transition-colors"
                    >
                      {allCollectionsSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : someCollectionsSelected ? (
                        <div className="w-4 h-4 rounded border border-primary bg-primary/30 flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-primary" />
                        </div>
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <Folder className="w-3.5 h-3.5" />
                      <span className="font-medium">Coleções</span>
                      <span className="text-white/40">
                        ({selectedCollections.size}/{filteredCollections.length})
                      </span>
                    </button>
                  </div>

                  {/* Collections Grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredCollections.map((collection) => {
                      const isSelected = selectedCollections.has(collection.id);
                      return (
                        <motion.button
                          key={collection.id}
                          type="button"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={() => handleToggleCollection(collection.id)}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg transition-all text-left",
                            isSelected
                              ? "bg-primary/10 border border-primary/30 ring-1 ring-primary/20"
                              : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Folder
                            className={cn(
                              "w-3.5 h-3.5 flex-shrink-0",
                              isSelected ? "text-primary" : "text-white/40"
                            )}
                          />
                          <span className="flex-1 text-xs text-white/80 truncate">
                            {collection.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-white/5 border-white/10 text-white/50"
                          >
                            {collection._count.documents}
                          </Badge>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              {filteredDocuments.length > 0 && (
                <div className="space-y-2">
                  {/* Section Header with Select All */}
                  <div className="flex items-center justify-between sticky top-0 bg-[#0a0a0f] py-1 z-10">
                    <button
                      type="button"
                      onClick={handleToggleAllDocuments}
                      className="flex items-center gap-2 text-xs text-white/60 hover:text-white/80 transition-colors"
                    >
                      {allDocsSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : someDocsSelected ? (
                        <div className="w-4 h-4 rounded border border-primary bg-primary/30 flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-primary" />
                        </div>
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <FileText className="w-3.5 h-3.5" />
                      <span className="font-medium">Documentos</span>
                      <span className="text-white/40">
                        ({selectedDocs.size}/{filteredDocuments.length})
                      </span>
                    </button>
                  </div>

                  {/* Documents List */}
                  <div className="space-y-1">
                    {filteredDocuments.map((doc) => {
                      const isSelected = selectedDocs.has(doc.id);
                      const catInfo = CATEGORIES[doc.category] || CATEGORIES.general;

                      return (
                        <motion.button
                          key={doc.id}
                          type="button"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={() => handleToggleDocument(doc.id)}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left",
                            isSelected
                              ? "bg-primary/10 border border-primary/30 ring-1 ring-primary/20"
                              : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                          />
                          <FileText
                            className={cn(
                              "w-3.5 h-3.5 flex-shrink-0",
                              isSelected ? "text-primary" : "text-white/40"
                            )}
                          />
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex-1 text-xs text-white/80 truncate">
                                  {doc.title}
                                </span>
                              </TooltipTrigger>
                              {doc.contentPreview && (
                                <TooltipContent
                                  side="bottom"
                                  align="start"
                                  className="max-w-md bg-[#1a1a2e] border-white/10 text-white/80 text-xs p-3"
                                >
                                  <p className="font-medium text-white mb-1">{doc.title}</p>
                                  <p className="text-white/60 line-clamp-4">
                                    {doc.contentPreview}
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] h-5 flex-shrink-0", catInfo.color)}
                          >
                            {catInfo.label}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-white/5 border-white/10 text-white/50 flex-shrink-0"
                          >
                            {doc._count.embeddings || 0}
                          </Badge>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredCollections.length === 0 && filteredDocuments.length === 0 && (
                <div className="h-full flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8 text-white/20" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-white/60 font-medium">
                        {showOnlySelected
                          ? "Nenhum item selecionado"
                          : searchQuery || selectedCategory
                          ? "Nenhum documento encontrado"
                          : "Nenhum documento indexado"}
                      </p>
                      <p className="text-xs text-white/40 max-w-xs mx-auto">
                        {showOnlySelected
                          ? "Selecione documentos ou coleções para vê-los aqui."
                          : searchQuery || selectedCategory
                          ? "Tente ajustar os filtros de busca para encontrar documentos."
                          : "Adicione documentos na página Fontes e processe os embeddings para usar o RAG."}
                      </p>
                    </div>
                    {!searchQuery && !selectedCategory && !showOnlySelected && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                        onClick={() => window.open("/sources", "_blank")}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Ir para Fontes
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-white/10 flex-shrink-0 bg-white/[0.01]">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-white/60">
              {totalSelected > 0 ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>
                    <strong className="text-white">{totalSelected}</strong> selecionado
                    {totalSelected !== 1 ? "s" : ""}
                  </span>
                  {selectedDocs.size > 0 && (
                    <span className="text-white/40">
                      ({selectedDocs.size} doc{selectedDocs.size !== 1 ? "s" : ""})
                    </span>
                  )}
                  {selectedCollections.size > 0 && (
                    <span className="text-white/40">
                      ({selectedCollections.size} col{selectedCollections.size !== 1 ? "s" : ""})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-white/40">Nenhum selecionado</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={totalSelected === 0}>
                <Check className="w-4 h-4 mr-1.5" />
                Salvar Seleção
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
