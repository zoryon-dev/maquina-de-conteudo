/**
 * Step 4 - Generation with Preview
 *
 * Shows generation progress and final result.
 * Polls GET /api/wizard/[id] until generatedContent is ready.
 * Displays preview with options to save to library, regenerate, or download.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  FileText,
  Image,
  Film,
  Download,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
  Copy,
  Eye,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Lightbulb,
  Video,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { PostType } from "@/db/schema";
import type { GeneratedSlide, GeneratedContent, VideoScriptStructured } from "@/lib/wizard-services/types";
import { VideoThumbnailGeneration } from "../shared/video-thumbnail-generation";

// Re-export for external use
export type { GeneratedSlide, GeneratedContent };

export interface GenerationStatus {
  step: "idle" | "generating" | "completed" | "failed";
  message: string;
  progress?: number;
  error?: string;
}

interface Step4GenerationProps {
  wizardId: number;
  contentType: PostType;
  numberOfSlides?: number;
  onComplete?: (content: GeneratedContent) => void;
  onSaveToLibrary?: (content: GeneratedContent) => Promise<void>;
  onRegenerate?: () => void;
  className?: string;
}

const CONTENT_TYPE_ICONS: Record<PostType, React.ElementType> = {
  text: FileText,
  image: Image,
  carousel: Film,
  video: Film,
  story: Image,
};

const CONTENT_TYPE_LABELS: Record<PostType, string> = {
  text: "Post de Texto",
  image: "Post de Imagem",
  carousel: "Carrossel",
  video: "Vídeo",
  story: "Story",
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if script is VideoScriptStructured (v4.3)
 */
function isVideoScriptStructured(script: string | VideoScriptStructured | undefined): script is VideoScriptStructured {
  return script !== undefined && typeof script === "object" && "meta" in script && "thumbnail" in script && "roteiro" in script;
}

// ============================================================================
// VIDEO SCRIPT PREVIEW COMPONENT (v4.3)
// ============================================================================

interface VideoScriptPreviewProps {
  script: VideoScriptStructured;
}

