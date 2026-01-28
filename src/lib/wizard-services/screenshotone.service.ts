/**
 * ScreenshotOne Service
 *
 * Handles HTML template rendering using ScreenshotOne API.
 * Generates Instagram-sized images (1080x1350px) from 4 templates.
 *
 * Templates follow patterns from .context/wizard-prompts/:
 * - dark-mode: Dark background with green/teal accents
 * - white-mode: Light background with orange accents
 * - twitter: Twitter-style post with avatar and verified badge
 * - super-headline: Giant headline with grid background
 */

import type {
  HtmlTemplate,
  HtmlTemplateOptions,
  ImageGenerationInput,
  ImageGenerationResult,
  GeneratedImage,
  TemplateData,
  ScreenshotOneConfig,
  ScreenshotOneRenderOptions,
} from "./image-types";
import type { ServiceResult } from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * ScreenshotOne access key from environment
 */
const SCREENSHOT_ONE_ACCESS_KEY = process.env.SCREENSHOT_ONE_ACCESS_KEY;

/**
 * Base ScreenshotOne API endpoint
 */
const SCREENSHOT_ONE_API = "https://api.screenshotone.com/take";

/**
 * Default timeout for ScreenshotOne requests
 */
const REQUEST_TIMEOUT = 60000; // 1 minute

// ============================================================================
// TEMPLATE DATA PARSING
// ============================================================================

/**
 * Parses content string to extract template-specific fields
 * Attempts to parse as JSON, falls back to generic title/content
 */
function parseTemplateData(content: string, title?: string): TemplateData {
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as TemplateData;
    }
  } catch {
    // Not JSON, use fallback
  }

  // Fallback: generic content structure
  return {
    title: title,
    content: content,
    headline: title,
  };
}

/**
 * Processes headline text to handle **bold** markers
 * Converts **text** to <span class="destaque">text</span>
 */
function processHeadline(text?: string): string {
  if (!text) return "";
  return text.replace(/\*([^*]+)\*/g, '<span class="destaque">$1</span>');
}

/**
 * Escapes HTML special characters for safe rendering
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

// ============================================================================
// HTML TEMPLATES
// ============================================================================

/**
 * Generates HTML content for each template following .context patterns
 * @param isLastCard - When true, removes navigation CTA (arraste para o lado, arrow)
 */
function generateTemplateHtml(
  template: HtmlTemplate,
  options: HtmlTemplateOptions,
  content: string,
  title?: string,
  isLastCard: boolean = false
): string {
  // Parse content to extract template-specific fields
  const data = parseTemplateData(content, title);

  // Extract colors from options with defaults
  const primaryColor = options.primaryColor || "#2dd4bf"; // Default teal
  const secondaryColor = options.secondaryColor || "#f97316"; // Default orange
  const backgroundColor = options.backgroundColor;
  const titleColor = options.titleColor;
  const textColor = options.textColor;
  const buttonColor = options.buttonColor;
  const buttonTextColor = options.buttonTextColor;

  // Generate template-specific HTML with extended color options
  switch (template) {
    // ==================== DARK MODE ====================
    case "dark-mode":
      return generateDarkModeHtml(data, {
        primaryColor,
        secondaryColor,
        backgroundColor,
        titleColor,
        textColor,
        buttonColor,
        buttonTextColor,
      }, isLastCard);

    // ==================== WHITE MODE ====================
    case "white-mode":
      return generateWhiteModeHtml(data, {
        primaryColor,
        secondaryColor,
        backgroundColor,
        titleColor,
        textColor,
        buttonColor,
        buttonTextColor,
      }, isLastCard);

    // ==================== TWITTER ====================
    case "twitter":
      return generateTwitterHtml(data, {
        primaryColor,
        backgroundColor,
        titleColor,
        textColor,
        buttonColor,
        buttonTextColor,
      }, isLastCard);

    // ==================== SUPER HEADLINE ====================
    case "super-headline":
      return generateSuperHeadlineHtml(data, {
        primaryColor,
        secondaryColor,
        backgroundColor,
        titleColor,
        buttonColor,
        buttonTextColor,
      }, isLastCard);

    default:
      // Fallback to dark-mode
      return generateDarkModeHtml(data, {
        primaryColor,
        secondaryColor,
        backgroundColor,
        titleColor,
        textColor,
        buttonColor,
        buttonTextColor,
      }, isLastCard);
  }
}

