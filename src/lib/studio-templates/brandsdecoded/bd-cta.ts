/**
 * Template BD_CTA - Slide 8 (Direção/CTA com gradient) ou Slide final
 *
 * Referências:
 * - temporaria/brandformat/brandsdecoded-design-system.md §SLIDE INTERNO — GRADIENT
 * - temporaria/brandformat/brandsdecoded-design-system.md §SLIDE CTA
 *
 * Layout:
 * - Fundo com gradient derivado da paleta (--PD → --P → --PL)
 * - Número decorativo gigante
 * - Headline 80px uppercase, branca
 * - Body 38px com strong=branco
 * - Keyword box opcional (texto3) — caixa branca com palavra-chave gigante
 *
 * Usado como slide 8 (direção) e pode servir também como slide final CTA.
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "../types";
import {
  buildBDPalette,
  bdSharedCss,
  bdBrandBarHtml,
  bdProgressBarHtml,
  bdProcessInline,
  BD_FONTS_HEAD,
} from "./shared";

export interface TemplateBDCtaInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  slideIndex?: number;
  totalSlides?: number;
}

export function generateBDCtaHtml(input: TemplateBDCtaInput): string {
  const { slide, profile, header, slideIndex = 7, totalSlides = 9 } = input;
  void profile;
  const { content, style } = slide;

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

    /* Accent bar suave sobre gradient */
    .slide-grad .accent-bar { background: rgba(255,255,255,0.22); }

    /* Número decorativo */
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

    /* Headline */
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

    /* Body */
    .grad-body {
      font-family: var(--F-BODY);
      font-size: 36px;
      font-weight: 400;
      line-height: 1.55;
      letter-spacing: -0.2px;
      color: rgba(255,255,255,0.78);
    }
    .grad-body strong { color: #fff; font-weight: 800; }

    /* Keyword box (texto3) — se preenchido vira CTA com palavra-chave */
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
          <div class="cta-kinstr">Comenta a palavra abaixo:</div>
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
