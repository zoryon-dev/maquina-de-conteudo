/**
 * Template WHITE_MODE - Fundo claro minimalista
 *
 * Layout similar ao DARK_MODE mas com tema claro.
 * Cores customizáveis via slide.style
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "./types";
import { escapeHtml, INSTAGRAM_DIMENSIONS } from "./types";

export interface TemplateWhiteModeInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  isLastSlide?: boolean;
}

/**
 * Processa texto com marcadores **bold** para destaque
 */
function processHighlight(text: string, highlightColor: string): string {
  return text.replace(
    /\*\*([^*]+)\*\*/g,
    `<span style="color: ${highlightColor}; font-style: italic;">$1</span>`
  );
}

/**
 * Gera o HTML do template WHITE_MODE
 */
export function generateWhiteModeHtml(input: TemplateWhiteModeInput): string {
  const { slide, profile, header, isLastSlide } = input;
  const { content, style } = slide;

  const showSwipe = style.showSwipeIndicator && !isLastSlide;

  // Para tema claro, o botão deve ter cor escura
  const buttonBg = style.backgroundColor === "#FFFFFF" || style.backgroundColor === "#ffffff"
    ? "#171717"
    : style.primaryColor;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${INSTAGRAM_DIMENSIONS.width}, height=${INSTAGRAM_DIMENSIONS.height}">
  <title>White Mode - Studio</title>
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
      padding: 48px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 80px;
    }

    .header-year {
      font-size: 18px;
      font-weight: 500;
      color: ${style.textColor};
      opacity: 0.5;
    }

    .header-brand {
      padding: 10px 28px;
      border: 1.5px solid ${style.textColor};
      opacity: 0.3;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      color: ${style.textColor};
    }

    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 40px;
    }

    .headline {
      font-size: 72px;
      font-weight: 800;
      line-height: 1.1;
      color: ${style.textColor};
      letter-spacing: -2px;
    }

    .descricao {
      font-size: 32px;
      font-weight: 400;
      line-height: 1.5;
      color: ${style.textColor};
      opacity: 0.65;
      max-width: 90%;
    }

    .cta-container {
      margin-top: 40px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .cta-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 18px 48px;
      background: ${buttonBg};
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .cta-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: ${buttonBg};
      border-radius: 12px;
    }

    .cta-arrow svg {
      width: 24px;
      height: 24px;
      color: #ffffff;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: auto;
      padding-top: 60px;
    }

    .footer-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .footer-made {
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
      gap: 20px;
      font-size: 15px;
      font-weight: 500;
      color: ${style.textColor};
      opacity: 0.4;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <span class="header-year">${escapeHtml(header.copyright)}</span>
      <span class="header-brand">${escapeHtml(header.brand)}</span>
      <span class="header-year">${escapeHtml(header.copyright)}</span>
    </header>

    <main class="content">
      <h1 class="headline">${processHighlight(escapeHtml(content.texto1), style.primaryColor)}</h1>
      ${content.texto2 ? `<p class="descricao">${escapeHtml(content.texto2)}</p>` : ""}

      ${showSwipe ? `
      <div class="cta-container">
        <span class="cta-button">Arraste para o lado</span>
        <span class="cta-arrow">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
      ` : ""}
    </main>

    <footer class="footer">
      <div class="footer-left">
        <span class="footer-made">Made By</span>
        <span class="footer-name">${escapeHtml(profile.name)}</span>
      </div>
      <div class="footer-right">
        <span>${escapeHtml(header.copyright)}</span>
        <span>${escapeHtml(profile.handle)}</span>
      </div>
    </footer>
  </div>
</body>
</html>`;

  return html;
}
