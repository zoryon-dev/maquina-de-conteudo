/**
 * Step 3 - Narratives Selection
 *
 * Displays generated narrative options for user to choose from.
 * Each narrative has a title, description, and angle (herege, visionario, tradutor, testemunha).
 * Based on Seth Godin's "Tribes" philosophy for tribal content leadership.
 * User selects one narrative to proceed to content generation.
 *
 * v2: Added inline editing, single narrative regeneration, and custom narrative creation.
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Info,
  Pencil,
  RefreshCw,
  Plus,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NarrativeCard, type Narrative } from "../shared/narrative-card";
import { SynthesisSummary, type SynthesizedResearch } from "../shared/synthesis-summary";
import { toast } from "sonner";

// Re-export types for external use
export type { Narrative, SynthesizedResearch };

export interface WizardFormData {
  selectedNarrativeId?: string;
  customInstructions?: string;
  editedNarratives?: Narrative[];
}

interface Step3NarrativesProps {
  narratives: Narrative[];
  synthesizedResearch?: SynthesizedResearch | null;
  initialData?: WizardFormData;
  onChange: (data: WizardFormData) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  className?: string;
  /** Wizard ID for regeneration API calls */
  wizardId?: number;
}

const ANGLE_INFO: Record<string, { label: string; description: string; color: string }> = {
  herege: {
    label: "Herege",
    description: "Desafia o senso comum e provoca reflexao",
    color: "text-red-400",
  },
  visionario: {
    label: "Visionario",
    description: "Mostra um futuro possivel e inspira mudanca",
    color: "text-purple-400",
  },
  tradutor: {
    label: "Tradutor",
    description: "Simplifica o complexo e democratiza conhecimento",
    color: "text-blue-400",
  },
  testemunha: {
    label: "Testemunha",
    description: "Compartilha jornada pessoal e cria identificacao",
    color: "text-green-400",
  },
};

const ANGLES = ["herege", "visionario", "tradutor", "testemunha"] as const;

interface EditingState {
  narrativeId: string;
  hook: string;
  core_belief: string;
  status_quo_challenged: string;
  title: string;
  description: string;
}

interface CustomNarrativeState {
  title: string;
  description: string;
  angle: string;
  hook: string;
  core_belief: string;
  status_quo_challenged: string;
}

