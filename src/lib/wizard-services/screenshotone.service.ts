/**
 * ScreenshotOne Service
 *
 * Handles HTML template rendering using ScreenshotOne API.
 * Generates Instagram-sized images (1080x1350px) from customizable templates.
 */

import type {
  HtmlTemplate,
  HtmlTemplateOptions,
  ImageGenerationInput,
  ImageGenerationResult,
  GeneratedImage,
  INSTAGRAM_DIMENSIONS,
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
// HTML TEMPLATES
// ============================================================================

/**
 * Generates HTML content for each template
 */
function generateTemplateHtml(
  template: HtmlTemplate,
  options: HtmlTemplateOptions,
  content: string,
  title?: string
): string {
  const {
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
    overlay = false,
    opacity = 0.9,
  } = options;

  // Default colors if not provided
  const bg = backgroundColor || (template.toLowerCase().includes("light") ? "#ffffff" : "#1a1a2e");
  const text = textColor || (template.toLowerCase().includes("light") ? "#1a1a2e" : "#ffffff");
  const primary = primaryColor || "#a3e635";
  const secondary = secondaryColor || "#6366f1";

  // Base styles
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  `;

  // Container
  const containerStyles = `
    width: 1080px;
    height: 1350px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: ${bg};
    position: relative;
    overflow: hidden;
  `;

  // Content styles
  const contentStyles = `
    max-width: 900px;
    text-align: center;
    z-index: 2;
    padding: 60px 40px;
  `;

  // Title styles
  const titleStyles = `
    font-size: 56px;
    font-weight: 800;
    color: ${primary};
    margin-bottom: 30px;
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: -1px;
  `;

  // Body text styles
  const bodyStyles = `
    font-size: 38px;
    font-weight: 500;
    color: ${text};
    line-height: 1.5;
    opacity: ${opacity};
  `;

  // Generate template-specific HTML
  switch (template) {
    // ==================== GRADIENT TEMPLATES ====================
    case "gradiente-solid":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: linear-gradient(135deg, ${primary}, ${secondary});">
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles}">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    case "gradiente-linear":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: linear-gradient(180deg, ${primary} 0%, ${bg} 50%, ${secondary} 100%);">
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles}">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    case "gradiente-radial":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: radial-gradient(circle at center, ${primary}, ${bg}, ${secondary});">
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles}">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    case "gradiente-mesh":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles}
            background:
              radial-gradient(at 40% 20%, ${primary} 0px, transparent 50%),
              radial-gradient(at 80% 0%, ${secondary} 0px, transparent 50%),
              radial-gradient(at 0% 50%, ${bg} 0px, transparent 50%),
              radial-gradient(at 80% 50%, ${primary} 0px, transparent 50%),
              radial-gradient(at 0% 100%, ${secondary} 0px, transparent 50%),
              radial-gradient(at 80% 100%, ${bg} 0px, transparent 50%);
            background-color: ${bg};
          ">
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles}">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    // ==================== TYPOGRAPHY TEMPLATES ====================
    case "tipografia-bold":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: ${bg};">
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles} font-size: 72px; color: ${primary}; text-shadow: 0 4px 20px rgba(0,0,0,0.3);">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles} font-weight: 700;">${escapeHtml(content)}</div>
            </div>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 200px; background: linear-gradient(to top, ${primary}20, transparent);"></div>
          </div>
        </body>
        </html>
      `;

    case "tipografia-clean":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: ${bg};">
            <div style="${contentStyles} border: 4px solid ${primary}; border-radius: 20px; margin: 40px;">
              ${title ? `<div style="${titleStyles} color: ${primary};">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    case "tipografia-overlay":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles}
            background: linear-gradient(135deg, ${primary}cc, ${secondary}cc),
              url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cdefs%3E%3Cpattern id=\"grid\" width=\"20\" height=\"20\" patternUnits=\"userSpaceOnUse\"%3E%3Cpath d=\"M 20 0 L 0 0 0 20\" fill=\"none\" stroke=\"${encodeURIComponent(text)}30\" stroke-width=\"1\"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\"100\" height=\"100\" fill=\"url(%23grid)\"/%3E%3C/svg%3E');
          ">
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles} color: #ffffff; text-shadow: 0 4px 30px rgba(0,0,0,0.5);">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles} color: #ffffff; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    // ==================== PATTERN TEMPLATES ====================
    case "padrão-geométrico":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: ${bg}; overflow: hidden;">
            <div style="position: absolute; inset: 0; opacity: 0.1;">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="triangles" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                    <polygon points="50,15 90,85 10,85" fill="${primary}"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#triangles)"/>
              </svg>
            </div>
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles}">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    case "padrão-círculos":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: ${bg}; overflow: hidden;">
            <div style="position: absolute; inset: 0; opacity: 0.15;">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="dots" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                    <circle cx="30" cy="30" r="15" fill="${primary}"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)"/>
              </svg>
            </div>
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles}">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    case "padrão-linhas":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: ${bg}; overflow: hidden;">
            <div style="position: absolute; inset: 0; opacity: 0.1;">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="lines" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="40" y2="40" stroke="${primary}" stroke-width="4"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#lines)"/>
              </svg>
            </div>
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles}">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    case "padrão-ondas":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: ${bg}; overflow: hidden;">
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 400px; opacity: 0.2;">
              <svg width="100%" height="400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
                <path fill="${primary}" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
              </svg>
            </div>
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles}">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    // ==================== STYLE TEMPLATES ====================
    case "glassmorphism":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: linear-gradient(135deg, ${bg}, ${primary}40); backdrop-filter: blur(20px);">
            <div style="${contentStyles} background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); border-radius: 30px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
              ${title ? `<div style="${titleStyles} color: ${primary};">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
            <div style="position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: ${primary}; filter: blur(150px); opacity: 0.3; border-radius: 50%;"></div>
            <div style="position: absolute; bottom: -100px; left: -100px; width: 400px; height: 400px; background: ${secondary}; filter: blur(150px); opacity: 0.3; border-radius: 50%;"></div>
          </div>
        </body>
        </html>
      `;

    case "neomorphism":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: ${bg};">
            <div style="${contentStyles} background: ${bg}; border-radius: 30px; box-shadow: 20px 20px 60px ${primary}30, -20px -20px 60px ${secondary}30;">
              ${title ? `<div style="${titleStyles} color: ${primary};">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    case "brutalista":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: ${bg}; border: 16px solid ${primary};">
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles} color: ${primary}; text-transform: uppercase; border-bottom: 8px solid ${secondary};">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles} font-weight: 900;">${escapeHtml(content)}</div>
            </div>
            <div style="position: absolute; top: 40px; right: 40px; width: 80px; height: 80px; background: ${secondary};"></div>
            <div style="position: absolute; bottom: 40px; left: 40px; width: 60px; height: 60px; background: ${primary};"></div>
          </div>
        </body>
        </html>
      `;

    case "neumorphism":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: ${bg};">
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles} color: ${primary}; text-shadow: 2px 2px 4px rgba(0,0,0,0.1), -1px -1px 2px rgba(255,255,255,0.1);">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    // ==================== THEME TEMPLATES ====================
    case "dark-mode":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: #0a0a0f;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${primary}, ${secondary}, ${primary});"></div>
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles} color: ${primary};">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles} color: #ffffff;">${escapeHtml(content)}</div>
            </div>
            <div style="position: absolute; bottom: 4px; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${secondary}, ${primary}, ${secondary});"></div>
          </div>
        </body>
        </html>
      `;

    case "light-mode":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: #ffffff;">
            <div style="position: absolute; top: 40px; right: 40px; width: 120px; height: 120px; background: ${primary}20; border-radius: 50%;"></div>
            <div style="position: absolute; bottom: 60px; left: 60px; width: 80px; height: 80px; background: ${secondary}20; border-radius: 50%;"></div>
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles} color: ${primary};">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles} color: #1a1a2e;">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    case "neon-glow":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: #000000;">
            <div style="position: absolute; inset: 0; background: radial-gradient(ellipse at center, ${primary}40, transparent 70%);"></div>
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles} color: ${primary}; text-shadow: 0 0 20px ${primary}, 0 0 40px ${primary}, 0 0 60px ${primary};">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles} color: #ffffff; text-shadow: 0 0 10px ${secondary}80;">${escapeHtml(content)}</div>
            </div>
            <div style="position: absolute; top: 20px; left: 20px; width: 100%; height: 100%; border: 4px solid ${primary}50; box-shadow: 0 0 20px ${primary}, inset 0 0 20px ${primary}50; pointer-events: none;"></div>
          </div>
        </body>
        </html>
      `;

    case "sunset-vibes":
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles}
            background: linear-gradient(180deg,
              #ff6b35 0%,
              #f7c59f 30%,
              #efefef 50%,
              #1a1a2e 100%);
          ">
            <div style="position: absolute; top: 100px; right: -50px; width: 200px; height: 200px; background: #ffd700; border-radius: 50%; filter: blur(60px); opacity: 0.8;"></div>
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles} color: #ff6b35;">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles} color: #1a1a2e;">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;

    default:
      // Fallback to gradient solid
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div style="${containerStyles} background: linear-gradient(135deg, ${primary}, ${secondary});">
            <div style="${contentStyles}">
              ${title ? `<div style="${titleStyles}">${escapeHtml(title)}</div>` : ""}
              <div style="${bodyStyles}">${escapeHtml(content)}</div>
            </div>
          </div>
        </body>
        </html>
      `;
  }
}

