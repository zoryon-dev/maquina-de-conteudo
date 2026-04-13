/**
 * Slides 2/4/6 do carrossel BD (dark). Body editorial denso (~36px).
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

export interface TemplateBDDarkInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  slideIndex?: number;
  totalSlides?: number;
}

export function generateBDDarkHtml(input: TemplateBDDarkInput): string {
  const { slide, profile, header, slideIndex = 1, totalSlides = 9 } = input;
  void profile;
  const { content, style } = slide;

  if (!content.texto1?.trim()) {
    console.warn("[bd-dark] texto1 (required) ausente em slide");
  }

  const palette = buildBDPalette(style.primaryColor);
  const shared = bdSharedCss(palette, "dark");

  const bgImage = content.backgroundImageUrl
    ? `<div class="slide-img-bg" style="background-image: url('${escapeCssUrl(content.backgroundImageUrl)}');"></div>
       <div class="slide-img-overlay"></div>`
    : "";

  // Número decorativo: posição do slide
  const slideNum = String(slideIndex + 1).padStart(2, "0");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>BD — Dark</title>
  ${BD_FONTS_HEAD}
  <style>
    ${shared}

    .slide-dark { background: var(--DB); }

    .slide-img-bg {
      position: absolute; inset: 0;
      background-size: cover; background-position: center;
      z-index: 0;
    }
    .slide-img-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(15,13,12,0.82) 0%,
        rgba(15,13,12,0.72) 30%,
        rgba(15,13,12,0.78) 60%,
        rgba(15,13,12,0.92) 100%
      );
      z-index: 1;
    }

    .dark-bg-num {
      position: absolute;
      right: -16px; bottom: 60px;
      font-family: var(--F-HEAD);
      font-size: 380px; font-weight: 900;
      color: rgba(255,255,255,0.04);
      line-height: 1; letter-spacing: -14px;
      pointer-events: none;
      z-index: 1;
    }

    .dark-h1 {
      font-family: var(--F-HEAD);
      font-size: 80px; font-weight: 900;
      line-height: 0.97;
      letter-spacing: -2px;
      text-transform: uppercase;
      color: #fff;
      margin-bottom: 32px;
    }
    .dark-h1 em { color: var(--P); font-style: normal; }
    .dark-h1 strong { color: #fff; font-weight: 900; }

    .dark-body {
      font-family: var(--F-BODY);
      font-size: 36px;
      font-weight: 400;
      line-height: 1.5;
      letter-spacing: -0.2px;
      color: rgba(255,255,255,0.62);
    }
    .dark-body strong { color: #fff; font-weight: 700; }
    .dark-body em     { color: var(--PL); font-style: normal; }

    .dark-card {
      margin-top: 32px;
      background: rgba(255,255,255,0.04);
      border-left: 6px solid var(--P);
      border-radius: 12px;
      padding: 32px 36px;
      font-family: var(--F-BODY);
      font-size: 28px; font-weight: 500; line-height: 1.45;
      color: rgba(255,255,255,0.85);
    }
    .dark-card strong { color: #fff; font-weight: 800; }

    .content { z-index: 2; }
  </style>
</head>
<body>
  <div class="slide slide-dark">
    ${bgImage}
    <div class="accent-bar"></div>
    ${bdBrandBarHtml(header)}

    ${!content.backgroundImageUrl ? `<div class="dark-bg-num">${slideNum}</div>` : ""}

    <div class="content">
      ${header.category ? `<div class="tag">${bdProcessInline(header.category)}</div>` : ""}
      ${content.texto1 ? `<h2 class="dark-h1">${bdProcessInline(content.texto1)}</h2>` : ""}
      ${content.texto2 ? `<p class="dark-body">${bdProcessInline(content.texto2)}</p>` : ""}
      ${content.texto3 ? `<div class="dark-card">${bdProcessInline(content.texto3)}</div>` : ""}
    </div>

    ${bdProgressBarHtml(slideIndex, totalSlides)}
  </div>
</body>
</html>`;

  return html;
}
