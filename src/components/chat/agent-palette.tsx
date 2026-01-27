/**
 * Agent Palette Component
 *
 * Command palette that appears when user types @ in the chat input.
 * Shows list of agents that can be selected for the conversation.
 *
 * Usage:
 * - Monitor input value for @ trigger
 * - Show palette when input starts with @
 * - Filter agents by query after @
 * - Select agent by click or Enter key
 */

"use client"

import * as React from "react"
import { Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { AGENTS, type AgentType } from "@/lib/agents"
import { AGENT_ICONS } from "@/components/chat/agent-selector"
import { motion, AnimatePresence } from "framer-motion"

/**
 * Props for AgentPalette component
 */
export interface AgentPaletteProps {
  /** Whether the palette is visible */
  open: boolean
  /** Query string to filter agents (text after @) */
  query: string
  /** Callback when an agent is selected */
  onSelectAgent: (agent: AgentType) => void
  /** Callback when palette should close */
  onClose: () => void
  /** Position relative to parent */
  position?: { top: number; left: number }
  /** Additional CSS classes */
  className?: string
}

/**
 * Filter agents by query string
 *
 * Searches in agent name, handle, and description.
 */
function filterAgents(query: string): typeof AGENTS {
  const q = query.toLowerCase().trim()

  if (!q) {
    return AGENTS
  }

  const filtered: Record<string, (typeof AGENTS)[AgentType]> = {}

  for (const [id, agent] of Object.entries(AGENTS)) {
    const matchesName = agent.name.toLowerCase().includes(q)
    const matchesHandle = agent.handle.toLowerCase().includes(q)
    const matchesDesc = agent.description.toLowerCase().includes(q)
    const matchesExpertise = agent.expertise.some((e) =>
      e.toLowerCase().includes(q)
    )

    if (matchesName || matchesHandle || matchesDesc || matchesExpertise) {
      filtered[id] = agent
    }
  }

  return filtered
}

/**
 * AgentPalette - Command palette para seleção de agentes
 *
 * Aparece quando o usuário digita @ no input do chat.
 * Filtra agentes conforme o usuário digita.
 * Permite seleção por clique ou teclas de navegação.
 */
export function AgentPalette({
  open,
  query,
  onSelectAgent,
  onClose,
  position,
  className,
}: AgentPaletteProps) {
  const filteredAgents = filterAgents(query)
  const agentList = Object.values(filteredAgents)
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  // Reset selected index when filtered list changes
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((i) =>
            i < agentList.length - 1 ? i + 1 : i
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((i) => (i > 0 ? i - 1 : 0))
          break
        case "Enter":
          e.preventDefault()
          if (agentList[selectedIndex]) {
            onSelectAgent(agentList[selectedIndex].id)
          }
          break
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, agentList, selectedIndex, onSelectAgent, onClose])

  if (!open || agentList.length === 0) {
    return null
  }

  const positionStyle = position
    ? { top: position.top, left: position.left }
    : {}

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "absolute z-50 w-72 bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden shadow-xl",
          "backdrop-blur-xl bg-[#1a1a2e]/95",
          className
        )}
        style={positionStyle}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-white/[0.05]">
          <p className="text-xs text-white/50 font-medium">
            {query ? `Resultados para "@${query}"` : "Selecione um agente"}
          </p>
        </div>

        {/* Agent list */}
        <div className="max-h-64 overflow-y-auto py-1">
          {agentList.map((agent, index) => {
            const AgentIcon = AGENT_ICONS[agent.id]
            const isSelected = index === selectedIndex

            return (
              <button
                key={agent.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 transition-colors",
                  "text-left",
                  isSelected
                    ? "bg-primary/20 text-white/90"
                    : "hover:bg-white/5 text-white/70"
                )}
                onClick={() => onSelectAgent(agent.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {/* Left color bar */}
                <span
                  className="w-0.5 h-8 rounded-full"
                  style={{ backgroundColor: agent.color }}
                />

                {/* Agent icon */}
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full w-9 h-9 shrink-0",
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isSelected ? "text-white" : "text-white/80"
                      )}
                    >
                      {agent.name}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        isSelected ? "text-white/50" : "text-white/30"
                      )}
                    >
                      {agent.handle}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs truncate",
                      isSelected ? "text-white/50" : "text-white/30"
                    )}
                  >
                    {agent.shortDescription}
                  </p>
                </div>

                {/* Checkmark for selected */}
                {isSelected && (
                  <kbd
                    className={cn(
                      "hidden sm:inline-flex items-center gap-1",
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      "bg-white/10 text-white/40"
                    )}
                  >
                    <Keyboard className="w-2.5 h-2.5" />
                    Enter
                  </kbd>
                )}
              </button>
            )
          })}

          {/* No results */}
          {agentList.length === 0 && (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-white/40">
                Nenhum agente encontrado para "@{query}"
              </p>
            </div>
          )}
        </div>

        {/* Footer with keyboard hint */}
        <div className="px-3 py-2 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 text-[10px] text-white/30">
            <kbd className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5">
              <Keyboard className="w-2.5 h-2.5" />
              ↑↓
            </kbd>
            <span>navegar</span>
            <kbd className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5">
              <Keyboard className="w-2.5 h-2.5" />
              Enter
            </kbd>
            <span>selecionar</span>
            <kbd className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5">
              <Keyboard className="w-2.5 h-2.5" />
              Esc
            </kbd>
            <span>fechar</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Hook to manage agent palette state
 *
 * Automatically detects @ trigger in input and manages palette state.
 */
export function useAgentPalette() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [triggerPosition, setTriggerPosition] = React.useState<{
    top: number
    left: number
  } | null>(null)

  /**
   * Process input value to detect @ trigger
   *
   * Call this with the current input value to determine:
   * - If palette should be open
   * - What query to filter by
   * - Where to position the palette
   */
  const processInput = React.useCallback(
    (value: string, inputElement?: HTMLTextAreaElement | HTMLInputElement | null) => {
      // Find the last @ in the input
      const lastAtIndex = value.lastIndexOf("@")

      // Check if @ is the last character or if we're typing after it
      if (lastAtIndex === -1) {
        setIsOpen(false)
        setQuery("")
        setTriggerPosition(null)
        return
      }

      // Get text after @
      const textAfterAt = value.slice(lastAtIndex + 1)

      // Check if there's a space before the @ (so it's a new @ mention)
      // or if @ is at the start
      const charBeforeAt = value[lastAtIndex - 1]
      const isNewMention =
        lastAtIndex === 0 || charBeforeAt === " " || charBeforeAt === "\n"

      // Only trigger if this is a new @ mention and no space after @ yet
      if (isNewMention && !textAfterAt.includes(" ")) {
        setIsOpen(true)
        setQuery(textAfterAt)

        // Calculate position if input element is provided
        if (inputElement) {
          // This is a simplified positioning
          // For more accurate positioning, you'd need to measure the text
          const rect = inputElement.getBoundingClientRect()
          setTriggerPosition({
            top: rect.top - 200, // Position above input
            left: rect.left,
          })
        }
        return
      }

      setIsOpen(false)
      setQuery("")
      setTriggerPosition(null)
    },
    []
  )

  /**
   * Close the palette
   */
  const close = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  /**
   * Select an agent
   *
   * Returns the handle that should be inserted into the input.
   */
  const selectAgent = React.useCallback(
    (agentId: AgentType): string => {
      const agent = AGENTS[agentId]
      setIsOpen(false)
      setQuery("")
      return agent.handle
    },
    []
  )

  return {
    isOpen,
    query,
    triggerPosition,
    processInput,
    close,
    selectAgent,
  }
}
