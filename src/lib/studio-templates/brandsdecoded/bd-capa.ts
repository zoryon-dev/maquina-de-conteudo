/**
 * Slide 1 do carrossel BD (capa). Editorial-jornalístico, headline forte, paleta warm.
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "../types";
import { escapeHtml, escapeCssUrl } from "../types";
import {
  buildBDPalette,
  bdSharedCss,
  bdBrandBarHtml,
  bdProgressBarHtml,
  bdProcessInline,
  BD_FONTS_HEAD,
} from "./shared";

export interface TemplateBDCapaInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  slideIndex?: number;
  totalSlides?: number;
}

export function generateBDCapaHtml(input: TemplateBDCapaInput): string {
  const { slide, profile, header, slideIndex = 0, totalSlides = 9 } = input;
  const { content, style } = slide;

  if (!content.texto1?.trim()) {
    console.warn("[bd-capa] texto1 (required) ausente em slide");
  }

  const palette = buildBDPalette(style.primaryColor);
  const shared = bdSharedCss(palette, "dark");

  const bgImage = content.backgroundImageUrl
    ? `background-image: url('${escapeCssUrl(content.backgroundImageUrl)}');`
    : `background: ${palette.darkBg};`;

  const handle = escapeHtml(profile.handle || "@brand");
  const initial = (profile.name || "B").trim().charAt(0).toUpperCase();

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>BD — Capa</title>
  ${BD_FONTS_HEAD}
  <style>
    ${shared}

    .slide-capa { background: #000; }

    .capa-bg {
      position: absolute; inset: 0;
      ${bgImage}
      background-size: cover;
      background-position: center;
      z-index: 0;
    }

    .capa-grad {
      position: absolute; inset: 0; z-index: 1;
      background: linear-gradient(
        to bottom,
        rgba(0,0,0,0.40) 0%,
        rgba(0,0,0,0.12) 25%,
        rgba(0,0,0,0.20) 40%,
        rgba(0,0,0,0.70) 55%,
        rgba(0,0,0,0.94) 75%,
        rgba(0,0,0,0.99) 100%
      );
    }

    .capa-content {
      position: absolute;
      left: 52px; right: 52px; bottom: 110px;
      z-index: 10;
    }

    .capa-badge {
      display: inline-flex; align-items: center; gap: 14px;
      background: rgba(0,0,0,0.42);
      border: 1.5px solid rgba(255,255,255,0.14);
      border-radius: 60px;
      padding: 10px 24px 10px 12px;
      margin-bottom: 32px;
      backdrop-filter: blur(10px);
    }
    .badge-dot {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--G);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--F-BODY); font-size: 16px; font-weight: 900; color: #fff;
    }
    .badge-handle {
      font-family: var(--F-BODY);
      font-size: 20px; font-weight: 700; color: #fff; letter-spacing: 0.3px;
    }

    .capa-type {
      display: inline-block;
      font-family: var(--F-BODY);
      font-size: 12px; font-weight: 800;
      letter-spacing: 3px; text-transform: uppercase;
      color: var(--P);
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.10);
      padding: 8px 18px;
      border-radius: 4px;
      margin-bottom: 24px;
    }

    .capa-headline {
      font-family: var(--F-HEAD);
      font-size: 104px;
      font-weight: 900;
      line-height: 0.93;
      letter-spacing: -3px;
      text-transform: uppercase;
      color: #fff;
    }
    .capa-headline em {
      color: var(--P);
      font-style: normal;
    }

    .capa-sub {
      margin-top: 28px;
      font-family: var(--F-BODY);
      font-size: 26px; font-weight: 500;
      line-height: 1.4;
      color: rgba(255,255,255,0.72);
      max-width: 94%;
    }

    .capa-content + .prog .prog-num { color: rgba(255,255,255,0.55); }
    .slide-capa .brand-bar { color: rgba(255,255,255,0.55); }
    .slide-capa .prog-track { background: rgba(255,255,255,0.15); }
    .slide-capa .prog-fill { background: rgba(255,255,255,0.8); }
    .slide-capa .prog-num { color: rgba(255,255,255,0.45); }
  </style>
</head>
<body>
  <div class="slide slide-capa">
    <div class="capa-bg"></div>
    <div class="capa-grad"></div>
    <div class="accent-bar"></div>
    ${bdBrandBarHtml(header)}

    <div class="capa-content">
      ${header.category ? `<div class="capa-type">${escapeHtml(header.category)}</div>` : ""}
      <div class="capa-badge">
        <div class="badge-dot">${escapeHtml(initial)}</div>
        <span class="badge-handle">${handle}</span>
      </div>
      <h1 class="capa-headline">${bdProcessInline(content.texto1 || "")}</h1>
      ${content.texto2 ? `<p class="capa-sub">${bdProcessInline(content.texto2)}</p>` : ""}
    </div>

    ${bdProgressBarHtml(slideIndex, totalSlides)}
  </div>
</body>
</html>`;

  return html;
}
