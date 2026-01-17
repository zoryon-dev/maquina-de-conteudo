/**
 * Active Agent Badge Component
 *
 * Displays the currently active agent as a badge.
 * Shows agent name, handle, icon and distinctive color.
 *
 * Used in chat UI to indicate which agent is currently responding.
 */

"use client"

import { Bot, Target, Sparkles, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { AGENTS, type AgentType } from "@/lib/agents"
import { AGENT_ICONS } from "@/components/chat/agent-selector"

/**
 * Props for ActiveAgentBadge component
 */
export interface ActiveAgentBadgeProps {
  /** Agent to display */
  agent?: AgentType
  /** Whether to show handle */
  showHandle?: boolean
  /** Whether to show description */
  showDescription?: boolean
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: "sm" | "md" | "lg"
}

const SIZE_CLASSES = {
  sm: {
    container: "px-2 py-1 gap-1.5",
    icon: "w-3 h-3",
    name: "text-xs",
    handle: "text-[10px]",
    description: "text-[10px]",
  },
  md: {
    container: "px-3 py-1.5 gap-2",
    icon: "w-4 h-4",
    name: "text-sm",
    handle: "text-xs",
    description: "text-xs",
  },
  lg: {
    container: "px-4 py-2 gap-2.5",
    icon: "w-5 h-5",
    name: "text-base",
    handle: "text-sm",
    description: "text-sm",
  },
}

/**
 * ActiveAgentBadge - Badge do agente ativo
 *
 * Mostra visualmente qual agente está ativo na conversa.
 * Usa a cor específica do agente para identificação rápida.
 */
export function ActiveAgentBadge({
  agent = "zory",
  showHandle = true,
  showDescription = false,
  className,
  size = "md",
}: ActiveAgentBadgeProps) {
  const agentConfig = AGENTS[agent]
  const AgentIcon = AGENT_ICONS[agent]
  const sizeClass = SIZE_CLASSES[size]

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border",
        "bg-white/[0.02] backdrop-blur-sm",
        sizeClass.container,
        className
      )}
      style={{
        borderColor: agentConfig.color.replace(")", ", 0.3)"),
        backgroundColor: agentConfig.color.replace(")", ", 0.08)"),
      }}
    >
      {/* Agent icon */}
      <span
        className={cn(
          "flex items-center justify-center rounded-full",
          size === "sm" ? "w-5 h-5" : size === "lg" ? "w-7 h-7" : "w-6 h-6"
        )}
        style={{ backgroundColor: agentConfig.color.replace(")", ", 0.2)") }}
      >
        <AgentIcon className={sizeClass.icon} />
      </span>

      {/* Agent name */}
      <span
        className={cn(
          "font-medium text-white/90",
          sizeClass.name
        )}
      >
        {agentConfig.name}
      </span>

      {/* Agent handle */}
      {showHandle && (
        <span
          className={cn(
            "text-white/40 font-medium",
            sizeClass.handle
          )}
        >
          {agentConfig.handle}
        </span>
      )}

      {/* Agent description */}
      {showDescription && (
        <span
          className={cn(
            "text-white/50",
            sizeClass.description
          )}
        >
          · {agentConfig.shortDescription}
        </span>
      )}
    </div>
  )
}

/**
 * Compact version - just icon and handle
 */
export function AgentMiniBadge({
  agent = "zory",
  className,
}: { agent?: AgentType; className?: string }) {
  const agentConfig = AGENTS[agent]
  const AgentIcon = AGENT_ICONS[agent]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
        "bg-white/[0.02] border border-white/[0.05]",
        className
      )}
    >
      <span className="w-3 h-3 flex items-center justify-center" style={{ color: agentConfig.color }}>
        <AgentIcon className="w-full h-full" />
      </span>
      <span className="text-xs text-white/60">{agentConfig.handle}</span>
    </div>
  )
}