/**
 * Escapes HTML special characters
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

    const { slideNumber, slideContent, slideTitle, config } = input;

    if (!config.htmlOptions) {
      return {
        success: false,
        error: "HTML options not provided in config",
      };
    }

    console.log(`[SCREENSHOT-ONE] Generating template ${config.htmlOptions.template} for slide ${slideNumber}...`);

    // Generate HTML content
    const htmlContent = generateTemplateHtml(
      config.htmlOptions.template,
      config.htmlOptions,
      slideContent,
      slideTitle
    );

    // Build ScreenshotOne URL
    const params = new URLSearchParams({
      access_key: SCREENSHOT_ONE_ACCESS_KEY,
      url: "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent),
      width: "1080",
      height: "1350",
      format: "png",
      quality: "90",
      device_scale_factor: "2",
      cache: "false",
    });

    const screenshotUrl = `${SCREENSHOT_ONE_API}?${params.toString()}`;

    console.log(`[SCREENSHOT-ONE] Requesting image from ScreenshotOne...`);

    // Make request to ScreenshotOne
    const response = await fetch(screenshotUrl, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SCREENSHOT-ONE] Request failed:", response.status, errorText);
      return {
        success: false,
        error: `ScreenshotOne request failed: ${response.status} ${response.statusText}`,
      };
    }

    // ScreenshotOne returns the image directly
    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);

    const result: GeneratedImage = {
      id: `html-${Date.now()}-${slideNumber}`,
      slideNumber,
      method: "html-template",
      template: config.htmlOptions.template,
      imageUrl,
      config,
      createdAt: new Date(),
    };

    console.log(`[SCREENSHOT-ONE] Template image generated successfully`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "ScreenshotOne request timed out",
      };
    }
    console.error("[SCREENSHOT-ONE] Error generating template image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Gets the public URL for a ScreenshotOne render
 */
