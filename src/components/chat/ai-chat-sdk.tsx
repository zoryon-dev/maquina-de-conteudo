/**
 * AI Chat SDK Component
 *
 * Chat component powered by Vercel AI SDK's useChat hook.
 * Provides streaming responses, automatic state management,
 * and RAG context integration.
 *
 * This component can be used standalone or integrated into
 * the existing AnimatedAIChat UI.
 */

"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import { cn } from "@/lib/utils"
import { LoaderIcon, SendIcon, Bot, User, StopCircle } from "lucide-react"
import { motion } from "framer-motion"
import { RagCategory, RAG_CATEGORIES } from "@/lib/rag"

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
}

/**
 * Extract text content from a UIMessage
 */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("")
}

/**
 * AiChatSdk Component
 *
 * Full-featured chat component with streaming support.
 */
export function AiChatSdk({
  placeholder = "Converse com nossos especialistas...",
  className,
  showRagSelector = true,
  useRagByDefault = true,
  defaultCategories = [...RAG_CATEGORIES] as RagCategory[],
  onComplete,
  header,
}: AiChatSdkProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const [ragEnabled, setRagEnabled] = useState(useRagByDefault)
  const [selectedCategories, setSelectedCategories] = useState<RagCategory[]>(defaultCategories)

  // useChat hook from Vercel AI SDK
  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    clearError,
  } = useChat({
    // API defaults to '/api/chat'
    onFinish: ({ message }) => {
      const text = getMessageText(message)
      onComplete?.(text)
    },
  })

  // Auto-scroll to bottom when new messages arrive
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

  const isLoading = status === "streaming"

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        handleSend()
      }
    }
  }

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      // Pass RAG settings via message metadata
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: input }],
        metadata: {
          useRag: ragEnabled,
          categories: selectedCategories,
        },
      })
      setInput("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "60px"
      }
    }
  }

  const toggleCategory = (category: RagCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category)
      } else {
        return [...prev, category]
      }
    })
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      {header || (
        <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/90">Chat AI</h3>
              <p className="text-xs text-white/40">
                {ragEnabled ? "RAG ativo" : "Chat geral"}
              </p>
            </div>
          </div>

          {/* RAG Toggle */}
          {showRagSelector && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">RAG</span>
              <button
                onClick={() => setRagEnabled((prev) => !prev)}
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
                Comece uma conversa...
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const text = getMessageText(message)

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
                  {text}
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
            <p className="text-sm text-red-400">
              Erro: {error.message || "Falha ao processar mensagem"}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => clearError()}
                className="text-xs text-red-300 hover:text-red-200 underline"
              >
                Fechar
              </button>
            </div>
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
 * Re-export for convenience
 */
export { useChat } from "@ai-sdk/react"
export type { UIMessage } from "ai"
