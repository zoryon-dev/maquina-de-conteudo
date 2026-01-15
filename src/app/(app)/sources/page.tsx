import { Globe } from "lucide-react"
import { PagePlaceholder } from "@/components/page-placeholder"

/**
 * Fontes de Conteúdo
 *
 * Configure fontes para scraping e inspiração.
 */
export default function SourcesPage() {
  return (
    <PagePlaceholder
      title="Fontes de Conteúdo"
      description="Adicione sites e referências para inspiração. Configure web scraping automático para extrair conteúdo de suas fontes favoritas."
      icon={Globe}
    />
  )
}
