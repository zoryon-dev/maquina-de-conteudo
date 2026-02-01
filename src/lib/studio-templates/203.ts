/**
 * Template 203 - Slide com Swipe Destaque
 *
 * Layout:
 * - Header no topo (categoria | marca | copyright)
 * - Perfil (avatar rotacionado + nome + handle)
 * - Texto 1 em BOLD (destaque principal)
 * - Texto 2 normal (contexto)
 * - Imagem central com border-radius
 * - Swipe indicator mais proeminente (full width)
 *
 * Baseado no Figma Node ID: 432:983
 *
 * Especificações:
 * - Dimensões: 1080 x 1350 px
 * - Fonte: Inter (Medium 43px nome, 39px textos)
 * - Padding lateral: 62px
 * - Gap entre elementos: 50px
 * - Border radius imagem: 20px
 * - Avatar: 134px, rotação -15°
 * - Swipe indicator: full width com destaque
 */

import type { StudioSlide, StudioProfile, StudioHeader } from "./types";
import { escapeHtml, INSTAGRAM_DIMENSIONS } from "./types";

export interface Template203Input {
  slide: StudioSlide;
  profile: StudioProfile;
  header: StudioHeader;
  isLastSlide?: boolean;
}

/**
 * Gera o HTML do template 203
 */
export function generate203Html(input: Template203Input): string {
  const { slide, profile, header, isLastSlide } = input;
  const { content, style } = slide;

  // No último slide, não mostrar swipe indicator
  const showSwipe = style.showSwipeIndicator && !isLastSlide;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${INSTAGRAM_DIMENSIONS.width}, height=${INSTAGRAM_DIMENSIONS.height}">
  <title>Slide 203 - Studio</title>
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
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 40px 62px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
    }

    .header-text {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: ${style.textColor};
      opacity: 0.6;
    }

    /* Perfil */
    .profile {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 50px;
    }

    .avatar-container {
      width: 134px;
      height: 134px;
      border-radius: 50%;
      overflow: hidden;
      transform: rotate(-15deg);
      flex-shrink: 0;
      background: #e5e5e5;
    }

    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: rotate(15deg) scale(1.1);
    }

    .profile-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .profile-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 43px;
      font-weight: 500;
      letter-spacing: -2.15px;
      color: ${style.textColor};
    }

    .verified-badge {
      width: 28px;
      height: 28px;
      fill: #1DA1F2;
    }

    .profile-handle {
      font-size: 39px;
      font-weight: 500;
      color: #717171;
    }

    .profile-arrow {
      margin-left: auto;
      font-size: 48px;
      color: ${style.textColor};
      opacity: 0.3;
    }

    /* Conteúdo */
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    .texto1 {
      font-size: 39px;
      font-weight: ${content.texto1Bold ? "700" : "400"};
      letter-spacing: -1.17px;
      line-height: 1.3;
      color: ${style.textColor};
    }

    .texto2 {
      font-size: 39px;
      font-weight: 400;
      letter-spacing: -1.17px;
      line-height: 1.3;
      color: ${style.textColor};
      opacity: 0.8;
    }

    .image-container {
      width: 100%;
      height: 320px;
      border-radius: 20px;
      overflow: hidden;
      background: #f0f0f0;
    }

    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Swipe Indicator Full Width - Destaque */
    .swipe-bar {
      width: 100%;
      padding: 24px 62px;
      background: ${style.primaryColor};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .swipe-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #000000;
    }

    .swipe-arrow {
      width: 28px;
      height: 28px;
    }

    /* Animação sutil na seta */
    @keyframes bounceRight {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(8px); }
    }

    .swipe-arrow {
      animation: bounceRight 1.5s ease-in-out infinite;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="main-content">
      <!-- Header -->
      <header class="header">
        <span class="header-text">${escapeHtml(header.category)}</span>
        <span class="header-text">${escapeHtml(header.brand)}</span>
        <span class="header-text">${escapeHtml(header.copyright)}</span>
      </header>

      <!-- Perfil -->
      <div class="profile">
        <div class="avatar-container">
          ${profile.avatarUrl
            ? `<img class="avatar" src="${escapeHtml(profile.avatarUrl)}" alt="${escapeHtml(profile.name)}">`
            : `<div class="avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>`
          }
        </div>
        <div class="profile-info">
          <span class="profile-name">
            ${escapeHtml(profile.name)}
            ${profile.showVerifiedBadge ? `
            <svg class="verified-badge" viewBox="0 0 24 24">
              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/>
            </svg>
            ` : ""}
          </span>
          <span class="profile-handle">${escapeHtml(profile.handle)}</span>
        </div>
        <span class="profile-arrow">→</span>
      </div>

      <!-- Conteúdo -->
      <div class="content">
        <p class="texto1">${escapeHtml(content.texto1)}</p>

        ${content.texto2 ? `<p class="texto2">${escapeHtml(content.texto2)}</p>` : ""}

        ${content.imageUrl ? `
        <div class="image-container">
          <img src="${escapeHtml(content.imageUrl)}" alt="Imagem do slide">
        </div>
        ` : ""}
      </div>
    </div>

    <!-- Swipe Bar Full Width -->
    ${showSwipe ? `
    <div class="swipe-bar">
      <span class="swipe-text">Arraste pro lado</span>
      <svg class="swipe-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    ` : ""}
  </div>
</body>
</html>`;

  return html;
}
