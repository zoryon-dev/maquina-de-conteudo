import { LifeBuoy } from "lucide-react"
import { PagePlaceholder } from "@/components/page-placeholder"

export default function HelpPage() {
  return (
    <PagePlaceholder
      title="Central de Ajuda"
      description="Estamos organizando tutoriais e perguntas frequentes para ajudar voce a usar a plataforma."
      icon={LifeBuoy}
    />
  )
}