export function Step3Narratives({
  narratives: initialNarratives,
  synthesizedResearch,
  initialData,
  onChange,
  onSubmit,
  isSubmitting = false,
  className,
  wizardId,
}: Step3NarrativesProps) {
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);
  const [narratives, setNarratives] = useState<Narrative[]>(initialNarratives);

  // Editing state
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [editedNarrativeIds, setEditedNarrativeIds] = useState<Set<string>>(new Set());

  // Regeneration state
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Custom narrative form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customNarrative, setCustomNarrative] = useState<CustomNarrativeState>({
    title: "",
    description: "",
    angle: "herege",
    hook: "",
    core_belief: "",
    status_quo_challenged: "",
  });

  const selectedNarrativeId = initialData?.selectedNarrativeId;
  const selectedNarrative = narratives.find((n) => n.id === selectedNarrativeId);

  // Sync edited narratives to parent whenever narratives change
  const syncNarrativesToParent = useCallback(
    (updatedNarratives: Narrative[]) => {
      onChange({
        ...initialData,
        editedNarratives: updatedNarratives,
      });
    },
    [initialData, onChange]
  );

  const handleSelectNarrative = (narrativeId: string) => {
    onChange({
      ...initialData,
      selectedNarrativeId: narrativeId,
    });
  };

  const handleCustomInstructionsChange = (value: string) => {
    onChange({
      ...initialData,
      customInstructions: value,
    });
  };

  const isValid = selectedNarrativeId !== undefined;

  // =============================================
  // EDITING
  // =============================================

  const handleStartEditing = (narrative: Narrative) => {
    setEditingState({
      narrativeId: narrative.id,
      title: narrative.title,
      description: narrative.description,
      hook: narrative.hook ?? "",
      core_belief: narrative.core_belief ?? "",
      status_quo_challenged: narrative.status_quo_challenged ?? "",
    });
  };

  const handleCancelEditing = () => {
    setEditingState(null);
  };

  const handleSaveEditing = () => {
    if (!editingState) return;

    const updatedNarratives = narratives.map((n) =>
      n.id === editingState.narrativeId
        ? {
            ...n,
            title: editingState.title,
            description: editingState.description,
            hook: editingState.hook || undefined,
            core_belief: editingState.core_belief || undefined,
            status_quo_challenged: editingState.status_quo_challenged || undefined,
          }
        : n
    );

    setNarratives(updatedNarratives);
    setEditedNarrativeIds((prev) => new Set([...prev, editingState.narrativeId]));
    setEditingState(null);
    syncNarrativesToParent(updatedNarratives);
    toast.success("Narrativa editada com sucesso");
  };

  // =============================================
  // REGENERATION
  // =============================================

  const handleRegenerate = useCallback(
    async (narrativeIndex: number, angle: string) => {
      if (!wizardId) {
        toast.error("ID do wizard nao disponivel para regeneracao");
        return;
      }

      setRegeneratingIndex(narrativeIndex);

      try {
        const resp = await fetch(`/api/wizard/${wizardId}/regenerate-narrative`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ narrativeIndex, angle }),
        });

        const data = await resp.json();

        if (!data.success) {
          throw new Error(data.error || "Falha ao regenerar narrativa");
        }

        // Update local narratives with the full array from server
        if (data.narratives) {
          setNarratives(data.narratives);
          syncNarrativesToParent(data.narratives);
        }

        toast.success("Narrativa regenerada com sucesso");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erro ao regenerar";
        toast.error(msg);
      } finally {
        setRegeneratingIndex(null);
      }
    },
    [wizardId, syncNarrativesToParent]
  );

  // =============================================
  // CUSTOM NARRATIVE
  // =============================================

  const handleAddCustomNarrative = () => {
    if (!customNarrative.title.trim() || !customNarrative.description.trim()) {
      toast.error("Titulo e descricao sao obrigatorios");
      return;
    }

    const newNarrative: Narrative = {
      id: `custom-${Date.now()}`,
      title: customNarrative.title,
      description: customNarrative.description,
      angle: customNarrative.angle,
      hook: customNarrative.hook || undefined,
      core_belief: customNarrative.core_belief || undefined,
      status_quo_challenged: customNarrative.status_quo_challenged || undefined,
    };

    const updatedNarratives = [...narratives, newNarrative];
    setNarratives(updatedNarratives);
    setEditedNarrativeIds((prev) => new Set([...prev, newNarrative.id]));
    syncNarrativesToParent(updatedNarratives);

    // Auto-select the custom narrative
    handleSelectNarrative(newNarrative.id);

    // Reset form
    setCustomNarrative({
      title: "",
      description: "",
      angle: "herege",
      hook: "",
      core_belief: "",
      status_quo_challenged: "",
    });
    setShowCustomForm(false);

    toast.success("Narrativa personalizada adicionada");
  };

  // Group narratives by angle
  const narrativesByAngle = narratives.reduce((acc, narrative) => {
    if (!acc[narrative.angle]) {
      acc[narrative.angle] = [];
    }
    acc[narrative.angle].push(narrative);
    return acc;
  }, {} as Record<string, Narrative[]>);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          {narratives.length} opcoes de narrativa
        </motion.div>
        <h2 className="text-xl font-semibold text-white">
          Escolha a narrativa para seu conteudo
        </h2>
        <p className="text-sm text-white/60">
          Cada opcao oferece uma abordagem diferente. Selecione a que melhor se
          adapta ao seu objetivo. Voce pode editar, regenerar ou criar uma nova.
        </p>
      </div>

      {/* Angle Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(ANGLE_INFO).map(([angle, info]) => {
          const hasThisAngle = narratives.some((n) => n.angle === angle);
          if (!hasThisAngle) return null;

          return (
            <div
              key={angle}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/10"
            >
              <span className={cn("text-xs font-medium capitalize", info.color)}>
                {info.label}
              </span>
              <span className="text-xs text-white/40">{info.description}</span>
            </div>
          );
        })}
      </div>

      {/* Synthesis Summary - Show if research was synthesized */}
      {synthesizedResearch && (
        <SynthesisSummary data={synthesizedResearch} />
      )}

      {/* Narratives by Angle */}
      <div className="space-y-6">
        {Object.entries(narrativesByAngle).map(([angle, angleNarratives], groupIndex) => {
          const angleInfo = ANGLE_INFO[angle];
          if (!angleInfo) return null;

          return (
            <div key={angle} className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-1 h-4 rounded-full",
                    angleInfo.color.replace("text-", "bg-")
                  )}
                />
                <h3 className="text-sm font-semibold text-white capitalize">
                  {angleInfo.label}s
                </h3>
                <span className="text-xs text-white/40">
                  ({angleNarratives.length})
                </span>
              </div>
              <div className="grid gap-3">
                {angleNarratives.map((narrative, index) => {
                  const globalIndex = narratives.findIndex((n) => n.id === narrative.id);
                  const isEditing = editingState?.narrativeId === narrative.id;
                  const isEdited = editedNarrativeIds.has(narrative.id);
                  const isRegenerating = regeneratingIndex === globalIndex;

                  return (
                    <div key={narrative.id} className="relative">
                      {/* Edited badge */}
                      {isEdited && !isEditing && (
                        <div className="absolute -top-2 right-3 z-10">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Editado
                          </span>
                        </div>
                      )}

                      {/* Regenerating overlay */}
                      {isRegenerating && (
                        <div className="absolute inset-0 z-20 rounded-xl bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <div className="flex items-center gap-2 text-white/70">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Regenerando...</span>
                          </div>
                        </div>
                      )}

                      {/* Editing mode */}
                      {isEditing ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="rounded-xl border-2 border-primary/50 bg-primary/5 p-5 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-primary">
                              Editando Narrativa
                            </h4>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEditing}
                                className="border-white/10 text-white/60 h-7 text-xs"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveEditing}
                                className="h-7 text-xs"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Salvar Edicao
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-white/60">Titulo</Label>
                              <input
                                type="text"
                                value={editingState.title}
                                onChange={(e) =>
                                  setEditingState((prev) =>
                                    prev ? { ...prev, title: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50 px-3 py-2 text-sm outline-none"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs text-white/60">Descricao</Label>
                              <Textarea
                                value={editingState.description}
                                onChange={(e) =>
                                  setEditingState((prev) =>
                                    prev ? { ...prev, description: e.target.value } : prev
                                  )
                                }
                                rows={2}
                                className="resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs text-white/60">Hook de Captura</Label>
                              <Textarea
                                value={editingState.hook}
                                onChange={(e) =>
                                  setEditingState((prev) =>
                                    prev ? { ...prev, hook: e.target.value } : prev
                                  )
                                }
                                rows={2}
                                placeholder="Primeira frase que cria reconhecimento imediato..."
                                className="resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs text-white/60">Crenca Compartilhada</Label>
                              <Textarea
                                value={editingState.core_belief}
                                onChange={(e) =>
                                  setEditingState((prev) =>
                                    prev ? { ...prev, core_belief: e.target.value } : prev
                                  )
                                }
                                rows={2}
                                placeholder="A crenca que une criador e audiencia..."
                                className="resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs text-white/60">Senso Comum Questionado</Label>
                              <Textarea
                                value={editingState.status_quo_challenged}
                                onChange={(e) =>
                                  setEditingState((prev) =>
                                    prev
                                      ? { ...prev, status_quo_challenged: e.target.value }
                                      : prev
                                  )
                                }
                                rows={2}
                                placeholder="O que este conteudo questiona..."
                                className="resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                              />
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <>
                          <NarrativeCard
                            narrative={narrative}
                            isSelected={narrative.id === selectedNarrativeId}
                            onSelect={handleSelectNarrative}
                            index={groupIndex * 10 + index}
                          />

                          {/* Action buttons below card */}
                          <div className="flex items-center gap-2 mt-2 ml-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditing(narrative)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                              Editar
                            </button>
                            {wizardId && (
                              <button
                                type="button"
                                onClick={() => handleRegenerate(globalIndex, narrative.angle)}
                                disabled={isRegenerating}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-30"
                              >
                                <RefreshCw className={cn("w-3 h-3", isRegenerating && "animate-spin")} />
                                Regenerar
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Narrative Button / Form */}
      <div className="border-t border-white/10 pt-4">
        <AnimatePresence>
          {showCustomForm ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border-2 border-dashed border-white/20 bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">
                    Escrever Minha Narrativa
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="text-white/40 hover:text-white/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/60">Titulo *</Label>
                    <input
                      type="text"
                      value={customNarrative.title}
                      onChange={(e) =>
                        setCustomNarrative((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Titulo da narrativa..."
                      className="w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/60">Angulo</Label>
                    <select
                      value={customNarrative.angle}
                      onChange={(e) =>
                        setCustomNarrative((prev) => ({ ...prev, angle: e.target.value }))
                      }
                      className="w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white px-3 py-2 text-sm outline-none"
                    >
                      {ANGLES.map((a) => (
                        <option key={a} value={a}>
                          {ANGLE_INFO[a]?.label ?? a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-white/60">Descricao *</Label>
                  <Textarea
                    value={customNarrative.description}
                    onChange={(e) =>
                      setCustomNarrative((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={2}
                    placeholder="Descreva a abordagem da narrativa..."
                    className="resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-white/60">Hook de Captura</Label>
                  <Textarea
                    value={customNarrative.hook}
                    onChange={(e) =>
                      setCustomNarrative((prev) => ({ ...prev, hook: e.target.value }))
                    }
                    rows={2}
                    placeholder="Primeira frase que cria reconhecimento imediato..."
                    className="resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-white/60">Crenca Compartilhada</Label>
                  <Textarea
                    value={customNarrative.core_belief}
                    onChange={(e) =>
                      setCustomNarrative((prev) => ({ ...prev, core_belief: e.target.value }))
                    }
                    rows={2}
                    placeholder="A crenca que une criador e audiencia..."
                    className="resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-white/60">Senso Comum Questionado</Label>
                  <Textarea
                    value={customNarrative.status_quo_challenged}
                    onChange={(e) =>
                      setCustomNarrative((prev) => ({
                        ...prev,
                        status_quo_challenged: e.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="O que este conteudo questiona..."
                    className="resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomForm(false)}
                    className="border-white/10 text-white/60"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddCustomNarrative}
                    disabled={!customNarrative.title.trim() || !customNarrative.description.trim()}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar Narrativa
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.01] text-white/40 hover:text-white/60 hover:border-white/25 hover:bg-white/[0.02] transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Escrever Minha Narrativa
            </button>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Instructions Toggle */}
      <div className="border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setShowCustomInstructions(!showCustomInstructions)}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <Info className="w-4 h-4" />
          {showCustomInstructions ? "Ocultar" : "Mostrar"} instrucoes adicionais
        </button>

        <AnimatePresence>
          {showCustomInstructions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-2">
                <Label className="text-xs text-white/60">
                  Instrucoes adicionais para a geracao (opcional)
                </Label>
                <Textarea
                  placeholder="Ex: Use um tom mais casual, inclua emojis, foque em beneficios..."
                  value={initialData?.customInstructions ?? ""}
                  onChange={(e) =>
                    handleCustomInstructionsChange(e.target.value)
                  }
                  rows={3}
                  className="resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Narrative Summary */}
      <AnimatePresence>
        {selectedNarrative && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-primary/5 border border-primary/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-xs text-primary font-medium">
                  Narrativa selecionada
                </p>
                <h4 className="text-sm font-semibold text-white">
                  {selectedNarrative.title}
                </h4>
                <p className="text-xs text-white/60 line-clamp-2">
                  {selectedNarrative.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {editedNarrativeIds.has(selectedNarrative.id) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Editado
                  </span>
                )}
                <span
                  className={cn(
                    "text-xs px-2 py-1 rounded-full capitalize",
                    ANGLE_INFO[selectedNarrative.angle]?.color ??
                      "text-primary",
                    "bg-white/10"
                  )}
                >
                  {selectedNarrative.angle}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <div className="pt-4 border-t border-white/10">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando conteudo...
            </>
          ) : (
            <>
              Gerar Conteudo
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
        {!isValid && (
          <p className="text-xs text-center text-white/40 mt-2">
            Selecione uma narrativa para continuar
          </p>
        )}
      </div>
    </div>
  );
}
