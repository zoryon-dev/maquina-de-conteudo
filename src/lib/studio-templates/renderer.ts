/**
 * Studio Template Renderer
 *
 * Função central que renderiza HTML a partir de um slide,
 * delegando para o template específico.
 */

import type { StudioSlide, StudioProfile, StudioHeader, FigmaTemplate } from "./types";
import type { BrandConfig } from "@/lib/brands/schema";
import { buildBrandTokenCss } from "./brand-tokens-css";
import { generate01CapaHtml } from "./01-capa";
import { generate201Html } from "./201";
import { generate202Html } from "./202";
import { generate203Html } from "./203";
// Generic templates
import { generateDarkModeHtml } from "./dark-mode";
import { generateWhiteModeHtml } from "./white-mode";
import { generateTwitterHtml } from "./twitter";
import { generateSuperHeadlineHtml } from "./super-headline";
// Image templates
import { generateImageOverlayHtml } from "./image-overlay";
import { generateImageSplitHtml } from "./image-split";
import { generateImageMinimalHtml } from "./image-minimal";
// BrandsDecoded templates
import { generateBDCapaHtml } from "./brandsdecoded/bd-capa";
import { generateBDDarkHtml } from "./brandsdecoded/bd-dark";
import { generateBDLightHtml } from "./brandsdecoded/bd-light";
import { generateBDCtaHtml } from "./brandsdecoded/bd-cta";

// ============================================================================
// RENDERER TYPES
// ============================================================================

export interface RenderSlideInput {
  /** Slide a ser renderizado */
  slide: StudioSlide;
  /** Configurações do perfil */
  profile: StudioProfile;
  /** Configurações do header */
  header: StudioHeader;
  /** Índice do slide (0-based) */
  slideIndex: number;
  /** Total de slides no carrossel */
  totalSlides: number;
  /**
   * Brand ativa (Fase 3). Quando presente + `featureFlags.visualTokensV2`,
   * o renderer injeta `<style>:root { --brand-*: ... }</style>` no HTML
   * antes do `<body>` (ou no topo se não houver `<head>`).
   */
  brand?: BrandConfig | null;
  /**
   * Feature flags por request. `visualTokensV2=true` ativa injeção de
   * brand tokens. Default (flag off / ausente): comportamento pré-Fase 3
   * intacto.
   */
  featureFlags?: { visualTokensV2?: boolean };
}

export interface RenderSlideResult {
  /** HTML gerado */
  html: string;
  /** Template usado */
  template: FigmaTemplate;
  /** Se é o último slide */
  isLastSlide: boolean;
}

// ============================================================================
// MAIN RENDERER
// ============================================================================

/**
 * Injeta um `<style>` com as CSS custom properties da brand no HTML do
 * slide. Estratégia: se existir `<head>`, injeta logo após a abertura do
 * head (ordem correta de cascade). Caso contrário, prepend no doc para que
 * o navegador processe como style global antes de qualquer render.
 */
