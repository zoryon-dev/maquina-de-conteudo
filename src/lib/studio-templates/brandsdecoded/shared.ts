/**
 * BrandsDecoded - Shared helpers and palette
 *
 * Elementos fixos (accent bar, brand bar, progress bar) e paleta
 * editorial-jornalística usada pelos templates BD (bd-capa, bd-dark,
 * bd-light, bd-cta).
 *
 * Referências:
 * - temporaria/brandformat/brandsdecoded-design-system.md
 * - temporaria/brandformat/brandsdecoded-principios-design.md
 *
 * Paleta padrão (warm primary -> BG off-white, DB near-black warm).
 * Pode ser sobrescrita via `slide.style.primaryColor`.
 */

import type { StudioHeader } from "../types";
import { escapeHtml } from "../types";

/**
 * Paleta derivada (warm primary default).
 * Conforme §6 do principios-design.md:
 *   warm primary -> LB #F5F2EF, DB #0F0D0C
 *   cool primary -> LB #F0F2F5, DB #0C0D10
 *
 * Mantemos a paleta "warm" como padrão, pois é a mais comum em
 * conteúdos editoriais (tom Folha de S.Paulo).
 */
export interface BDPalette {
  /** --P  — cor primária (accent) */
  primary: string;
  /** --PL — primary light (dark slides highlight) */
  primaryLight: string;
  /** --PD — primary dark */
  primaryDark: string;
  /** --LB — light background */
  lightBg: string;
  /** --LR — light border */
  lightBorder: string;
  /** --DB — dark background */
  darkBg: string;
}

/**
 * Mistura uma cor hex com branco (clarear) ou preto (escurecer)
 * num fator 0..1. Usado para derivar --PL e --PD.
 */
