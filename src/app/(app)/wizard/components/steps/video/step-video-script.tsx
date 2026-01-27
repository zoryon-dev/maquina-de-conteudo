/**
 * Step 3 - Video Script Review
 *
 * Displays generated video script for user approval.
 * User can: Approve, or Refactor (with dialog).
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  RefreshCw,
  Edit,
  Film,
  Eye,
  EyeOff,
  Wand2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Lightbulb,
  Sparkles,
  Target,
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
import type { VideoScriptStructured } from "@/lib/wizard-services/types";

// ============================================================================
// TYPES
// ============================================================================

export interface StepVideoScriptProps {
  wizardId: number;
  generatedScript?: string;
  onApprove: (script: string) => void;
  className?: string;
}

// Type guard
function isVideoScriptStructured(content: unknown): content is VideoScriptStructured {
  return (
    content !== null &&
    typeof content === "object" &&
    "meta" in content &&
    "thumbnail" in content &&
    "roteiro" in content
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StepVideoScript({
  wizardId,
  generatedScript,
  onApprove,
  className,
}: StepVideoScriptProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState(generatedScript || "");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    details: true,
  });

  // Refactor dialog states
  const [showRefactorDialog, setShowRefactorDialog] = useState(false);
  const [refactorInstructions, setRefactorInstructions] = useState("");
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [refactorError, setRefactorError] = useState<string | null>(null);

  // Parse script
  let parsedScript: VideoScriptStructured | null = null;
  try {
    parsedScript = isVideoScriptStructured(generatedScript)
      ? generatedScript
      : JSON.parse(generatedScript || "{}");
  } catch {
    parsedScript = null;
  }

  const hasValidScript = parsedScript !== null && "meta" in parsedScript;

  const handleApprove = () => {
    const scriptToSave = isEditing ? editedScript : (generatedScript || "");
    onApprove(scriptToSave);
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

      const newScript = data.data?.script || generatedScript;
      setEditedScript(newScript);
      setShowRefactorDialog(false);
      setRefactorInstructions("");
    } catch (err) {
      setRefactorError(err instanceof Error ? err.message : "Erro ao refatorar");
    } finally {
      setIsRefactoring(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
          <Film className="w-8 h-8 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          Revise seu Roteiro
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-white/70 max-w-2xl mx-auto"
        >
          {isEditing
            ? "Edite o conteúdo abaixo e aprove quando estiver satisfeito."
            : "Revise o roteiro gerado. Você pode aprovar ou refatorar."}
        </motion.p>
      </div>

      {/* Script Preview */}
      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
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
                {expandedSections.overview && hasValidScript && (
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
                          {parsedScript?.meta?.duracao_estimada || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Lightbulb className="w-4 h-4 text-white/50" />
                        <span className="text-white/70">Valor Central:</span>
                        <span className="text-white font-medium">
                          {parsedScript?.meta?.valor_central || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-white/50" />
                        <span className="text-white/70">Ângulo Tribal:</span>
                        <span className="text-white font-medium capitalize">
                          {parsedScript?.meta?.angulo_tribal || "N/A"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Script Details Card */}
            <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("details")}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="text-lg font-semibold text-white">
                    Roteiro Detalhado
                  </span>
                </div>
                {expandedSections.details ? (
                  <ChevronUp className="w-5 h-5 text-white/60" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/60" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.details && hasValidScript && (
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
                          {parsedScript?.roteiro?.hook?.texto || "N/A"}
                        </p>
                      </div>

                      {/* Development */}
                      <div>
                        <h4 className="text-sm font-semibold text-white/80 mb-2">Desenvolvimento</h4>
                        <div className="space-y-2">
                          {(parsedScript?.roteiro?.desenvolvimento || [])
                            .slice(0, 3)
                            .map((section, idx) => (
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
                          {parsedScript?.roteiro?.cta?.texto || "N/A"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Full JSON for reference */}
            <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("json")}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-white/40" />
                  <span className="text-sm font-medium text-white/60">
                    Ver JSON Completo
                  </span>
                </div>
                {expandedSections.json ? (
                  <ChevronUp className="w-5 h-5 text-white/40" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/40" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.json && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4">
                      <pre className="text-xs text-white/50 bg-black/30 rounded-lg p-4 overflow-x-auto">
                        {JSON.stringify(parsedScript, null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor="script-editor" className="text-lg font-semibold text-white">
                  Editar Roteiro
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditedScript(generatedScript || "")}
                  className="text-white/70 hover:text-white"
                >
                  Resetar
                </Button>
              </div>
              <Textarea
                id="script-editor"
                value={editedScript}
                onChange={(e) => setEditedScript(e.target.value)}
                className="min-h-[500px] bg-black/30 text-white/90 border-white/10 focus:border-primary font-mono text-sm"
                placeholder="Edite o roteiro aqui..."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Box */}
      {hasValidScript && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-lg bg-primary/10 border border-primary/20"
        >
          <p className="text-sm text-white/80 text-center">
            ✨ Roteiro estruturado gerado com sucesso!
            {" "}Nos próximos passos você irá escolher o título da thumbnail e configurar a imagem.
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
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // Trigger regeneration by going back to narratives
              window.location.href = `/wizard/${wizardId}?step=narratives`;
            }}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Gerar Novamente
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowRefactorDialog(true)}
            className="border-primary/50 text-primary hover:bg-primary/10"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Refatorar
          </Button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditing ? "Ver Preview" : "Editar"}
          </Button>

          <Button
            type="button"
            size="lg"
            onClick={handleApprove}
            disabled={!hasValidScript}
            className="min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90"
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
                rows={4}
                className="mt-2 min-h-[120px] bg-black/30 text-white/90 border-white/10 focus:border-primary"
                disabled={isRefactoring}
              />
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
