/**
 * Text Editor Component
 *
 * Editor de textos do slide com:
 * - Campos para texto1, texto2, texto3
 * - Toggle de bold
 * - Sugestões IA integradas
 */

"use client";

import { useStudioStore, useActiveSlide } from "@/stores/studio-store";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TEMPLATE_METADATA } from "@/lib/studio-templates/types";
import { AiSuggestionPanel } from "../ai-tools/ai-suggestion-panel";

export function TextEditor() {
  const activeSlide = useActiveSlide();
  const updateSlideContent = useStudioStore((state) => state.updateSlideContent);

  if (!activeSlide) return null;

  const templateMeta = TEMPLATE_METADATA[activeSlide.template];
  const requiredFields = templateMeta?.requiredFields ?? [];

  // Verificar se o template atual usa cada campo
  const showTexto1 = true; // Todos os templates usam texto1
  const showTexto2 = requiredFields.includes("texto2") || activeSlide.template !== "01_CAPA";
  const showTexto3 = requiredFields.includes("texto3");

  const handleContentChange = (
    field: "texto1" | "texto2" | "texto3",
    value: string
  ) => {
    updateSlideContent(activeSlide.id, { [field]: value });
  };

  const handleBoldChange = (
    field: "texto1Bold" | "texto3Bold",
    value: boolean
  ) => {
    updateSlideContent(activeSlide.id, { [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Texto 1 */}
      {showTexto1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="texto1"
              className="text-sm text-white/70"
            >
              {activeSlide.template === "01_CAPA" ? "Headline" : "Texto 1 (Gancho)"}
            </Label>
            {activeSlide.template !== "01_CAPA" && (
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="texto1-bold"
                  className="text-xs text-white/50"
                >
                  Bold
                </Label>
                <Switch
                  id="texto1-bold"
                  checked={activeSlide.content.texto1Bold}
                  onCheckedChange={(checked) =>
                    handleBoldChange("texto1Bold", checked)
                  }
                />
              </div>
            )}
          </div>
          <Textarea
            id="texto1"
            value={activeSlide.content.texto1}
            onChange={(e) => handleContentChange("texto1", e.target.value)}
            placeholder={
              activeSlide.template === "01_CAPA"
                ? "Sua headline principal..."
                : "O gancho que prende a atenção..."
            }
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none min-h-[80px]"
          />
          <AiSuggestionPanel
            type={activeSlide.template === "01_CAPA" ? "headline" : "hook"}
            onSelect={(suggestion) => handleContentChange("texto1", suggestion)}
            existingTexts={activeSlide.content}
          />
        </div>
      )}

      {/* Texto 2 */}
      {showTexto2 && (
        <div className="space-y-2">
          <Label htmlFor="texto2" className="text-sm text-white/70">
            Texto 2 (Contexto)
          </Label>
          <Textarea
            id="texto2"
            value={activeSlide.content.texto2}
            onChange={(e) => handleContentChange("texto2", e.target.value)}
            placeholder="O contexto ou explicação..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none min-h-[80px]"
          />
          <AiSuggestionPanel
            type="context"
            onSelect={(suggestion) => handleContentChange("texto2", suggestion)}
            existingTexts={activeSlide.content}
          />
        </div>
      )}

      {/* Texto 3 */}
      {showTexto3 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="texto3" className="text-sm text-white/70">
              Texto 3 (Conclusão)
            </Label>
            <div className="flex items-center gap-2">
              <Label htmlFor="texto3-bold" className="text-xs text-white/50">
                Bold
              </Label>
              <Switch
                id="texto3-bold"
                checked={activeSlide.content.texto3Bold}
                onCheckedChange={(checked) =>
                  handleBoldChange("texto3Bold", checked)
                }
              />
            </div>
          </div>
          <Textarea
            id="texto3"
            value={activeSlide.content.texto3 ?? ""}
            onChange={(e) => handleContentChange("texto3", e.target.value)}
            placeholder="A conclusão ou call-to-action..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none min-h-[80px]"
          />
          <AiSuggestionPanel
            type="conclusion"
            onSelect={(suggestion) => handleContentChange("texto3", suggestion)}
            existingTexts={activeSlide.content}
          />
        </div>
      )}

      {/* Dica */}
      <p className="text-xs text-white/40">
        Template atual: <span className="text-white/60">{templateMeta?.label}</span>
      </p>
    </div>
  );
}
