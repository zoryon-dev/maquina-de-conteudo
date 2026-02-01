/**
 * Studio Page
 *
 * Server Component raiz que renderiza o Client Component StudioPage.
 * Editor visual para criação de carrosséis, posts e stories.
 */

import type { Metadata } from "next";
import { StudioPage } from "./components/studio-page";

/**
 * Metadata da página
 */
export const metadata: Metadata = {
  title: "Studio - Editor Visual",
  description:
    "Crie carrosséis, posts e stories com templates profissionais e edição visual em tempo real.",
};

export default function StudioRootPage() {
  return <StudioPage />;
}