/**
 * Color options for template generation
 */
interface TemplateColorOptions {
  primaryColor: string;
  secondaryColor?: string;
  backgroundColor?: string;
  titleColor?: string;
  textColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
}

/**
 * Dark Mode Template - Fundo escuro com gradiente verde/teal
 * Pattern: .context/wizard-prompts/dark-mode.html
 * @param isLastCard - When true, removes navigation CTA (arraste para o lado, arrow)
 */
function generateDarkModeHtml(
  data: TemplateData,
  colors: TemplateColorOptions,
  isLastCard: boolean = false
): string {
  const headline = data.headline || data.title || data.content || "";
  const descricao = data.descricao || data.content || "";

  // Extract colors with defaults
  const { primaryColor, secondaryColor = "#f97316", backgroundColor = "#0f0f0f", titleColor = "#ffffff", textColor = "rgba(255, 255, 255, 0.7)", buttonColor, buttonTextColor = "#ffffff" } = colors;

  // Use buttonColor if provided, otherwise use secondaryColor gradient
  const buttonBackground = buttonColor
    ? buttonColor
    : `linear-gradient(135deg, ${secondaryColor} 0%, #fb923c 100%)`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1350">
  <title>Post Dark Mode</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1080px; height: 1350px; overflow: hidden; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${backgroundColor};
      color: ${titleColor};
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
      color: ${textColor};
    }
    .header-brand {
      padding: 10px 28px;
      border: 1.5px solid ${textColor};
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      color: ${titleColor};
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
      color: ${titleColor};
      letter-spacing: -2px;
    }
    .headline .destaque {
      color: ${primaryColor};
      font-style: italic;
    }
    .descricao {
      font-size: 32px;
      font-weight: 400;
      line-height: 1.5;
      color: ${textColor};
      max-width: 90%;
    }
    .subtitulo {
      font-size: 42px;
      font-weight: 600;
      line-height: 1.25;
      color: ${textColor};
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
      background: ${buttonBackground};
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      color: ${buttonTextColor};
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .cta-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: ${buttonBackground};
      border-radius: 12px;
    }
    .cta-arrow svg { width: 24px; height: 24px; color: ${buttonTextColor}; }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: auto;
      padding-top: 60px;
    }
    .footer-left { display: flex; flex-direction: column; gap: 2px; }
    .footer-made { font-size: 14px; font-weight: 400; color: ${textColor}; }
    .footer-name { font-size: 16px; font-weight: 700; color: ${titleColor}; text-transform: uppercase; }
    .footer-right { display: flex; align-items: center; gap: 20px; font-size: 15px; font-weight: 500; color: ${textColor}; }
  </style>
</head>
<body>
  <header class="header">
    <span class="header-year">©2025</span>
    <span class="header-brand">zoryon</span>
    <span class="header-year">©2025</span>
  </header>
  <main class="content">
    <h1 class="headline">${processHeadline(escapeHtml(headline))}</h1>
    <p class="descricao">${escapeHtml(descricao)}</p>
    ${data.subtitulo ? `<h2 class="subtitulo">${escapeHtml(data.subtitulo)}</h2>` : ""}
    ${!isLastCard ? `
    <div class="cta-container">
      <span class="cta-button">Arraste para o lado</span>
      <span class="cta-arrow">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </span>
    </div>
    ` : ''}
  </main>
  <footer class="footer">
    <div class="footer-left">
      <span class="footer-made">Made By</span>
      <span class="footer-name">Jonas Silva</span>
    </div>
    <div class="footer-right">
      <span>©2025</span>
      <span>@o.jonas.silva</span>
    </div>
  </footer>
