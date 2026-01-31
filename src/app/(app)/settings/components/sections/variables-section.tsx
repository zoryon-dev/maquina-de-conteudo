/**
 * Variables Section
 *
 * Configure global variables for content personalization
 * Uses USER_VARIABLES_CONFIG from system-prompts.ts
 */

"use client"

import * as React from "react"
import {
  Sliders,
  Info,
  AlertTriangle,
  Lightbulb,
  Tag,
  Heart,
  Shield,
  TrendingUp,
  Target,
  Check,
  ChevronRight,
  RotateCcw,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getUserVariablesAction,
  saveVariableAction,
  deleteVariableAction,
} from "@/app/(app)/settings/actions"

/**
 * Variable field configuration
 */
interface VariableFieldConfig {
  label: string
  description: string
  placeholder: string
  examples: string[]
  icon?: React.ComponentType<{ className?: string }>
  warning?: boolean
}

const VARIABLES_CONFIG: Record<string, VariableFieldConfig> = {
  tone: {
    label: "Tom de Voz",
    description: "Como sua marca se comunica em geral",
    placeholder: "Profissional, casual, amigável, humorístico...",
    examples: ["Profissional e acessível", "Casual e descontraído", "Amigável e empático", "Humorístico e leve", "Autoritário e técnico"],
  },
  brandVoice: {
    label: "Voz da Marca",
    description: "Personalidade única que diferencia sua comunicação (mais detalhado que o tom)",
    placeholder: "Autêntica, jovem, sem corporativês...",
    examples: ["Autêntica e sem filtro", "Jovem e conectada", "Séria e confiável", "Irreverente e ousada", "Inspiradora e motivadora"],
    icon: TrendingUp,
  },
  niche: {
    label: "Nichos de Atuação",
    description: "Áreas específicas onde sua marca atua",
    placeholder: "Ex: Ecommerce de moda, consultoria financeira...",
    examples: ["Ecommerce de moda sustentável", "Consultoria de negócios", "Educação física online", "Software B2B", "Food service saudável"],
  },
  targetAudience: {
    label: "Público-Alvo",
    description: "Demografia e psicografia do seu cliente ideal",
    placeholder: "Mulheres 25-40 anos, classe A-B, interessadas em...",
    examples: ["Mulheres 25-40, urbana, preocupada com sustentabilidade", "Empresários 30-50, buscando otimizar tempo", "Gen Z, interessada em moda e tendências"],
    icon: Target,
  },
  audienceFears: {
    label: "Medos e Dores",
    description: "O que seu público teme ou quer evitar (use com ética)",
    placeholder: "Envelhecer, perder dinheiro, ficar para trás...",
    examples: ["Envelhecer, perder relevância", "Desperdiçar dinheiro com produtos que não funcionam", "Não ter tempo para a família", "Perder oportunidades na carreira"],
    icon: AlertTriangle,
    warning: true,
  },
  audienceDesires: {
    label: "Desejos e Aspirações",
    description: "O que seu público sonha e almeja",
    placeholder: "Se sentir único, pertencer a um grupo...",
    examples: ["Se sentir única e especial", "Pertencer a uma comunidade exclusiva", "Ter mais tempo livre", "Ser admirada socialmente", "Viver uma vida mais saudável"],
    icon: Heart,
  },
  negativeTerms: {
    label: "Termos Proibidos",
    description: "Termos que a IA NUNCA deve usar (separados por vírgula)",
    placeholder: "Oba, é assim que, gente, minha gente...",
    examples: ["Oba, é assim que, gente, minha gente, oi povo, amigx", "Caro cliente, prezado cliente, estimado cliente", "Oferta imperdível, só hoje, última chance"],
    icon: Shield,
    warning: true,
  },
  differentiators: {
    label: "Diferenciais",
    description: "O que sua marca/produto oferece que ninguém mais oferece",
    placeholder: "Delivery em 2h, 100% vegano, garantia vitalícia...",
    examples: ["Delivery em 2h, sustentável, 100% vegano", "Atendimento 24/7, garantia incondicional", "Produtos artesanais, receitas exclusivas", "Tecnologia proprietária, patenteada"],
    icon: StarIcon,
  },
  contentGoals: {
    label: "Objetivos do Conteúdo",
    description: "O que cada conteúdo deve priorizar",
    placeholder: "Engajamento, conversão, brand awareness...",
    examples: ["Engajamento e compartilhamento", "Conversão e vendas", "Brand awareness e alcance", "Fidelização e retenção", "Educação e autoridade"],
    icon: Lightbulb,
  },
  preferredCTAs: {
    label: "CTAs Preferidos",
    description: "Chamadas para ação que funcionam bem com sua audiência",
    placeholder: "Compre agora, Saiba mais, Garanta seu desconto...",
    examples: ["Compre agora", "Saiba mais", "Garanta seu desconto", "Clique e confira", "Fale com especialista", "Comece grátis"],
    icon: Tag,
  },
} as const

