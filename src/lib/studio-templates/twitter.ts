/**
 * Template TWITTER - Estilo de post do Twitter
 *
 * Layout:
 * - Header com brand
 * - Avatar circular com badge verificado
 * - Headline grande
 * - Parágrafos de corpo
 * - CTA "Arraste para o lado"
 *
 * Cores customizáveis via slide.style
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "./types";
import { escapeHtml, INSTAGRAM_DIMENSIONS } from "./types";

export interface TemplateTwitterInput {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  isLastSlide?: boolean;
}

/**
 * Gera o HTML do template TWITTER
 */
export function generateTwitterHtml(input: TemplateTwitterInput): string {
  const { slide, profile, header, isLastSlide } = input;
  const { content, style } = slide;

  const showSwipe = style.showSwipeIndicator && !isLastSlide;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${INSTAGRAM_DIMENSIONS.width}, height=${INSTAGRAM_DIMENSIONS.height}">
  <title>Twitter Style - Studio</title>
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
      position: relative;
    }

    /* Header - FORA da área útil (topo) */
    .header {
      position: absolute;
      top: 40px;
      left: 64px;
      right: 64px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-brand {
      font-size: 18px;
      font-weight: 700;
      color: ${style.textColor};
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .header-tag {
      font-size: 18px;
      font-weight: 600;
      color: ${style.textColor};
      letter-spacing: 1px;
    }

    /* Área útil - centralizada */
    .safe-area {
      position: absolute;
      top: 135px;
      left: 0;
      width: 1080px;
      height: 1080px;
      padding: 40px 64px;
      display: flex;
      flex-direction: column;
    }

    /* Autor */
    .author {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 36px;
      margin-top: 20px;
    }

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      overflow: hidden;
      background: #e5e5e5;
      flex-shrink: 0;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .author-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .author-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 22px;
      font-weight: 700;
      color: ${style.textColor};
    }

    .verified {
      width: 22px;
      height: 22px;
      fill: #1d9bf0;
    }

    .author-handle {
      font-size: 17px;
      font-weight: 500;
      color: ${style.textColor};
      opacity: 0.6;
    }

    /* Conteúdo */
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .headline {
      font-size: 58px;
      font-weight: 800;
      line-height: 1.1;
      color: ${style.textColor};
      margin-bottom: 32px;
      letter-spacing: -2px;
    }

    .body {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .body p {
      font-size: 30px;
      font-weight: 400;
      line-height: 1.4;
      color: ${style.textColor};
      opacity: 0.8;
    }

    .body p.destaque {
      font-weight: 700;
      color: ${style.primaryColor};
      opacity: 1;
    }

    /* CTA Button */
    .cta-container {
      margin-top: auto;
      padding-bottom: 20px;
    }

    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 16px;
    }

    .cta-text {
      padding: 18px 56px;
      background: ${style.primaryColor};
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      color: #000000;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .cta-arrow {
      width: 52px;
      height: 52px;
      background: ${style.textColor === "#000000" ? "#f0f0f0" : "rgba(255,255,255,0.1)"};
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cta-arrow svg {
      width: 24px;
      height: 24px;
      stroke: ${style.textColor};
      opacity: 0.5;
      stroke-width: 2.5;
      fill: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <span class="header-brand">${escapeHtml(header.brand)}</span>
      <span class="header-tag">${escapeHtml(header.category)}</span>
    </header>

    <!-- Área útil -->
    <main class="safe-area">
      <div class="author">
        <div class="avatar">
          ${profile.avatarUrl
            ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="${escapeHtml(profile.name)}">`
            : `<div style="width:100%;height:100%;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>`
          }
        </div>
        <div class="author-info">
          <span class="author-name">
            ${escapeHtml(profile.name)}
            ${profile.showVerifiedBadge ? `
            <svg class="verified" viewBox="0 0 24 24">
              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" fill="#1d9bf0"/>
            </svg>
            ` : ""}
          </span>
          <span class="author-handle">${escapeHtml(profile.handle)}</span>
        </div>
      </div>

      <div class="content">
        <h1 class="headline">${escapeHtml(content.texto1)}</h1>

        <div class="body">
          ${content.texto2 ? `<p>${escapeHtml(content.texto2)}</p>` : ""}
          ${content.texto3 ? `<p class="destaque">${escapeHtml(content.texto3)}</p>` : ""}
        </div>
      </div>

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
    </main>
  </div>
</body>
</html>`;

  return html;
}
