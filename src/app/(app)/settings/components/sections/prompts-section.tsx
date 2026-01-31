/**
 * Prompts Section
 *
 * Customize system prompts for AI agents with 4-layer architecture
 *
 * Layer 1: System Prompt (dev-defined, read-only)
 * Layer 2: User Prompt (customizable, overrides system)
 * Layer 3: Processed Variables (AI-enriched via Gemini)
 * Layer 4: RAG Context (document embeddings)
 */

"use client"

import * as React from "react"
import { Edit3, RotateCcw, Layers, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  getSystemPromptsAction,
  getUserPromptsAction,
  savePromptAction,
  deletePromptAction,
} from "../../actions/save-settings"
import { PROMPT_LAYERS } from "@/lib/system-prompts"

/**
 * Database prompt types
 */
interface DbSystemPrompt {
  id: number
  agent: string
  prompt: string
  version: number
}

interface DbUserPrompt {
  id: number
  agent: string
  prompt: string
}

/**
 * Agent configuration
 */
interface AgentConfig {
  id: string
  name: string
  description: string
  icon: string
}

const AGENTS: AgentConfig[] = [
  { id: "zory", name: "Zory", description: "Estrategista de conteúdo para redes sociais", icon: "⚡" },
  { id: "estrategista", name: "Estrategista", description: "Analista de tendências e comportamento", icon: "📊" },
  { id: "calendario", name: "Calendário", description: "Especialista em planejamento e agendamento", icon: "📅" },
  { id: "criador", name: "Criador", description: "Gerador de conteúdo criativo", icon: "✨" },
]

/**
 * Prompts Section Props
 */
export interface PromptsSectionProps {
  onChange?: () => void
  className?: string
}

/**
 * Prompt Layer Badge
 */
function PromptLayerBadge({ layer }: { layer: keyof typeof PROMPT_LAYERS }) {
  const config = PROMPT_LAYERS[layer]
  return (
    <span
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded",
        layer === "system" && "bg-amber-500/10 text-amber-400",
        layer === "user" && "bg-blue-500/10 text-blue-400",
        layer === "variables" && "bg-purple-500/10 text-purple-400",
        layer === "rag" && "bg-cyan-500/10 text-cyan-400"
      )}
    >
      <Layers className="h-2.5 w-2.5" />
      {config.name}
    </span>
  )
}

/**
 * Prompt Card Component
 */
interface PromptCardProps {
  agent: AgentConfig
  systemPrompt?: DbSystemPrompt
  userPrompt?: DbUserPrompt
  onEdit: () => void
}