const VARIABLE_ORDER = [
  "tone", "brandVoice", "niche",
  "targetAudience", "audienceFears", "audienceDesires",
  "differentiators", "contentGoals", "preferredCTAs",
  "negativeTerms",
] as const

/**
 * Variables Section Props
 */
export interface VariablesSectionProps {
  onChange?: () => void
  className?: string
}

/**
 * Star icon for differentiators (inline version)
 */
function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

/**
 * Variable Card Component
 */
interface VariableCardProps {
  varKey: string
  config: VariableFieldConfig
  value: string
  hasValue: boolean
  onClick: () => void
}

function VariableCard({ varKey, config, value, hasValue, onClick }: VariableCardProps) {
  const Icon = config.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-3 p-4 rounded-xl border bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-200 text-left group",
        config.warning && "border-red-500/20 hover:border-red-500/30 bg-red-500/5",
        hasValue && "border-primary/30 bg-primary/5"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 w-full">
        {Icon ? (
          <Icon className={cn("h-4 w-4 shrink-0", config.warning ? "text-red-400" : "text-primary")} />
        ) : (
          <div className={cn("h-4 w-4 rounded-full shrink-0", config.warning ? "bg-red-400" : "bg-primary")} />
        )}
        <span className="text-sm font-medium text-white flex-1">{config.label}</span>
        {config.warning && (
          <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
        )}
        {hasValue && (
          <Check className="h-4 w-4 text-green-500 shrink-0" />
        )}
        <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/40 shrink-0" />
      </div>

      {/* Description (truncated) */}
      <p className={cn("text-xs line-clamp-2", config.warning ? "text-red-300/70" : "text-white/50")}>
        {config.description}
      </p>

      {/* Value preview */}
      {hasValue && (
        <p className="text-xs text-primary/80 line-clamp-1 italic">
          {value}
        </p>
      )}
    </button>
  )
}

/**
 * Variable Edit Dialog Component
 */
interface VariableEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  key: string
  config: VariableFieldConfig
  value: string
  onSave: (value: string) => Promise<void>
  isLoading?: boolean
}

