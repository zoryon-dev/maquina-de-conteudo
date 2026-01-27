/**
 * Narrative Card
 *
 * Displays a single narrative option with title, description, and angle.
 * Shows rich context details when expanded (tribal fields: hook, core_belief, status_quo_challenged).
 * Based on Seth Godin's "Tribes" philosophy for tribal content leadership.
 * Used in Step 3 - Narratives selection.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Target, Zap, Lightbulb, ChevronDown, ChevronUp, Eye, Info, AlertTriangle, Tag, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface Narrative {
  id: string;
  title: string;
  description: string;
  angle: string;
  // Tribal narrative fields (v4)
  hook?: string;
  core_belief?: string;
  status_quo_challenged?: string;
  // Extended fields for richer context (legacy, still supported)
  viewpoint?: string;
  whyUse?: string;
  impact?: string;
  tone?: string;
  keywords?: string[];
  differentiation?: string;
  risks?: string;
}

interface NarrativeCardProps {
  narrative: Narrative;
  isSelected: boolean;
  onSelect: (narrativeId: string) => void;
  className?: string;
  index?: number;
}

const ANGLE_ICONS: Record<string, React.ElementType> = {
  herege: Zap,
  visionario: Lightbulb,
  tradutor: Sparkles,
  testemunha: Target,
};

const ANGLE_COLORS: Record<string, string> = {
  herege: "text-red-400",
  visionario: "text-purple-400",
  tradutor: "text-blue-400",
  testemunha: "text-green-400",
};

const ANGLE_BADGE_COLORS: Record<string, string> = {
  herege: "bg-red-500/20 text-red-300 border-red-500/30",
  visionario: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  tradutor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  testemunha: "bg-green-500/20 text-green-300 border-green-500/30",
};

// Helper function to check if narrative has rich context
function hasRichContext(narrative: Narrative): boolean {
  return !!(
    // Tribal narrative fields (v4)
    narrative.hook ||
    narrative.core_belief ||
    narrative.status_quo_challenged ||
    // Extended fields (legacy)
    narrative.viewpoint ||
    narrative.whyUse ||
    narrative.impact ||
    narrative.tone ||
    narrative.keywords?.length ||
    narrative.differentiation ||
    narrative.risks
  );
}

export function NarrativeCard({
  narrative,
  isSelected,
  onSelect,
  className,
  index = 0,
}: NarrativeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const IconComponent = ANGLE_ICONS[narrative.angle] || Sparkles;
  const angleColor = ANGLE_COLORS[narrative.angle] || "text-primary";
  const angleBadgeColor = ANGLE_BADGE_COLORS[narrative.angle] || "bg-primary/20 text-primary";
  const hasRichDetails = hasRichContext(narrative);

  const handleSelect = () => {
    onSelect(narrative.id);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={className}
    >
      <div
        className={cn(
          "rounded-xl border-2 transition-all duration-200 relative group overflow-hidden",
          isSelected
            ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
        )}
      >
        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            layoutId="narrative-selection"
            className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-xl z-10"
            initial={false}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}

        {/* Main Card Button */}
        <button
          onClick={handleSelect}
          className="w-full text-left p-5"
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={cn(
                "p-3 rounded-lg transition-colors flex-shrink-0",
                isSelected ? "bg-primary/20" : "bg-white/5 group-hover:bg-white/10"
              )}
            >
              <IconComponent className={cn("w-6 h-6", angleColor)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-base font-semibold text-white truncate">
                  {narrative.title}
                </h3>
                <div className="flex items-center gap-2">
                  {hasRichDetails && (
                    <span className="text-xs text-white/40 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Detalhes
                    </span>
                  )}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
              </div>
              <p
                className={cn(
                  "text-sm leading-relaxed mb-2",
                  isSelected ? "text-white/70" : "text-white/50"
                )}
              >
                {narrative.description}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full capitalize border",
                    angleBadgeColor
                  )}
                >
                  {narrative.angle}
                </span>
                {narrative.tone && (
                  <span className="text-xs text-white/40">
                    Tom: {narrative.tone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Expand Button */}
        {hasRichDetails && (
          <button
            onClick={handleExpand}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2 text-xs transition-colors border-t",
              isSelected
                ? "border-white/10 text-white/60 hover:text-white/80 hover:bg-white/5"
                : "border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.02]"
            )}
          >
            <span>{isExpanded ? "Menos detalhes" : "Ver detalhes completos"}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && hasRichDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4">
                {/* Tribal Fields (v4) */}
                {/* Hook */}
                {narrative.hook && (
                  <div className="flex items-start gap-3">
                    <Zap className={cn("w-4 h-4 mt-0.5 flex-shrink-0", angleColor)} />
                    <div>
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Hook de Captura</span>
                      <p className="text-sm text-white/80 mt-1">{narrative.hook}</p>
                    </div>
                  </div>
                )}

                {/* Core Belief */}
                {narrative.core_belief && (
                  <div className="flex items-start gap-3">
                    <Target className="w-4 h-4 mt-0.5 flex-shrink-0 text-pink-400" />
                    <div>
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Crença Compartilhada</span>
                      <p className="text-sm text-white/80 mt-1">{narrative.core_belief}</p>
                    </div>
                  </div>
                )}

                {/* Status Quo Challenged */}
                {narrative.status_quo_challenged && (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                    <div>
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Senso Comum Questionado</span>
                      <p className="text-sm text-white/80 mt-1">{narrative.status_quo_challenged}</p>
                    </div>
                  </div>
                )}

                {/* Divider between tribal and legacy fields */}
                {(narrative.hook || narrative.core_belief || narrative.status_quo_challenged) &&
                 (narrative.viewpoint || narrative.whyUse || narrative.impact) && (
                  <div className="border-t border-white/10 pt-2" />
                )}

                {/* Legacy Fields */}
                {/* Viewpoint */}
                {narrative.viewpoint && (
                  <div className="flex items-start gap-3">
                    <Eye className={cn("w-4 h-4 mt-0.5 flex-shrink-0", angleColor)} />
                    <div>
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Ponto de Vista</span>
                      <p className="text-sm text-white/80 mt-1">{narrative.viewpoint}</p>
                    </div>
                  </div>
                )}

                {/* Why Use */}
                {narrative.whyUse && (
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
                    <div>
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Por que Usar</span>
                      <p className="text-sm text-white/80 mt-1">{narrative.whyUse}</p>
                    </div>
                  </div>
                )}

                {/* Impact */}
                {narrative.impact && (
                  <div className="flex items-start gap-3">
                    <Target className="w-4 h-4 mt-0.5 flex-shrink-0 text-pink-400" />
                    <div>
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Impacto Esperado</span>
                      <p className="text-sm text-white/80 mt-1">{narrative.impact}</p>
                    </div>
                  </div>
                )}

                {/* Tone */}
                {narrative.tone && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-400" />
                    <div>
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Tom de Voz</span>
                      <p className="text-sm text-white/80 mt-1">{narrative.tone}</p>
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {narrative.keywords && narrative.keywords.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Palavras-chave</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {narrative.keywords.map((keyword, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/70"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Differentiation */}
                {narrative.differentiation && (
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                    <div>
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Diferencial Único</span>
                      <p className="text-sm text-white/80 mt-1">{narrative.differentiation}</p>
                    </div>
                  </div>
                )}

                {/* Risks */}
                {narrative.risks && (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                    <div>
                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Cuidados e Riscos</span>
                      <p className="text-sm text-white/80 mt-1">{narrative.risks}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover Glow Effect */}
        {!isSelected && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}
      </div>
    </motion.div>
  );
}
