/**
 * Text Editor Component
 *
 * Editor de textos do slide com:
 * - Campos para texto1, texto2, texto3
 * - Toggle de bold
 * - Sugestões IA integradas
 * - Campos não suportados pelo template aparecem desabilitados
 */

"use client";

import { useStudioStore, useActiveSlide } from "@/stores/studio-store";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { TEMPLATE_METADATA, type SlideContent } from "@/lib/studio-templates/types";
import { AiSuggestionPanel } from "../ai-tools/ai-suggestion-panel";

export function TextEditor() {
  const activeSlide = useActiveSlide();
  const updateSlideContent = useStudioStore((state) => state.updateSlideContent);

  if (!activeSlide) return null;

  const templateMeta = TEMPLATE_METADATA[activeSlide.template];
  const requiredFields = templateMeta?.requiredFields ?? [];

  // Verificar se cada campo é suportado pelo template
  const isFieldSupported = (field: keyof SlideContent): boolean => {
    return requiredFields.includes(field);
  };

  // Campos texto1 é sempre suportado
  const supportsTexto1 = true;
  const supportsTexto2 = isFieldSupported("texto2");
  const supportsTexto3 = isFieldSupported("texto3");

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
      {/* Texto 1 - Sempre disponível */}
      {supportsTexto1 && (
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
      {supportsTexto2 ? (
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
      ) : (
        <div className="space-y-2 opacity-50">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-white/40">
              Texto 2 (Contexto)
            </Label>
            <Badge variant="outline" className="text-[10px] text-white/30 border-white/10">
              Não usado
            </Badge>
          </div>
          <Textarea
            disabled
            placeholder="Este campo não é usado no template selecionado"
            className="bg-white/5 border-white/10 text-white/30 placeholder:text-white/20 resize-none min-h-[60px] cursor-not-allowed"
          />
        </div>
      )}

      {/* Texto 3 */}
      {supportsTexto3 ? (
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
      ) : (
        <div className="space-y-2 opacity-50">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-white/40">
              Texto 3 (Conclusão)
            </Label>
            <Badge variant="outline" className="text-[10px] text-white/30 border-white/10">
              Não usado
            </Badge>
          </div>
          <Textarea
            disabled
            placeholder="Este campo não é usado no template selecionado"
            className="bg-white/5 border-white/10 text-white/30 placeholder:text-white/20 resize-none min-h-[60px] cursor-not-allowed"
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
