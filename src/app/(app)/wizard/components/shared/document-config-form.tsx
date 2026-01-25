/**
 * Document Config Form
 *
 * Form component for configuring RAG (Retrieval Augmented Generation) settings.
 * Allows selecting documents, collections, and adjusting relevance threshold.
 */

"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Folder,
  FolderOpen,
  Settings,
  ChevronDown,
  ChevronUp,
  Info,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DocumentSelectorDialog,
  type RagSelection,
} from "./document-selector-dialog";

export interface RagConfig {
  mode?: "auto" | "manual";
  threshold?: number;
  maxChunks?: number;
  documents?: number[];
  collections?: number[];
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
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  // Calculate selected counts
  const selectedDocsCount = config.documents?.length ?? 0;
  const selectedCollectionsCount = config.collections?.length ?? 0;
  const totalSelected = selectedDocsCount + selectedCollectionsCount;

  // Handle open selector
  const handleOpenSelector = () => {
    setShowSelector(true);
  };

  // Handle save selection from dialog
  const handleSaveSelection = (selection: RagSelection) => {
    onChange({
      ...config,
      mode: "manual",
      documents: selection.documents,
      collections: selection.collections,
    });
  };

  // Handle clear selection
  const handleClearSelection = () => {
    onChange({
      ...config,
      mode: "auto",
      documents: [],
      collections: [],
    });
  };

  return (
    <>
      <DocumentSelectorDialog
        open={showSelector}
        onOpenChange={setShowSelector}
        initialSelection={{
          documents: config.documents ?? [],
          collections: config.collections ?? [],
        }}
        onSave={handleSaveSelection}
      />

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
                {config.mode === "manual" && totalSelected > 0
                  ? `${totalSelected} selecionado${totalSelected !== 1 ? "s" : ""}`
                  : config.mode === "manual"
                  ? "Nenhum selecionado"
                  : "Modo automático"}
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
                      config.mode === "auto" || config.mode === undefined
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
                    {/* Selection Summary */}
                    {totalSelected > 0 ? (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-sm text-white/80">
                              {totalSelected} item{totalSelected !== 1 ? "s" : ""} selecionado
                              {totalSelected !== 1 ? "s" : ""}
                            </span>
                            {selectedDocsCount > 0 && (
                              <span className="text-xs text-white/50">
                                ({selectedDocsCount} docs, {selectedCollectionsCount} coleções)
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearSelection}
                            className="h-7 text-xs text-white/50 hover:text-white/80"
                          >
                            Limpar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-white/[0.02] border border-dashed border-white/10 text-center">
                        <FolderOpen className="w-8 h-8 text-white/20 mx-auto mb-2" />
                        <p className="text-sm text-white/50 mb-1">
                          Nenhum documento selecionado
                        </p>
                        <p className="text-xs text-white/30 mb-3">
                          Selecione documentos para enriquecer seu conteúdo
                        </p>
                      </div>
                    )}

                    {/* Open Selector Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenSelector}
                      className="w-full"
                    >
                      {totalSelected > 0
                        ? "Alterar Seleção"
                        : "Selecionar Documentos"}
                    </Button>
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
    </>
  );
}
