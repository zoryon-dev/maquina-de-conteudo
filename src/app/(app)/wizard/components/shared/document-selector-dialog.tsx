/**
 * Document Selector Dialog
 *
 * Dialog for selecting documents and collections for manual RAG mode.
 * Shows only documents that have embeddings (embedded=true).
 */

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Folder,
  Search,
  Check,
  Sparkles,
  Loader2,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Document {
  id: number;
  title: string;
  category: string;
  embedded: boolean;
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
        console.error("Error fetching documents:", err);
        setError(err instanceof Error ? err.message : "Failed to load documents");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open]);

  // Filter documents based on search and category
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      searchQuery === "" ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === null || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Filter collections based on search
  const filteredCollections = collections.filter((col) => {
    return (
      searchQuery === "" ||
      col.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Get unique categories from documents
  const categories = Array.from(
    new Set(documents.map((doc) => doc.category))
  ).sort();

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

  // Select all/none handlers
  const handleSelectAllDocuments = () => {
    setSelectedDocs(new Set(filteredDocuments.map((d) => d.id)));
  };

  const handleClearAllDocuments = () => {
    setSelectedDocs(new Set());
  };

  const handleSelectAllCollections = () => {
    setSelectedCollections(new Set(filteredCollections.map((c) => c.id)));
  };

  const handleClearAllCollections = () => {
    setSelectedCollections(new Set());
  };

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
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col bg-[#0a0a0f] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Selecionar Documentos para RAG
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Escolha quais documentos e coleções usar para enriquecer seu conteúdo.
            Apenas documentos com embeddings serão usados.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Buscar documentos ou coleções..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/[0.02] border-white/10 text-white placeholder:text-white/40"
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

          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-white/40" />
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "h-7 text-xs",
                selectedCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 text-white/60 hover:bg-white/10 border-white/10"
              )}
            >
              Todos ({documents.length})
            </Button>
            {categories.map((cat) => {
              const count = documents.filter((d) => d.category === cat).length;
              if (count === 0) return null;

              const catInfo = CATEGORIES[cat];

              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "h-7 text-xs",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 text-white/60 hover:bg-white/10 border-white/10"
                  )}
                >
                  {catInfo.label} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-white/60">Carregando documentos...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex-1 flex items-center justify-center py-12">
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
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Collections */}
            {filteredCollections.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-white/60 flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5" />
                    Coleções ({filteredCollections.length})
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-white/50 hover:text-white/80"
                      onClick={handleSelectAllCollections}
                    >
                      Todas
                    </Button>
                    <span className="text-white/20">|</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-white/50 hover:text-white/80"
                      onClick={handleClearAllCollections}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-32 pr-4">
                  <div className="space-y-1">
                    {filteredCollections.map((collection) => {
                      const isSelected = selectedCollections.has(collection.id);
                      return (
                        <motion.div
                          key={collection.id}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <button
                            onClick={() => handleToggleCollection(collection.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                              isSelected
                                ? "bg-primary/10 border border-primary/30"
                                : "bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10"
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleCollection(collection.id)}
                              className="border-white/20"
                            />
                            <Folder
                              className={cn(
                                "w-4 h-4 flex-shrink-0",
                                isSelected ? "text-primary" : "text-white/40"
                              )}
                            />
                            <span className="flex-1 text-sm text-white/80">
                              {collection.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs bg-white/5 border-white/10 text-white/60"
                            >
                              {collection._count.documents}
                            </Badge>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Documents */}
            {filteredDocuments.length > 0 && (
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-white/60 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    Documentos ({filteredDocuments.length})
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-white/50 hover:text-white/80"
                      onClick={handleSelectAllDocuments}
                    >
                      Todas
                    </Button>
                    <span className="text-white/20">|</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-white/50 hover:text-white/80"
                      onClick={handleClearAllDocuments}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-1">
                    {filteredDocuments.map((doc) => {
                      const isSelected = selectedDocs.has(doc.id);
                      const catInfo = CATEGORIES[doc.category] || CATEGORIES.general;

                      return (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <button
                            onClick={() => handleToggleDocument(doc.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                              isSelected
                                ? "bg-primary/10 border border-primary/30"
                                : "bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10"
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleDocument(doc.id)}
                              className="border-white/20"
                            />
                            <FileText
                              className={cn(
                                "w-4 h-4 flex-shrink-0",
                                isSelected ? "text-primary" : "text-white/40"
                              )}
                            />
                            <span
                              className="flex-1 text-sm text-white/80 truncate"
                              title={doc.title}
                            >
                              {doc.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", catInfo.color)}
                            >
                              {catInfo.label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs bg-white/5 border-white/10 text-white/60"
                            >
                              {doc._count.embeddings || 0}
                            </Badge>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Empty State */}
            {!isLoading &&
              filteredCollections.length === 0 &&
              filteredDocuments.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    <FileText className="w-12 h-12 text-white/20 mx-auto" />
                    <p className="text-sm text-white/40">
                      {searchQuery || selectedCategory
                        ? "Nenhum documento encontrado com os filtros atuais."
                        : "Nenhum documento com embeddings encontrado."}
                    </p>
                    <p className="text-xs text-white/30">
                      {searchQuery || selectedCategory
                        ? "Tente ajustar os filtros."
                        : "Faça upload de documentos na página Fontes para começar."}
                    </p>
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-white/60">
              {totalSelected > 0 ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  {totalSelected} selecionado
                  {totalSelected !== 1 ? "s" : ""}
                </span>
              ) : (
                <span>Nenhum selecionado</span>
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
                Salvar Seleção
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