function mixHex(hex: string, target: "white" | "black", amount: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const tr = target === "white" ? 255 : 0;
  const tg = target === "white" ? 255 : 0;
  const tb = target === "white" ? 255 : 0;
  const nr = Math.round(r + (tr - r) * amount);
  const ng = Math.round(g + (tg - g) * amount);
  const nb = Math.round(b + (tb - b) * amount);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

/**
 * Valida se o valor é um hex de 3 ou 6 dígitos (com ou sem `#`).
 * Rejeita "rgb(...)", names CSS ("red"), hex de 4/5/8 chars, etc.
 */
function isValidHex(value: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(value) || /^#?[0-9a-fA-F]{3}$/.test(value);
}

/**
 * Gera paleta BD completa a partir da cor primária.
 * Tema warm (default) — backgrounds com temperatura quente.
 *
 * Validação: se `primaryColor` não for hex válido (ex.: "rgb(...)", "red",
 * string vazia), loga warning e cai no default #C8321E. Sem esse guard,
 * `mixHex` chamaria `parseInt` em pedaços inválidos e retornaria NaN, gerando
 * CSS quebrado tipo `#NaNNaNNaN`.
 */
export function buildBDPalette(primaryColor: string = "#C8321E"): BDPalette {
  let primary = primaryColor;
  if (!isValidHex(primary)) {
    console.warn("[bd-palette] invalid hex, falling back to default:", primary);
    primary = "#C8321E";
  }

  // Normaliza para forma #RRGGBB (expande 3 chars → 6).
  const normalized = primary.startsWith("#") ? primary : `#${primary}`;
  const full = normalized.length === 4
    ? `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
    : normalized;

  return {
    primary: full,
    primaryLight: mixHex(full, "white", 0.2),
    primaryDark: mixHex(full, "black", 0.3),
    lightBg: "#F5F2EF",
    lightBorder: "#E8E3DE",
    darkBg: "#0F0D0C",
  };
}

/**
 * CSS comum a todos os templates BD (fixed elements + tokens).
 * Usa Barlow Condensed para headlines e Plus Jakarta Sans para corpo.
 * Fontes carregadas via Google Fonts (mantém consistência com restante
 * dos templates do projeto, que também usam <link>).
 */
export function bdSharedCss(palette: BDPalette, bg: "light" | "dark" | "grad"): string {
  const gradient = `linear-gradient(165deg, ${palette.primaryDark} 0%, ${palette.primary} 50%, ${palette.primaryLight} 100%)`;

  const progTrackBg = bg === "light"
    ? "rgba(0,0,0,0.08)"
    : bg === "dark"
      ? "rgba(255,255,255,0.10)"
      : "rgba(255,255,255,0.15)";
  const progFillBg = bg === "light"
    ? palette.primary
    : bg === "dark"
      ? "#fff"
      : "rgba(255,255,255,0.6)";
  const progNumColor = bg === "light"
    ? "rgba(0,0,0,0.35)"
    : bg === "dark"
      ? "rgba(255,255,255,0.35)"
      : "rgba(255,255,255,0.45)";
  const brandColor = bg === "light"
    ? "rgba(15,13,12,0.45)"
    : bg === "dark"
      ? "rgba(255,255,255,0.45)"
      : "rgba(255,255,255,0.55)";
  const accentBg = bg === "grad" ? "rgba(255,255,255,0.18)" : gradient;

  return `
    :root {
      --P: ${palette.primary};
      --PL: ${palette.primaryLight};
      --PD: ${palette.primaryDark};
      --LB: ${palette.lightBg};
      --LR: ${palette.lightBorder};
      --DB: ${palette.darkBg};
      --G: ${gradient};
      --F-HEAD: 'Barlow Condensed', 'Oswald', 'Inter', sans-serif;
      --F-BODY: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; word-break: break-word; overflow-wrap: break-word; }

    html, body {
      width: 1080px;
      height: 1350px;
      overflow: hidden;
      font-family: var(--F-BODY);
    }

    .slide {
      position: relative;
      width: 1080px;
      height: 1350px;
      overflow: hidden;
    }

    /* Accent bar no topo */
    .accent-bar {
      position: absolute; top: 0; left: 0; right: 0;
      height: 7px; z-index: 30;
      background: ${accentBg};
    }

    /* Brand bar */
    .brand-bar {
      position: absolute; top: 7px; left: 0; right: 0;
      padding: 32px 56px 0;
      display: flex; justify-content: space-between; align-items: center;
      z-index: 20;
      font-family: var(--F-BODY);
      font-size: 14px; font-weight: 700;
      letter-spacing: 1.5px; text-transform: uppercase;
      color: ${brandColor};
    }

    /* Progress bar */
    .prog {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 0 56px 30px; z-index: 20;
      display: flex; align-items: center; gap: 16px;
      font-family: var(--F-BODY);
    }
    .prog-track {
      flex: 1; height: 3px; border-radius: 2px; overflow: hidden;
      background: ${progTrackBg};
    }
    .prog-fill {
      height: 100%; border-radius: 2px;
      background: ${progFillBg};
    }
    .prog-num {
      font-size: 15px; font-weight: 600;
      color: ${progNumColor};
    }

    /* Tag/label */
    .tag {
      font-family: var(--F-BODY);
      font-size: 13px; font-weight: 700;
      letter-spacing: 3px; text-transform: uppercase;
      margin-bottom: 24px;
      color: ${bg === "light" ? palette.primary : bg === "dark" ? palette.primaryLight : "rgba(255,255,255,0.55)"};
    }

    /* Content area — alinhado à base */
    .content {
      position: absolute;
      top: 110px; left: 56px; right: 56px; bottom: 90px;
      display: flex; flex-direction: column;
      justify-content: flex-end;
      padding-bottom: 20px;
      z-index: 5;
    }
  `;
}

/**
 * HTML do Brand Bar (header topo: categoria à esquerda, brand à direita).
 */
export function bdBrandBarHtml(header: StudioHeader): string {
  return `<div class="brand-bar">
    <span>${escapeHtml(header.category || header.brand)}</span>
    <span>${escapeHtml(header.brand)}</span>
  </div>`;
}

/**
 * HTML do Progress Bar (rodapé com barra de progresso + numeração).
 */
export function bdProgressBarHtml(slideIndex: number, totalSlides: number): string {
  const current = Math.max(1, slideIndex + 1);
  const total = Math.max(current, totalSlides);
  const pct = Math.min(100, Math.round((current / total) * 100));
  return `<div class="prog">
    <span class="prog-num">${String(current).padStart(2, "0")}</span>
    <div class="prog-track"><div class="prog-fill" style="width: ${pct}%"></div></div>
    <span class="prog-num">${String(total).padStart(2, "0")}</span>
  </div>`;
}

/**
 * Processa **texto** como <em> (accent color) e __texto__ como <strong>.
 * Aplicado em headlines e body text dos templates BD.
 */
export function bdProcessInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<em>$1</em>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>');
}

/** Fonts preconnect + link (Google Fonts: Barlow Condensed + Plus Jakarta Sans) */
export const BD_FONTS_HEAD = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
`;
