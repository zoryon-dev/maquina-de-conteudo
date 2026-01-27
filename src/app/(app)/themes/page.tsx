/**
 * Themes Library Page
 *
 * Manage saved themes from Discovery Service.
 */

import type { Metadata } from "next"
import { ThemesPage } from "./components/themes-page"

export const metadata: Metadata = {
  title: "Temas",
  description: "Biblioteca de temas descobertos via Discovery Service.",
}

export default function ThemesRootPage() {
  return <ThemesPage />
}
