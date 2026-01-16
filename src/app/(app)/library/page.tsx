/**
 * Biblioteca de Conteúdo Page
 *
 * Server Component raiz que renderiza o Client Component LibraryPage.
 */

import type { Metadata } from "next"
import { LibraryPage } from "./components/library-page"

/**
 * Metadata da página
 */
export const metadata: Metadata = {
  title: "Biblioteca de Conteúdo",
  description: "Gerencie e organize todo seu conteúdo criado. Textos, imagens, carrosséis e posts agendados em um só lugar.",
}

export default function LibraryRootPage() {
  return <LibraryPage />
}
