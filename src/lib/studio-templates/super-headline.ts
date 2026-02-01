/**
 * Template SUPER_HEADLINE - Headline gigante com grid de fundo
 *
 * Layout:
 * - Grid de fundo sutil
 * - Header com ano e brand
 * - Headline ENORME (115px)
 * - CTA "Arraste para o lado"
 * - Footer com créditos
 *
 * Cores customizáveis via slide.style
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "./types";
import { escapeHtml, INSTAGRAM_DIMENSIONS } from "./types";

export interface TemplateSuperHeadlineInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  isLastSlide?: boolean;
}

/**
 * Processa texto com marcadores **texto** para destaque
 * Aplica cor de destaque e estilo itálico ao texto entre **
 */
function processHighlight(text: string, highlightColor: string): string {
  return text.replace(
    /\*\*([^*]+)\*\*/g,
    `<span style="color: ${highlightColor}; font-style: italic;">$1</span>`
  );
}

/**
 * Gera o HTML do template SUPER_HEADLINE
 */
export function generateSuperHeadlineHtml(input: TemplateSuperHeadlineInput): string {
  const { slide, profile, header, isLastSlide } = input;
  const { content, style } = slide;

  const showSwipe = style.showSwipeIndicator && !isLastSlide;

  // Cor do grid baseada no tema
  const isLightBg = style.backgroundColor.toLowerCase() === "#ffffff" ||
                    style.backgroundColor.toLowerCase() === "#fafafa" ||
                    style.backgroundColor.toLowerCase() === "#f5f5f5";
  const gridColor = isLightBg ? "#e5e5e5" : "rgba(255,255,255,0.08)";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${INSTAGRAM_DIMENSIONS.width}, height=${INSTAGRAM_DIMENSIONS.height}">
  <title>Super Headline - Studio</title>
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
      background: ${style.backgroundColor};
      color: ${style.textColor};
    }

    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 48px 64px;
      position: relative;
    }

    /* Grid de fundo */
    .grid-bg {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        linear-gradient(to right, ${gridColor} 1px, transparent 1px),
        linear-gradient(to bottom, ${gridColor} 1px, transparent 1px);
      background-size: 120px 120px;
      pointer-events: none;
      z-index: 0;
    }

    /* Conteúdo sobre o grid */
    .content-wrapper {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 60px;
    }

    .header-year {
      font-size: 16px;
      font-weight: 500;
      color: ${style.textColor};
      opacity: 0.5;
    }

    .header-brand {
      padding: 10px 28px;
      border: 1.5px solid ${style.textColor};
      opacity: 0.4;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      color: ${style.textColor};
    }

    /* Headline gigante */
    .headline-container {
      flex: 1;
      display: flex;
      align-items: center;
    }

    .headline {
      font-size: 115px;
      font-weight: 700;
      line-height: 1.05;
      color: ${style.textColor};
      letter-spacing: -3px;
    }

    /* CTA */
    .cta-container {
      margin-bottom: 48px;
    }

    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 16px;
    }

    .cta-text {
      padding: 20px 64px;
      background: ${style.primaryColor};
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      color: #000000;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .cta-arrow {
      width: 56px;
      height: 56px;
      background: ${isLightBg ? "#f0f0f0" : "rgba(255,255,255,0.1)"};
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cta-arrow svg {
      width: 28px;
      height: 28px;
      stroke: ${style.primaryColor};
      stroke-width: 2.5;
      fill: none;
    }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .footer-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .footer-label {
      font-size: 14px;
      font-weight: 400;
      color: ${style.textColor};
      opacity: 0.4;
    }

    .footer-name {
      font-size: 16px;
      font-weight: 700;
      color: ${style.textColor};
      text-transform: uppercase;
    }

    .footer-right {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 14px;
      font-weight: 500;
      color: ${style.textColor};
      opacity: 0.4;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="grid-bg"></div>

    <div class="content-wrapper">
      <header class="header">
        <span class="header-year">${escapeHtml(header.copyright)}</span>
        <span class="header-brand">${escapeHtml(header.brand)}</span>
        <span class="header-year">${escapeHtml(header.copyright)}</span>
      </header>

      <main class="headline-container">
        <h1 class="headline">${processHighlight(escapeHtml(content.texto1), style.primaryColor)}</h1>
      </main>

      ${showSwipe ? `
      <div class="cta-container">
        <div class="cta-button">
          <span class="cta-text">Arraste para o lado</span>
          <span class="cta-arrow">
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
      </div>
      ` : ""}

      <footer class="footer">
        <div class="footer-left">
          <span class="footer-label">Made By</span>
          <span class="footer-name">${escapeHtml(profile.name)}</span>
        </div>
        <div class="footer-right">
          <span>${escapeHtml(header.copyright)}</span>
          <span>${escapeHtml(profile.handle)}</span>
        </div>
      </footer>
    </div>
  </div>
</body>
</html>`;

  return html;
}
