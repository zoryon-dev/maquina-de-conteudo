/**
 * Agent Selector Component
 *
 * Visual selector for multi-agent chat system.
 * Allows switching between the 4 specialized agents.
 *
 * Agents:
 * - Zory (@zory) - Generalist assistant
 * - Estrategista (@estrategista) - Strategy and positioning
 * - Criador (@criador) - Content creation
 * - Calendário (@calendario) - Editorial calendar
 */

"use client"

import * as React from "react"
import {
  Bot,
  Target,
  Sparkles,
  Calendar,
  Check,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  AGENTS,
  type AgentType,
  getAgentByHandle,
} from "@/lib/agents"

/**
 * Agent icon mapping
 * Exported for use in other components
 */
export const AGENT_ICONS: Record<AgentType, React.ComponentType<{ className?: string }>> = {
  zory: Bot,
  estrategista: Target,
  criador: Sparkles,
  calendario: Calendar,
}

/**
 * Props for AgentSelector component
 */
export interface AgentSelectorProps {
  /** Currently selected agent */
  value?: AgentType
  /** Callback when agent is changed */
  onValueChange?: (agent: AgentType) => void
  /** Additional CSS classes */
  className?: string
  /** Whether to show the badge with agent name */
  showLabel?: boolean
  /** Size variant */
  size?: "sm" | "md" | "lg"
}

/**
 * AgentSelector - Seletor visual de agentes
 *
 * Dropdown que permite trocar entre os 4 agentes especializados.
 * Cada agente tem sua cor e ícone distintivos.
 */
export function AgentSelector({
  value = "zory",
  onValueChange,
  className,
  showLabel = false,
  size = "md",
}: AgentSelectorProps) {
  const currentAgent = AGENTS[value]
  const CurrentIcon = AGENT_ICONS[value]

  const handleSelectAgent = (agentId: AgentType) => {
    onValueChange?.(agentId)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-lg transition-colors relative group",
            "data-[state=open]:bg-white/10 data-[state=open]:text-white/90",
            showLabel
              ? "px-3 py-2 bg-white/[0.02] border border-white/[0.05] hover:border-white/10"
              : "p-2 text-white/40 hover:text-white/90",
            className
          )}
          title={`Agente atual: ${currentAgent.name}`}
        >
          {/* Agent icon with color */}
          <span
            className={cn(
              "flex items-center justify-center rounded-full",
              size === "sm" ? "w-6 h-6" : size === "lg" ? "w-9 h-9" : "w-8 h-8"
            )}
            style={{ backgroundColor: currentAgent.color.replace(")", ", 0.15)") }}
          >
            <span
              className={cn(
                "flex items-center justify-center",
                size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4"
              )}
              style={{ color: currentAgent.color }}
            >
              <CurrentIcon className="w-full h-full" />
            </span>
          </span>

          {/* Agent name/label */}
          {showLabel && (
            <>
              <span className="text-sm font-medium text-white/90">
                {currentAgent.name}
              </span>
              <span className="text-xs text-white/40">{currentAgent.handle}</span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 bg-[#1a1a2e] border-white/10 text-white p-2"
      >
        <div className="px-2 py-1.5 mb-2">
          <p className="text-xs text-white/50 font-medium">AGENTES DISPONÍVEIS</p>
        </div>

        {Object.values(AGENTS).map((agent) => {
          const AgentIcon = AGENT_ICONS[agent.id]
          const isSelected = agent.id === value

          return (
            <DropdownMenuItem
              key={agent.id}
              className={cn(
                "cursor-pointer rounded-md mb-1",
                "flex items-center gap-3 px-3 py-2.5",
                "transition-colors",
                isSelected
                  ? "bg-primary/20 text-white/90"
                  : "hover:bg-white/5 text-white/70"
              )}
              onClick={() => handleSelectAgent(agent.id)}
            >
              {/* Colored indicator */}
              <span
                className="w-1 h-8 rounded-full"
                style={{ backgroundColor: agent.color }}
              />

              {/* Agent icon */}
              <span
                className={cn(
                  "flex items-center justify-center rounded-full w-8 h-8",
                  isSelected ? "bg-white/10" : "bg-white/5"
                )}
              >
                <span
                  className="w-4 h-4 flex items-center justify-center"
                  style={{ color: agent.color }}
                >
                  <AgentIcon className="w-full h-full" />
                </span>
              </span>

              {/* Agent info */}
              <div className="flex-1 text-left">
                <div className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-white" : "text-white/80"
                )}>
                  {agent.name}
                </div>
                <div className="text-xs text-white/40">
                  {agent.handle} · {agent.shortDescription}
                </div>
              </div>

              {/* Checkmark for selected */}
              {isSelected && (
                <Check className="w-4 h-4 text-primary ml-2" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Parse agent from message text
 *
 * Extracts agent handle from message like "@zory create a post"
 * Returns the agent ID and message without the handle.
 */
export function parseAgentFromMessage(
  message: string
): { agent: AgentType | null; messageWithoutAgent: string } {
  const trimmed = message.trim()

  // Check if message starts with @agent
  if (trimmed.startsWith("@")) {
    const parts = trimmed.split(/\s+/)
    const handle = parts[0]

    const agent = getAgentByHandle(handle)
    if (agent) {
      // Remove the handle from message
      const messageWithoutAgent = trimmed
        .substring(handle.length)
        .trim()

      return { agent: agent.id, messageWithoutAgent }
    }
  }

  return { agent: null, messageWithoutAgent: trimmed }
}

/**
 * Hook para gerenciar agente selecionado
 */
export function useAgentSelector(defaultAgent: AgentType = "zory") {
  const [selectedAgent, setSelectedAgent] = React.useState<AgentType>(defaultAgent)

  const agentConfig = React.useMemo(
    () => AGENTS[selectedAgent],
    [selectedAgent]
  )

  return {
    selectedAgent,
    setSelectedAgent,
    agentConfig,
    parseAgentFromMessage,
  }
}
