"use client"

import { useState, useEffect } from "react"
import { AnimatedAIChat } from "@/components/dashboard/animated-ai-chat"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { type AgentType } from "@/lib/agents"

/**
 * Dashboard - Chat com IA
 *
 * Interface conversacional para criar conteúdo com especialistas AI.
 * Usa Vercel AI SDK v3 para streaming responses com interface animada.
 *
 * Comandos disponíveis: /texto, /imagem, /carrossel, /agendar, /fontes, /especialistas
 *
 * RAG Integration:
 * - Uses selected RAG categories from context selector
 * - Fetches relevant context from indexed documents
 * - Displays sources in response when available
 */
export default function DashboardPage() {
  const { isLoaded, userId } = useAuth()
  const router = useRouter()
  const [currentAgent, setCurrentAgent] = useState<AgentType>("zory")

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in")
    }
  }, [isLoaded, userId, router])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-white/60">Carregando...</div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedAIChat
        initialAgent={currentAgent}
        onAgentChange={setCurrentAgent}
        useRagByDefault={true}
      />
    </div>
  )
}
