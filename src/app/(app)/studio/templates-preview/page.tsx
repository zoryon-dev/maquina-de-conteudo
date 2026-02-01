/**
 * Templates Preview Page
 *
 * Página para visualização de todos os templates disponíveis no Studio.
 * Permite comparar templates lado a lado com dados de exemplo.
 */

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TEMPLATE_METADATA, type FigmaTemplate } from "@/lib/studio-templates/types";
import { TemplatePreviewCard } from "./template-preview-card";

// Dados de exemplo para preview
const SAMPLE_DATA = {
  texto1: "O segredo que ninguém te conta sobre produtividade",
  texto2: "A maioria das pessoas foca em trabalhar mais horas, quando deveria focar em trabalhar com mais clareza e propósito.",
  texto3: "Comece pelo mais importante, não pelo mais urgente.",
  profile: {
    name: "Jonas Silva",
    handle: "@o.jonas.silva",
    avatarUrl: "https://res.cloudinary.com/dbgwlovic/image/upload/v1752350264/foto_jonas_silva_-_mobile_e05zam.webp",
    showVerifiedBadge: true,
  },
  header: {
    category: "ESTUDO DE CASO",
    brand: "ZORYON",
    copyright: `©COPYRIGHT ${new Date().getFullYear()}`,
  },
};

export default function TemplatesPreviewPage() {
  const templates = Object.values(TEMPLATE_METADATA);

  // Agrupar por uso recomendado
  const coverTemplates = templates.filter((t) => t.recommendedUse === "cover");
  const contentTemplates = templates.filter((t) => t.recommendedUse === "content");
  const anyTemplates = templates.filter((t) => t.recommendedUse === "any");

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/studio">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-white">
              Preview de Templates
            </h1>
            <p className="text-sm text-white/50">
              Visualize todos os templates disponíveis no Studio
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {/* Cover Templates */}
        {coverTemplates.length > 0 && (
          <section>
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full" />
              Templates de Capa
            </h2>
            <p className="text-sm text-white/50 mb-6">
              Ideais para o primeiro slide do carrossel
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coverTemplates.map((template) => (
                <TemplatePreviewCard
                  key={template.id}
                  template={template}
                  sampleData={SAMPLE_DATA}
                />
              ))}
            </div>
          </section>
        )}

        {/* Content Templates */}
        {contentTemplates.length > 0 && (
          <section>
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Templates de Conteúdo
            </h2>
            <p className="text-sm text-white/50 mb-6">
              Para slides intermediários com informações e imagens
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contentTemplates.map((template) => (
                <TemplatePreviewCard
                  key={template.id}
                  template={template}
                  sampleData={SAMPLE_DATA}
                />
              ))}
            </div>
          </section>
        )}

        {/* Any Templates */}
        {anyTemplates.length > 0 && (
          <section>
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full" />
              Templates Versáteis
            </h2>
            <p className="text-sm text-white/50 mb-6">
              Podem ser usados em qualquer posição do carrossel
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {anyTemplates.map((template) => (
                <TemplatePreviewCard
                  key={template.id}
                  template={template}
                  sampleData={SAMPLE_DATA}
                />
              ))}
            </div>
          </section>
        )}

        {/* Info */}
        <div className="border-t border-white/10 pt-8">
          <p className="text-sm text-white/40 text-center">
            Os templates acima são renderizados com dados de exemplo.
            No editor, você pode personalizar cores, textos e imagens.
          </p>
        </div>
      </main>
    </div>
  );
}