function VariableEditDialog({
  open,
  onOpenChange,
  key: varKey,
  config,
  value,
  onSave,
  isLoading
}: VariableEditDialogProps) {
  const [tempValue, setTempValue] = React.useState(value)
  const [showExamples, setShowExamples] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const Icon = config.icon

  React.useEffect(() => {
    setTempValue(value)
  }, [value])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(tempValue)
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSaving(false)
    }
  }

  const handleExampleClick = (example: string) => {
    setTempValue(example)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {Icon ? (
              <div className={cn("p-2 rounded-lg", config.warning ? "bg-red-500/10" : "bg-primary/10")}>
                <Icon className={cn("h-5 w-5", config.warning ? "text-red-400" : "text-primary")} />
              </div>
            ) : (
              <div className={cn("p-2 rounded-lg", config.warning ? "bg-red-500/10" : "bg-primary/10")}>
                <div className={cn("h-5 w-5 rounded-full", config.warning ? "bg-red-400" : "bg-primary")} />
              </div>
            )}
            <div className="flex-1">
              <DialogTitle className="text-white flex items-center gap-2">
                {config.label}
                {config.warning && (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-500/10 text-red-400">
                    Use com ética
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-white/60 mt-1">
                {config.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Examples */}
          {config.examples.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Lightbulb className="h-3 w-3" />
                {showExamples ? "Ocultar" : "Ver"} exemplos
              </button>
              {showExamples && (
                <div className="flex flex-wrap gap-2">
                  {config.examples.map((example, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleExampleClick(example)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all border border-white/5 hover:border-white/10"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/70">
              Seu valor para {config.label.toLowerCase()}
            </label>
            <textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder={config.placeholder}
              rows={4}
              disabled={isSaving}
              className={cn(
                "w-full px-4 py-3 rounded-xl border text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 resize-none",
                config.warning
                  ? "bg-red-950/30 border-red-500/20 focus:ring-red-500/50"
                  : "bg-[#0a0a0f] border-white/10 focus:ring-primary/50",
                isSaving && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || tempValue === value}
            className="bg-primary text-black hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Helper function to render double braces in JSX
 */
function VarCode({ children }: { children: string }) {
  return (
    <code className="px-1 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-xs">
      {"{{"}{children}{"}}"}
    </code>
  )
}

/**
 * Variables Section Component
 */
export function VariablesSection({ onChange, className }: VariablesSectionProps) {
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  // Load variables from database on mount
  React.useEffect(() => {
    const loadVariables = async () => {
      setIsLoading(true)
      try {
        const savedVariables = await getUserVariablesAction()
        setValues(savedVariables)
      } catch (error) {
        toast.error("Erro ao carregar variáveis")
      } finally {
        setIsLoading(false)
      }
    }

    loadVariables()
  }, [])

  const handleValueChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    onChange?.()
  }

  const handleReset = async () => {
    // Delete all variables
    try {
      await Promise.all(
        Object.keys(values).map((key) => deleteVariableAction(key))
      )
      setValues({})
      onChange?.()
      toast.success("Variáveis resetadas com sucesso!")
    } catch (error) {
      toast.error("Erro ao resetar variáveis")
    }
  }

  const openDialog = (key: string) => {
    setSelectedKey(key)
    setDialogOpen(true)
  }

  const handleDialogSave = async (value: string) => {
    if (!selectedKey) return

    setIsSaving(true)
    try {
      if (value.trim()) {
        // Save or update variable
        const result = await saveVariableAction(selectedKey, value)
        if (result.success) {
          handleValueChange(selectedKey, value)
          toast.success(`${VARIABLES_CONFIG[selectedKey].label} salva com sucesso!`)
        } else {
          throw new Error(result.error)
        }
      } else {
        // Delete if value is empty
        const result = await deleteVariableAction(selectedKey)
        if (result.success) {
          handleValueChange(selectedKey, "")
          toast.success(`${VARIABLES_CONFIG[selectedKey].label} removida.`)
        } else {
          throw new Error(result.error)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar variável")
    } finally {
      setIsSaving(false)
    }
  }

  const filledCount = Object.keys(values).filter((k) => values[k]?.trim()).length
  const totalCount = VARIABLE_ORDER.length

  const selectedConfig = selectedKey ? VARIABLES_CONFIG[selectedKey] : null
  const selectedValue = selectedKey ? (values[selectedKey] || "") : ""

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-purple-400" />
            Variáveis de Personalização
          </h2>
          <p className="text-sm text-white/60">
            Configure {totalCount} variáveis para conteúdo hiper-personalizado.
            <span className="text-white/40"> ({filledCount}/{totalCount} preenchidas)</span>
          </p>
        </div>
        {filledCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={isLoading}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Resetar
          </Button>
        )}
      </div>

      {/* Info Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
        <Info className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-sm space-y-2">
          <p className="text-white/90">
            <span className="font-medium text-purple-300">Como funciona:</span> Preencha estas variáveis uma vez
            e a IA usará automaticamente essas informações em TODOS os conteúdos gerados.
          </p>
          <div className="pl-3 space-y-1 text-white/70">
            <p>• Você define: <span className="text-white">"Público: Mulheres 25-40 que buscam autoestima"</span></p>
            <p>• IA cria: Conteúdo que fala diretamente com esse público</p>
          </div>
          <p className="text-white/60 text-xs pt-1">
            💡 Dica: Quanto mais detalhado, melhor. Exemplo de "Tom de Voz": "Como uma amiga que te dá conselhos sinceros, sem firula"
          </p>
        </div>
      </div>

      {/* Variables Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VARIABLE_ORDER.map((key) => {
            const config = VARIABLES_CONFIG[key]
            const value = values[key] || ""
            const hasValue = value.trim().length > 0

            return (
              <VariableCard
                key={key}
                varKey={key}
                config={config}
                value={value}
                hasValue={hasValue}
                onClick={() => openDialog(key)}
              />
            )
          })}
        </div>
      )}

      {/* Tips */}
      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs text-white/70">
          <strong className="text-amber-400">Dica:</strong> Quanto mais detalhadas forem suas variáveis,
          melhor será a personalização do conteúdo. Use{" "}
          <VarCode>audienceFears</VarCode> e{" "}
          <VarCode>audienceDesires</VarCode> para criar
          conexões emocionais autênticas.
        </p>
      </div>

      {/* Edit Dialog */}
      {selectedConfig && (
        <VariableEditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          key={selectedKey || ""}
          config={selectedConfig}
          value={selectedValue}
          onSave={handleDialogSave}
          isLoading={isSaving}
        />
      )}
    </div>
  )
}
