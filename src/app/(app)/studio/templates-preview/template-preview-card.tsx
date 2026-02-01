/**
 * Template Preview Card
 *
 * Card individual que mostra o preview de um template.
 * Renderiza o HTML do template em um iframe escalado.
 */

"use client";

import { useState, useMemo } from "react";
import { Eye, EyeOff, Check, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TemplateMetadata, StudioSlide, StudioProfile, StudioHeader, SlideStyle } from "@/lib/studio-templates/types";
import { renderSlideToHtml } from "@/lib/studio-templates/renderer";

interface TemplatePreviewCardProps {
  template: TemplateMetadata;
  sampleData: {
    texto1: string;
    texto2: string;
    texto3: string;
    profile: StudioProfile;
    header: StudioHeader;
  };
}

export function TemplatePreviewCard({ template, sampleData }: TemplatePreviewCardProps) {
  const [showSwipe, setShowSwipe] = useState(true);

  // Criar slide de exemplo baseado no template
  const sampleSlide: StudioSlide = useMemo(() => {
    const style: SlideStyle = {
      backgroundColor: template.id.includes("WHITE") || template.id === "TWITTER" ? "#FFFFFF" : "#0A0A0F",
      textColor: template.id.includes("WHITE") || template.id === "TWITTER" ? "#000000" : "#FFFFFF",
      primaryColor: "#A3E635",
      showSwipeIndicator: showSwipe,
    };

    return {
      id: `preview-${template.id}`,
      template: template.id,
      content: {
        texto1: sampleData.texto1,
        texto1Bold: template.id === "201" || template.id === "203",
        texto2: sampleData.texto2,
        texto3: sampleData.texto3,
        texto3Bold: template.id === "202",
        imageUrl: template.supportsImage ? "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400" : undefined,
        backgroundImageUrl: template.supportsBackgroundImage ? "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800" : undefined,
      },
      style,
    };
  }, [template, sampleData, showSwipe]);

  // Renderizar HTML
  const { html } = useMemo(() => {
    return renderSlideToHtml({
      slide: sampleSlide,
      profile: sampleData.profile,
      header: sampleData.header,
      slideIndex: 0,
      totalSlides: showSwipe ? 3 : 1, // Se showSwipe, simular que tem mais slides
    });
  }, [sampleSlide, sampleData, showSwipe]);

  return (
    <div className="group relative bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
      {/* Preview Container */}
      <div className="relative aspect-[4/5] bg-black overflow-hidden">
        {/* Iframe com escala para mostrar o template 1080x1350 em tamanho menor */}
        <div
          className="absolute origin-top-left"
          style={{
            width: "1080px",
            height: "1350px",
            transform: "scale(0.25)",
            transformOrigin: "top left",
          }}
        >
          <iframe
            srcDoc={html}
            className="w-full h-full border-0"
            title={`Preview: ${template.label}`}
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-white">{template.label}</h3>
            <p className="text-xs text-white/50 mt-0.5">{template.description}</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] border-0",
              template.recommendedUse === "cover" && "bg-blue-500/20 text-blue-300",
              template.recommendedUse === "content" && "bg-green-500/20 text-green-300",
              template.recommendedUse === "any" && "bg-purple-500/20 text-purple-300"
            )}
          >
            {template.recommendedUse === "cover" && "Capa"}
            {template.recommendedUse === "content" && "Conteúdo"}
            {template.recommendedUse === "any" && "Versátil"}
          </Badge>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1.5">
          {template.requiredFields.map((field) => (
            <span
              key={field}
              className="text-[10px] px-1.5 py-0.5 bg-white/5 text-white/50 rounded"
            >
              {field === "texto1" && "Texto 1"}
              {field === "texto2" && "Texto 2"}
              {field === "texto3" && "Texto 3"}
            </span>
          ))}
          {template.supportsImage && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded flex items-center gap-1">
              <ImageIcon className="w-2.5 h-2.5" />
              Imagem
            </span>
          )}
          {template.supportsBackgroundImage && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded flex items-center gap-1">
              <ImageIcon className="w-2.5 h-2.5" />
              Fundo
            </span>
          )}
        </div>

        {/* Toggle Swipe */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-xs text-white/40">Swipe Indicator</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSwipe(!showSwipe)}
            className={cn(
              "h-7 px-2 text-xs gap-1",
              showSwipe ? "text-primary" : "text-white/40"
            )}
          >
            {showSwipe ? (
              <>
                <Eye className="w-3 h-3" />
                Visível
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3" />
                Oculto
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
