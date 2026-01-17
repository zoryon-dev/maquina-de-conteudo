/**
 * AI Chat SDK Component
 *
 * Chat component with multi-agent support via Zep Cloud.
 * Provides streaming responses, agent selection, and RAG context.
 * Uses Vercel AI SDK v3 useChat hook for automatic streaming management.
 *
 * @component
 */

"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { cn } from "@/lib/utils"
import { LoaderIcon, SendIcon, Bot, User, StopCircle } from "lucide-react"
import { motion } from "framer-motion"
import { RagCategory, RAG_CATEGORIES } from "@/lib/rag"
import { type AgentType } from "@/lib/agents"
import { AgentSelector } from "./agent-selector"

/**
 * Props for AiChatSdk component
 */
export interface AiChatSdkProps {
  /** Placeholder text for input */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
  /** Whether to show RAG context selector (default: true) */
  showRagSelector?: boolean
  /** Whether to use RAG by default (default: true) */
  useRagByDefault?: boolean
  /** Default RAG categories (default: all) */
  defaultCategories?: RagCategory[]
  /** Callback when a message is completed */
  onComplete?: (message: string) => void
  /** Custom header component */
  header?: React.ReactNode
  /** Zep thread ID for context persistence */
  zepThreadId?: string | null
  /** Initial agent to use (default: "zory") */
  initialAgent?: AgentType
  /** Callback when agent changes */
  onAgentChange?: (agent: AgentType) => void
  /** Custom API endpoint (default: /api/chat) */
  apiEndpoint?: string
  /** Initial messages for the chat */
  initialMessages?: Array<{ role: "user" | "assistant"; content: string }>
}

/**
 * Extract text content from a UIMessage
 */
function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts) return ""
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("")
}

/**
 * AiChatSdk Component
 *
 * Full-featured chat component with multi-agent support.
 * Uses Vercel AI SDK v3 useChat hook for automatic streaming.
 */
