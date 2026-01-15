import { Settings } from "lucide-react"
import { PagePlaceholder } from "@/components/page-placeholder"

/**
 * Configurações
 *
 * Gerencie suas configurações e integrações.
 */
export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Configurações"
      description="Configure suas APIs (OpenRouter, Tavily, Firecrawl), preferências de sistema e integrações com redes sociais."
      icon={Settings}
    />
  )
}