</body>
</html>`;
  return html;
}

/**
 * White Mode Template - Fundo claro com estilo minimalista
 * Pattern: .context/wizard-prompts/white-mode.html
 * @param isLastCard - When true, removes navigation CTA (arraste para o lado, arrow)
 */
function generateWhiteModeHtml(
  data: TemplateData,
  colors: TemplateColorOptions,
  isLastCard: boolean = false
): string {
  const headline = data.headline || data.title || data.content || "";
  const descricao = data.descricao || data.content || "";

  // Extract colors with defaults (light theme defaults)
  const { primaryColor = "#2dd4bf", secondaryColor = "#f97316", backgroundColor = "#fafafa", titleColor = "#171717", textColor = "rgba(23, 23, 23, 0.65)", buttonColor, buttonTextColor = "#ffffff" } = colors;

  // Use buttonColor if provided, otherwise use dark gradient
  const buttonBackground = buttonColor
    ? buttonColor
    : `linear-gradient(135deg, #171717 0%, #404040 100%)`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1350">
  <title>Post White Mode</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1080px; height: 1350px; overflow: hidden; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${backgroundColor};
      color: ${titleColor};
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
      color: ${textColor};
    }
    .header-brand {
      padding: 10px 28px;
      border: 1.5px solid ${textColor};
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      color: ${titleColor};
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
      color: ${titleColor};
      letter-spacing: -2px;
    }
    .headline .destaque {
      color: ${secondaryColor};
      font-style: italic;
    }
    .descricao {
      font-size: 32px;
      font-weight: 400;
      line-height: 1.5;
      color: ${textColor};
      max-width: 90%;
    }
    .subtitulo {
      font-size: 42px;
      font-weight: 600;
      line-height: 1.25;
      color: ${titleColor};
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
      background: ${buttonBackground};
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      color: ${buttonTextColor};
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .cta-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: ${buttonBackground};
      border-radius: 12px;
    }
    .cta-arrow svg { width: 24px; height: 24px; color: ${buttonTextColor}; }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: auto;
      padding-top: 60px;
    }
    .footer-left { display: flex; flex-direction: column; gap: 2px; }
    .footer-made { font-size: 14px; font-weight: 400; color: ${textColor}; }
    .footer-name { font-size: 16px; font-weight: 700; color: ${titleColor}; text-transform: uppercase; }
    .footer-right { display: flex; align-items: center; gap: 20px; font-size: 15px; font-weight: 500; color: ${textColor}; }
  </style>
</head>
<body>
  <header class="header">
    <span class="header-year">©2025</span>
    <span class="header-brand">zoryon</span>
    <span class="header-year">©2025</span>
  </header>
  <main class="content">
    <h1 class="headline">${processHeadline(escapeHtml(headline))}</h1>
    <p class="descricao">${escapeHtml(descricao)}</p>
    ${data.subtitulo ? `<h2 class="subtitulo">${escapeHtml(data.subtitulo)}</h2>` : ""}
    ${!isLastCard ? `
    <div class="cta-container">
      <span class="cta-button">Arraste para o lado</span>
      <span class="cta-arrow">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </span>
    </div>
    ` : ''}
  </main>
  <footer class="footer">
    <div class="footer-left">
      <span class="footer-made">Made By</span>
      <span class="footer-name">Jonas Silva</span>
    </div>
    <div class="footer-right">
      <span>©2025</span>
      <span>@o.jonas.silva</span>
    </div>
  </footer>
