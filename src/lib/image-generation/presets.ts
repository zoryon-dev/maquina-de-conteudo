/**
 * Image Generation Presets
 *
 * Presets pré-configurados para casos de uso comuns no Instagram.
 * O usuário pode selecionar um preset e depois ajustar campos individuais.
 */

import type { ImagePreset, ImagePromptFields } from "@/types/image-generation";

// ============================================================================
// PRESETS DISPONÍVEIS
// ============================================================================

/**
 * Presets para casos de uso comuns no Instagram
 */
export const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: "hook-poderoso",
    name: "Hook Poderoso",
    description: "Imagem de alto impacto para capturar atenção imediata",
    icon: "⚡",
    defaults: {
      shotType: "close-up",
      lighting: "dramatic",
      colorPalette: "vibrant",
      photoStyle: "bold",
      mood: "intense, powerful, commanding attention",
    },
  },
  {
    id: "lifestyle-aspiracional",
    name: "Lifestyle Aspiracional",
    description: "Cenas do dia-a-dia que inspiram e conectam",
    icon: "✨",
    defaults: {
      shotType: "medium",
      lighting: "golden-hour",
      colorPalette: "warm",
      photoStyle: "lifestyle",
      mood: "aspirational, successful, relatable",
    },
  },
  {
    id: "profissional-confiavel",
    name: "Profissional Confiável",
    description: "Imagem clean para posicionamento profissional",
    icon: "💼",
    defaults: {
      shotType: "medium",
      lighting: "studio",
      colorPalette: "cool",
      photoStyle: "corporate",
      mood: "trustworthy, professional, competent",
    },
  },
  {
    id: "minimalista-elegante",
    name: "Minimalista Elegante",
    description: "Menos é mais - foco total no essencial",
    icon: "◻️",
    defaults: {
      shotType: "detail",
      lighting: "soft",
      colorPalette: "muted",
      photoStyle: "minimal",
      mood: "calm, sophisticated, intentional",
    },
  },
  {
    id: "stories-dinamico",
    name: "Stories Dinâmico",
    description: "Vertical, vibrante, feito para Stories e Reels",
    icon: "📱",
    defaults: {
      aspectRatio: "9:16",
      shotType: "medium",
      lighting: "natural",
      colorPalette: "vibrant",
      photoStyle: "candid",
      mood: "energetic, authentic, in-the-moment",
    },
  },
  {
    id: "flatlay-produtos",
    name: "Flat Lay Produtos",
    description: "Vista de cima para mostrar produtos ou objetos",
    icon: "🎯",
    defaults: {
      shotType: "overhead",
      lighting: "soft",
      colorPalette: "pastel",
      photoStyle: "minimal",
      mood: "organized, aesthetic, curated",
    },
  },
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Retorna um preset pelo ID
 */
export function getPresetById(id: string): ImagePreset | undefined {
  return IMAGE_PRESETS.find((preset) => preset.id === id);
}

/**
 * Aplica um preset aos campos, mesclando com valores existentes
 */
export function applyPreset(
  currentFields: Partial<ImagePromptFields>,
  presetId: string
): Partial<ImagePromptFields> {
  const preset = getPresetById(presetId);
  if (!preset) return currentFields;

  return {
    ...currentFields,
    ...preset.defaults,
  };
}

/**
 * Retorna todos os presets disponíveis
 */
export function getAllPresets(): ImagePreset[] {
  return IMAGE_PRESETS;
}
