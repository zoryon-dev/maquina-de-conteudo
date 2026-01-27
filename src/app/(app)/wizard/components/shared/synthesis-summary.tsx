/**
 * Synthesis Summary Component
 *
 * Displays the synthesized research data from the Synthesizer step.
 * Shows 7 categories of insights: summary, narrative suggestion, concrete data,
 * real examples, errors/risks, frameworks/methods, and engagement hooks.
 */

"use client";

import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Lightbulb, TrendingUp, AlertTriangle, BookOpen, Zap, Target } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Types matching SynthesizedResearch from synthesis-types.ts
export interface ConcreteDataPoint {
  dado: string;
  fonte: string;
  uso_sugerido: string;
}

export interface RealExample {
  exemplo: string;
  contexto: string;
}

export interface ErrorRisk {
  erro: string;
  consequencia: string;
  como_evitar: string;
}

export interface FrameworkMetodo {
  nome: string;
  descricao: string;
}

export interface Hook {
  gancho: string;
  tipo: string;
}

export interface SynthesizedResearch {
  summary: string;
  narrative_suggestion: string;
  concrete_data: ConcreteDataPoint[];
  real_examples: RealExample[];
  errors_risks: ErrorRisk[];
  frameworks_metodos: FrameworkMetodo[];
  hooks: Hook[];
  gaps_oportunidades: string[];
  sources: string[];
}

interface SynthesisSummaryProps {
  data: SynthesizedResearch | null;
  className?: string;
}

const SECTION_CONFIG = [
  {
    key: "summary" as const,
    label: "Resumo da Pesquisa",
    icon: Target,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "narrative_suggestion" as const,
    label: "Sugestão de Narrativa",
    icon: Lightbulb,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
  },
  {
    key: "concrete_data" as const,
    label: "Dados Concretos",
    icon: TrendingUp,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    key: "real_examples" as const,
    label: "Exemplos Reais",
    icon: BookOpen,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
  },
  {
    key: "errors_risks" as const,
    label: "Erros e Riscos",
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
  },
  {
    key: "frameworks_metodos" as const,
    label: "Frameworks e Métodos",
    icon: BookOpen,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
  {
    key: "hooks" as const,
    label: "Ganchos de Engajamento",
    icon: Zap,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
  },
] as const;

function SectionHeader({
  config,
  count,
  isExpanded,
  onToggle,
}: {
  config: (typeof SECTION_CONFIG)[number];
  count?: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", config.bgColor)}>
          <Icon className={cn("w-4 h-4", config.color)} />
        </div>
        <span className="text-sm font-medium text-white">{config.label}</span>
        {count !== undefined && (
          <span className="text-xs text-white/40">({count})</span>
        )}
      </div>
      {isExpanded ? (
        <ChevronUp className="w-4 h-4 text-white/40" />
      ) : (
        <ChevronDown className="w-4 h-4 text-white/40" />
      )}
    </button>
  );
}

export function SynthesisSummary({ data, className }: SynthesisSummaryProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["summary", "concrete_data", "hooks"])
  );

  if (!data) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-white/40">
          Síntese de pesquisa ainda não disponível.
        </p>
      </div>
    );
  }

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const hasSection = (key: string): boolean => {
    switch (key) {
      case "summary":
        return !!data.summary;
      case "narrative_suggestion":
        return !!data.narrative_suggestion;
      case "concrete_data":
        return data.concrete_data?.length > 0;
      case "real_examples":
        return data.real_examples?.length > 0;
      case "errors_risks":
        return data.errors_risks?.length > 0;
      case "frameworks_metodos":
        return data.frameworks_metodos?.length > 0;
      case "hooks":
        return data.hooks?.length > 0;
      case "gaps_oportunidades":
        return data.gaps_oportunidades?.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20"
      >
        <div className="p-2 rounded-lg bg-primary/20">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary">Pesquisa Sintetizada</p>
          <p className="text-xs text-white/60">
            Insights acionáveis extraídos da pesquisa
          </p>
        </div>
      </motion.div>

      {/* Sections */}
      {SECTION_CONFIG.map((config) => {
        if (!hasSection(config.key)) return null;

        const isExpanded = expandedSections.has(config.key);
        const count = Array.isArray(data[config.key])
          ? (data[config.key] as unknown[]).length
          : undefined;

        return (
          <motion.div
            key={config.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]"
          >
            <SectionHeader
              config={config}
              count={count}
              isExpanded={isExpanded}
              onToggle={() => toggleSection(config.key)}
            />

            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/10 p-4"
              >
                {config.key === "summary" && data.summary && (
                  <p className="text-sm text-white/80 leading-relaxed">
                    {data.summary}
                  </p>
                )}

                {config.key === "narrative_suggestion" && data.narrative_suggestion && (
                  <div className="p-3 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                    <p className="text-sm text-yellow-200/90 leading-relaxed">
                      {data.narrative_suggestion}
                    </p>
                  </div>
                )}

                {config.key === "concrete_data" && data.concrete_data?.length > 0 && (
                  <div className="space-y-3">
                    {data.concrete_data.map((item, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-blue-400/5 border border-blue-400/10"
                      >
                        <p className="text-sm text-white/90">{item.dado}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="text-blue-300/70">Fonte: {item.fonte}</span>
                          <span className="text-white/40">•</span>
                          <span className="text-white/60">{item.uso_sugerido}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {config.key === "real_examples" && data.real_examples?.length > 0 && (
                  <div className="space-y-3">
                    {data.real_examples.map((item, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-green-400/5 border border-green-400/10"
                      >
                        <p className="text-sm text-white/90">{item.exemplo}</p>
                        {item.contexto && (
                          <p className="mt-2 text-xs text-green-200/60">
                            Contexto: {item.contexto}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {config.key === "errors_risks" && data.errors_risks?.length > 0 && (
                  <div className="space-y-3">
                    {data.errors_risks.map((item, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-red-400/5 border border-red-400/10"
                      >
                        <p className="text-sm font-medium text-red-200/90">{item.erro}</p>
                        {item.consequencia && (
                          <p className="mt-1 text-xs text-red-200/60">
                            Consequência: {item.consequencia}
                          </p>
                        )}
                        {item.como_evitar && (
                          <p className="mt-1 text-xs text-white/60">
                            Como evitar: {item.como_evitar}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {config.key === "frameworks_metodos" && data.frameworks_metodos?.length > 0 && (
                  <div className="space-y-3">
                    {data.frameworks_metodos.map((item, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-purple-400/5 border border-purple-400/10"
                      >
                        <p className="text-sm font-medium text-purple-200/90">{item.nome}</p>
                        {item.descricao && (
                          <p className="mt-1 text-xs text-white/60">{item.descricao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {config.key === "hooks" && data.hooks?.length > 0 && (
                  <div className="space-y-2">
                    {data.hooks.map((item, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-orange-400/5 border border-orange-400/10"
                      >
                        <p className="text-sm text-white/90">{item.gancho}</p>
                        {item.tipo && (
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-orange-400/20 text-orange-200/70">
                            {item.tipo}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {/* Gaps and Opportunities */}
      {data.gaps_oportunidades?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-white/[0.02] border border-white/10"
        >
          <h4 className="text-sm font-medium text-white mb-3">Gaps e Oportunidades</h4>
          <ul className="space-y-2">
            {data.gaps_oportunidades.map((gap, i) => (
              <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
