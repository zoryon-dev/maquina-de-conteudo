/**
 * Client-safe types for settings
 * Contains ONLY types - no server-side logic
 */

export interface ServiceStatus {
  name: string
  description: string
  configured: boolean
  required: boolean
  source: "env" | "database" | "none"
  documentationUrl?: string
}

export interface SystemStatusResult {
  overallConfigured: boolean
  services: {
    openrouter: ServiceStatus
    voyage: ServiceStatus
    tavily: ServiceStatus
    firecrawl: ServiceStatus
    apify: ServiceStatus
  }
}

export interface ActionResult {
  success: boolean
  error?: string
}

export interface DbDocument {
  id: number
  title: string
  fileType: string | null
  category: string | null
  createdAt: Date
  embedded: boolean
}
