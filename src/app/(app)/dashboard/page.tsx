"use client"

import { AnimatedAIChat } from "@/components/dashboard/animated-ai-chat"
import { useAuth } from "@clerk/nextjs"

/**
 * Dashboard - Chat com IA
 *
 * Interface conversacional para criar conteúdo com especialistas AI.
 * Comandos disponíveis: /texto, /imagem, /carrossel, /agendar, /fontes, /especialistas
 */
export default function DashboardPage() {
  const { isLoaded } = useAuth()

  // Redirect if not authenticated (handled by middleware, but double-check)
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-white/60">Carregando...</div>
      </div>
    )
  }

  const handleSendMessage = (message: string, model?: string) => {
    // TODO: Implementar integração com OpenRouter
    console.log("Message:", message)
    console.log("Model:", model)
  }

  return <AnimatedAIChat onSendMessage={handleSendMessage} />
}