export function getScreenshotOneUrl(options: ScreenshotOneRenderOptions): string {
  const params = new URLSearchParams({
    access_key: SCREENSHOT_ONE_ACCESS_KEY || "",
    url: options.url,
    width: options.width.toString(),
    height: options.height.toString(),
    format: options.format || "png",
    quality: (options.quality || 90).toString(),
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
 * Gets available HTML templates
 */
export function getAvailableTemplates(): HtmlTemplate[] {
  return [
    "gradiente-solid",
    "gradiente-linear",
    "gradiente-radial",
    "gradiente-mesh",
    "tipografia-bold",
    "tipografia-clean",
    "tipografia-overlay",
    "padrão-geométrico",
    "padrão-círculos",
    "padrão-linhas",
    "padrão-ondas",
    "glassmorphism",
    "neomorphism",
    "brutalista",
    "neumorphism",
    "dark-mode",
    "light-mode",
    "neon-glow",
    "sunset-vibes",
  ];
}

/**
 * Gets a user-friendly label for a template
 */
export function getTemplateLabel(template: HtmlTemplate): string {
  const labels: Record<HtmlTemplate, string> = {
    "gradiente-solid": "Gradido Sólido",
    "gradiente-linear": "Gradiente Linear",
    "gradiente-radial": "Gradiente Radial",
    "gradiente-mesh": "Gradiente Mesh",
    "tipografia-bold": "Tipografia Bold",
    "tipografia-clean": "Tipografia Clean",
    "tipografia-overlay": "Tipografia Overlay",
    "padrão-geométrico": "Padrão Geométrico",
    "padrão-círculos": "Padrão Círculos",
    "padrão-linhas": "Padrão Linhas",
    "padrão-ondas": "Padrão Ondas",
    "glassmorphism": "Glassmorphism",
    "neomorphism": "Neomorphism",
    "brutalista": "Brutalista",
    "neumorphism": "Neumorphism",
    "dark-mode": "Dark Mode",
    "light-mode": "Light Mode",
    "neon-glow": "Neon Glow",
    "sunset-vibes": "Sunset Vibes",
  };
  return labels[template] || template;
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
