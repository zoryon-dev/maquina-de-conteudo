/**
 * Video Script Viewer Component
 *
 * Displays VideoScriptStructured v4.3 in a collapsible section format.
 * Reusable across wizard, library, and other contexts.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Palette,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoScriptStructured, DevelopmentSection } from "@/lib/wizard-services/types";

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

// ============================================================================
// MAIN VIDEO SCRIPT VIEWER COMPONENT
// ============================================================================

interface VideoScriptViewerProps {
  script: VideoScriptStructured;
}

export function VideoScriptViewer({ script }: VideoScriptViewerProps) {
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

      {/* Desenvolvimento Section */}
      <CollapsibleSection
        title="Desenvolvimento"
        icon={Lightbulb}
        expanded={expandedSections.desenvolvimento}
        onToggle={() => toggleSection("desenvolvimento")}
        className="border-blue-500/20 bg-blue-500/5"
      >
        <div className="space-y-2">
          {script.roteiro.desenvolvimento.map((secao, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/10"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary">
                    {secao.numero}.
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded border",
                      getSectionTypeColor(secao.tipo)
                    )}
                  >
                    {secao.tipo}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-white/50 mb-1">Tópico</p>
                  <p className="text-sm text-white font-medium">{secao.topico}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">Insight</p>
                  <p className="text-sm text-white/80">{secao.insight}</p>
                </div>
                {secao.exemplo && (
                  <div>
                    <p className="text-xs text-white/50 mb-1">Exemplo</p>
                    <p className="text-xs text-white/70 italic">{secao.exemplo}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-white/50 mb-1">Transição</p>
                  <p className="text-xs text-white/70">{secao.transicao}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">Nota Gravação</p>
                  <p className="text-xs text-white/70">{secao.nota_gravacao}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* CTA Section */}
      <CollapsibleSection
        title="CTA"
        icon={Target}
        expanded={expandedSections.cta}
        onToggle={() => toggleSection("cta")}
        className="border-green-500/20 bg-green-500/5"
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/20 to-primary/20 border border-green-500/30">
            <p className="text-xs text-green-400/80 mb-1">🎯 Texto</p>
            <p className="text-sm text-white font-medium">{script.roteiro.cta.texto}</p>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
            <p className="text-xs text-white/50 mb-1">Próximo Passo</p>
            <p className="text-xs text-white/80">{script.roteiro.cta.proximo_passo}</p>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
            <p className="text-xs text-white/50 mb-1">Nota Gravação</p>
            <p className="text-xs text-white/70">{script.roteiro.cta.nota_gravacao}</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Notas de Produção */}
      <CollapsibleSection
        title="Notas de Produção"
        icon={Lightbulb}
        expanded={expandedSections.notasProducao}
        onToggle={() => toggleSection("notasProducao")}
        className="border-orange-500/20 bg-orange-500/5"
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs text-white/50 mb-1">Tom Geral</p>
            <p className="text-sm text-white/80">{script.notas_producao.tom_geral}</p>
          </div>
          <div>
            <p className="text-xs text-white/50 mb-1">Ritmo</p>
            <p className="text-sm text-white/80">{script.notas_producao.ritmo}</p>
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
// TYPE GUARD
// ============================================================================

/**
 * Type guard to check if script is VideoScriptStructured (v4.3)
 */
export function isVideoScriptStructured(script: string | Record<string, unknown> | undefined): script is VideoScriptStructured {
  return script !== undefined && typeof script === "object" && "meta" in script && "thumbnail" in script && "roteiro" in script;
}
