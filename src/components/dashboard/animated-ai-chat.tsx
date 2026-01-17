"use client"

import { useEffect, useRef, useCallback, useTransition, useState } from "react"
import { cn } from "@/lib/utils"
import {
  ImageIcon,
  FileText,
  Calendar,
  Link2,
  Sparkles,
  Command,
  Paperclip,
  SendIcon,
  XIcon,
  LoaderIcon,
  MessageSquare,
  Bot,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ModelSelector, useModelSelector } from "@/components/chat/model-selector"
import { RagContextSelector, useRagCategories } from "@/components/chat/rag-context-selector"
import { ChatMessageSources, type ChatSource } from "@/components/chat"
import { AgentPalette } from "@/components/chat/agent-palette"
import { AgentSelector } from "@/components/chat/agent-selector"
import { AGENTS, type AgentType } from "@/lib/agents"

interface UseAutoResizeTextareaProps {
  minHeight: number
  maxHeight?: number
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current
      if (!textarea) return

      if (reset) {
        textarea.style.height = `${minHeight}px`
        return
      }

      textarea.style.height = `${minHeight}px`
      const newHeight = Math.max(
        minHeight,
        Math.min(
          textarea.scrollHeight,
          maxHeight ?? Number.POSITIVE_INFINITY
        )
      )

      textarea.style.height = `${newHeight}px`
    },
    [minHeight, maxHeight]
  )

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = `${minHeight}px`
    }
  }, [minHeight])

  useEffect(() => {
    const handleResize = () => adjustHeight()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [adjustHeight])

  return { textareaRef, adjustHeight }
}

interface CommandSuggestion {
  icon: React.ReactNode
  label: string
  description: string
  prefix: string
}

interface AnimatedAIChatProps {
  onSendMessage?: (message: string, model?: string, agent?: AgentType) => void
  /** External typing state (controlled by parent) */
  isTyping?: boolean
  /** Response text to display */
  response?: string | null
  /** RAG sources from the response */
  sources?: ChatSource[] | null
  /** Initial agent to use (default: "zory") */
  initialAgent?: AgentType
  /** Callback when agent changes */
  onAgentChange?: (agent: AgentType) => void
}

/**
 * AnimatedAIChat - Interface conversacional com IA
 *
 * Chat completo com command palette, sugestões,
 * textarea auto-resize e animações fluidas.
 *
 * Cores adaptadas para Lime Green do sistema.
 */
