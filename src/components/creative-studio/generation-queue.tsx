"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GenerationQueueProps {
  isGenerating: boolean;
  progress?: {
    current: number;
    total: number;
    format?: string;
    model?: string;
  };
  error?: string | null;
  onDismiss?: () => void;
}

export function GenerationQueue({
  isGenerating,
  progress,
  error,
  onDismiss,
}: GenerationQueueProps) {
  const isDone = !isGenerating && progress && progress.current >= progress.total;
  const hasError = !!error;
  const show = isGenerating || isDone || hasError;

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md"
        >
          <div
            className={cn(
              "rounded-xl border px-4 py-3 shadow-xl shadow-black/30 backdrop-blur-xl",
              hasError
                ? "border-red-500/30 bg-red-950/80"
                : isDone
                  ? "border-primary/30 bg-[#0a0a0f]/90"
                  : "border-white/10 bg-[#0a0a0f]/90"
            )}
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              {hasError ? (
                <XCircle className="size-5 text-red-400 shrink-0" />
              ) : isDone ? (
                <CheckCircle2 className="size-5 text-primary shrink-0" />
              ) : (
                <Loader2 className="size-5 text-primary animate-spin shrink-0" />
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white truncate">
                    {hasError
                      ? "Erro na geração"
                      : isDone
                        ? "Geração concluída!"
                        : "Gerando imagens..."}
                  </p>
                  {progress && !hasError && (
                    <span className="text-xs text-white/50 ml-2 shrink-0">
                      {progress.current}/{progress.total}
                    </span>
                  )}
                </div>

                {/* Detail line */}
                {hasError ? (
                  <p className="text-xs text-red-400/80 truncate mt-0.5">
                    {error}
                  </p>
                ) : progress?.format || progress?.model ? (
                  <p className="text-xs text-white/40 truncate mt-0.5">
                    {[progress.format, progress.model?.split("/").pop()]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                ) : null}

                {/* Progress bar */}
                {isGenerating && progress && (
                  <div className="mt-2">
                    <Progress value={progressPercent} className="h-1" />
                  </div>
                )}
              </div>

              {/* Dismiss */}
              {(isDone || hasError) && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-xs text-white/40 hover:text-white/60 transition-colors shrink-0 ml-2"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
