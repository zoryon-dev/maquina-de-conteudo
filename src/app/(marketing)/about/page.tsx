import { Info } from "lucide-react"
import { PagePlaceholder } from "@/components/page-placeholder"

export default function AboutPage() {
  return (
    <PagePlaceholder
      title="Sobre a contentMachine"
      description="Estamos preparando uma visao completa sobre nosso time, missao e valores."
      icon={Info}
    />
  )
}