</body>
</html>`;
  return html;
}

/**
 * Twitter Template - Estilo de post do Twitter com avatar e verificado
 * Pattern: .context/wizard-prompts/twitter.html
 * @param isLastCard - When true, removes navigation CTA (arraste para o lado, arrow)
 */
function generateTwitterHtml(
  data: TemplateData,
  colors: TemplateColorOptions,
  isLastCard: boolean = false
): string {
  const headline = data.headline || data.title || data.content || "";
  const paragrafo1 = data.paragrafo1 || "";
  const paragrafo2 = data.paragrafo2 || "";
  const destaque = data.destaque || "";

  // Extract colors with defaults
  const { primaryColor = "#8b7cf7", backgroundColor = "#ffffff", titleColor = "#000000", textColor = "#1a1a1a", buttonColor = "#8b7cf7", buttonTextColor = "#ffffff" } = colors;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1350">
  <title>Post Twitter Mode</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1350px;
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${backgroundColor};
      color: ${titleColor};
    }

    /* Container principal */
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
      color: ${titleColor};
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .header-tag {
      font-size: 18px;
      font-weight: 600;
      color: ${titleColor};
      letter-spacing: 1px;
    }

    /* Área útil - 1080x1080 centralizada */
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
      background: #1a1a1a;
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
      color: ${titleColor};
    }
    .verified {
      width: 22px;
      height: 22px;
      fill: #1d9bf0;
    }
    .author-handle {
      font-size: 17px;
      font-weight: 500;
      color: ${textColor};
    }

    /* Conteúdo */
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* Headline */
    .headline {
      font-size: 58px;
      font-weight: 800;
      line-height: 1.1;
      color: ${titleColor};
      margin-bottom: 32px;
      letter-spacing: -2px;
    }

    /* Corpo */
    .body {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .body p {
      font-size: 30px;
      font-weight: 400;
      line-height: 1.4;
      color: ${textColor};
    }
    .body p.destaque {
      font-weight: 700;
      color: ${primaryColor};
    }

    /* CTA Button - DENTRO da área útil */
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
      background: ${buttonColor};
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      color: ${buttonTextColor};
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .cta-arrow {
      width: 52px;
      height: 52px;
      background: ${textColor === "#1a1a1a" ? "#f0f0f0" : textColor};
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cta-arrow svg {
      width: 24px;
      height: 24px;
      stroke: ${textColor === "#1a1a1a" ? "#666666" : textColor};
      stroke-width: 2.5;
      fill: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header - FORA da área útil -->
    <header class="header">
      <span class="header-brand">Zoryon</span>
      <span class="header-tag">IA First</span>
    </header>

    <!-- Área útil 1080x1080 -->
    <main class="safe-area">
      <div class="author">
        <div class="avatar">
          <img src="https://res.cloudinary.com/dbgwlovic/image/upload/v1752350264/foto_jonas_silva_-_mobile_e05zam.webp" alt="Jonas Silva">
        </div>
        <div class="author-info">
          <span class="author-name">
            Jonas Silva
            <svg class="verified" viewBox="0 0 24 24">
              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" fill="#1d9bf0"/>
            </svg>
          </span>
          <span class="author-handle">@o.jonas.silva</span>
        </div>
      </div>

      <div class="content">
        <h1 class="headline">${escapeHtml(headline)}</h1>

        <div class="body">
          ${paragrafo1 ? `<p>${escapeHtml(paragrafo1)}</p>` : ""}
          ${paragrafo2 ? `<p>${escapeHtml(paragrafo2)}</p>` : ""}
          ${destaque ? `<p class="destaque"><strong>**${escapeHtml(destaque)}**</strong></p>` : ""}
        </div>
      </div>

      ${!isLastCard ? `
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
      ` : ''}
    </main>
  </div>
</body>
</html>`;
  return html;
}

/**
 * Super Headline Template - Headline gigante com grid de fundo
 * Pattern: .context/wizard-prompts/superheadline.html
 * @param isLastCard - When true, removes navigation CTA (arraste para o lado, arrow)
 */
