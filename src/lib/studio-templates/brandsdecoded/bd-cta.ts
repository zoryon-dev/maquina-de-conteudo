/**
 * Slide 8 do carrossel BD (CTA). Gradient + keyword box.
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "../types";
import { escapeHtml } from "../types";
import {
  buildBDPalette,
  bdSharedCss,
  bdBrandBarHtml,
  bdProgressBarHtml,
  bdProcessInline,
  BD_FONTS_HEAD,
} from "./shared";

/**
 * Texto-default da instrução do CTA (PT-BR).
 *
 * TODO: i18n — quando o sistema suportar locale por slide, expor esta string
 * via `content.texto3Instruction?: string` no `SlideContent` (atualmente
 * adicionar o campo impactaria todos os templates / o store Zustand). Por ora,
 * mantemos a string isolada nesta constante para facilitar troca futura.
 */
export const DEFAULT_BD_CTA_INSTRUCTION = "Comenta a palavra abaixo:";

export interface TemplateBDCtaInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  slideIndex?: number;
  totalSlides?: number;
  /**
   * Override opcional do texto-instrução exibido acima da keyword. Quando
   * omitido, usa `DEFAULT_BD_CTA_INSTRUCTION`. Renderizado com escape de HTML.
   */
  ctaInstruction?: string;
}

export function generateBDCtaHtml(input: TemplateBDCtaInput): string {
  const {
    slide,
    profile,
    header,
    slideIndex = 7,
    totalSlides = 9,
    ctaInstruction,
  } = input;
  void profile;
  const { content, style } = slide;
  const instructionText = ctaInstruction ?? DEFAULT_BD_CTA_INSTRUCTION;

  if (!content.texto1?.trim()) {
    console.warn("[bd-cta] texto1 (required) ausente em slide");
  }

  const palette = buildBDPalette(style.primaryColor);
  const shared = bdSharedCss(palette, "grad");

  const slideNum = String(slideIndex + 1).padStart(2, "0");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>BD — CTA</title>
  ${BD_FONTS_HEAD}
  <style>
    ${shared}

    .slide-grad { background: var(--G); }

    .slide-grad .accent-bar { background: rgba(255,255,255,0.22); }

    .grad-bg-num {
      position: absolute;
      right: -16px; bottom: 50px;
      font-family: var(--F-HEAD);
      font-size: 420px; font-weight: 900;
      color: rgba(255,255,255,0.08);
      line-height: 1; letter-spacing: -16px;
      pointer-events: none;
      z-index: 1;
    }

    .grad-h1 {
      font-family: var(--F-HEAD);
      font-size: 80px; font-weight: 900;
      line-height: 0.97;
      letter-spacing: -2px;
      text-transform: uppercase;
      color: #fff;
      margin-bottom: 32px;
    }
    .grad-h1 em { color: rgba(255,255,255,0.85); font-style: normal; }

    .grad-body {
      font-family: var(--F-BODY);
      font-size: 36px;
      font-weight: 400;
      line-height: 1.55;
      letter-spacing: -0.2px;
      color: rgba(255,255,255,0.78);
    }
    .grad-body strong { color: #fff; font-weight: 800; }

    .cta-kbox {
      margin-top: 36px;
      background: #fff;
      border-radius: 18px;
      padding: 32px 36px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.12);
    }
    .cta-kinstr {
      font-family: var(--F-BODY);
      font-size: 18px; font-weight: 500;
      color: rgba(15,13,12,0.45);
      margin-bottom: 8px;
      letter-spacing: 0.2px;
    }
    .cta-kword {
      font-family: var(--F-HEAD);
      font-size: 68px; font-weight: 900;
      color: var(--P);
      letter-spacing: -2px;
      line-height: 1;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .content { z-index: 2; }
  </style>
</head>
<body>
  <div class="slide slide-grad">
    <div class="accent-bar"></div>
    ${bdBrandBarHtml(header)}

    <div class="grad-bg-num">${slideNum}</div>

    <div class="content">
      ${header.category ? `<div class="tag">${bdProcessInline(header.category)}</div>` : ""}
      ${content.texto1 ? `<h2 class="grad-h1">${bdProcessInline(content.texto1)}</h2>` : ""}
      ${content.texto2 ? `<p class="grad-body">${bdProcessInline(content.texto2)}</p>` : ""}
      ${content.texto3 ? `
        <div class="cta-kbox">
          <div class="cta-kinstr">${escapeHtml(instructionText)}</div>
          <div class="cta-kword">${bdProcessInline(content.texto3)}</div>
        </div>
      ` : ""}
    </div>

    ${bdProgressBarHtml(slideIndex, totalSlides)}
  </div>
</body>
</html>`;

  return html;
}