function VideoScriptPreview({ script }: VideoScriptPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    meta: true,
    thumbnail: true,
    hook: true,
    desenvolvimento: true,
    cta: true,
    notasProducao: false,
    caption: false,
    hashtags: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Get badge color for section type
  const getSectionTypeColor = (tipo: string) => {
    const colors: Record<string, string> = {
      problema: "bg-red-500/20 text-red-400 border-red-500/30",
      conceito: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      passo: "bg-green-500/20 text-green-400 border-green-500/30",
      exemplo: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      erro: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      contraste: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      sintese: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      cta: "bg-primary/20 text-primary border-primary/30",
    };
    return colors[tipo] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  return (
    <div className="space-y-3">
      {/* Meta Section */}
      <CollapsibleSection
        title="Meta (Valor Central)"
        icon={Sparkles}
        expanded={expandedSections.meta}
        onToggle={() => toggleSection("meta")}
        className="border-primary/20 bg-primary/5"
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs text-white/50 mb-1">Duração Estimada</p>
            <p className="text-sm font-medium text-white">{script.meta.duracao_estimada}</p>
          </div>
          <div>
            <p className="text-xs text-white/50 mb-1">Ângulo Tribal</p>
            <p className="text-sm font-medium text-white capitalize">{script.meta.angulo_tribal}</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/20 to-green-500/20 border border-primary/30">
            <p className="text-xs text-primary/80 mb-1">💎 Valor Central</p>
            <p className="text-sm text-white font-medium">{script.meta.valor_central}</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Thumbnail Section */}
      <CollapsibleSection
        title="Thumbnail"
        icon={Palette}
        expanded={expandedSections.thumbnail}
        onToggle={() => toggleSection("thumbnail")}
        className="border-purple-500/20 bg-purple-500/5"
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
            <p className="text-xs text-white/50 mb-1">🎯 Título</p>
            <p className="text-base font-bold text-white">{script.thumbnail.titulo}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
              <p className="text-xs text-white/50 mb-1">😶 Expressão</p>
              <p className="text-xs text-white/80">{script.thumbnail.expressao}</p>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
              <p className="text-xs text-white/50 mb-1">✏️ Texto Overlay</p>
              <p className="text-xs text-white/80">{script.thumbnail.texto_overlay}</p>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
            <p className="text-xs text-white/50 mb-1">🎨 Estilo</p>
            <p className="text-xs text-white/80">{script.thumbnail.estilo}</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Hook Section */}
      <CollapsibleSection
        title="Hook"
        icon={Target}
        expanded={expandedSections.hook}
        onToggle={() => toggleSection("hook")}
        className="border-yellow-500/20 bg-yellow-500/5"
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
            <p className="text-xs text-white/50 mb-1">📢 Texto</p>
            <p className="text-sm text-white font-medium">{script.roteiro.hook.texto}</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 p-2 rounded-lg bg-white/[0.02] border border-white/10">
              <p className="text-xs text-white/50 mb-1">Tipo</p>
              <p className="text-xs text-white/80 capitalize">{script.roteiro.hook.tipo}</p>
            </div>
            <div className="flex-[2] p-2 rounded-lg bg-white/[0.02] border border-white/10">
              <p className="text-xs text-white/50 mb-1">📹 Nota Gravação</p>
              <p className="text-xs text-white/80">{script.roteiro.hook.nota_gravacao}</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Desenvolvimento (Development Sections) */}
      <CollapsibleSection
        title={`Desenvolvimento (${script.roteiro.desenvolvimento.length} seções)`}
        icon={Lightbulb}
        expanded={expandedSections.desenvolvimento}
        onToggle={() => toggleSection("desenvolvimento")}
        className="border-blue-500/20 bg-blue-500/5"
      >
        <div className="space-y-3">
          {script.roteiro.desenvolvimento.map((secao, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/10"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded border font-medium",
                  getSectionTypeColor(secao.tipo)
                )}>
                  {secao.numero}. {secao.tipo.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-primary mb-1">{secao.topico}</p>
                  <p className="text-sm text-white/90">{secao.insight}</p>
                </div>
                {secao.exemplo && (
                  <div className="p-2 rounded bg-white/[0.02] border-l-2 border-primary/50">
                    <p className="text-xs text-white/50 mb-1">💡 Exemplo</p>
                    <p className="text-xs text-white/80 italic">{secao.exemplo}</p>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-white/50">➡️ {secao.transicao}</p>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-white/40">📹 {secao.nota_gravacao}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CollapsibleSection>

      {/* CTA Section */}
      <CollapsibleSection
        title="Call-to-Action"
        icon={Target}
        expanded={expandedSections.cta}
        onToggle={() => toggleSection("cta")}
        className="border-green-500/20 bg-green-500/5"
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs text-primary/80 mb-1">📢 Convite</p>
            <p className="text-sm text-white font-medium">{script.roteiro.cta.texto}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
            <p className="text-xs text-white/50 mb-1">➡️ Próximo Passo</p>
            <p className="text-sm text-white/80">{script.roteiro.cta.proximo_passo}</p>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
            <p className="text-xs text-white/40">📹 {script.roteiro.cta.nota_gravacao}</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Notas de Produção */}
      <CollapsibleSection
        title="Notas de Produção"
        icon={Video}
        expanded={expandedSections.notasProducao}
        onToggle={() => toggleSection("notasProducao")}
        className="border-gray-500/20 bg-gray-500/5"
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs text-white/50 mb-1">🎭 Tom Geral</p>
            <p className="text-sm text-white/80">{script.notas_producao.tom_geral}</p>
          </div>
          <div>
            <p className="text-xs text-white/50 mb-1">⏱️ Ritmo</p>
            <p className="text-sm text-white/80">{script.notas_producao.ritmo}</p>
          </div>
          <div>
            <p className="text-xs text-white/50 mb-1">🎵 Música Mood</p>
            <p className="text-sm text-white/80">{script.notas_producao.musica_mood}</p>
          </div>
          <div>
            <p className="text-xs text-white/50 mb-1">🎬 Visuais Chave</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {script.notas_producao.visuais_chave.map((visual, idx) => (
                <span
                  key={idx}
                  className="text-xs text-white/70 bg-white/[0.02] border border-white/10 px-2 py-1 rounded"
                >
                  {visual}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Caption */}
      <CollapsibleSection
        title="Caption"
        icon={FileText}
        expanded={expandedSections.caption}
        onToggle={() => toggleSection("caption")}
        className="border-indigo-500/20 bg-indigo-500/5"
      >
        <p className="text-sm text-white/80 whitespace-pre-wrap">{script.caption}</p>
      </CollapsibleSection>

      {/* Hashtags */}
      <CollapsibleSection
        title="Hashtags"
        icon={FileText}
        expanded={expandedSections.hashtags}
        onToggle={() => toggleSection("hashtags")}
        className="border-pink-500/20 bg-pink-500/5"
      >
        <div className="flex flex-wrap gap-2">
          {script.hashtags.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs text-primary/80 bg-primary/10 px-2 py-1 rounded-full"
            >
              {tag.startsWith("#") ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

function CollapsibleSection({ title, icon: Icon, expanded, onToggle, children, className }: CollapsibleSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border overflow-hidden", className)}
    >
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <Icon className="w-4 h-4 text-white/60 flex-shrink-0" />
        <span className="text-sm font-medium text-white flex-1 text-left">{title}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Step4Generation({
  wizardId,
  contentType,
  numberOfSlides = 1,
  onComplete,
  onSaveToLibrary,
  onRegenerate,
  className,
}: Step4GenerationProps) {
  const [status, setStatus] = useState<GenerationStatus>({
    step: "idle",
    message: "Preparando geração...",
  });
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "thumbnail" | "raw">("preview");

  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // Poll wizard status until content is ready
  useEffect(() => {
    isMountedRef.current = true;
    retryCountRef.current = 0;

    const pollWizardStatus = async () => {
      try {
        const response = await fetch(`/api/wizard/${wizardId}`);

        if (!response.ok) {
          if (response.status === 404 && isMountedRef.current) {
            setStatus({
              step: "failed",
              message: "Wizard não encontrado",
              error: "O wizard não existe ou foi excluído.",
            });
          }
          return;
        }

        const wizard = await response.json();

        // Check if content is ready
        if (wizard.generatedContent) {
          // generatedContent might be an object or a JSON string
          const generatedContent: GeneratedContent = typeof wizard.generatedContent === 'string'
            ? JSON.parse(wizard.generatedContent)
            : wizard.generatedContent;

          if (isMountedRef.current) {
            setContent(generatedContent);
            setStatus({
              step: "completed",
              message: "Conteúdo gerado com sucesso!",
              progress: 100,
            });

            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            // DON'T auto-call onComplete - let user review first
            // onComplete?.(generatedContent);
          }
          return;
        }

        // Check for job failure
        if (wizard.currentStep === "abandoned" || wizard.jobStatus === "failed") {
          if (isMountedRef.current) {
            setStatus({
              step: "failed",
              message: "Geração falhou",
              error: wizard.jobError || "Ocorreu um erro ao gerar o conteúdo.",
            });
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
          return;
        }

        // Update progress based on job status
        const jobStatus = wizard.jobStatus || "pending";
        let newStatus: GenerationStatus;

        switch (jobStatus) {
          case "pending":
            newStatus = {
              step: "idle",
              message: "Aguardando início da geração...",
            };
            break;
          case "processing":
            newStatus = {
              step: "generating",
              message: "Gerando conteúdo com IA...",
              progress: wizard.generationProgress?.percent ?? 50,
            };
            break;
          default:
            newStatus = {
              step: "idle",
              message: "Processando...",
            };
        }

        if (isMountedRef.current) {
          setStatus((prev) => {
            if (prev.step !== newStatus.step || prev.message !== newStatus.message) {
              return newStatus;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Error polling wizard status:", error);

        if (isMountedRef.current && retryCountRef.current < 3) {
          const backoffDelay = 1000 * Math.pow(2, retryCountRef.current);
          setTimeout(() => {
            if (isMountedRef.current) {
              retryCountRef.current += 1;
            }
          }, backoffDelay);
        } else if (isMountedRef.current) {
          setStatus({
            step: "failed",
            message: "Erro de conexão",
            error: "Não foi possível conectar ao servidor. Tente novamente.",
          });
        }
      }
    };

    // Initial poll
    pollWizardStatus();

    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(pollWizardStatus, 2000);

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [wizardId, onComplete]);

  const handleSaveToLibrary = async () => {
    if (!content || !onSaveToLibrary) return;

    setIsSaving(true);
    try {
      await onSaveToLibrary(content);
      setSavedToLibrary(true);
    } catch (error) {
      console.error("Error saving to library:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyContent = () => {
    if (!content) return;

    let text = "";

    if (content.slides && content.slides.length > 0) {
      // Carousel content
      text = content.slides
        .map((slide, i) => `Slide ${i + 1}:\n${slide.content}`)
        .join("\n\n");
    } else if (content.caption) {
      // Text/Image/Video content
      text = content.caption;
      if (content.cta) {
        text += `\n\nCTA: ${content.cta}`;
      }
      if (content.hashtags && content.hashtags.length > 0) {
        text += `\n\n${content.hashtags.map((tag) => tag.startsWith("#") ? tag : `#${tag}`).join(" ")}`;
      }
    } else if (content.script) {
      // Video script content
      text = typeof content.script === "string" ? content.script : JSON.stringify(content.script, null, 2);
    }

    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  const handleDownload = () => {
    if (!content) return;

    const text = JSON.stringify(content, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conteudo-${contentType}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ContentTypeIcon = CONTENT_TYPE_ICONS[contentType];
  const isFailed = status.step === "failed";
  const isCompleted = status.step === "completed" && content !== null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Generation Progress */}
      <AnimatePresence mode="wait">
        {!isCompleted && !isFailed && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Content Type Header */}
            <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <ContentTypeIcon className="w-6 h-6 text-primary" />
              <div>
                <h3 className="text-sm font-medium text-white">
                  {CONTENT_TYPE_LABELS[contentType]}
                </h3>
                <p className="text-xs text-white/50">
                  {numberOfSlides > 1
                    ? `${numberOfSlides} slides`
                    : `${numberOfSlides} slide`}
                </p>
              </div>
            </div>

            {/* Loading Animation */}
            <div className="flex flex-col items-center gap-4 py-8">
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-16 h-16 rounded-full border-4 border-white/10" />
                <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-t-transparent border-r-transparent border-b-primary border-l-primary" />
              </motion.div>

              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-white">
                  {status.message}
                </p>
                <p className="text-xs text-white/50">
                  Isso pode levar alguns segundos...
                </p>
              </div>

              {/* Progress Bar */}
              {status.progress !== undefined && (
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Progresso</span>
                    <span className="text-primary font-medium">
                      {Math.round(status.progress)}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-green-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${status.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Processing Steps */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {["Narrativa", "Contexto", "IA Generativa"].map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-3 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <div
                    className={cn(
                      "w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2",
                      (status.progress ?? 0) > (i + 1) * 30
                        ? "bg-green-500/20 text-green-400"
                        : (status.progress ?? 0) > i * 30
                          ? "bg-primary/20 text-primary animate-pulse"
                          : "bg-white/5 text-white/30"
                    )}
                  >
                    {(status.progress ?? 0) > (i + 1) * 30 ? (
                      <Check className="w-4 h-4" />
                    ) : (status.progress ?? 0) > i * 30 ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-medium">{i + 1}</span>
                    )}
                  </div>
                  <p className="text-xs text-white/60">{step}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Failed State */}
        {isFailed && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-white">{status.message}</p>
              {status.error && (
                <p className="text-xs text-white/50">{status.error}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onRegenerate}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </motion.div>
        )}

        {/* Completed State with Preview */}
        {isCompleted && content && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Success Header */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">
                    Conteúdo gerado com sucesso!
                  </h3>
                  <p className="text-xs text-white/60">
                    {CONTENT_TYPE_LABELS[contentType]}
                    {content.slides && ` • ${content.slides.length} slide${content.slides.length > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyContent}
                  className="h-8"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Baixar
                </Button>
              </div>
            </div>

            {/* Content Preview */}
            <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "preview" | "thumbnail" | "raw")}>
              <TabsList className={cn("grid w-full", contentType === "video" ? "grid-cols-3" : "grid-cols-2")}>
                <TabsTrigger value="preview">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </TabsTrigger>
                {contentType === "video" && (
                  <TabsTrigger value="thumbnail">
                    <Palette className="w-4 h-4 mr-2" />
                    Thumbnail
                  </TabsTrigger>
                )}
                <TabsTrigger value="raw">
                  <FileText className="w-4 h-4 mr-2" />
                  Raw
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-3 mt-4">
                {/* Slides Preview (for carousel) */}
                {content.slides && content.slides.length > 0 && (
                  <>
                    {content.slides.map((slide, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/10"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-medium text-primary">
                            Slide {index + 1}
                          </span>
                          {slide.title && (
                            <span className="text-xs text-white/60">
                              {slide.title}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/80 whitespace-pre-wrap">
                          {slide.content}
                        </p>
                        {slide.imagePrompt && (
                          <div className="mt-3 pt-3 border-t border-white/5">
                            <p className="text-xs text-white/40 mb-1">Image Prompt:</p>
                            <p className="text-xs text-white/50 italic">
                              {slide.imagePrompt}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </>
                )}

                {/* Caption/Script Preview (for text/image/video) */}
                {!content.slides || content.slides.length === 0 ? (
                  <>
                    {content.caption && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/10"
                      >
                        <p className="text-xs text-primary mb-2">Caption:</p>
                        <p className="text-sm text-white/80 whitespace-pre-wrap">
                          {content.caption}
                        </p>
                      </motion.div>
                    )}

                    {content.script && (
                      <>
                        {/* v4.0 Structured Video Script */}
                        {isVideoScriptStructured(content.script) ? (
                          <VideoScriptPreview script={content.script} />
                        ) : (
                          /* v3.0 Legacy String Script */
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-white/[0.02] border border-white/10"
                          >
                            <p className="text-xs text-primary mb-2">Script:</p>
                            <p className="text-sm text-white/80 whitespace-pre-wrap">
                              {content.script}
                            </p>
                          </motion.div>
                        )}
                      </>
                    )}

                    {(content.metadata as any)?.imagePrompt && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/10"
                      >
                        <p className="text-xs text-primary mb-2">Image Prompt:</p>
                        <p className="text-sm text-white/80 italic">
                          {(content.metadata as any).imagePrompt}
                        </p>
                      </motion.div>
                    )}
                  </>
                ) : null}

                {/* Hashtags & CTA (for all types) */}
                {(content.caption || content.hashtags || content.cta) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (content.slides?.length || 0) * 0.05 }}
                    className="p-4 rounded-xl bg-primary/5 border border-primary/20"
                  >
                    {content.cta && (
                      <div className="mb-3">
                        <p className="text-xs text-primary mb-1">CTA:</p>
                        <p className="text-sm text-white/80">{content.cta}</p>
                      </div>
                    )}
                    {content.hashtags && content.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {content.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs text-primary/80 bg-primary/10 px-2 py-1 rounded-full"
                          >
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </TabsContent>

              {/* Thumbnail Generation Tab (only for video content type) */}
              {contentType === "video" && (
                <TabsContent value="thumbnail" className="mt-4">
                  {isVideoScriptStructured(content.script) ? (
                    <VideoThumbnailGeneration
                      wizardId={wizardId}
                      thumbnailTitle={content.script.thumbnail.titulo}
                      contextoTematico={`${content.metadata.narrativeTitle} - ${content.script.meta.valor_central}`}
                      wizardContext={{
                        theme: content.metadata.narrativeTitle,
                        niche: content.metadata.narrativeAngle,
                      }}
                    />
                  ) : (
                    <div className="p-8 text-center text-white/60">
                      <Palette className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Geração de thumbnail disponível apenas para roteiros v4.3</p>
                    </div>
                  )}
                </TabsContent>
              )}

              <TabsContent value="raw" className="mt-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 overflow-auto max-h-96">
                  <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono">
                    {JSON.stringify(content, null, 2)}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={onRegenerate}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerar
              </Button>
              <Button
                onClick={() => onComplete?.(content)}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Check className="w-4 h-4 mr-2" />
                Aprovar e Continuar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