function generateSuperHeadlineHtml(
  data: TemplateData,
  colors: TemplateColorOptions,
  isLastCard: boolean = false
): string {
  const headline = data.headline || data.title || data.content || "";

  // Extract colors with defaults
  const { primaryColor = "#a3e635", secondaryColor = "#f97316", backgroundColor = "#ffffff", titleColor = "#1a1a1a", buttonColor = "#8b7cf7", buttonTextColor = "#ffffff" } = colors;

  // Grid color based on background (lighter version)
  const gridColor = titleColor === "#1a1a1a" ? "#e5e5e5" : "rgba(255,255,255,0.1)";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1350">
  <title>Post Super Headline</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1080px; height: 1350px; overflow: hidden; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${backgroundColor};
      color: ${titleColor};
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
      color: ${titleColor};
    }
    .header-brand {
      padding: 10px 28px;
      border: 1.5px solid ${titleColor};
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      color: ${titleColor};
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
      color: ${titleColor};
      letter-spacing: -3px;
    }
    .headline .destaque {
      color: ${secondaryColor};
      font-style: italic;
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
      background: ${buttonColor};
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      color: ${buttonTextColor};
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .cta-arrow {
      width: 56px;
      height: 56px;
      background: ${titleColor === "#1a1a1a" ? "#f0f0f0" : titleColor};
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cta-arrow svg {
      width: 28px;
      height: 28px;
      stroke: ${buttonColor};
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
      color: ${titleColor === "#1a1a1a" ? "#666666" : "rgba(255,255,255,0.6)"};
    }
    .footer-name {
      font-size: 16px;
      font-weight: 700;
      color: ${titleColor};
      text-transform: uppercase;
    }
    .footer-right {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 14px;
      font-weight: 500;
      color: ${titleColor === "#1a1a1a" ? "#666666" : "rgba(255,255,255,0.6)"};
    }
  </style>
</head>
<body>
  <div class="grid-bg"></div>

  <div class="content-wrapper">
    <header class="header">
      <span class="header-year">©2025</span>
      <span class="header-brand">zoryon</span>
      <span class="header-year">©2025</span>
    </header>

    <main class="headline-container">
      <h1 class="headline">${processHeadline(escapeHtml(headline))}</h1>
    </main>

    ${!isLastCard ? `
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
    ` : ''}

    <footer class="footer">
      <div class="footer-left">
        <span class="footer-label">Made By</span>
        <span class="footer-name">Jonas Silva</span>
      </div>
      <div class="footer-right">
        <span>©2025</span>
        <span>@o.jonas.silva</span>
      </div>
    </footer>
  </div>
</body>
</html>`;
  return html;
}

// ============================================================================
// SCREENSHOT ONE API
// ============================================================================>

/**
 * Generates an image using ScreenshotOne HTML template
 */
export async function generateHtmlTemplateImage(
  input: ImageGenerationInput
): Promise<ImageGenerationResult> {
  try {
    if (!SCREENSHOT_ONE_ACCESS_KEY) {
      return {
        success: false,
        error: "ScreenshotOne not configured. Please set SCREENSHOT_ONE_ACCESS_KEY.",
      };
    }

    const { slideNumber, totalSlides, slideContent, slideTitle, config } = input;

    // Determine if this is the last card (no navigation CTA should be shown)
    const isLastCard = totalSlides !== undefined && slideNumber === totalSlides;

    if (!config.htmlOptions) {
      return {
        success: false,
        error: "HTML options not provided in config",
      };
    }

    // Generate HTML content (pass isLastCard to remove navigation CTA)
    const htmlContent = generateTemplateHtml(
      config.htmlOptions.template,
      config.htmlOptions,
      slideContent,
      slideTitle,
      isLastCard
    );

    // ScreenshotOne API requires POST with JSON body
    const screenshotUrl = `${SCREENSHOT_ONE_API}`;

    // Build JSON body for POST request
    const requestBody = {
      access_key: SCREENSHOT_ONE_ACCESS_KEY,
      html: htmlContent,
      viewport_width: 1080,
      viewport_height: 1350,
      format: "png",
      device_scale_factor: 2,
      cache: false,
    };

    // Make POST request to ScreenshotOne with JSON body
    const response = await fetch(screenshotUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SCREENSHOT-ONE] Request failed:", response.status, errorText);
      return {
        success: false,
        error: `ScreenshotOne request failed: ${response.status} ${response.statusText} - ${errorText}`,
      };
    }

    // ScreenshotOne returns the image directly
    const imageBlob = await response.blob();

    // Convert blob to base64 data URL (works universally, unlike blob URLs)
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const imageUrl = `data:image/png;base64,${base64}`;

    const result: GeneratedImage = {
      id: `html-${Date.now()}-${slideNumber}`,
      slideNumber,
      method: "html-template",
      template: config.htmlOptions.template,
      imageUrl,
      config,
      createdAt: new Date(),
    };

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[SCREENSHOT-ONE] Request timed out after", REQUEST_TIMEOUT, "ms");
      return {
        success: false,
        error: "ScreenshotOne request timed out",
      };
    }
    console.error("[SCREENSHOT-ONE] Error generating template image:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Gets the public URL for a ScreenshotOne render
 *
 * NOTE: This function is for screenshotting public URLs (http/https).
 * For HTML content, use generateHtmlTemplateImage() which uses POST request.
 *
 * Updated API parameters:
 * - width/height → viewport_width/viewport_height
 * - quality parameter removed (no longer supported)
 */
export function getScreenshotOneUrl(options: ScreenshotOneRenderOptions): string {
  const params = new URLSearchParams({
    access_key: SCREENSHOT_ONE_ACCESS_KEY || "",
    url: options.url,
    viewport_width: options.width.toString(),
    viewport_height: options.height.toString(),
    format: options.format || "png",
  });

  if (options.deviceScaleFactor) {
    params.set("device_scale_factor", options.deviceScaleFactor.toString());
  }

  return `${SCREENSHOT_ONE_API}?${params.toString()}`;
}

/**
 * Checks if ScreenshotOne service is available
 */
export function isScreenshotOneAvailable(): boolean {
  return !!SCREENSHOT_ONE_ACCESS_KEY;
}

/**
 * Gets available HTML templates (simplified to 4 options)
 * Re-export from image-types.ts for convenience
 */
export { getTemplateLabel, getTemplateDescription, getTemplateRequiredFields } from "./image-types";

/**
 * Gets available HTML templates
 */
export function getAvailableTemplates(): HtmlTemplate[] {
  return [
    "dark-mode",
    "white-mode",
    "twitter",
    "super-headline",
  ];
}

/**
 * Validates HTML template options
 */
export function validateHtmlOptions(options: HtmlTemplateOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!/^#[0-9A-Fa-f]{6}$/.test(options.primaryColor)) {
    errors.push("Primary color must be a valid hex code (e.g., #FF5733)");
  }

  if (options.secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(options.secondaryColor)) {
    errors.push("Secondary color must be a valid hex code (e.g., #FF5733)");
  }

  if (options.backgroundColor && !/^#[0-9A-Fa-f]{6}$/.test(options.backgroundColor)) {
    errors.push("Background color must be a valid hex code (e.g., #FF5733)");
  }

  if (options.textColor && !/^#[0-9A-Fa-f]{6}$/.test(options.textColor)) {
    errors.push("Text color must be a valid hex code (e.g., #FF5733)");
  }

  if (options.opacity !== undefined && (options.opacity < 0 || options.opacity > 1)) {
    errors.push("Opacity must be between 0 and 1");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export types for external use
export type { ImageGenerationResult, GeneratedImage, HtmlTemplateOptions };
