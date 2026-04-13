/**
 * Template BD_LIGHT - Slides internos claros (3, 5, 7, 9)
 *
 * Referências:
 * - temporaria/brandformat/brandsdecoded-design-system.md §SLIDE INTERNO — LIGHT
 * - temporaria/brandformat/brandsdecoded-principios-design.md §1, §5
 *
 * Layout:
 * - Fundo off-white warm (--LB: #F5F2EF)
 * - Tag em uppercase (cor accent --P)
 * - Headline 68px Barlow Condensed uppercase
 * - Body 36px Plus Jakarta Sans com strong=darkBg
 * - Card branco opcional (border-left accent) para ênfase
 *
 * Densidade alvo: até ~100 palavras (slides light aguentam mais texto).
 * Tom editorial — ideal para blocos BD de 20-34 palavras de parágrafo.
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "../types";
import { escapeCssUrl } from "../types";
import {
  buildBDPalette,
  bdSharedCss,
  bdBrandBarHtml,
  bdProgressBarHtml,
  bdProcessInline,
  BD_FONTS_HEAD,
} from "./shared";

export interface TemplateBDLightInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  slideIndex?: number;
  totalSlides?: number;
}

export function generateBDLightHtml(input: TemplateBDLightInput): string {
  const { slide, profile, header, slideIndex = 2, totalSlides = 9 } = input;
  void profile;
  const { content, style } = slide;

  const palette = buildBDPalette(style.primaryColor);
  const shared = bdSharedCss(palette, "light");

  const imgBoxHtml = content.backgroundImageUrl
    ? `<div class="img-box" style="background-image: url('${escapeCssUrl(content.backgroundImageUrl)}');"></div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>BD — Light</title>
  ${BD_FONTS_HEAD}
  <style>
    ${shared}

    .slide-light { background: var(--LB); }

    /* Img-box (topo) — usado quando há backgroundImageUrl */
    .img-box {
      width: 100%;
      height: 320px;
      border-radius: 18px;
      background-size: cover;
      background-position: center;
      margin-bottom: 32px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    }

    /* Headline */
    .light-h1 {
      font-family: var(--F-HEAD);
      font-size: 68px; font-weight: 900;
      line-height: 1.0;
      letter-spacing: -1.5px;
      text-transform: uppercase;
      color: var(--DB);
      margin-bottom: 28px;
    }
    .light-h1 em { color: var(--P); font-style: normal; }

    /* Body */
    .light-body {
      font-family: var(--F-BODY);
      font-size: 36px;
      font-weight: 400;
      line-height: 1.55;
      letter-spacing: -0.2px;
      color: rgba(15,13,12,0.62);
    }
    .light-body strong { color: var(--DB); font-weight: 800; }
    .light-body em     { color: var(--P); font-style: normal; }

    /* Card branco opcional (texto3) */
    .light-card {
      margin-top: 32px;
      background: #fff;
      border-left: 7px solid var(--P);
      border-radius: 16px;
      padding: 36px 40px;
      font-family: var(--F-BODY);
      font-size: 28px; font-weight: 500; line-height: 1.45;
      color: rgba(15,13,12,0.78);
    }
    .light-card strong { color: var(--DB); font-weight: 800; }
  </style>
</head>
<body>
  <div class="slide slide-light">
    <div class="accent-bar"></div>
    ${bdBrandBarHtml(header)}

    <div class="content">
      ${imgBoxHtml}
      ${header.category ? `<div class="tag">${bdProcessInline(header.category)}</div>` : ""}
      ${content.texto1 ? `<h2 class="light-h1">${bdProcessInline(content.texto1)}</h2>` : ""}
      ${content.texto2 ? `<p class="light-body">${bdProcessInline(content.texto2)}</p>` : ""}
      ${content.texto3 ? `<div class="light-card">${bdProcessInline(content.texto3)}</div>` : ""}
    </div>

    ${bdProgressBarHtml(slideIndex, totalSlides)}
  </div>
</body>
</html>`;

  return html;
}
