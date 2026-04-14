import type { Metadata } from "next"
import { WizardEntry } from "./components/wizard-entry"

export const metadata: Metadata = {
  title: "Novo conteúdo — Wizard",
  description: "Escolha tipo e metodologia pra começar um novo conteúdo.",
}

export default function Page() {
  return <WizardEntry />
}
