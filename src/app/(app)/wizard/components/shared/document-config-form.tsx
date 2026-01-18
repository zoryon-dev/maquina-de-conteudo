/**
 * Document Config Form
 *
 * Form component for configuring RAG (Retrieval Augmented Generation) settings.
 * Allows selecting documents, collections, and adjusting relevance threshold.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Folder,
  Settings,
  ChevronDown,
  ChevronUp,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface RagConfig {
  mode?: "auto" | "manual";
  threshold?: number;
  maxChunks?: number;
  documents?: number[];
  collections?: number[];
}

interface Document {
  id: number;
  title: string;
  category: string;
  embedded: boolean;
}

interface Collection {
  id: number;
  name: string;
  description?: string;
  _count?: { documents?: number };
}

interface DocumentConfigFormProps {
  config: RagConfig;
  onChange: (config: RagConfig) => void;
  className?: string;
}

export function DocumentConfigForm({
  config,
  onChange,
  className,
}: DocumentConfigFormProps) {
  const documents: Document[] = [];
  const collections: Collection[] = [];
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedDocsSet = new Set(config.documents ?? []);
  const selectedCollectionsSet = new Set(config.collections ?? []);

  // Calculate available embedded documents
  const embeddedDocs = documents.filter((d: Document) => d.embedded).length;

  const handleToggleDocument = (docId: number) => {
    const newDocs = config.documents ?? [];
    if (newDocs.includes(docId)) {
      onChange({
        ...config,
        mode: "manual",
        documents: newDocs.filter((id) => id !== docId),
      });
    } else {
      onChange({
        ...config,
        mode: "manual",
        documents: [...newDocs, docId],
      });
    }
  };

  const handleToggleCollection = (collectionId: number) => {
    const newCollections = config.collections ?? [];
    if (newCollections.includes(collectionId)) {
      onChange({
        ...config,
        mode: "manual",
        collections: newCollections.filter((id) => id !== collectionId),
      });
    } else {
      onChange({
        ...config,
        mode: "manual",
        collections: [...newCollections, collectionId],
      });
    }
  };

  const handleSelectAll = () => {
    onChange({
      ...config,
      mode: "manual",
      documents: documents.filter((d: Document) => d.embedded).map((d: Document) => d.id),
      collections: collections.map((c: Collection) => c.id),
    });
  };

  const handleClearAll = () => {
    onChange({
      ...config,
      mode: "auto",
      documents: [],
      collections: [],
    });
  };

  return (
    <div className={cn("border border-white/10 rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">
              Contexto da Base de Conhecimento
            </h3>
            <p className="text-xs text-white/50">
              {embeddedDocs > 0
                ? `${embeddedDocs} documentos indexados disponíveis`
                : "Nenhum documento indexado"}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-white/40" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/40" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {/* Mode Selection */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02]">
                <button
                  onClick={() => onChange({ ...config, mode: "auto" })}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                    config.mode === "auto"
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                >
                  Auto
                </button>
                <button
                  onClick={() => onChange({ ...config, mode: "manual" })}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                    config.mode === "manual"
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                >
                  Manual
                </button>
              </div>

              {/* Manual Selection */}
              {config.mode === "manual" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  {/* Collections */}
                  {collections.length > 0 && (
                    <div>
                      <Label className="text-xs text-white/60 mb-2 block">
                        Coleções
                      </Label>
                      <div className="space-y-1">
                        {collections.map((collection: Collection) => {
                          const isSelected = selectedCollectionsSet.has(collection.id);
                          return (
                            <button
                              key={collection.id}
                              onClick={() => handleToggleCollection(collection.id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                                isSelected
                                  ? "bg-primary/10 border border-primary/30"
                                  : "bg-white/5 border border-transparent hover:bg-white/10"
                              )}
                            >
                              <Folder
                                className={cn(
                                  "w-4 h-4 flex-shrink-0",
                                  isSelected ? "text-primary" : "text-white/40"
                                )}
                              />
                              <span className="flex-1 text-left text-sm text-white/80">
                                {collection.name}
                              </span>
                              <span className="text-xs text-white/40">
                                {collection._count?.documents ?? 0} docs
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {documents.length > 0 && (
                    <div>
                      <Label className="text-xs text-white/60 mb-2 block">
                        Documentos
                      </Label>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {documents.map((doc: Document) => {
                          const isSelected = selectedDocsSet.has(doc.id);
                          return (
                            <button
                              key={doc.id}
                              onClick={() => handleToggleDocument(doc.id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                                isSelected
                                  ? "bg-primary/10 border border-primary/30"
                                  : "bg-white/5 border border-transparent hover:bg-white/10"
                              )}
                            >
                              <FileText
                                className={cn(
                                  "w-4 h-4 flex-shrink-0",
                                  isSelected ? "text-primary" : "text-white/40"
                                )}
                              />
                              <span
                                className="flex-1 text-left text-sm text-white/80 truncate"
                                title={doc.title}
                              >
                                {doc.title}
                              </span>
                              {!doc.embedded && (
                                <span className="text-xs text-white/30">
                                  pendente
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="flex-1"
                    >
                      Selecionar Tudo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      className="flex-1"
                    >
                      Limpar
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Advanced Settings */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs text-white/60 hover:text-white/80 transition-colors"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  {showAdvanced ? "Ocultar" : "Mostrar"} avançado
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-3"
                    >
                      {/* Threshold */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs text-white/60">
                            Similaridade mínima
                          </Label>
                          <span className="text-xs text-primary">
                            {config.threshold ?? 0.5}
                          </span>
                        </div>
                        <Input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={config.threshold ?? 0.5}
                          onChange={(e) =>
                            onChange({
                              ...config,
                              threshold: parseFloat(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>

                      {/* Max Chunks */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs text-white/60">
                            Máx. de trechos
                          </Label>
                          <span className="text-xs text-primary">
                            {config.maxChunks ?? 15}
                          </span>
                        </div>
                        <Input
                          type="range"
                          min={5}
                          max={30}
                          step={1}
                          value={config.maxChunks ?? 15}
                          onChange={(e) =>
                            onChange({
                              ...config,
                              maxChunks: parseInt(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-200/70">
                          Ajuste a sensibilidade da busca. Valores mais baixos retornam
                          mais contexto, mas podem incluir conteúdo menos relevante.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
