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
import {
  LoaderIcon,
  SendIcon,
  Bot,
  User,
  StopCircle,
  Database,
  Globe,
  FileText,
  ChevronDown,
  Paperclip,
  File as FileIcon,
  X,
} from "lucide-react"
import { motion } from "framer-motion"
import { RagCategory, RAG_CATEGORIES } from "@/lib/rag"
import { type AgentType } from "@/lib/agents"
import { AgentSelector } from "./agent-selector"
import { ModelSelector } from "./model-selector"
import { RagDocumentSelector, type RagSelection } from "./rag-document-selector"

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
  /** Whether to show model selector (default: true) */
  showModelSelector?: boolean
  /** Whether to use document-based RAG selector (default: true) */
  useDocumentRagSelector?: boolean
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
  showModelSelector = true,
  useDocumentRagSelector = true,
}: AiChatSdkProps & { showModelSelector?: boolean; useDocumentRagSelector?: boolean }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const [ragEnabled, setRagEnabled] = useState(useRagByDefault)
  const [selectedCategories, setSelectedCategories] = useState<RagCategory[]>(defaultCategories)
  const [ragSelection, setRagSelection] = useState<RagSelection>({ collectionIds: [], documentIds: [] })
  const [currentAgent, setCurrentAgent] = useState<AgentType>(initialAgent)
  const [currentModel, setCurrentModel] = useState<string>("openai/gpt-4.1")
  const [ragSources, setRagSources] = useState<Array<{ documentTitle: string; category: string; score: number }>>([])
  const [showRagSources, setShowRagSources] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; size: number; type: string }>>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tool states
  const [tavilyEnabled, setTavilyEnabled] = useState(false)
  const [firecrawlEnabled, setFirecrawlEnabled] = useState(false)

  // Convert initial messages to UIMessage format
  const convertedInitialMessages = initialMessages.map((msg) => ({
    id: crypto.randomUUID(),
    role: msg.role,
    parts: [{ type: "text" as const, text: msg.content }],
  }))

  // Create transport with initial body configuration
  const transportRef = useRef(
    new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: initialAgent,
        model: currentModel,
        zepThreadId,
        categories: defaultCategories,
        ragSelection: { collectionIds: [], documentIds: [] },
        useRag: useRagByDefault,
        useTavily: false,
        useFirecrawl: false,
      },
    })
  )

  // Use Vercel AI SDK v3 useChat hook
  const { messages, status, error, sendMessage, stop } = useChat({
    transport: transportRef.current,
    messages: convertedInitialMessages,
    onFinish: ({ message }) => {
      const text = getMessageText(message)
      onComplete?.(text)
    },
  })

  const isLoading = status === "streaming"

  // Improved auto-scroll with user control
  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (autoScroll && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      })
    }
  }, [messages, autoScroll])

  // Auto-scroll toggle when user scrolls up
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    setAutoScroll(isAtBottom)
  }, [])

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

  // Handle agent change - update transport body
  const handleAgentChange = useCallback((agent: AgentType) => {
    setCurrentAgent(agent)
    onAgentChange?.(agent)

    // Update transport with new agent
    transportRef.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent,
        model: currentModel,
        zepThreadId,
        categories: selectedCategories,
        ragSelection,
        useRag: ragEnabled,
        useTavily: tavilyEnabled,
        useFirecrawl: firecrawlEnabled,
      },
    })
  }, [apiEndpoint, currentModel, zepThreadId, selectedCategories, ragSelection, ragEnabled, tavilyEnabled, firecrawlEnabled, onAgentChange])

  // Handle model change - update transport body
  const handleModelChange = useCallback((modelId: string) => {
    setCurrentModel(modelId)

    transportRef.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: currentAgent,
        model: modelId,
        zepThreadId,
        categories: selectedCategories,
        ragSelection,
        useRag: ragEnabled,
        useTavily: tavilyEnabled,
        useFirecrawl: firecrawlEnabled,
      },
    })
  }, [apiEndpoint, currentAgent, zepThreadId, selectedCategories, ragSelection, ragEnabled, tavilyEnabled, firecrawlEnabled])

  // Handle RAG toggle - update transport body
  const handleRagToggle = useCallback(() => {
    const newValue = !ragEnabled
    setRagEnabled(newValue)

    transportRef.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: currentAgent,
        model: currentModel,
        zepThreadId,
        categories: selectedCategories,
        ragSelection,
        useRag: newValue,
        useTavily: tavilyEnabled,
        useFirecrawl: firecrawlEnabled,
      },
    })
  }, [ragEnabled, apiEndpoint, currentAgent, currentModel, zepThreadId, selectedCategories, ragSelection, tavilyEnabled, firecrawlEnabled])

  // Handle Tavily toggle - update transport body
  const handleTavilyToggle = useCallback(() => {
    const newValue = !tavilyEnabled
    setTavilyEnabled(newValue)

    transportRef.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: currentAgent,
        model: currentModel,
        zepThreadId,
        categories: selectedCategories,
        ragSelection,
        useRag: ragEnabled,
        useTavily: newValue,
        useFirecrawl: firecrawlEnabled,
      },
    })
  }, [tavilyEnabled, apiEndpoint, currentAgent, currentModel, zepThreadId, selectedCategories, ragSelection, ragEnabled, firecrawlEnabled])

  // Handle Firecrawl toggle - update transport body
  const handleFirecrawlToggle = useCallback(() => {
    const newValue = !firecrawlEnabled
    setFirecrawlEnabled(newValue)

    transportRef.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: currentAgent,
        model: currentModel,
        zepThreadId,
        categories: selectedCategories,
        ragSelection,
        useRag: ragEnabled,
        useTavily: tavilyEnabled,
        useFirecrawl: newValue,
      },
    })
  }, [firecrawlEnabled, apiEndpoint, currentAgent, currentModel, zepThreadId, selectedCategories, ragSelection, ragEnabled, tavilyEnabled])

  // Handle category change - update transport body
  const handleCategoryChange = useCallback((categories: RagCategory[]) => {
    setSelectedCategories(categories)

    transportRef.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: currentAgent,
        model: currentModel,
        zepThreadId,
        categories,
        ragSelection,
        useRag: ragEnabled,
        useTavily: tavilyEnabled,
        useFirecrawl: firecrawlEnabled,
      },
    })
  }, [apiEndpoint, currentAgent, currentModel, zepThreadId, ragSelection, ragEnabled, tavilyEnabled, firecrawlEnabled])

  // Handle ragSelection change - update transport body
  const handleRagSelectionChange = useCallback((selection: RagSelection) => {
    setRagSelection(selection)

    transportRef.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: currentAgent,
        model: currentModel,
        zepThreadId,
        categories: selectedCategories,
        ragSelection: selection,
        useRag: ragEnabled,
        useTavily: tavilyEnabled,
        useFirecrawl: firecrawlEnabled,
      },
    })
  }, [apiEndpoint, currentAgent, currentModel, zepThreadId, selectedCategories, ragEnabled, tavilyEnabled, firecrawlEnabled])

  // Handle file attachment
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const result = await response.json()
          setAttachments(prev => [...prev, {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type,
          }])
        }
      }
    } catch (error) {
      // Silent fail - file upload error
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }, [])

  // Send message
  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || isLoading) return

    // Update transport with current state before sending
    transportRef.current = new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        agent: currentAgent,
        model: currentModel,
        zepThreadId,
        categories: selectedCategories,
        ragSelection,
        useRag: ragEnabled,
        useTavily: tavilyEnabled,
        useFirecrawl: firecrawlEnabled,
        attachments: attachments.map(a => ({ id: a.id, name: a.name, type: a.type })),
      },
    })

    sendMessage(
      { parts: [{ type: "text", text: content }] },
      {
        body: {
          agent: currentAgent,
          model: currentModel,
          zepThreadId,
          categories: selectedCategories,
          ragSelection,
          useRag: ragEnabled,
          useTavily: tavilyEnabled,
          useFirecrawl: firecrawlEnabled,
          attachments: attachments.map(a => ({ id: a.id, name: a.name, type: a.type })),
        },
      }
    )

    setInput("")
    setAttachments([])
    setShowRagSources(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = "60px"
    }
  }, [input, isLoading, sendMessage, currentAgent, currentModel, zepThreadId, selectedCategories, ragSelection, ragEnabled, tavilyEnabled, firecrawlEnabled, attachments, apiEndpoint])

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

  // Format model name for display
  const formatModelName = (modelId: string) => {
    const parts = modelId.split("/")
    if (parts.length >= 2) {
      const provider = parts[0]
      const model = parts[1]
      const providerNames: Record<string, string> = {
        "openai": "OpenAI",
        "anthropic": "Anthropic",
        "google": "Google",
        "x-ai": "xAI",
        "bytedance-seed": "ByteDance",
        "black-forest-labs": "Black Forest",
      }
      return `${providerNames[provider] || provider} - ${model}`
    }
    return modelId
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Enhanced Header */}
      {header || (
        <div className="flex items-center justify-between p-3 border-b border-white/[0.05] bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <AgentSelector
              value={currentAgent}
              onValueChange={handleAgentChange}
              showLabel={false}
              size="sm"
            />

            {/* Model Selector */}
            {showModelSelector && (
              <ModelSelector
                value={currentModel}
                onChange={handleModelChange}
                modelType="text"
                showModelName={true}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Tool Toggles */}
            <div className="flex items-center gap-2">
              {/* Tavily Search */}
              <button
                onClick={handleTavilyToggle}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
                  tavilyEnabled ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/40 hover:text-white/60"
                )}
                title="Busca web Tavily"
              >
                <Globe className="w-3 h-3" />
                <span>Web</span>
              </button>

              {/* Firecrawl */}
              <button
                onClick={handleFirecrawlToggle}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
                  firecrawlEnabled ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-white/40 hover:text-white/60"
                )}
                title="Scraping Firecrawl"
              >
                <FileText className="w-3 h-3" />
                <span>Scrape</span>
              </button>

              {/* RAG Document Selector */}
              {showRagSelector && useDocumentRagSelector && (
                <>
                  <div className="w-px h-4 bg-white/10" />
                  <RagDocumentSelector
                    value={ragSelection}
                    onValueChange={handleRagSelectionChange}
                    compact={false}
                  />
                </>
              )}

              {/* Legacy RAG Toggle (fallback) */}
              {showRagSelector && !useDocumentRagSelector && (
                <>
                  <div className="w-px h-4 bg-white/10" />
                  <button
                    onClick={handleRagToggle}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
                      ragEnabled ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40 hover:text-white/60"
                    )}
                  >
                    <Database className="w-3 h-3" />
                    <span>RAG</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
      >
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Bot className="w-8 h-8 text-primary/50" />
              </div>
              <div>
                <p className="text-sm text-white/60">
                  Comece uma conversa com {currentAgent === "zory" ? "a Zory" : currentAgent}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  {showModelSelector && `Usando ${formatModelName(currentModel)}`}
                </p>
              </div>

              {/* Tool suggestions */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {showRagSelector && (
                  <button
                    onClick={() => setRagEnabled(true)}
                    className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white/70 hover:border-white/20 transition-colors"
                  >
                    <Database className="w-3 h-3 inline mr-1" />
                    Buscar nos documentos
                  </button>
                )}
                <button
                  onClick={() => setTavilyEnabled(true)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white/70 hover:border-white/20 transition-colors"
                >
                  <Globe className="w-3 h-3 inline mr-1" />
                  Buscar na web
                </button>
                <button
                  onClick={() => setFirecrawlEnabled(true)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white/70 hover:border-white/20 transition-colors"
                >
                  <FileText className="w-3 h-3 inline mr-1" />
                  Anexar URL
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const messageText = getMessageText(message)
          const isStreaming = message.role === "assistant" && isLoading && messages[messages.length - 1] === message
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/20">
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
                    <span className="text-white/40 italic">Pensando...</span>
                  )}
                </p>

                {/* Streaming indicator */}
                {isStreaming && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-white/60" />
                </div>
              )}
            </motion.div>
          )
        })}

        {/* RAG Sources Display */}
        {showRagSources && ragSources.length > 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-11 bg-primary/5 border border-primary/20 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">Fontes consultadas</span>
            </div>
            <div className="space-y-1">
              {ragSources.map((source, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-white/60">
                  <span className="text-primary/50">•</span>
                  <span>{source.documentTitle}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                    {source.category}
                  </span>
                </div>
              ))}
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
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            messagesContainerRef.current?.scrollTo({
              top: messagesContainerRef.current.scrollHeight,
              behavior: "smooth"
            })
          }}
          className="absolute bottom-24 right-6 w-8 h-8 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center text-primary hover:bg-primary/30 transition-colors z-10"
          title="Rolar para baixo"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

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
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-white/5 text-white/40 hover:text-white/60 border border-transparent"
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

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-white/[0.05]">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70"
              >
                <FileIcon className="w-3 h-3" />
                <span className="max-w-[100px] truncate">{attachment.name}</span>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-white/40 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/[0.05] bg-white/[0.01]">
        {/* Tool status bar */}
        {(ragEnabled || tavilyEnabled || firecrawlEnabled) && (
          <div className="flex items-center gap-2 mb-2">
            {ragEnabled && (
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs">
                <Database className="w-3 h-3 inline mr-1" />
                RAG ativo
              </span>
            )}
            {tavilyEnabled && (
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
                <Globe className="w-3 h-3 inline mr-1" />
                Web search ativo
              </span>
            )}
            {firecrawlEnabled && (
              <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">
                <FileText className="w-3 h-3 inline mr-1" />
                Scraping ativo
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.doc,.docx"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isLoading || isUploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading}
            className={cn(
              "p-3 rounded-xl transition-all",
              "flex items-center justify-center",
              "bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/10"
            )}
            title="Anexar arquivo"
          >
            {isUploading ? (
              <LoaderIcon className="w-4 h-4 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>

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

        {/* Model info */}
        {showModelSelector && (
          <div className="mt-2 flex items-center justify-between text-xs text-white/30">
            <span>Enter para enviar, Shift+Enter para nova linha</span>
            <ModelSelector
              value={currentModel}
              onChange={handleModelChange}
              modelType="text"
              showModelName={true}
              className="opacity-60 hover:opacity-100 transition-opacity"
            />
          </div>
        )}
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
