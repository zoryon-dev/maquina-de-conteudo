/**
 * Generation History Gallery
 *
 * Displays all past generations with filtering, favorites, pagination,
 * and the ability to reuse prompts in the create form.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Repeat2,
  Expand,
  Clock,
  Image as ImageIcon,
  Loader2,
  PackageOpen,
  BarChart3,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getGenerationHistoryAction,
  toggleFavoriteAction,
  getGenerationStatsAction,
  type HistoryOutput,
  type HistoryParams,
  type GenerationStats,
} from "../actions/creative-studio-actions";
import { CREATIVE_MODELS, FORMAT_OPTIONS } from "@/lib/creative-studio/constants";
import { toast } from "sonner";

interface GenerationHistoryProps {
  favoritesOnly?: boolean;
  onReusePrompt?: (prompt: string, model: string, formats: string[]) => void;
  className?: string;
}

export function GenerationHistory({
  favoritesOnly = false,
  onReusePrompt,
  className,
}: GenerationHistoryProps) {
  const [outputs, setOutputs] = useState<HistoryOutput[]>([]);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters
  const [modelFilter, setModelFilter] = useState<string>("");
  const [formatFilter, setFormatFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);

  // Lightbox
  const [selectedOutput, setSelectedOutput] = useState<HistoryOutput | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: HistoryParams = {
        page,
        limit: 20,
        favoritesOnly,
      };
      if (modelFilter) params.model = modelFilter;
      if (formatFilter) params.format = formatFilter;

      const result = await getGenerationHistoryAction(params);
      setOutputs(result.outputs);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (error) {
      console.error("[GenerationHistory] Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, modelFilter, formatFilter, favoritesOnly]);

  const fetchStats = useCallback(async () => {
    try {
      const s = await getGenerationStatsAction();
      setStats(s);
    } catch (error) {
      console.error("[GenerationHistory] Stats error:", error);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleToggleFavorite = async (outputId: number) => {
    const result = await toggleFavoriteAction(outputId);
    if (result.success) {
      setOutputs((prev) =>
        prev.map((o) =>
          o.id === outputId ? { ...o, isFavorite: result.isFavorite } : o
        )
      );
      // If viewing favorites only and unfavorited, remove from list
      if (favoritesOnly && !result.isFavorite) {
        setOutputs((prev) => prev.filter((o) => o.id !== outputId));
        setTotal((prev) => prev - 1);
      }
      // Update stats
      fetchStats();
    }
  };

  const handleReusePrompt = (output: HistoryOutput) => {
    if (onReusePrompt && output.generationPrompt) {
      onReusePrompt(
        output.generationPrompt,
        output.modelUsed ?? "",
        [output.format]
      );
      toast.success("Prompt carregado no formulario de criacao");
    }
  };

  const handleToggleCompare = (outputId: number) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(outputId)) {
        return prev.filter((id) => id !== outputId);
      }
      if (prev.length >= 4) {
        toast.error("Maximo de 4 imagens para comparacao");
        return prev;
      }
      return [...prev, outputId];
    });
  };

  const clearFilters = () => {
    setModelFilter("");
    setFormatFilter("");
    setPage(1);
  };

  const hasActiveFilters = modelFilter || formatFilter;

  const getModelName = (modelId: string | null) => {
    if (!modelId) return "Desconhecido";
    const model = CREATIVE_MODELS.find((m) => m.id === modelId);
    return model ? model.name : modelId.split("/").pop() ?? modelId;
  };

  const comparedOutputs = outputs.filter((o) =>
    selectedForCompare.includes(o.id)
  );

  return (
    <div className={cn("space-y-5", className)}>
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
            <div className="text-lg font-bold text-white">
              {stats.totalGenerations}
            </div>
            <div className="text-xs text-white/40">Total de geracoes</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
            <div className="text-lg font-bold text-red-400">
              {stats.totalFavorites}
            </div>
            <div className="text-xs text-white/40">Favoritos</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
            <div className="text-lg font-bold text-white">
              {stats.byModel.length}
            </div>
            <div className="text-xs text-white/40">Modelos usados</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
            <div className="text-lg font-bold text-white">
              {stats.byFormat.length}
            </div>
            <div className="text-xs text-white/40">Formatos</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "border-white/10 text-white/70 hover:text-white",
              hasActiveFilters && "border-primary/50 text-primary"
            )}
          >
            <Filter className="size-4 mr-1" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 text-xs bg-primary/20 px-1.5 rounded-full">
                !
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedForCompare([]);
            }}
            className={cn(
              "border-white/10 text-white/70 hover:text-white",
              compareMode && "border-primary/50 text-primary bg-primary/10"
            )}
          >
            <BarChart3 className="size-4 mr-1" />
            {compareMode ? "Sair Comparacao" : "Comparar"}
          </Button>

          <span className="text-xs text-white/40">
            {total} resultado{total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Collapsible Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              {/* Model Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50">Modelo</label>
                <select
                  value={modelFilter}
                  onChange={(e) => {
                    setModelFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg !border-white/10 !bg-white/[0.02] !text-white px-3 py-2 text-sm outline-none min-w-[180px]"
                >
                  <option value="">Todos os modelos</option>
                  {CREATIVE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Format Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50">Formato</label>
                <select
                  value={formatFilter}
                  onChange={(e) => {
                    setFormatFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg !border-white/10 !bg-white/[0.02] !text-white px-3 py-2 text-sm outline-none min-w-[180px]"
                >
                  <option value="">Todos os formatos</option>
                  {FORMAT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label} ({f.value})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare Bar */}
      <AnimatePresence>
        {compareMode && selectedForCompare.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5"
          >
            <span className="text-sm text-white/70">
              {selectedForCompare.length} imagem{selectedForCompare.length !== 1 ? "ns" : ""} selecionada{selectedForCompare.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedForCompare([])}
                className="border-white/10 text-white/70"
              >
                Limpar
              </Button>
              <Button
                size="sm"
                disabled={selectedForCompare.length < 2}
                onClick={() => setSelectedOutput(null)}
                className="bg-primary text-primary-foreground"
              >
                Comparar ({selectedForCompare.length})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
            >
              <div className="aspect-square bg-white/5 animate-pulse" />
              <div className="p-2.5 space-y-1.5">
                <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : outputs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageOpen className="size-12 text-white/15 mb-4" />
          <h3 className="text-sm font-medium text-white/50 mb-1">
            {favoritesOnly
              ? "Nenhum favorito encontrado"
              : "Nenhuma geracao encontrada"}
          </h3>
          <p className="text-xs text-white/30 max-w-xs">
            {favoritesOnly
              ? "Marque imagens como favoritas para ve-las aqui"
              : hasActiveFilters
                ? "Tente ajustar os filtros"
                : "Comece criando sua primeira imagem"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {outputs.map((output) => (
            <motion.div
              key={output.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "group relative rounded-xl overflow-hidden border transition-all",
                compareMode && selectedForCompare.includes(output.id)
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-white/10 hover:border-white/20",
                "bg-white/[0.02]"
              )}
            >
              {/* Image */}
              <div
                className="relative aspect-square bg-black/20 cursor-pointer"
                onClick={() => {
                  if (compareMode) {
                    handleToggleCompare(output.id);
                  } else {
                    setSelectedOutput(output);
                  }
                }}
              >
                <img
                  src={output.thumbnailUrl || output.imageUrl}
                  alt={`Geracao ${output.format}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />

                {/* Compare checkbox */}
                {compareMode && (
                  <div className="absolute top-2 left-2">
                    <div
                      className={cn(
                        "size-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        selectedForCompare.includes(output.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-white/40 bg-black/40"
                      )}
                    >
                      {selectedForCompare.includes(output.id) && (
                        <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}

                {/* Favorite badge */}
                {output.isFavorite && !compareMode && (
                  <div className="absolute top-2 right-2">
                    <Heart className="size-4 fill-red-400 text-red-400" />
                  </div>
                )}

                {/* Hover overlay */}
                {!compareMode && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOutput(output);
                      }}
                      className="size-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <Expand className="size-3.5 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(output.id);
                      }}
                      className="size-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <Heart
                        className={cn(
                          "size-3.5",
                          output.isFavorite
                            ? "fill-red-400 text-red-400"
                            : "text-white"
                        )}
                      />
                    </button>
                    {output.generationPrompt && onReusePrompt && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReusePrompt(output);
                        }}
                        className="size-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                      >
                        <Repeat2 className="size-3.5 text-white" />
                      </button>
                    )}
                    <a
                      href={output.imageUrl}
                      download={`${output.format}_${output.id}.png`}
                      onClick={(e) => e.stopPropagation()}
                      className="size-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <Download className="size-3.5 text-white" />
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 space-y-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xs text-white/50 truncate">
                        {output.generationPrompt || "Sem prompt"}
                      </p>
                    </TooltipTrigger>
                    {output.generationPrompt && (
                      <TooltipContent
                        side="bottom"
                        className="max-w-xs bg-[#1a1a2e] border-white/10 text-white/80"
                      >
                        <p className="text-xs">{output.generationPrompt}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="text-[9px] border-white/10 text-white/40 px-1.5 py-0"
                    >
                      {output.format}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[9px] border-white/10 text-white/40 px-1.5 py-0"
                    >
                      {getModelName(output.modelUsed)}
                    </Badge>
                  </div>
                  {output.generationTimeMs && (
                    <span className="flex items-center gap-0.5 text-[9px] text-white/25">
                      <Clock className="size-2.5" />
                      {(output.generationTimeMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                <div className="text-[9px] text-white/25">
                  {new Date(output.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="border-white/10 text-white/60"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-white/50">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="border-white/10 text-white/60"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog
        open={!!selectedOutput && !compareMode}
        onOpenChange={(open) => {
          if (!open) setSelectedOutput(null);
        }}
      >
        <DialogContent className="bg-[#0a0a0f] border-white/10 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="border-white/10 text-white/50">
                {selectedOutput?.format}
              </Badge>
              {selectedOutput?.modelUsed && (
                <span className="text-sm font-normal text-white/40">
                  via {getModelName(selectedOutput.modelUsed)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOutput && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={selectedOutput.imageUrl}
                alt={`Geracao ${selectedOutput.format}`}
                className="max-h-[70vh] w-auto rounded-lg"
              />
              {selectedOutput.generationPrompt && (
                <div className="w-full p-3 rounded-lg bg-white/[0.02] border border-white/10">
                  <p className="text-xs text-white/40 mb-1">Prompt</p>
                  <p className="text-sm text-white/70">
                    {selectedOutput.generationPrompt}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleFavorite(selectedOutput.id)}
                  className="border-white/10 text-white/70"
                >
                  <Heart
                    className={cn(
                      "size-4 mr-1",
                      selectedOutput.isFavorite
                        ? "fill-red-400 text-red-400"
                        : ""
                    )}
                  />
                  {selectedOutput.isFavorite ? "Desfavoritar" : "Favoritar"}
                </Button>
                {selectedOutput.generationPrompt && onReusePrompt && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReusePrompt(selectedOutput)}
                    className="border-white/10 text-white/70"
                  >
                    <Repeat2 className="size-4 mr-1" />
                    Reusar Prompt
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild className="border-white/10 text-white/70">
                  <a
                    href={selectedOutput.imageUrl}
                    download={`${selectedOutput.format}_${selectedOutput.id}.png`}
                  >
                    <Download className="size-4 mr-1" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog
        open={compareMode && selectedForCompare.length >= 2 && !selectedOutput}
        onOpenChange={(open) => {
          if (!open) setSelectedForCompare([]);
        }}
      >
        <DialogContent className="bg-[#0a0a0f] border-white/10 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Comparacao de Imagens ({comparedOutputs.length})
            </DialogTitle>
          </DialogHeader>
          <div
            className={cn(
              "grid gap-4",
              comparedOutputs.length <= 2 ? "grid-cols-2" : "grid-cols-2"
            )}
          >
            {comparedOutputs.map((output) => (
              <div key={output.id} className="space-y-2">
                <div className="rounded-lg overflow-hidden border border-white/10">
                  <img
                    src={output.imageUrl}
                    alt={`Comparacao ${output.format}`}
                    className="w-full h-auto"
                  />
                </div>
                <div className="space-y-1 px-1">
                  <p className="text-xs text-white/60 line-clamp-2">
                    {output.generationPrompt || "Sem prompt"}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="text-[9px] border-white/10 text-white/40"
                    >
                      {output.format}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[9px] border-white/10 text-white/40"
                    >
                      {getModelName(output.modelUsed)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
