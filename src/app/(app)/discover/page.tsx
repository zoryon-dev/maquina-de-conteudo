/**
 * Discovery Page
 *
 * Discover trending topics across YouTube and Instagram
 * based on a keyword, with AI-powered briefings.
 */

import type { Metadata } from "next"
import { DiscoverPage } from "./components/discover-page"

export const metadata: Metadata = {
  title: "Discovery",
  description: "Descubra temas em alta no YouTube e Instagram para criar conteúdo relevante.",
}

export default function DiscoverRootPage() {
  return <DiscoverPage />
}
