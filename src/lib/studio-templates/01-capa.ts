/**
 * Template 01_CAPA - Capa do Carrossel
 *
 * Layout:
 * - Imagem de fundo ocupando ~70% superior
 * - Header transparente no topo
 * - Swipe indicator centralizado sobre a imagem
 * - Área branca com headline gigante na parte inferior
 *
 * Baseado no Figma Node ID: 432:826
 *
 * Especificações:
 * - Dimensões: 1080 x 1350 px
 * - Fonte: Inter (Medium, Bold)
 * - Cores padrão: branco (#FFFFFF), preto (#000000), amarelo (#FFD700)
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "./types";
import { escapeHtml, INSTAGRAM_DIMENSIONS } from "./types";

export interface CapaTemplateInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
}

/**
 * Gera o HTML do template 01_CAPA
 */
export function generate01CapaHtml(input: CapaTemplateInput): string {
  const { slide, profile, header } = input;
  const { content, style } = slide;

  // Usar imagem de fundo se disponível, senão usar cor de fundo
  const backgroundStyle = content.backgroundImageUrl
    ? `background-image: url('${escapeHtml(content.backgroundImageUrl)}'); background-size: cover; background-position: center;`
    : `background-color: ${style.primaryColor};`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${INSTAGRAM_DIMENSIONS.width}, height=${INSTAGRAM_DIMENSIONS.height}">
  <title>Capa - Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${INSTAGRAM_DIMENSIONS.width}px;
      height: ${INSTAGRAM_DIMENSIONS.height}px;
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    /* Área da imagem de fundo (70% superior) */
    .background-area {
      height: 70%;
      position: relative;
      ${backgroundStyle}
    }

    /* Overlay escuro para melhorar legibilidade */
    .background-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.3) 0%,
        rgba(0, 0, 0, 0.1) 50%,
        rgba(0, 0, 0, 0.4) 100%
      );
    }

    /* Header - categoria | marca | copyright */
    .header {
      position: absolute;
      top: 40px;
      left: 62px;
      right: 62px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
    }

    .header-text {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.9);
    }

    /* Swipe indicator centralizado */
    .swipe-indicator {
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 32px;
      background: ${style.primaryColor};
      border-radius: 50px;
      z-index: 10;
    }

    .swipe-text {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #000000;
    }

    .swipe-arrow {
      width: 24px;
      height: 24px;
    }

    /* Área do headline (30% inferior) */
    .headline-area {
      height: 30%;
      background: ${style.backgroundColor};
      display: flex;
      align-items: center;
      padding: 0 62px;
    }

    .headline {
      font-size: 72px;
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -2px;
      color: ${style.textColor};
    }

    /* Destaque no texto */
    .headline .destaque {
      color: ${style.primaryColor};
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Área da imagem de fundo -->
    <div class="background-area">
      <div class="background-overlay"></div>

      <!-- Header -->
      <header class="header">
        <span class="header-text">${escapeHtml(header.category)}</span>
        <span class="header-text">${escapeHtml(header.brand)}</span>
        <span class="header-text">${escapeHtml(header.copyright)}</span>
      </header>

      <!-- Swipe Indicator -->
      ${style.showSwipeIndicator ? `
      <div class="swipe-indicator">
        <span class="swipe-text">Arraste pro lado</span>
        <svg class="swipe-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      ` : ""}
    </div>

    <!-- Área do headline -->
    <div class="headline-area">
      <h1 class="headline">${escapeHtml(content.texto1)}</h1>
    </div>
  </div>
</body>
</html>`;

  return html;
}
