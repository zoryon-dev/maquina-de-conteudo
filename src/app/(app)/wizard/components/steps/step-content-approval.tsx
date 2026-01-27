/**
 * Step: Content Approval
 *
 * Displays generated content for user approval.
 * User can: Approve, Regenerate, or Edit manually.
 * This is a simplified approval interface after content generation.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  RefreshCw,
  Edit,
  FileText,
  Film,
  Image,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles,
  Target,
  Lightbulb,
  Clock,
  Wand2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PostType } from "@/db/schema";
import type { VideoScriptStructured } from "@/lib/wizard-services/types";

interface ContentApprovalProps {
  wizardId: number;
  contentType: PostType;
  generatedContent: string;
  onApprove: (content: string) => void;
  onRegenerate: () => void;
  onBack?: () => void;
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

// Type guard for VideoScriptStructured
function isVideoScriptStructured(content: unknown): content is VideoScriptStructured {
  return (
    content !== null &&
    typeof content === "object" &&
    "meta" in content &&
    "thumbnail" in content &&
    "roteiro" in content
  );
}

export function StepContentApproval({
  wizardId,
  contentType,
  generatedContent,
  onApprove,
  onRegenerate,
  onBack,
  className,
}: ContentApprovalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(generatedContent);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    details: false,
  });

  // Refactor dialog states
  const [showRefactorDialog, setShowRefactorDialog] = useState(false);
  const [refactorInstructions, setRefactorInstructions] = useState("");
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [refactorError, setRefactorError] = useState<string | null>(null);

  const ContentTypeIcon = CONTENT_TYPE_ICONS[contentType];
  const contentTypeLabel = CONTENT_TYPE_LABELS[contentType];

  // Parse content
  let parsedContent: VideoScriptStructured | Record<string, unknown> | null = null;
  try {
    parsedContent = JSON.parse(generatedContent);
  } catch {
    parsedContent = null;
  }

  const isVideo = contentType === "video" && isVideoScriptStructured(parsedContent);
  const hasValidContent = parsedContent !== null || generatedContent.length > 0;

  const handleApprove = () => {
    const contentToSave = isEditing ? editedContent : generatedContent;
    onApprove(contentToSave);
  };

  const handleRefactor = async () => {
    if (!refactorInstructions.trim()) {
      setRefactorError("Por favor, descreva o que deseja melhorar.");
      return;
    }

    setIsRefactoring(true);
    setRefactorError(null);

    try {
      const response = await fetch(`/api/wizard/${wizardId}/refactor-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refactorInstructions: refactorInstructions.trim(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Falha ao refatorar roteiro");
      }

      // Update content with refactored version
      const newContent = data.data?.script || generatedContent;
      setEditedContent(newContent);
      setGeneratedContent(newContent); // Update parent if needed
      setShowRefactorDialog(false);
      setRefactorInstructions("");
    } catch (err) {
      setRefactorError(err instanceof Error ? err.message : "Erro ao refatorar");
    } finally {
      setIsRefactoring(false);
    }
  };

  const openRefactorDialog = () => {
    setShowRefactorDialog(true);
    setRefactorError(null);
  };

  // Update generatedContent when prop changes
  const setGeneratedContent = (newContent: string) => {
    // This would typically update parent state via callback
    // For now, we'll just update local editedContent
    setEditedContent(newContent);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className={cn("w-full max-w-5xl mx-auto px-4 py-8", className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6"
        >
          <ContentTypeIcon className="w-8 h-8 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          Revise seu {contentTypeLabel}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-white/70 max-w-2xl mx-auto"
        >
          {isEditing
            ? "Edite o conteúdo abaixo e aprove quando estiver satisfeito."
            : "Revise o conteúdo gerado. Você pode aprovar, regenerar ou editar manualmente."}
        </motion.p>
      </div>

      {/* Content Preview */}
      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8"
          >
            {/* Video Script Overview */}
            {isVideo && parsedContent && (
              <div className="space-y-4 mb-6">
                {/* Overview Card */}
                <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSection("overview")}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-primary" />
                      <span className="text-lg font-semibold text-white">
                        Visão Geral
                      </span>
                    </div>
                    {expandedSections.overview ? (
                      <ChevronUp className="w-5 h-5 text-white/60" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/60" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections.overview && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-white/50" />
                            <span className="text-white/70">Duração:</span>
                            <span className="text-white font-medium">
                              {(parsedContent as VideoScriptStructured).meta?.duracao_estimada || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Lightbulb className="w-4 h-4 text-white/50" />
                            <span className="text-white/70">Valor Central:</span>
                            <span className="text-white font-medium">
                              {(parsedContent as VideoScriptStructured).meta?.valor_central || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-white/50" />
                            <span className="text-white/70">Ângulo Tribal:</span>
                            <span className="text-white font-medium capitalize">
                            {(parsedContent as VideoScriptStructured).meta?.angulo_tribal || "N/A"}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Details Card */}
                <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSection("details")}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-primary" />
                      <span className="text-lg font-semibold text-white">
                        Detalhes do Roteiro
                      </span>
                    </div>
                    {expandedSections.details ? (
                      <ChevronUp className="w-5 h-5 text-white/60" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/60" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections.details && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-4 space-y-4 max-h-96 overflow-y-auto">
                          {/* Hook */}
                          <div>
                            <h4 className="text-sm font-semibold text-white/80 mb-2">Hook</h4>
                            <p className="text-sm text-white/60 bg-white/[0.02] rounded-lg p-3">
                              {(parsedContent as VideoScriptStructured).roteiro?.hook?.texto || "N/A"}
                            </p>
                          </div>

                          {/* Development Sections */}
                          <div>
                            <h4 className="text-sm font-semibold text-white/80 mb-2">Desenvolvimento</h4>
                            <div className="space-y-2">
                              {(parsedContent as VideoScriptStructured).roteiro?.desenvolvimento?.slice(0, 3).map((section, idx) => (
                                <div key={idx} className="text-sm bg-white/[0.02] rounded-lg p-3">
                                  <p className="text-white font-medium mb-1">
                                    {section.topico}
                                  </p>
                                  <p className="text-white/60 text-xs">
                                    {section.insight}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* CTA */}
                          <div>
                            <h4 className="text-sm font-semibold text-white/80 mb-2">Call to Action</h4>
                            <p className="text-sm text-white/60 bg-white/[0.02] rounded-lg p-3">
                              {(parsedContent as VideoScriptStructured).roteiro?.cta?.texto || "N/A"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Non-video or raw content preview */}
            {(!isVideo || !parsedContent) && (
              <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Conteúdo Gerado</h3>
                <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-white/80 whitespace-pre-wrap font-mono">
                    {generatedContent}
                  </pre>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8"
          >
            <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor="content-editor" className="text-lg font-semibold text-white">
                  Editar Conteúdo
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditedContent(generatedContent)}
                  className="text-white/70 hover:text-white"
                >
                  Resetar
                </Button>
              </div>
              <Textarea
                id="content-editor"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[400px] bg-black/30 text-white/90 border-white/10 focus:border-primary font-mono text-sm"
                placeholder="Edite o conteúdo aqui..."
              />
              <p className="text-xs text-white/50 mt-2">
                💡 Formato JSON para vídeos. Edite com cuidado para manter a estrutura válida.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Box */}
      {hasValidContent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 p-4 rounded-lg bg-primary/10 border border-primary/20"
        >
          <p className="text-sm text-white/80 text-center">
            ✨ {isVideo ? "Roteiro estruturado" : "Conteúdo"} gerado com sucesso!
            {isVideo && " Você poderá revisar e gerar títulos e thumbnail nos próximos passos."}
          </p>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="text-white/70 hover:text-white flex-1 sm:flex-initial"
            >
              Voltar
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={onRegenerate}
            disabled={!hasValidContent}
            className="border-white/20 text-white hover:bg-white/10 flex-1 sm:flex-initial"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerar
          </Button>

          {/* Refatorar button - only for videos */}
          {isVideo && (
            <Button
              type="button"
              variant="outline"
              onClick={openRefactorDialog}
              disabled={!hasValidContent}
              className="border-primary/50 text-primary hover:bg-primary/10 flex-1 sm:flex-initial"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Refatorar
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            disabled={!hasValidContent}
            className="border-white/20 text-white hover:bg-white/10 flex-1 sm:flex-initial"
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditing ? "Ver Preview" : "Editar"}
          </Button>

          <Button
            type="button"
            size="lg"
            onClick={handleApprove}
            disabled={!hasValidContent}
            className="min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial"
          >
            <Check className="w-4 h-4 mr-2" />
            Aprovar
          </Button>
        </div>
      </motion.div>

      {/* Refactor Dialog */}
      <Dialog open={showRefactorDialog} onOpenChange={setShowRefactorDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Refatorar Roteiro</DialogTitle>
            <DialogDescription>
              Descreva o que você deseja melhorar, otimizar ou refazer no roteiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="refactor-instructions" className="text-white/90">
                O que você deseja melhorar?
              </Label>
              <Textarea
                id="refactor-instructions"
                value={refactorInstructions}
                onChange={(e) => setRefactorInstructions(e.target.value)}
                placeholder="Ex: Adicionar mais exemplos práticos, tornar o hook mais impactante, incluir dados sobre..."
                className="mt-2 min-h-[120px] bg-black/30 text-white/90 border-white/10 focus:border-primary"
                disabled={isRefactoring}
              />
              <p className="text-xs text-white/50 mt-2">
                💡 Seja específico para obter melhores resultados.
              </p>
            </div>

            {refactorError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-300">{refactorError}</p>
              </div>
            )}

            {/* Quick suggestions */}
            <div className="space-y-2">
              <p className="text-xs text-white/60">Sugestões rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Adicionar mais exemplos",
                  "Tornar o hook mais impactante",
                  "Incluir dados estatísticos",
                  "Adicionar humor",
                  "Simplificar linguagem",
                  "Profundizar insights",
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRefactorInstructions(suggestion)}
                    disabled={isRefactoring}
                    className="text-xs h-7 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                  >
                    + {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowRefactorDialog(false)}
              disabled={isRefactoring}
              className="text-white/70 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleRefactor}
              disabled={isRefactoring || !refactorInstructions.trim()}
              className="min-w-[120px] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isRefactoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refatorando...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Refatorar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
