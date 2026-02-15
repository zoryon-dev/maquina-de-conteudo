"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { downloadZip } from "@/lib/export/zip-generator";
import { toast } from "sonner";

interface OutputItem {
  id: number;
  imageUrl: string;
  format: string;
  width?: number | null;
  height?: number | null;
  modelUsed?: string | null;
  generationTimeMs?: number | null;
  isFavorite?: boolean | null;
}
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  Download,
  Trash2,
  Expand,
  PackageOpen,
  Clock,
  Loader2,
} from "lucide-react";

interface OutputGridProps {
  outputs: OutputItem[];
  onFavorite?: (id: number) => void;
  onDelete?: (id: number) => void;
  onDownloadAll?: () => void;
  isLoading?: boolean;
  expectedCount?: number;
}

export function OutputGrid({
  outputs,
  onFavorite,
  onDelete,
  onDownloadAll,
  isLoading,
  expectedCount,
}: OutputGridProps) {
  const [selectedOutput, setSelectedOutput] = useState<OutputItem | null>(
    null
  );
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAll = useCallback(async () => {
    if (onDownloadAll) {
      onDownloadAll();
      return;
    }

    if (outputs.length === 0) return;

    setIsDownloading(true);
    try {
      const entries = outputs.map((output, index) => ({
        name: `${output.format}_${String(index + 1).padStart(2, "0")}.png`,
        url: output.imageUrl,
      }));

      const timestamp = Date.now();
      await downloadZip(entries, `creative-studio-${timestamp}.zip`);
      toast.success("Download concluido!");
    } catch (error) {
      console.error("[OutputGrid] Download all error:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao gerar ZIP"
      );
    } finally {
      setIsDownloading(false);
    }
  }, [outputs, onDownloadAll]);

  if (outputs.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <PackageOpen className="size-10 text-white/20 mb-3" />
        <p className="text-sm text-white/40">Nenhuma imagem gerada ainda</p>
      </div>
    );
  }

  return (
    <>
      {/* Header with download all */}
      {outputs.length > 1 && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-white/60">
            {outputs.length} imagen{outputs.length > 1 ? "s" : ""} gerada
            {outputs.length > 1 ? "s" : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            disabled={isDownloading}
            className="border-white/10 text-white/70 hover:text-white"
          >
            {isDownloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {isDownloading ? "Gerando ZIP..." : "Baixar Todas"}
          </Button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {outputs.map((output) => (
          <div
            key={output.id}
            className="group relative rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] transition-all hover:border-white/20"
          >
            {/* Image */}
            <div className="relative aspect-square bg-black/20">
              <img
                src={output.imageUrl}
                alt={`Output ${output.format}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setSelectedOutput(output)}
                  className="size-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Expand className="size-4 text-white" />
                </button>
                {onFavorite && (
                  <button
                    onClick={() => onFavorite(output.id)}
                    className="size-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Heart
                      className={cn(
                        "size-4",
                        output.isFavorite
                          ? "fill-red-400 text-red-400"
                          : "text-white"
                      )}
                    />
                  </button>
                )}
                <a
                  href={output.imageUrl}
                  download={`${output.format}_${output.id}.png`}
                  className="size-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Download className="size-4 text-white" />
                </a>
                {onDelete && (
                  <button
                    onClick={() => onDelete(output.id)}
                    className="size-9 rounded-full bg-red-500/10 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="size-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2">
              <Badge
                variant="outline"
                className="text-[10px] border-white/10 text-white/50"
              >
                {output.format}
              </Badge>
              {output.generationTimeMs && (
                <span className="flex items-center gap-1 text-[10px] text-white/30">
                  <Clock className="size-3" />
                  {(output.generationTimeMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Loading skeletons */}
        {isLoading &&
          Array.from({ length: Math.max(0, (expectedCount ?? 3) - outputs.length) }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
            >
              <div className="aspect-square bg-white/5 animate-pulse" />
              <div className="px-3 py-2">
                <div className="h-4 w-12 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
      </div>

      {/* Fullscreen dialog */}
      <Dialog
        open={!!selectedOutput}
        onOpenChange={(open) => {
          if (!open) setSelectedOutput(null);
        }}
      >
        <DialogContent className="bg-[#0a0a0f] border-white/10 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-white/10 text-white/50"
              >
                {selectedOutput?.format}
              </Badge>
              {selectedOutput?.modelUsed && (
                <span className="text-sm font-normal text-white/40">
                  via {selectedOutput.modelUsed.split("/").pop()}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOutput && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={selectedOutput.imageUrl}
                alt={`Output ${selectedOutput.format}`}
                className="max-h-[70vh] w-auto rounded-lg"
              />
              <div className="flex gap-2">
                {onFavorite && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onFavorite(selectedOutput.id)}
                    className="border-white/10 text-white/70"
                  >
                    <Heart
                      className={cn(
                        "size-4",
                        selectedOutput.isFavorite
                          ? "fill-red-400 text-red-400"
                          : ""
                      )}
                    />
                    Favoritar
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild className="border-white/10 text-white/70">
                  <a
                    href={selectedOutput.imageUrl}
                    download={`${selectedOutput.format}_${selectedOutput.id}.png`}
                  >
                    <Download className="size-4" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
