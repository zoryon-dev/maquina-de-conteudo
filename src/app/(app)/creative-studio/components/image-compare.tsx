/**
 * Image Compare View
 *
 * Side-by-side comparison of 2-4 selected images with metadata.
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CREATIVE_MODELS } from "@/lib/creative-studio/constants";

interface CompareImage {
  id: number;
  imageUrl: string;
  format: string;
  generationPrompt: string | null;
  modelUsed: string | null;
  generationTimeMs: number | null;
  createdAt: Date;
}

interface ImageCompareProps {
  images: CompareImage[];
  onClose: () => void;
  className?: string;
}

export function ImageCompare({
  images,
  onClose,
  className,
}: ImageCompareProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const getModelName = (modelId: string | null) => {
    if (!modelId) return "Desconhecido";
    const model = CREATIVE_MODELS.find((m) => m.id === modelId);
    return model ? model.name : modelId.split("/").pop() ?? modelId;
  };

  const gridCols =
    images.length <= 2
      ? "grid-cols-2"
      : "grid-cols-2";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-lg flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">
            Comparacao de Imagens
          </h2>
          <span className="text-sm text-white/40">
            {images.length} imagen{images.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            disabled={zoomLevel <= 0.5}
            className="border-white/10 text-white/60"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="text-xs text-white/40 w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
            disabled={zoomLevel >= 2}
            className="border-white/10 text-white/60"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-white/10 text-white/60 ml-2"
          >
            <X className="size-4 mr-1" />
            Fechar
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className={cn("grid gap-4", gridCols)}>
          {images.map((image) => (
            <div key={image.id} className="space-y-3">
              {/* Image */}
              <div
                className="rounded-xl overflow-hidden border border-white/10 bg-black/20"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
              >
                <img
                  src={image.imageUrl}
                  alt={`Comparacao ${image.format}`}
                  className="w-full h-auto"
                />
              </div>

              {/* Metadata */}
              <div className="space-y-2 px-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] border-white/10 text-white/50"
                  >
                    {image.format}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-primary/30 text-primary/70"
                  >
                    {getModelName(image.modelUsed)}
                  </Badge>
                  {image.generationTimeMs && (
                    <span className="text-[10px] text-white/30">
                      {(image.generationTimeMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                {image.generationPrompt && (
                  <p className="text-xs text-white/50 line-clamp-3">
                    {image.generationPrompt}
                  </p>
                )}
                <p className="text-[10px] text-white/25">
                  {new Date(image.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