function PromptCard({ agent, systemPrompt, userPrompt, onEdit }: PromptCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const hasCustomPrompt = !!userPrompt

  return (
    <div
      className={cn(
        "p-4 rounded-xl border bg-white/[0.02] transition-all duration-200",
        "hover:border-white/10",
        hasCustomPrompt && "border-blue-500/30 bg-blue-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-lg">
            {agent.icon}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-white">{agent.name}</h3>
              <PromptLayerBadge layer={hasCustomPrompt ? "user" : "system"} />
            </div>
            <p className="text-xs text-white/60">{agent.description}</p>

            {/* Prompt preview */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Ocultar prompt
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Ver prompt
                  </>
                )}
              </button>

              {isExpanded && (
                <div className="mt-2 p-3 rounded-lg bg-black/30 border border-white/5">
                  <p className="text-xs text-white/70 whitespace-pre-wrap font-mono">
                    {hasCustomPrompt ? userPrompt!.prompt : systemPrompt?.prompt || "Não disponível"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          className={cn(
            "h-8 px-2",
            hasCustomPrompt
              ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
        >
          <Edit3 className="h-3.5 w-3.5 mr-1" />
          {hasCustomPrompt ? "Editar custom" : "Personalizar"}
        </Button>
      </div>
    </div>
  )
}

/**
 * Prompt Editor Dialog
 */
interface PromptEditorDialogProps {
  agent: AgentConfig | null
  systemPrompt?: DbSystemPrompt
  userPrompt?: DbUserPrompt
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
}

function PromptEditorDialog({
  agent,
  systemPrompt,
  userPrompt,
  open,
  onOpenChange,
  onSave,
}: PromptEditorDialogProps) {
  const [customPrompt, setCustomPrompt] = React.useState(userPrompt?.prompt || "")
  const [isSaving, setIsSaving] = React.useState(false)
  const [showSystemPrompt, setShowSystemPrompt] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setCustomPrompt(userPrompt?.prompt || "")
      setShowSystemPrompt(false)
    }
  }, [open, userPrompt])

  const handleSave = async () => {
    if (!agent) return

    setIsSaving(true)
    try {
      if (customPrompt.trim()) {
        const result = await savePromptAction(agent.id, customPrompt.trim())
        if (result.success) {
          toast.success(`Prompt personalizado salvo para ${agent.name}`)
          onSave()
          onOpenChange(false)
        } else {
          toast.error(result.error || "Falha ao salvar prompt")
        }
      } else {
        // If empty, delete the custom prompt
        const result = await deletePromptAction(agent.id)
        if (result.success) {
          toast.success(`Prompt resetado para o padrão do sistema`)
          onSave()
          onOpenChange(false)
        } else {
          toast.error(result.error || "Falha ao resetar prompt")
        }
      }
    } catch (error) {
      toast.error("Falha ao salvar prompt")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (!agent) return

    setIsSaving(true)
    try {
      const result = await deletePromptAction(agent.id)
      if (result.success) {
        toast.success(`Prompt resetado para o padrão do sistema`)
        setCustomPrompt("")
        onSave()
        onOpenChange(false)
      } else {
        toast.error(result.error || "Falha ao resetar prompt")
      }
    } catch (error) {
      toast.error("Falha ao resetar prompt")
    } finally {
      setIsSaving(false)
    }
  }

  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[#1a1a2e] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span className="text-lg">{agent.icon}</span>
            Personalizar Prompt - {agent.name}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Crie sua própria versão do prompt. Isso sobrescreverá o prompt do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Layer info */}
          <div className="flex items-center gap-2 flex-wrap">
            <PromptLayerBadge layer="system" />
            <span className="text-xs text-white/40">→</span>
            <PromptLayerBadge layer="user" />
            <span className="text-xs text-white/40">→</span>
            <PromptLayerBadge layer="variables" />
            <span className="text-xs text-white/40">→</span>
            <PromptLayerBadge layer="rag" />
          </div>

          {/* System prompt reference */}
          <div className="rounded-lg bg-black/30 border border-white/5">
            <button
              type="button"
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className="w-full flex items-center justify-between px-3 py-2 text-left"
            >
              <span className="text-xs font-medium text-white/70">
                Prompt do Sistema (referência)
              </span>
              {showSystemPrompt ? (
                <ChevronUp className="h-4 w-4 text-white/40" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/40" />
              )}
            </button>
            {showSystemPrompt && (
              <div className="px-3 pb-3">
                <p className="text-xs text-white/50 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                  {systemPrompt?.prompt || "Não disponível"}
                </p>
              </div>
            )}
          </div>

          {/* Custom prompt textarea */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/70">
              Seu Prompt Personalizado
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Digite seu prompt personalizado... Use variáveis como {{tone}}, {{niche}}, {{targetAudience}}"
              className="w-full px-3 py-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[200px]"
            />
            <p className="text-xs text-white/40">
              Deixe vazio para usar o prompt do sistema.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isSaving || !userPrompt}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Resetar para Sistema
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-black hover:bg-primary/90"
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Prompts Section Component
 */
export function PromptsSection({ onChange, className }: PromptsSectionProps) {
  const [systemPrompts, setSystemPrompts] = React.useState<DbSystemPrompt[]>([])
  const [userPrompts, setUserPrompts] = React.useState<DbUserPrompt[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [editingAgent, setEditingAgent] = React.useState<AgentConfig | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  // Fetch prompts on mount
  React.useEffect(() => {
    fetchPrompts()
  }, [])

  const fetchPrompts = async () => {
    setIsLoading(true)
    try {
      const [system, user] = await Promise.all([
        getSystemPromptsAction(),
        getUserPromptsAction(),
      ])
      setSystemPrompts(system)
      setUserPrompts(user)
    } catch (error) {
      // Silent fail - prompts fetch error
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (agent: AgentConfig) => {
    setEditingAgent(agent)
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    fetchPrompts()
    onChange?.()
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4 p-8 text-center", className)}>
        <p className="text-sm text-white/40">Carregando prompts...</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-white">Prompts do Sistema</h2>
        <p className="text-sm text-white/60">
          Personalize os prompts que definem o comportamento de cada agente de IA.
          Seus prompts sobrescrevem os prompts do sistema.
        </p>
      </div>

      {/* Layer Architecture Info */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
        <Layers className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-white/90">
            <span className="font-medium">Arquitetura de 4 Camadas:</span> Sistema
            → User → Variáveis Processadas → Contexto RAG
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(PROMPT_LAYERS).map(([key, config]) => (
              <span
                key={key}
                className={cn(
                  "text-xs px-2 py-0.5 rounded",
                  key === "system" && "bg-amber-500/10 text-amber-400",
                  key === "user" && "bg-blue-500/10 text-blue-400",
                  key === "variables" && "bg-purple-500/10 text-purple-400",
                  key === "rag" && "bg-cyan-500/10 text-cyan-400"
                )}
              >
                {config.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Agents List */}
      <div className="space-y-3">
        {AGENTS.map((agent) => {
          const systemPrompt = systemPrompts.find((p) => p.agent === agent.id)
          const userPrompt = userPrompts.find((p) => p.agent === agent.id)
          return (
            <PromptCard
              key={agent.id}
              agent={agent}
              systemPrompt={systemPrompt}
              userPrompt={userPrompt}
              onEdit={() => handleEdit(agent)}
            />
          )
        })}
      </div>

      {/* Prompt Editor Dialog */}
      <PromptEditorDialog
        agent={editingAgent}
        systemPrompt={editingAgent ? systemPrompts.find((p) => p.agent === editingAgent.id) : undefined}
        userPrompt={editingAgent ? userPrompts.find((p) => p.agent === editingAgent.id) : undefined}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
      />
    </div>
  )
}