export function AiChatSdk({
  placeholder = "Converse com nossos especialistas...",
  className,
  showRagSelector = true,
  useRagByDefault = true,
  defaultCategories = [...RAG_CATEGORIES] as RagCategory[],
  onComplete,
  header,
  zepThreadId = null,
  initialAgent = "zory",
  onAgentChange,
  apiEndpoint = "/api/chat",
  initialMessages = [],
}: AiChatSdkProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState("")
  const [ragEnabled, setRagEnabled] = useState(useRagByDefault)
  const [selectedCategories, setSelectedCategories] = useState<RagCategory[]>(defaultCategories)
  const [currentAgent, setCurrentAgent] = useState<AgentType>(initialAgent)

  // Set up transport with custom body fields
  const transport = useRef(
    new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: initialAgent,
        zepThreadId,
        categories: defaultCategories,
        useRag: useRagByDefault,
      },
    })
  )

  // Convert initial messages to UIMessage format
  const convertedInitialMessages = initialMessages.map((msg) => ({
    id: crypto.randomUUID(),
    role: msg.role,
    parts: [{ type: "text" as const, text: msg.content }],
  }))

  // Use Vercel AI SDK v3 useChat hook
  const { messages, status, error, sendMessage, stop } = useChat({
    transport: transport.current,
    messages: convertedInitialMessages,
    onFinish: ({ message }) => {
      const text = getMessageText(message)
      onComplete?.(text)
    },
  })

  const isLoading = status === "streaming"

  // Auto-scroll to bottom when messages change
  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const resetHeight = () => {
      textarea.style.height = "60px"
    }

    const adjustHeight = () => {
      textarea.style.height = "60px"
      const newHeight = Math.min(200, Math.max(60, textarea.scrollHeight))
      textarea.style.height = `${newHeight}px`
    }

    textarea.addEventListener("input", adjustHeight)
    resetHeight()

    return () => {
      textarea.removeEventListener("input", adjustHeight)
    }
  }, [])

  // Handle agent change
  const handleAgentChange = useCallback((agent: AgentType) => {
    setCurrentAgent(agent)
    onAgentChange?.(agent)

    // Update transport with new agent
    transport.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent,
        zepThreadId,
        categories: selectedCategories,
        useRag: ragEnabled,
      },
    })
  }, [apiEndpoint, onAgentChange, zepThreadId, selectedCategories, ragEnabled])

  // Handle RAG toggle
  const handleRagToggle = useCallback(() => {
    const newValue = !ragEnabled
    setRagEnabled(newValue)

    // Update transport with new RAG setting
    transport.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: currentAgent,
        zepThreadId,
        categories: selectedCategories,
        useRag: newValue,
      },
    })
  }, [ragEnabled, apiEndpoint, currentAgent, zepThreadId, selectedCategories])

  // Handle category change
  const handleCategoryChange = useCallback((categories: RagCategory[]) => {
    setSelectedCategories(categories)

    // Update transport with new categories
    transport.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: currentAgent,
        zepThreadId,
        categories,
        useRag: ragEnabled,
      },
    })
  }, [apiEndpoint, currentAgent, zepThreadId, ragEnabled])

  // Send message
  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || isLoading) return

    // Send via SDK with custom body
    sendMessage(
      { text: content },
      {
        body: {
          agent: currentAgent,
          zepThreadId,
          categories: selectedCategories,
          useRag: ragEnabled,
        },
      }
    )

    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "60px"
    }
  }, [input, isLoading, sendMessage, currentAgent, zepThreadId, selectedCategories, ragEnabled])

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Toggle RAG category
  const toggleCategory = (category: RagCategory) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category]
    handleCategoryChange(newCategories)
  }

  // Clear error
  const clearError = () => {
    // useChat doesn't have a clearError method, but we can handle it via UI state
    // The error will be cleared on the next successful request
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      {header || (
        <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <AgentSelector
              value={currentAgent}
              onValueChange={handleAgentChange}
              showLabel
              size="md"
            />
          </div>

          {/* RAG Toggle */}
          {showRagSelector && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">RAG</span>
              <button
                onClick={handleRagToggle}
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative",
                  ragEnabled ? "bg-primary" : "bg-white/10"
                )}
              >
                <motion.span
                  className="absolute top-1 w-3.5 h-3.5 rounded-full bg-white"
                  animate={{ left: ragEnabled ? "auto" : 4, right: ragEnabled ? 4 : "auto" }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <Bot className="w-8 h-8 text-primary/50 mx-auto" />
              <p className="text-sm text-white/40">
                Comece uma conversa com {currentAgent === "zory" ? "a Zory" : currentAgent}...
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const messageText = getMessageText(message)
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-[#0A0A0B]"
                    : "bg-white/[0.02] border border-white/[0.05]"
                )}
              >
                <p className={cn(
                  "text-sm whitespace-pre-wrap",
                  message.role === "user" ? "text-[#0A0A0B]" : "text-white/80"
                )}>
                  {messageText || (
                    <span className="text-white/40 italic">Digitando...</span>
                  )}
                </p>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-white/60" />
                </div>
              )}
            </motion.div>
          )
        })}

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <LoaderIcon className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-white/60">Digitando...</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
          >
            <p className="text-sm text-red-400">{error.message}</p>
            <button
              onClick={clearError}
              className="text-xs text-red-300 hover:text-red-200 underline mt-2"
            >
              Fechar
            </button>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Category Selector (when RAG is enabled) */}
      {showRagSelector && ragEnabled && (
        <div className="px-4 py-2 border-t border-white/[0.05]">
          <div className="flex flex-wrap gap-2">
            {defaultCategories.map((category) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs transition-colors",
                  selectedCategories.includes(category)
                    ? "bg-primary/20 text-primary"
                    : "bg-white/5 text-white/40 hover:text-white/60"
                )}
              >
                {category}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/30 mt-1">
            {selectedCategories.length} categorias selecionadas
          </p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/[0.05]">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "flex-1 px-4 py-3 rounded-xl",
              "resize-none",
              "bg-white/[0.02] border border-white/[0.05]",
              "text-sm text-white/90 placeholder:text-white/20",
              "focus:outline-none focus:border-primary/50",
              "min-h-[60px] max-h-[200px]"
            )}
            disabled={isLoading}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={cn(
              "px-4 py-3 rounded-xl transition-all",
              "flex items-center justify-center",
              input.trim()
                ? "bg-primary text-[#0A0A0B] hover:bg-primary/90"
                : "bg-white/5 text-white/40"
            )}
          >
            {isLoading ? (
              <LoaderIcon className="w-4 h-4 animate-spin" />
            ) : (
              <SendIcon className="w-4 h-4" />
            )}
          </button>

          {isLoading && (
            <button
              type="button"
              onClick={stop}
              className="px-4 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
              title="Parar geração"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Export hook for agent management
 */
export function useAgentChat(defaultAgent: AgentType = "zory") {
  const [currentAgent, setCurrentAgent] = useState<AgentType>(defaultAgent)
  const [zepThreadId, setZepThreadId] = useState<string | null>(null)

  const switchAgent = useCallback((agent: AgentType) => {
    setCurrentAgent(agent)
  }, [])

  const startNewSession = useCallback((threadId: string) => {
    setZepThreadId(threadId)
  }, [])

  return {
    currentAgent,
    setCurrentAgent,
    switchAgent,
    zepThreadId,
    setZepThreadId,
    startNewSession,
  }
}
