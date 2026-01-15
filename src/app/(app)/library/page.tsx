import { Library } from "lucide-react"
import { PagePlaceholder } from "@/components/page-placeholder"

/**
 * Biblioteca de Conteúdo
 *
 * Gerencie textos, imagens, carrosséis e conteúdo agendado.
 */
export default function LibraryPage() {
  return (
    <PagePlaceholder
      title="Biblioteca de Conteúdo"
      description="Gerencie e organize todo seu conteúdo criado. Textos, imagens, carrosséis e posts agendados em um só lugar."
      icon={Library}
    />
  )
}
