import { Newspaper } from "lucide-react"
import { PagePlaceholder } from "@/components/page-placeholder"

export default function BlogPage() {
  return (
    <PagePlaceholder
      title="Blog"
      description="Em breve compartilharemos novidades, insights e historias do produto."
      icon={Newspaper}
    />
  )
}