function injectBrandStyle(html: string, brandCss: string): string {
  if (!brandCss) return html;
  const styleTag = `<style data-brand-tokens>${brandCss}</style>`;
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>\n${styleTag}`);
  }
  return `${styleTag}\n${html}`;
}

/**
 * Renderiza um slide para HTML usando o template apropriado
 */
export function renderSlideToHtml(input: RenderSlideInput): RenderSlideResult {
  const { slide, profile, header, slideIndex, totalSlides, brand, featureFlags } = input;
  const isLastSlide = slideIndex === totalSlides - 1;

  let html: string;

  switch (slide.template) {
    // === FIGMA TEMPLATES ===
    case "01_CAPA":
      html = generate01CapaHtml({ slide, profile, header });
      break;

    case "201":
      html = generate201Html({ slide, profile, header, isLastSlide });
      break;

    case "202":
      html = generate202Html({ slide, profile, header, isLastSlide });
      break;

    case "203":
      html = generate203Html({ slide, profile, header, isLastSlide });
      break;

    // === GENERIC TEMPLATES ===
    case "DARK_MODE":
      html = generateDarkModeHtml({ slide, profile, header, isLastSlide });
      break;

    case "WHITE_MODE":
      html = generateWhiteModeHtml({ slide, profile, header, isLastSlide });
      break;

    case "TWITTER":
      html = generateTwitterHtml({ slide, profile, header, isLastSlide });
      break;

    case "SUPER_HEADLINE":
      html = generateSuperHeadlineHtml({ slide, profile, header, isLastSlide });
      break;

    // === IMAGE TEMPLATES ===
    case "IMAGE_OVERLAY":
      html = generateImageOverlayHtml({ slide, profile, header, isLastSlide });
      break;

    case "IMAGE_SPLIT":
      html = generateImageSplitHtml({ slide, profile, header, isLastSlide });
      break;

    case "IMAGE_MINIMAL":
      html = generateImageMinimalHtml({ slide, profile, header, isLastSlide });
      break;

    // === BRANDSDECODED V4 ===
    case "BD_CAPA":
      html = generateBDCapaHtml({ slide, profile, header, slideIndex, totalSlides });
      break;

    case "BD_DARK":
      html = generateBDDarkHtml({ slide, profile, header, slideIndex, totalSlides });
      break;

    case "BD_LIGHT":
      html = generateBDLightHtml({ slide, profile, header, slideIndex, totalSlides });
      break;

    case "BD_CTA":
      html = generateBDCtaHtml({ slide, profile, header, slideIndex, totalSlides });
      break;

    default: {
      // Não silenciar: log + placeholder visível.
      // Silenciar mascarava bugs de mapper (PR5.1+PR6 review).
      const unknownTemplate = String((slide as { template?: unknown }).template ?? "(undefined)");
      console.error(
        "[renderer] template desconhecido:",
        unknownTemplate,
        "— renderizando placeholder visível. Verifique mapper/motor."
      );
      // Escapa para evitar HTML injection se template vier de fonte não confiável
      const safeName = unknownTemplate
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        html, body { margin:0; padding:0; height:100%; }
        body {
          background: repeating-linear-gradient(45deg, #2a1a1a, #2a1a1a 12px, #3a2222 12px, #3a2222 24px);
          color: #ff6b6b;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 32px; text-align: center;
        }
        .badge { font-size: 64px; line-height: 1; margin-bottom: 16px; }
        .title { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #fff; }
        .name { font-family: 'SF Mono', Menlo, monospace; font-size: 16px; background: rgba(255,107,107,0.15); padding: 6px 12px; border-radius: 6px; }
        .hint { font-size: 12px; opacity: 0.7; margin-top: 16px; max-width: 400px; }
      </style></head><body>
        <div class="badge">⚠️</div>
        <div class="title">Template inválido</div>
        <div class="name">${safeName}</div>
        <div class="hint">Este slide referencia um template não registrado no renderer. Verifique o motor de geração e o mapper.</div>
      </body></html>`;
      break;
    }
  }

  // Fase 3: injeta brand tokens apenas quando flag on + brand presente.
  // Backcompat estrita: sem flag ou sem brand, HTML idêntico ao original.
  const brandCss =
    featureFlags?.visualTokensV2 && brand ? buildBrandTokenCss(brand) : "";
  const finalHtml = brandCss ? injectBrandStyle(html, brandCss) : html;

  return {
    html: finalHtml,
    template: slide.template,
    isLastSlide,
  };
}

/**
 * Renderiza todos os slides de um carrossel
 */
export function renderAllSlidesToHtml(
  slides: StudioSlide[],
  profile: StudioProfile,
  header: StudioHeader,
  options: {
    brand?: BrandConfig | null;
    featureFlags?: { visualTokensV2?: boolean };
  } = {}
): RenderSlideResult[] {
  return slides.map((slide, index) =>
    renderSlideToHtml({
      slide,
      profile,
      header,
      slideIndex: index,
      totalSlides: slides.length,
      brand: options.brand,
      featureFlags: options.featureFlags,
    })
  );
}

// ============================================================================
// PREVIEW UTILITIES
// ============================================================================

/**
 * Gera HTML de preview para exibição em iframe
 * Adiciona estilos de reset e escala para caber em containers menores
 */
export function generatePreviewHtml(
  slide: StudioSlide,
  profile: StudioProfile,
  header: StudioHeader,
  options: {
    slideIndex?: number;
    totalSlides?: number;
    scale?: number;
  } = {}
): string {
  const { slideIndex = 0, totalSlides = 1, scale = 1 } = options;

  const result = renderSlideToHtml({
    slide,
    profile,
    header,
    slideIndex,
    totalSlides,
  });

  // Se escala for 1, retornar HTML puro
  if (scale === 1) {
    return result.html;
  }

  // Envolver em container com escala
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; }
    body {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0a0f;
      overflow: hidden;
    }
    .preview-container {
      transform: scale(${scale});
      transform-origin: center center;
    }
  </style>
</head>
<body>
  <div class="preview-container">
    ${result.html}
  </div>
</body>
</html>`;
}

/**
 * Gera uma URL de data para preview em iframe
 * Útil para renderizar preview sem precisar de API
 */
export function generatePreviewDataUrl(
  slide: StudioSlide,
  profile: StudioProfile,
  header: StudioHeader,
  options?: {
    slideIndex?: number;
    totalSlides?: number;
    scale?: number;
  }
): string {
  const html = generatePreviewHtml(slide, profile, header, options);
  const encodedHtml = encodeURIComponent(html);
  return `data:text/html;charset=utf-8,${encodedHtml}`;
}
