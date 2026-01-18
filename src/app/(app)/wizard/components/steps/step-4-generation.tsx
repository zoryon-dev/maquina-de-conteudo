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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { PostType } from "@/db/schema";

export interface GeneratedSlide {
  title?: string;
  content: string;
  imagePrompt?: string;
}

export interface GeneratedContent {
  type: PostType;
  slides: GeneratedSlide[];
  caption?: string;
  hashtags?: string[];
  cta?: string;
  metadata?: {
    narrative?: string;
    model?: string;
    generatedAt?: string;
  };
}

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
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");

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
          const generatedContent: GeneratedContent = JSON.parse(
            wizard.generatedContent
          );

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

            // Notify parent component
            onComplete?.(generatedContent);
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

    const text = content.slides
      .map((slide, i) => `Slide ${i + 1}:\n${slide.content}`)
      .join("\n\n");

    navigator.clipboard.writeText(text);
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
                    {CONTENT_TYPE_LABELS[contentType]} • {content.slides.length}{" "}
                    slide{content.slides.length > 1 ? "s" : ""}
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
            <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "preview" | "raw")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="raw">
                  <FileText className="w-4 h-4 mr-2" />
                  Raw
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-3 mt-4">
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

                {/* Caption & Hashtags */}
                {(content.caption || content.hashtags) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: content.slides.length * 0.05 }}
                    className="p-4 rounded-xl bg-primary/5 border border-primary/20"
                  >
                    {content.caption && (
                      <div className="mb-3">
                        <p className="text-xs text-primary mb-1">Caption:</p>
                        <p className="text-sm text-white/80">{content.caption}</p>
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

              <TabsContent value="raw" className="mt-4">
                <div className="p-4 rounded-xl bg-black/30 border border-white/10 overflow-auto max-h-96">
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
                onClick={handleSaveToLibrary}
                disabled={isSaving || savedToLibrary}
                className="flex-1"
              >
                {savedToLibrary ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Salvo na biblioteca
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Salvando..." : "Salvar na biblioteca"}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
