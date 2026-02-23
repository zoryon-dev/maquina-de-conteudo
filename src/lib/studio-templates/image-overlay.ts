/**
 * Template IMAGE_OVERLAY - Imagem full-bleed com overlay de texto
 *
 * Layout:
 * - Imagem de fundo full-bleed (1080x1440)
 * - Header transparente no topo
 * - Gradiente escuro na parte inferior
 * - Headline 64px + subtitle 28px sobre o gradiente
 * - Fallback sem imagem: cor sólida primaryColor
 *
 * Ideal para: posts de imagem únicos com texto sobreposto
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "./types";
import { escapeHtml, escapeCssUrl, INSTAGRAM_DIMENSIONS } from "./types";

export interface TemplateImageOverlayInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  isLastSlide?: boolean;
}

/**
 * Gera o HTML do template IMAGE_OVERLAY
 */
export function generateImageOverlayHtml(input: TemplateImageOverlayInput): string {
  const { slide, profile, header } = input;
  const { content, style } = slide;

  const backgroundStyle = content.backgroundImageUrl
    ? `background-image: url('${escapeCssUrl(content.backgroundImageUrl)}'); background-size: cover; background-position: center;`
    : `background-color: ${style.primaryColor};`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${INSTAGRAM_DIMENSIONS.width}, height=${INSTAGRAM_DIMENSIONS.height}">
  <title>Image Overlay - Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; word-break: break-word; overflow-wrap: break-word; }
    html, body {
      width: ${INSTAGRAM_DIMENSIONS.width}px;
      height: ${INSTAGRAM_DIMENSIONS.height}px;
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .container {
      width: 100%;
      height: 100%;
      position: relative;
      ${backgroundStyle}
    }

    /* Gradiente escuro para legibilidade do texto */
    .gradient-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.4) 0%,
        rgba(0, 0, 0, 0.05) 35%,
        rgba(0, 0, 0, 0.05) 50%,
        rgba(0, 0, 0, 0.6) 75%,
        rgba(0, 0, 0, 0.85) 100%
      );
    }

    /* Header */
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

    /* Texto na base */
    .text-area {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 62px 72px;
      z-index: 10;
    }

    .headline {
      font-size: 64px;
      font-weight: 800;
      line-height: 1.08;
      letter-spacing: -2px;
      color: #ffffff;
      margin-bottom: 16px;
    }

    .subtitle {
      font-size: 28px;
      font-weight: 500;
      line-height: 1.35;
      color: rgba(255, 255, 255, 0.75);
    }

    /* Footer */
    .footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 62px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
    }

    .footer-text {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="gradient-overlay"></div>

    <!-- Header -->
    <header class="header">
      <span class="header-text">${escapeHtml(header.category)}</span>
      <span class="header-text">${escapeHtml(header.brand)}</span>
      <span class="header-text">${escapeHtml(header.copyright)}</span>
    </header>

    <!-- Texto sobre gradiente -->
    <div class="text-area">
      <h1 class="headline">${escapeHtml(content.texto1)}</h1>
      ${content.texto2 ? `<p class="subtitle">${escapeHtml(content.texto2)}</p>` : ""}
    </div>
  </div>
</body>
</html>`;

  return html;
}
