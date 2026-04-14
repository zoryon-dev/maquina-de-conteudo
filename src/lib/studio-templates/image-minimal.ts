/**
 * Template IMAGE_MINIMAL - Imagem dominante + barra sutil na base
 *
 * Layout:
 * - Imagem full-bleed (1080x1440)
 * - Header transparente no topo
 * - Barra sutil na base (~200px) com gradiente suave
 * - Headline 36px + subtitle 22px na barra
 * - Texto menor, imagem é o foco principal
 * - Fallback sem imagem: cor sólida primaryColor
 *
 * Ideal para: posts onde a imagem é o protagonista
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "./types";
import { escapeHtml, escapeCssUrl, INSTAGRAM_DIMENSIONS } from "./types";
import { tokenVar } from "./brand-tokens-css";

export interface TemplateImageMinimalInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  isLastSlide?: boolean;
}

/**
 * Gera o HTML do template IMAGE_MINIMAL
 */
export function generateImageMinimalHtml(input: TemplateImageMinimalInput): string {
  const { slide, header } = input;
  const { content, style } = slide;

  const backgroundStyle = content.backgroundImageUrl
    ? `background-image: url('${escapeCssUrl(content.backgroundImageUrl)}'); background-size: cover; background-position: center;`
    : `background-color: ${style.primaryColor};`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${INSTAGRAM_DIMENSIONS.width}, height=${INSTAGRAM_DIMENSIONS.height}">
  <title>Image Minimal - Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; word-break: break-word; overflow-wrap: break-word; }
    html, body {
      width: ${INSTAGRAM_DIMENSIONS.width}px;
      height: ${INSTAGRAM_DIMENSIONS.height}px;
      overflow: hidden;
      font-family: ${tokenVar("font", "body", "'Inter', -apple-system, BlinkMacSystemFont, sans-serif")};
    }

    .container {
      width: 100%;
      height: 100%;
      position: relative;
      ${backgroundStyle}
    }

    /* Header transparente sobre a imagem */
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
      color: rgba(255, 255, 255, 0.85);
    }

    /* Gradiente sutil na base */
    .bottom-gradient {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 280px;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0) 0%,
        rgba(0, 0, 0, 0.55) 50%,
        rgba(0, 0, 0, 0.8) 100%
      );
      z-index: 5;
    }

    /* Barra de texto na base */
    .text-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 62px 40px;
      z-index: 10;
    }

    .headline {
      font-size: 36px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -1px;
      color: #ffffff;
      margin-bottom: 8px;
    }

    .subtitle {
      font-size: 22px;
      font-weight: 400;
      line-height: 1.35;
      color: rgba(255, 255, 255, 0.65);
    }

    /* Gradiente no topo para header */
    .top-gradient {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 120px;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.4) 0%,
        rgba(0, 0, 0, 0) 100%
      );
      z-index: 5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-gradient"></div>
    <div class="bottom-gradient"></div>

    <!-- Header -->
    <header class="header">
      <span class="header-text">${escapeHtml(header.category)}</span>
      <span class="header-text">${escapeHtml(header.brand)}</span>
      <span class="header-text">${escapeHtml(header.copyright)}</span>
    </header>

    <!-- Barra de texto sutil -->
    <div class="text-bar">
      <h1 class="headline">${escapeHtml(content.texto1)}</h1>
      ${content.texto2 ? `<p class="subtitle">${escapeHtml(content.texto2)}</p>` : ""}
    </div>
  </div>
</body>
</html>`;

  return html;
}
