/**
 * Step 1 - Video Configuration
 *
 * Complete configuration step for video content.
 * Combines content type, references, context, RAG, and video-specific settings.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Clock,
  Target,
  Lightbulb,
  FileText,
  Image,
  Wand2,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { SynthesizedResearch } from "../step-3-narratives";
import type { RagConfig } from "../../shared/document-config-form";
import type { VideoDuration } from "@/lib/wizard-services/types";
import type { VideoWizardFormData } from "../../wizard-video-page";
import { DocumentConfigForm } from "../../shared/document-config-form";

// ============================================================================
// TYPES
// ============================================================================

export interface StepVideoConfigurationProps {
  initialData?: VideoWizardFormData;
  wizardId?: number;
  onSubmit: (data: VideoWizardFormData) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VIDEO_DURATIONS: { value: VideoDuration; label: string; description: string }[] = [
  { value: "2-5min", label: "2-5 Minutos", description: "Conteúdo direto e objetivo" },
  { value: "5-10min", label: "5-10 Minutos", description: "Conteúdo médio com exemplos" },
  { value: "+10min", label: "10-20 Minutos", description: "Conteúdo profundo com storytelling" },
  { value: "+30min", label: "Acima de 30 Minutos", description: "Conteúdo muito profundo" },
];

const VIDEO_INTENTIONS = [
  { id: "educar", label: "Educar", description: "Ensinar algo novo ao público", icon: "💡" },
  { id: "entreter", label: "Entreter", description: "Diversão e entretenimento", icon: "😄" },
  { id: "inspirar", label: "Inspirar", description: "Motivar e inspirar ação", icon: "⚡" },
  { id: "vender", label: "Vender/Converter", description: "Promover produto ou serviço", icon: "🎯" },
  { id: "noticiar", label: "Noticiar/Informar", description: "Compartilhar novidades", icon: "📰" },
  { id: "posicionar", label: "Posicionar Marca", description: "Construir autoridade", icon: "🏆" },
];

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  required?: boolean;
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  required = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-white">
            {title}
            {required && <span className="text-red-400 ml-1">*</span>}
          </p>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StepVideoConfiguration({
  initialData,
  wizardId,
  onSubmit,
  className,
}: StepVideoConfigurationProps) {
  // Basic info
  const [theme, setTheme] = useState(initialData?.theme || "");
  const [context, setContext] = useState(initialData?.context || "");
  const [objective, setObjective] = useState(initialData?.objective || "");
  const [cta, setCta] = useState(initialData?.cta || "");
  const [targetAudience, setTargetAudience] = useState(initialData?.targetAudience || "");

  // Video-specific
  const [videoDuration, setVideoDuration] = useState<VideoDuration | undefined>(
    initialData?.videoDuration
  );
  const [videoIntention, setVideoIntention] = useState<string | undefined>(
    initialData?.videoIntention
  );
  const [customIntention, setCustomIntention] = useState(initialData?.customVideoIntention || "");
  const [showCustomIntention, setShowCustomIntention] = useState(false);

  // RAG/Knowledge
  const [ragConfig, setRagConfig] = useState<RagConfig>(initialData?.ragConfig || {
    mode: "auto",
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    video: true,
    knowledge: false,
    advanced: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!theme?.trim()) {
      alert("Por favor, informe o tema do conteúdo.");
      return;
    }
    if (!videoDuration) {
      alert("Por favor, selecione a duração do vídeo.");
      return;
    }

    setIsSubmitting(true);

    const data: VideoWizardFormData = {
      theme: theme.trim(),
      context: context.trim(),
      objective: objective.trim(),
      cta: cta.trim(),
      targetAudience: targetAudience.trim(),
      videoDuration,
      videoIntention: showCustomIntention ? customIntention.trim() || undefined : videoIntention,
      customVideoIntention: showCustomIntention ? customIntention.trim() : undefined,
      ragConfig,
    };

    onSubmit(data);
  };

  const canSubmit = theme.trim() !== "" && videoDuration !== undefined;

  return (
    <div className={cn("w-full max-w-4xl mx-auto px-4 py-8", className)}>
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
          Configure seu Vídeo
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-white/70 max-w-2xl mx-auto"
        >
          Preencha as informações abaixo para criarmos um roteiro personalizado.
        </motion.p>
      </div>

      {/* Form Sections */}
      <div className="space-y-4">
        {/* 1. Basic Information */}
        <CollapsibleSection title="Informações Básicas" icon={FileText} defaultOpen={true}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="theme" className="text-white/90">
                Tema do Conteúdo <span className="text-red-400">*</span>
              </Label>
              <Input
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex: Como usar IA para criar conteúdo"
                className="mt-2 bg-white/[0.02] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
              />
            </div>

            <div>
              <Label htmlFor="context" className="text-white/90">Contexto</Label>
              <Textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Forneça mais detalhes sobre o contexto..."
                rows={3}
                className="mt-2 bg-white/[0.02] border-white/10 text-white placeholder:text-white/40 focus:border-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="objective" className="text-white/90">Objetivo</Label>
                <Input
                  id="objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Ensinar o uso de IA"
                  className="mt-2 bg-white/[0.02] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                />
              </div>

              <div>
                <Label htmlFor="targetAudience" className="text-white/90">Público-Alvo</Label>
                <Input
                  id="targetAudience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Ex: Criadores de conteúdo iniciantes"
                  className="mt-2 bg-white/[0.02] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cta" className="text-white/90">Call to Action (opcional)</Label>
              <Input
                id="cta"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Ex: Inscreva-se para mais conteúdo"
                className="mt-2 bg-white/[0.02] border-white/10 text-white placeholder:text-white/40 focus:border-primary"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* 2. Video Configuration */}
        <CollapsibleSection title="Configurações do Vídeo" icon={Film} required={true}>
          <div className="space-y-4">
            {/* Duration */}
            <div>
              <Label className="text-white/90 mb-3 block">
                Duração do Vídeo <span className="text-red-400">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VIDEO_DURATIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVideoDuration(option.value)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      videoDuration === option.value
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold text-white">{option.label}</span>
                    </div>
                    <p className="text-xs text-white/60">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Intention */}
            <div>
              <Label className="text-white/90 mb-3 block">Intenção do Vídeo</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                {VIDEO_INTENTIONS.map((intention) => (
                  <button
                    key={intention.id}
                    type="button"
                    onClick={() => {
                      setVideoIntention(intention.id);
                      setShowCustomIntention(false);
                    }}
                    className={cn(
                      "p-3 rounded-lg border transition-all text-left",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      videoIntention === intention.id && !showCustomIntention
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="text-lg mb-1 block">{intention.icon}</span>
                    <span className="text-xs font-medium text-white">{intention.label}</span>
                  </button>
                ))}

                {/* Custom intention */}
                <button
                  type="button"
                  onClick={() => setShowCustomIntention(true)}
                  className={cn(
                    "p-3 rounded-lg border transition-all text-left",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    showCustomIntention
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  )}
                >
                  <span className="text-lg mb-1 block">✏️</span>
                  <span className="text-xs font-medium text-white">Outra...</span>
                </button>
              </div>

              {/* Custom intention textarea */}
              {showCustomIntention && (
                <Textarea
                  value={customIntention}
                  onChange={(e) => setCustomIntention(e.target.value)}
                  placeholder="Descreva a intenção personalizada do seu vídeo..."
                  rows={2}
                  className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/40 focus:border-primary resize-none"
                />
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* 3. Knowledge Base */}
        <CollapsibleSection title="Base de Conhecimento (RAG)" icon={Lightbulb}>
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Selecione documentos para usar como referência na geração do roteiro.
            </p>
            <DocumentConfigForm
              config={ragConfig}
              onChange={setRagConfig}
            />
          </div>
        </CollapsibleSection>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-end pt-6"
      >
        <Button
          type="button"
          size="lg"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={cn(
            "min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90",
            !canSubmit && "opacity-50 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            "Processando..."
          ) : (
            <>
              Continuar
              <ArrowRight className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
