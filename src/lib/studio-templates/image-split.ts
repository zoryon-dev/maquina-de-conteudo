/**
 * Template IMAGE_SPLIT - Imagem topo + card de texto na base
 *
 * Layout:
 * - Imagem ocupando ~55% superior (792px)
 * - Header sobreposto na imagem (transparente)
 * - Card de texto ~45% inferior (648px)
 * - Headline 56px + subtitle 26px centralizados no card
 * - Footer com "Made By" no rodapé do card
 * - Fallback sem imagem: cor sólida primaryColor
 *
 * Ideal para: posts de imagem com bastante texto de apoio
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "./types";
import { escapeHtml, escapeCssUrl, INSTAGRAM_DIMENSIONS } from "./types";
import { tokenVar } from "./brand-tokens-css";

export interface TemplateImageSplitInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  isLastSlide?: boolean;
}

/**
 * Gera o HTML do template IMAGE_SPLIT
 */
export function generateImageSplitHtml(input: TemplateImageSplitInput): string {
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
  <title>Image Split - Studio</title>
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
      display: flex;
      flex-direction: column;
    }

    /* Área da imagem (55% superior) */
    .image-area {
      height: 55%;
      position: relative;
      ${backgroundStyle}
    }

    .image-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.3) 0%,
        rgba(0, 0, 0, 0.05) 60%,
        rgba(0, 0, 0, 0.1) 100%
      );
    }

    /* Header sobre a imagem */
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

    /* Card de texto (45% inferior) */
    .text-card {
      height: 45%;
      background: ${style.backgroundColor};
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 48px 62px;
      gap: 16px;
    }

    .headline {
      font-size: 56px;
      font-weight: 800;
      line-height: 1.08;
      letter-spacing: -2px;
      color: ${style.textColor};
    }

    .subtitle {
      font-size: 26px;
      font-weight: 400;
      line-height: 1.4;
      color: ${style.textColor};
      opacity: 0.7;
    }

    /* Footer no card */
    .footer {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 62px 32px;
      background: ${style.backgroundColor};
    }

    .footer-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .footer-made {
      font-size: 13px;
      font-weight: 400;
      color: ${style.textColor};
      opacity: 0.4;
    }

    .footer-name {
      font-size: 15px;
      font-weight: 700;
      color: ${style.textColor};
      text-transform: uppercase;
    }

    .footer-right {
      font-size: 13px;
      font-weight: 500;
      color: ${style.textColor};
      opacity: 0.4;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Área da imagem -->
    <div class="image-area">
      <div class="image-overlay"></div>

      <header class="header">
        <span class="header-text">${escapeHtml(header.category)}</span>
        <span class="header-text">${escapeHtml(header.brand)}</span>
        <span class="header-text">${escapeHtml(header.copyright)}</span>
      </header>
    </div>

    <!-- Card de texto -->
    <div class="text-card">
      <h1 class="headline">${escapeHtml(content.texto1)}</h1>
      ${content.texto2 ? `<p class="subtitle">${escapeHtml(content.texto2)}</p>` : ""}
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        <span class="footer-made">Made By</span>
        <span class="footer-name">${escapeHtml(profile.name)}</span>
      </div>
      <span class="footer-right">${escapeHtml(profile.handle)}</span>
    </div>
  </div>
</body>
</html>`;

  return html;
}
