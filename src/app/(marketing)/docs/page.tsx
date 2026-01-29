import { BookOpen } from "lucide-react"
import { PagePlaceholder } from "@/components/page-placeholder"

export default function DocsPage() {
  return (
    <PagePlaceholder
      title="Documentacao"
      description="Guias tecnicos e referencias do produto estarao disponiveis em breve."
      icon={BookOpen}
    />
  )
}
