/**
 * Step Finalizar - Finalization Step
 *
 * Final step of the condensed 4-step wizard flow (v2.1).
 * Shows a summary of the created content and provides action buttons:
 * - "Salvar na Biblioteca" (save as draft)
 * - "Abrir no Visual Studio" (navigate to visual studio for carousel/image)
 * - "Agendar Publicacao" (opens schedule drawer)
 * - "Publicar Agora" (if social connected — future feature)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Library,
  Paintbrush,
  Calendar,
  Check,
  Loader2,
  FileText,
  Film,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PostType } from "@/db/schema";

// ============================================================================
// TYPES
// ============================================================================

interface StepFinalizarProps {
  wizardId: number;
  contentType: PostType;
  generatedContent: string;
  numberOfSlides?: number;
  onOpenVisualStudio: () => void;
  onBack: () => void;
  className?: string;
}

const CONTENT_TYPE_CONFIG: Record<PostType, {
  label: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  supportsVisualStudio: boolean;
}> = {
  text: {
    label: "Post de Texto",
    icon: FileText,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/20",
    supportsVisualStudio: false,
  },
  image: {
    label: "Post de Imagem",
    icon: ImageIcon,
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-pink-500/20",
    supportsVisualStudio: true,
  },
  carousel: {
    label: "Carrossel",
    icon: Film,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-amber-500/20",
    supportsVisualStudio: true,
  },
  video: {
    label: "Video",
    icon: Film,
    color: "text-red-400",
    gradient: "from-red-500/20 to-rose-500/20",
    supportsVisualStudio: false,
  },
  story: {
    label: "Story",
    icon: ImageIcon,
    color: "text-green-400",
    gradient: "from-green-500/20 to-emerald-500/20",
    supportsVisualStudio: true,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function getContentSummary(generatedContent: string, contentType: PostType): {
  title: string;
  slidesCount?: number;
  hasHashtags: boolean;
  hasCaption: boolean;
} {
  try {
    const parsed = JSON.parse(generatedContent);

    // ZoryonCarousel format
    if (parsed.throughline && parsed.capa && parsed.slides) {
      return {
        title: parsed.capa?.texto1 || parsed.throughline?.substring(0, 60) || "Carrossel",
        slidesCount: (parsed.slides?.length ?? 0) + 1, // +1 for capa
        hasHashtags: !!parsed.hashtags?.length,
        hasCaption: !!parsed.caption,
      };
    }

    // GeneratedContent format
    if (parsed.type && parsed.metadata) {
      return {
        title: parsed.metadata?.narrativeTitle || parsed.slides?.[0]?.title || "Conteudo gerado",
        slidesCount: parsed.slides?.length,
        hasHashtags: !!parsed.hashtags?.length,
        hasCaption: !!parsed.caption,
      };
    }

    // VideoScriptStructured format
    if (parsed.meta && parsed.roteiro) {
      return {
        title: parsed.meta?.valor_central || "Roteiro de video",
        hasHashtags: !!parsed.hashtags?.length,
        hasCaption: !!parsed.caption,
      };
    }

    return {
      title: "Conteudo gerado",
      hasHashtags: false,
      hasCaption: false,
    };
  } catch {
    return {
      title: "Conteudo gerado",
      hasHashtags: false,
      hasCaption: false,
    };
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StepFinalizar({
  wizardId,
  contentType,
  generatedContent,
  numberOfSlides,
  onOpenVisualStudio,
  onBack,
  className,
}: StepFinalizarProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [savedLibraryItemId, setSavedLibraryItemId] = useState<number | null>(null);

  const config = CONTENT_TYPE_CONFIG[contentType];
  const Icon = config.icon;
  const summary = getContentSummary(generatedContent, contentType);

  // Save to library
  const handleSaveToLibrary = async () => {
    setIsSaving(true);

    try {
      // Mark wizard as completed
      await fetch(`/api/wizard/${wizardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: "completed" }),
      });

      // Save content to library
      const response = await fetch(`/api/wizard/${wizardId}/save-to-library`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          generatedContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle already-saved case
        if (response.status === 409 && errorData.libraryItemId) {
          setSavedToLibrary(true);
          setSavedLibraryItemId(errorData.libraryItemId);
          toast.info("Este conteudo ja foi salvo na biblioteca!");
          return;
        }

        throw new Error(errorData.error || "Falha ao salvar na biblioteca");
      }

      const result = await response.json();
      setSavedToLibrary(true);
      setSavedLibraryItemId(result.libraryItemId);
      toast.success("Conteudo salvo na biblioteca!");
    } catch (error) {
      console.error("[StepFinalizar] Save error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar na biblioteca");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("max-w-3xl mx-auto", className)}>
      {/* Header */}
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
          className={cn(
            "inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br mb-6",
            config.gradient
          )}
        >
          <Icon className={cn("w-10 h-10", config.color)} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold text-white mb-3"
        >
          Seu conteudo esta pronto!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white/60 text-lg"
        >
          Escolha o que fazer com o {config.label.toLowerCase()} gerado
        </motion.p>
      </div>

      {/* Content Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-8 p-5 rounded-2xl bg-white/[0.03] border border-white/10"
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
            config.gradient
          )}>
            <Icon className={cn("w-6 h-6", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-medium mb-1 uppercase tracking-wider">
              {config.label}
            </p>
            <h3 className="text-base font-semibold text-white truncate mb-2">
              {summary.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
              {summary.slidesCount && (
                <span className="flex items-center gap-1">
                  <Film className="w-3 h-3" />
                  {summary.slidesCount} slide{summary.slidesCount > 1 ? "s" : ""}
                </span>
              )}
              {summary.hasCaption && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Caption incluida
                </span>
              )}
              {summary.hasHashtags && (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Hashtags incluidas
                </span>
              )}
              <span className="text-white/30">
                Wizard #{wizardId}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Primary: Save to Library */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {savedToLibrary ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Salvo na biblioteca!</p>
                  <p className="text-xs text-white/50">Voce pode acessar a qualquer momento</p>
                </div>
              </div>
              {savedLibraryItemId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/library/${savedLibraryItemId}`)}
                  className="flex-shrink-0 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Ver
                </Button>
              )}
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={handleSaveToLibrary}
              disabled={isSaving}
              className="w-full h-14 text-base bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando na biblioteca...
                </>
              ) : (
                <>
                  <Library className="w-5 h-5 mr-2" />
                  Salvar na Biblioteca
                </>
              )}
            </Button>
          )}
        </motion.div>

        {/* Secondary: Open in Visual Studio (only for carousel/image/story) */}
        {config.supportsVisualStudio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onOpenVisualStudio}
              className="w-full h-12 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
            >
              <Paintbrush className="w-5 h-5 mr-2" />
              Abrir no Visual Studio
            </Button>
          </motion.div>
        )}

        {/* Tertiary: Schedule Publication */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              if (savedLibraryItemId) {
                router.push(`/library/${savedLibraryItemId}`);
              } else {
                toast.info("Salve na biblioteca primeiro para agendar a publicacao");
              }
            }}
            className="w-full h-12 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Agendar Publicacao
          </Button>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex items-center justify-between pt-6 border-t border-white/10"
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-white/50 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar
          </Button>

          <div className="flex items-center gap-3">
            {savedToLibrary && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/library")}
                className="text-white/50 hover:text-white"
              >
                Ir para Biblioteca
                <ExternalLink className="w-4 h-4 ml-1.5" />
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/wizard")}
              className="text-primary hover:text-primary/80"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Criar Novo
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
