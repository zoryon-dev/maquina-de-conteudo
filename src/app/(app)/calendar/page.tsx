import { Calendar } from "lucide-react"
import { PagePlaceholder } from "@/components/page-placeholder"

/**
 * Calendário de Publicações
 *
 * Visualize e gerencie posts agendados.
 */
export default function CalendarPage() {
  return (
    <PagePlaceholder
      title="Calendário de Publicações"
      description="Visualize todos os seus posts agendados em um calendário intuitivo. Arraste, edite e organize sua estratégia de conteúdo."
      icon={Calendar}
    />
  )
}
