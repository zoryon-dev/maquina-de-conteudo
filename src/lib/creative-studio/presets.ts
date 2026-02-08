/**
 * Creative Studio — Style Presets
 *
 * 4 presets tribais (baseados na filosofia tribal v4) + 6 presets genéricos.
 * Cada preset injeta um promptPrefix na geração de imagem.
 */

import type { StylePreset } from "./types";

// ========================================
// TRIBAL PRESETS (4 ângulos)
// ========================================

const TRIBAL_PRESETS: StylePreset[] = [
  {
    id: "tribal-herege",
    name: "Herege",
    category: "tribal",
    promptPrefix:
      "Bold, provocative visual that challenges conventional wisdom. High contrast, striking composition. Dark moody atmosphere with a single bright accent. Rebellious energy, counter-cultural aesthetic.",
    negativePrompt: "generic, boring, safe, corporate, stock photo",
    colorPalette: ["#0a0a0f", "#ff3333", "#ffffff", "#1a1a2e"],
    previewGradient: "linear-gradient(135deg, #1a1a2e 0%, #ff3333 100%)",
    textConfig: {
      content: "",
      fontFamily: "Montserrat",
      fontSize: 48,
      fontWeight: "black",
      textColor: "#ffffff",
      textAlign: "left",
      position: "bottom-left",
      textTransform: "uppercase",
    },
  },
  {
    id: "tribal-visionario",
    name: "Visionário",
    category: "tribal",
    promptPrefix:
      "Futuristic, aspirational visual that paints a possible future. Expansive perspective, open spaces, ethereal lighting. Optimistic and dreamy atmosphere with warm golden tones. Visionary, forward-thinking aesthetic.",
    negativePrompt: "pessimistic, dark, depressing, cluttered",
    colorPalette: ["#0a0a0f", "#f59e0b", "#fef3c7", "#1a1a2e"],
    previewGradient: "linear-gradient(135deg, #1a1a2e 0%, #f59e0b 100%)",
    textConfig: {
      content: "",
      fontFamily: "Playfair Display",
      fontSize: 44,
      fontWeight: "bold",
      textColor: "#fef3c7",
      textAlign: "center",
      position: "center",
    },
  },
  {
    id: "tribal-tradutor",
    name: "Tradutor",
    category: "tribal",
    promptPrefix:
      "Clean, educational visual that simplifies complexity. Organized layout, clear visual hierarchy. Infographic style with labeled elements. Modern and accessible aesthetic with cool blue tones.",
    negativePrompt: "chaotic, messy, confusing, overly complex",
    colorPalette: ["#0a0a0f", "#3b82f6", "#e0f2fe", "#1a1a2e"],
    previewGradient: "linear-gradient(135deg, #1a1a2e 0%, #3b82f6 100%)",
    textConfig: {
      content: "",
      fontFamily: "Inter",
      fontSize: 40,
      fontWeight: "bold",
      textColor: "#ffffff",
      textAlign: "left",
      position: "top-left",
    },
  },
  {
    id: "tribal-testemunha",
    name: "Testemunha",
    category: "tribal",
    promptPrefix:
      "Authentic, personal visual that creates identification. Intimate perspective, warm lighting, human-centered composition. Vulnerable and real aesthetic with earthy warm tones. Documentary style.",
    negativePrompt: "artificial, posed, fake, corporate, stock",
    colorPalette: ["#0a0a0f", "#a3e635", "#ecfccb", "#1a1a2e"],
    previewGradient: "linear-gradient(135deg, #1a1a2e 0%, #a3e635 100%)",
    textConfig: {
      content: "",
      fontFamily: "Georgia",
      fontSize: 36,
      fontWeight: "normal",
      textColor: "#ecfccb",
      textAlign: "center",
      position: "bottom-center",
    },
  },
];

// ========================================
// GENERIC PRESETS (6 estilos visuais)
// ========================================

const GENERIC_PRESETS: StylePreset[] = [
  {
    id: "style-minimalista",
    name: "Minimalista",
    category: "generic",
    promptPrefix:
      "Minimalist design, clean composition, lots of white space, simple shapes, muted color palette, elegant and understated.",
    negativePrompt: "cluttered, busy, ornate, heavy textures",
    colorPalette: ["#fafafa", "#333333", "#e5e5e5", "#000000"],
    previewGradient: "linear-gradient(135deg, #fafafa 0%, #333333 100%)",
  },
  {
    id: "style-corporate",
    name: "Corporate",
    category: "generic",
    promptPrefix:
      "Professional corporate design, clean lines, business aesthetic. Navy blue and white color scheme, structured layout, trustworthy and authoritative.",
    negativePrompt: "casual, playful, chaotic, unprofessional",
    colorPalette: ["#1e3a5f", "#ffffff", "#d4e6f1", "#2c3e50"],
    previewGradient: "linear-gradient(135deg, #1e3a5f 0%, #d4e6f1 100%)",
  },
  {
    id: "style-vibrant",
    name: "Vibrante",
    category: "generic",
    promptPrefix:
      "Vibrant, energetic design with bold colors. High saturation, dynamic composition, playful shapes. Eye-catching gradients, modern pop art influence.",
    negativePrompt: "dull, muted, boring, monotone",
    colorPalette: ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3"],
    previewGradient: "linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)",
  },
  {
    id: "style-elegant",
    name: "Elegante",
    category: "generic",
    promptPrefix:
      "Elegant, sophisticated design. Rich dark tones with gold accents. Serif typography feel, luxury brand aesthetic. Refined textures, premium quality.",
    negativePrompt: "cheap, garish, loud, cluttered",
    colorPalette: ["#1a1a1a", "#c9a96e", "#f5f0eb", "#2d2d2d"],
    previewGradient: "linear-gradient(135deg, #1a1a1a 0%, #c9a96e 100%)",
  },
  {
    id: "style-tech",
    name: "Tech",
    category: "generic",
    promptPrefix:
      "Modern tech aesthetic, dark mode design with neon accents. Grid patterns, digital elements, circuit-inspired. Futuristic UI feel, glowing edges.",
    negativePrompt: "organic, natural, rustic, vintage",
    colorPalette: ["#0a0a0f", "#00ff88", "#1a1a2e", "#0088ff"],
    previewGradient: "linear-gradient(135deg, #0a0a0f 0%, #00ff88 50%, #0088ff 100%)",
  },
  {
    id: "style-organic",
    name: "Orgânico",
    category: "generic",
    promptPrefix:
      "Natural, organic aesthetic with earthy tones. Soft textures, botanical elements, hand-drawn feel. Warm and inviting, sustainable brand aesthetic.",
    negativePrompt: "artificial, neon, digital, cold, mechanical",
    colorPalette: ["#2d5016", "#f5e6d3", "#8fbc8f", "#654321"],
    previewGradient: "linear-gradient(135deg, #2d5016 0%, #f5e6d3 100%)",
  },
];

// ========================================
// EXPORTS
// ========================================

export const STYLE_PRESETS: StylePreset[] = [
  ...TRIBAL_PRESETS,
  ...GENERIC_PRESETS,
];

export const TRIBAL_PRESET_IDS = TRIBAL_PRESETS.map((p) => p.id);
export const GENERIC_PRESET_IDS = GENERIC_PRESETS.map((p) => p.id);

export function getPresetById(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find((p) => p.id === id);
}

export function getPresetsByCategory(
  category: "tribal" | "generic"
): StylePreset[] {
  return STYLE_PRESETS.filter((p) => p.category === category);
}
