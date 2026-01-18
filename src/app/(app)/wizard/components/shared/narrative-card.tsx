/**
 * Narrative Card
 *
 * Displays a single narrative option with title, description, and angle.
 * Used in Step 3 - Narratives selection.
 */

"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, Target, Zap, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Narrative {
  id: string;
  title: string;
  description: string;
  angle: string;
}

interface NarrativeCardProps {
  narrative: Narrative;
  isSelected: boolean;
  onSelect: (narrativeId: string) => void;
  className?: string;
  index?: number;
}

const ANGLE_ICONS: Record<string, React.ElementType> = {
  criativo: Sparkles,
  estrategico: Target,
  dinamico: Zap,
  inspirador: Lightbulb,
};

const ANGLE_COLORS: Record<string, string> = {
  criativo: "text-purple-400",
  estrategico: "text-blue-400",
  dinamico: "text-orange-400",
  inspirador: "text-green-400",
};

export function NarrativeCard({
  narrative,
  isSelected,
  onSelect,
  className,
  index = 0,
}: NarrativeCardProps) {
  const IconComponent = ANGLE_ICONS[narrative.angle] || Sparkles;
  const angleColor = ANGLE_COLORS[narrative.angle] || "text-primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={className}
    >
      <button
        onClick={() => onSelect(narrative.id)}
        className={cn(
          "w-full text-left p-5 rounded-xl border-2 transition-all duration-200 relative group",
          isSelected
            ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
        )}
      >
        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            layoutId="narrative-selection"
            className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-xl"
            initial={false}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              "p-3 rounded-lg transition-colors",
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
            <p
              className={cn(
                "text-sm leading-relaxed",
                isSelected ? "text-white/70" : "text-white/50"
              )}
            >
              {narrative.description}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full capitalize",
                  angleColor,
                  isSelected ? "bg-white/10" : "bg-white/5"
                )}
              >
                {narrative.angle}
              </span>
            </div>
          </div>
        </div>

        {/* Hover Glow Effect */}
        {!isSelected && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}
      </button>
    </motion.div>
  );
}
