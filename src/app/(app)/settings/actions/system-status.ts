/**
 * System Status Server Action
 *
 * Checks which services are configured via environment variables.
 * This is read-only - users cannot modify system-controlled API keys.
 */

import { auth } from "@clerk/nextjs/server"
import { isVoyageConfigured, isVoyageUsingEnvVar } from "@/lib/voyage"

/**
 * Status of a single service
 */
export interface ServiceStatus {
  name: string
  description: string
  configured: boolean
  source: "env" | "database" | "none"
  required: boolean
  documentationUrl?: string
}

/**
 * System status response
 */
export interface SystemStatusResult {
  services: Record<string, ServiceStatus>
  overallConfigured: boolean
}

/**
 * Service definitions
 */
const SERVICE_DEFINITIONS = {
  openrouter: {
    name: "OpenRouter",
    description: "Multi-LLM aggregator para modelos de linguagem (GPT, Claude, etc.)",
    required: true,
    documentationUrl: "https://openrouter.ai/docs/quick-start",
  },
  voyage: {
    name: "Voyage AI",
    description: "Embeddings e busca semântica (RAG)",
    required: true,
    documentationUrl: "https://docs.voyageai.com/",
  },
  firecrawl: {
    name: "Firecrawl",
    description: "Web scraping para extrair conteúdo de sites",
    required: false,
    documentationUrl: "https://www.firecrawl.dev/docs",
  },
  tavily: {
    name: "Tavily",
    description: "Busca web em tempo real",
    required: false,
    documentationUrl: "https://tavily.com/docs",
  },
} as const

/**
 * Get system status
 *
 * Checks which services are configured via environment variables.
 * This is a server action that runs on the server side.
 */
export async function getSystemStatusAction(): Promise<SystemStatusResult> {
  const { userId } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  // Check AI services (OpenRouter via AI SDK)
  const openrouterEnvKey = !!process.env.OPENROUTER_API_KEY

  // Check Voyage (uses env var or database fallback)
  const voyageConfigured = await isVoyageConfigured()
  const voyageUsingEnv = isVoyageUsingEnvVar()

  // Check other services
  const firecrawlConfigured = !!process.env.FIRECRAWL_API_KEY
  const tavilyConfigured = !!process.env.TAVILY_API_KEY

  const services: Record<string, ServiceStatus> = {
    openrouter: {
      ...SERVICE_DEFINITIONS.openrouter,
      configured: openrouterEnvKey,
      source: openrouterEnvKey ? "env" : "none",
    },
    voyage: {
      ...SERVICE_DEFINITIONS.voyage,
      configured: voyageConfigured,
      source: voyageUsingEnv ? "env" : voyageConfigured ? "database" : "none",
    },
    firecrawl: {
      ...SERVICE_DEFINITIONS.firecrawl,
      configured: firecrawlConfigured,
      source: firecrawlConfigured ? "env" : "none",
    },
    tavily: {
      ...SERVICE_DEFINITIONS.tavily,
      configured: tavilyConfigured,
      source: tavilyConfigured ? "env" : "none",
    },
  }

  // Overall is configured if required services are ready
  const requiredConfigured =
    services.openrouter.configured && services.voyage.configured

  return {
    services,
    overallConfigured: requiredConfigured,
  }
}
