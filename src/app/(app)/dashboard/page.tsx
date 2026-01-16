"use client"

import { useState } from "react"
import { AnimatedAIChat } from "@/components/dashboard/animated-ai-chat"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { useRagCategories } from "@/components/chat"

/**
 * Dashboard - Chat com IA
 *
 * Interface conversacional para criar conteúdo com especialistas AI.
 * Comandos disponíveis: /texto, /imagem, /carrossel, /agendar, /fontes, /especialistas
 *
 * RAG Integration:
 * - Uses selected RAG categories from context selector
 * - Fetches relevant context from indexed documents
 * - Displays sources in response when available
 */
export default function DashboardPage() {
  const { isLoaded } = useAuth()
  const [isTyping, setIsTyping] = useState(false)
  const [lastResponse, setLastResponse] = useState<string | null>(null)
  const [lastSources, setLastSources] = useState<any[] | null>(null)

  // Get selected RAG categories from the context selector
  const { selected: ragCategories } = useRagCategories()

  // Redirect if not authenticated (handled by middleware, but double-check)
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-white/60">Carregando...</div>
      </div>
    )
  }

  const handleSendMessage = async (message: string, model?: string) => {
    setIsTyping(true)
    setLastResponse(null)
    setLastSources(null)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          model,
          categories: ragCategories,
          useRag: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send message")
      }

      const data = await response.json()

      setLastResponse(data.response)
      if (data.sources && data.sources.length > 0) {
        setLastSources(data.sources)
      }

      if (data.ragUsed) {
        toast.success(`Contexto RAG usado: ${data.chunksIncluded} chunks`)
      }
    } catch (error) {
      console.error("Chat error:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem")
      // Fallback for demo purposes
      setLastResponse("Mensagem enviada (modo demo - configure a API key do OpenRouter)")
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedAIChat
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
        response={lastResponse}
        sources={lastSources}
      />
    </div>
  )
}