export function AnimatedAIChat({
  onSendMessage,
  isTyping: externalIsTyping,
  response,
  sources,
  initialAgent = "zory",
  onAgentChange,
}: AnimatedAIChatProps) {
  const [value, setValue] = useState("")
  const [attachments, setAttachments] = useState<string[]>([])
  const [internalIsTyping, setInternalIsTyping] = useState(false)
  const [, startTransition] = useTransition()
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  })
  const [inputFocused, setInputFocused] = useState(false)
  const commandPaletteRef = useRef<HTMLDivElement>(null)

  // Agent selection state
  const [currentAgent, setCurrentAgent] = useState<AgentType>(initialAgent)
  const [showAgentPalette, setShowAgentPalette] = useState(false)
  const [agentQuery, setAgentQuery] = useState("")

  // Use external typing state if provided, otherwise use internal
  const isTyping = externalIsTyping !== undefined ? externalIsTyping : internalIsTyping

  // Model selection state
  const { selectedModel, setSelectedModel } = useModelSelector()

  // RAG context selection state
  const { selected: ragCategories } = useRagCategories()

  // Comandos específicos para Máquina de Conteúdo
  const commandSuggestions: CommandSuggestion[] = [
    {
      icon: <MessageSquare className="w-4 h-4" />,
      label: "Novo Texto",
      description: "Criar texto para redes sociais",
      prefix: "/texto",
    },
    {
      icon: <ImageIcon className="w-4 h-4" />,
      label: "Gerar Imagem",
      description: "Criar imagem com IA",
      prefix: "/imagem",
    },
    {
      icon: <FileText className="w-4 h-4" />,
      label: "Carrossel",
      description: "Criar carrossel para post",
      prefix: "/carrossel",
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Agendar",
      description: "Agendar publicação",
      prefix: "/agendar",
    },
    {
      icon: <Link2 className="w-4 h-4" />,
      label: "Fontes",
      description: "Adicionar fonte de conteúdo",
      prefix: "/fontes",
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      label: "Especialistas",
      description: "Ver especialistas disponíveis",
      prefix: "/especialistas",
    },
  ]

  useEffect(() => {
    // Detect /command trigger
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCommandPalette(true)
      setShowAgentPalette(false) // Close agent palette when command palette opens

      const matchingSuggestionIndex = commandSuggestions.findIndex((cmd) =>
        cmd.prefix.startsWith(value)
      )

      if (matchingSuggestionIndex >= 0) {
        setActiveSuggestion(matchingSuggestionIndex)
      } else {
        setActiveSuggestion(-1)
      }
    } else if (value.startsWith("@") && !value.includes(" ")) {
      // Detect @agent trigger
      setShowAgentPalette(true)
      setShowCommandPalette(false) // Close command palette when agent palette opens
      setAgentQuery(value.slice(1)) // Query is text after @
    } else {
      setShowCommandPalette(false)
      setShowAgentPalette(false)
      setAgentQuery("")
    }
  }, [value])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const commandButton = document.querySelector('[data-command-button]')

      if (
        commandPaletteRef.current &&
        !commandPaletteRef.current.contains(target) &&
        !commandButton?.contains(target)
      ) {
        setShowCommandPalette(false)
        setShowAgentPalette(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveSuggestion(
          (prev) => (prev < commandSuggestions.length - 1 ? prev + 1 : 0)
        )
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveSuggestion(
          (prev) => (prev > 0 ? prev - 1 : commandSuggestions.length - 1)
        )
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault()
        if (activeSuggestion >= 0) {
          const selectedCommand = commandSuggestions[activeSuggestion]
          setValue(selectedCommand.prefix + " ")
          setShowCommandPalette(false)
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        setShowCommandPalette(false)
      }
    } else if (showAgentPalette) {
      if (e.key === "Escape") {
        e.preventDefault()
        setShowAgentPalette(false)
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault()
        // Select first matching agent
        const matchedAgent = Object.values(AGENTS).find(
          (agent) =>
            agent.handle.toLowerCase() === `@${agentQuery.toLowerCase()}` ||
            agent.id.toLowerCase() === agentQuery.toLowerCase()
        )
        if (matchedAgent) {
          setValue(`${matchedAgent.handle} `)
          setCurrentAgent(matchedAgent.id)
          onAgentChange?.(matchedAgent.id)
          setShowAgentPalette(false)
        }
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        handleSendMessage()
      }
    }
  }

  const handleSendMessage = () => {
    if (value.trim()) {
      // Check if message starts with @agent and handle agent switching
      let messageToSend = value
      let agentToSend = currentAgent

      if (value.startsWith("@")) {
        const parts = value.slice(1).split(/\s+/)
        const potentialHandle = `@${parts[0].toLowerCase()}`

        // Find agent by handle
        const matchedAgent = Object.values(AGENTS).find(
          (agent) => agent.handle.toLowerCase() === potentialHandle
        )

        if (matchedAgent) {
          agentToSend = matchedAgent.id
          setCurrentAgent(matchedAgent.id)
          onAgentChange?.(matchedAgent.id)

          // Remove the @handle from the message
          messageToSend = value.slice(potentialHandle.length).trim()
        }
      }

      if (messageToSend) {
        startTransition(() => {
          onSendMessage?.(messageToSend, selectedModel, agentToSend)
          // Only set internal typing state if external is not controlled
          if (externalIsTyping === undefined) {
            setInternalIsTyping(true)
            // Simular resposta da IA quando não controlado externamente
            setTimeout(() => {
              setInternalIsTyping(false)
            }, 2000)
          }
          setValue("")
          adjustHeight(true)
        })
      } else {
        // Just switch agent without sending message
        setValue("")
        adjustHeight(true)
      }
    }
  }

  const handleAttachFile = () => {
    const mockFileName = `arquivo-${Math.floor(Math.random() * 1000)}.pdf`
    setAttachments((prev) => [...prev, mockFileName])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const selectCommandSuggestion = (index: number) => {
    const selectedCommand = commandSuggestions[index]
    setValue(selectedCommand.prefix + " ")
    setShowCommandPalette(false)
    textareaRef.current?.focus()
  }

  const handleAgentSelect = (agentId: AgentType) => {
    const agent = AGENTS[agentId]
    setValue(`${agent.handle} `)
    setCurrentAgent(agentId)
    onAgentChange?.(agentId)
    setShowAgentPalette(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden">
      {/* Background animado com Lime Green */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full mix-blend-normal filter blur-[128px] animate-pulse [animation-delay:700ms]" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-primary/8 rounded-full mix-blend-normal filter blur-[96px] animate-pulse [animation-delay:1000ms]" />
      </div>

      <div className="w-full max-w-2xl mx-auto relative">
        <motion.div
          className="relative z-10 space-y-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 pb-1">
                Como posso ajudar hoje?
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className="text-sm text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Digite um comando ou faça uma pergunta
            </motion.p>
          </div>

          {/* Chat Card */}
          <motion.div
            className="relative backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Command Palette */}
            <AnimatePresence>
              {showCommandPalette && (
                <motion.div
                  ref={commandPaletteRef}
                  className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-black/90 rounded-lg z-50 shadow-lg border border-white/10 overflow-hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="py-1 bg-black/95">
                    {commandSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.prefix}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
                          activeSuggestion === index
                            ? "bg-primary/20 text-white"
                            : "text-white/70 hover:bg-white/5"
                        )}
                        onClick={() => selectCommandSuggestion(index)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div className="w-5 h-5 flex items-center justify-center text-primary">
                          {suggestion.icon}
                        </div>
                        <div className="font-medium">{suggestion.label}</div>
                        <div className="text-white/40 text-xs ml-1">
                          {suggestion.prefix}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Agent Palette */}
            <AnimatePresence>
              {showAgentPalette && (
                <motion.div
                  ref={commandPaletteRef}
                  className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-black/90 rounded-lg z-50 shadow-lg border border-white/10 overflow-hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="py-1 bg-black/95">
                    <div className="px-3 py-2 border-b border-white/[0.05]">
                      <p className="text-xs text-white/50 font-medium">
                        {agentQuery ? `Agente: "@${agentQuery}"` : "Selecione um agente"}
                      </p>
                    </div>
                    {Object.values(AGENTS)
                      .filter(
                        (agent) =>
                          !agentQuery ||
                          agent.handle.toLowerCase().includes(`@${agentQuery.toLowerCase()}`) ||
                          agent.id.toLowerCase().includes(agentQuery.toLowerCase()) ||
                          agent.name.toLowerCase().includes(agentQuery.toLowerCase())
                      )
                      .map((agent, index) => {
                        const AgentIcon = agent.icon === "Bot" ? Bot :
                          agent.icon === "Target" ? Command :
                          agent.icon === "Sparkles" ? Sparkles :
                          agent.icon === "Calendar" ? Calendar : Bot

                        return (
                          <motion.div
                            key={agent.id}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 text-xs transition-colors cursor-pointer",
                              "hover:bg-white/5 text-white/70"
                            )}
                            onClick={() => handleAgentSelect(agent.id)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            {/* Color indicator */}
                            <span
                              className="w-1 h-8 rounded-full"
                              style={{ backgroundColor: agent.color }}
                            />
                            {/* Agent icon */}
                            <span
                              className="flex items-center justify-center rounded-full w-8 h-8 bg-white/5"
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
                              <div className="font-medium text-white/90">{agent.name}</div>
                              <div className="text-white/40 text-xs">
                                {agent.handle} · {agent.shortDescription}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea */}
            <div className="p-4">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  adjustHeight()
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Converse com nossos especialistas..."
                className={cn(
                  "w-full px-4 py-3",
                  "resize-none",
                  "bg-transparent",
                  "border-none",
                  "text-white/90 text-sm",
                  "focus:outline-none",
                  "placeholder:text-white/20",
                  "min-h-[60px]"
                )}
                style={{
                  overflow: "hidden",
                }}
              />
            </div>

            {/* Attachments */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  className="px-4 pb-3 flex gap-2 flex-wrap"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {attachments.map((file, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center gap-2 text-xs bg-white/[0.03] py-1.5 px-3 rounded-lg text-white/70"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <span>{file}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer com botões */}
            <div className="p-4 border-t border-white/[0.05] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  onClick={handleAttachFile}
                  whileTap={{ scale: 0.94 }}
                  className="p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group"
                >
                  <Paperclip className="w-4 h-4" />
                  <motion.span
                    className="absolute inset-0 bg-white/[0.05] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    layoutId="button-highlight"
                  />
                </motion.button>
                <motion.button
                  type="button"
                  data-command-button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCommandPalette((prev) => !prev)
                  }}
                  whileTap={{ scale: 0.94 }}
                  className={cn(
                    "p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group",
                    showCommandPalette && "bg-primary/20 text-white/90"
                  )}
                >
                  <Command className="w-4 h-4" />
                  <motion.span
                    className="absolute inset-0 bg-white/[0.05] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    layoutId="button-highlight"
                  />
                </motion.button>
                {/* Model Selector */}
                <ModelSelector
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                />
                {/* Agent Selector */}
                <AgentSelector
                  value={currentAgent}
                  onValueChange={(agent) => {
                    setCurrentAgent(agent)
                    onAgentChange?.(agent)
                  }}
                  size="sm"
                />
                {/* RAG Context Selector */}
                <RagContextSelector compact />
              </div>

              <motion.button
                type="button"
                onClick={handleSendMessage}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isTyping || !value.trim()}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "flex items-center gap-2",
                  value.trim()
                    ? "bg-primary text-[#0A0A0B] shadow-lg shadow-primary/20"
                    : "bg-white/[0.05] text-white/40"
                )}
              >
                {isTyping ? (
                  <LoaderIcon className="w-4 h-4 animate-[spin_2s_linear_infinite]" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
                <span>Enviar</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Sugestões rápidas */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {commandSuggestions.slice(0, 4).map((suggestion, index) => (
              <motion.button
                key={suggestion.prefix}
                onClick={() => selectCommandSuggestion(index)}
                className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg text-sm text-white/60 hover:text-white/90 transition-all relative group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {suggestion.icon}
                <span>{suggestion.label}</span>
                <motion.div
                  className="absolute inset-0 border border-white/[0.05] rounded-lg"
                  initial={false}
                  animate={{
                    opacity: [0, 1],
                    scale: [0.98, 1],
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* AI Typing Indicator */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-7 rounded-full bg-primary/10 flex items-center justify-center text-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>Digitando</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Response Display */}
      <AnimatePresence>
        {response && !isTyping && (
          <motion.div
            className="fixed bottom-8 left-1/2 right-4 sm:right-auto -translate-x-1/2 sm:w-full sm:max-w-2xl backdrop-blur-2xl bg-white/[0.02] rounded-xl border border-white/[0.05] shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
          >
            <div className="p-4">
              {/* Response header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-white/90">Assistente</span>
              </div>

              {/* Response text */}
              <div className="text-sm text-white/80 whitespace-pre-wrap mb-4">
                {response}
              </div>

              {/* RAG Sources */}
              {sources && sources.length > 0 && (
                <ChatMessageSources
                  sources={sources}
                  chunksIncluded={sources.length}
                  className="border-t border-white/10 pt-3"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mouse glow effect */}
      {inputFocused && (
        <motion.div
          className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r from-primary/50 via-primary/30 to-primary/50 blur-[96px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-primary rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
          style={{
            boxShadow: "0 0 4px rgba(163, 230, 53, 0.5)",
          }}
        />
      ))}
    </div>
  )
}
