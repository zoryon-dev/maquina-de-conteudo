/**
 * Creative Studio — Prompt Builder
 *
 * Unifica preset + template + user input + format specs + analysis (Modo 3)
 * em um prompt final para geração de imagem.
 */

import { getPresetById } from "./presets";
import { getTemplateBySlug, fillTemplate } from "./templates";
import { FORMAT_DIMENSIONS } from "./constants";
import type { ImageAnalysis } from "./types";

interface BuildCreativePromptParams {
  userPrompt?: string;
  presetId?: string;
  templateSlug?: string;
  templateVars?: Record<string, string>;
  format?: string;
  analysisData?: ImageAnalysis;
}

interface BuiltPrompt {
  prompt: string;
  negativePrompt?: string;
}

/**
 * Constrói o prompt final para geração de imagem.
 *
 * Ordem de composição:
 * 1. Preset promptPrefix (se selecionado)
 * 2. Template preenchido (se selecionado)
 * 3. User prompt (sempre presente)
 * 4. Analysis data (Modo 3 — Replicar)
 * 5. Format dimensions spec
 * 6. Quality suffix
 */
export function buildCreativePrompt(
  params: BuildCreativePromptParams
): BuiltPrompt {
  const parts: string[] = [];
  let negativePrompt: string | undefined;

  // 1. Preset prefix
  if (params.presetId) {
    const preset = getPresetById(params.presetId);
    if (preset) {
      parts.push(preset.promptPrefix);
      if (preset.negativePrompt) {
        negativePrompt = preset.negativePrompt;
      }
    }
  }

  // 2. Template (with variable substitution)
  if (params.templateSlug && params.templateVars) {
    const template = getTemplateBySlug(params.templateSlug);
    if (template) {
      const filled = fillTemplate(template.promptTemplate, params.templateVars);
      parts.push(filled);
    }
  }

  // 3. User prompt
  if (params.userPrompt?.trim()) {
    parts.push(params.userPrompt.trim());
  }

  // 4. Analysis data (Modo 3)
  if (params.analysisData) {
    const analysis = params.analysisData;
    const analysisLines: string[] = [];

    if (analysis.layout) {
      analysisLines.push(
        `Layout: ${analysis.layout.type} - ${analysis.layout.description}`
      );
    }
    if (analysis.colors) {
      analysisLines.push(
        `Color palette: ${analysis.colors.palette.join(", ")}. Style: ${analysis.colors.style}`
      );
    }
    if (analysis.style) {
      analysisLines.push(
        `Visual style: ${analysis.style.mood}, ${analysis.style.aesthetic}. Keywords: ${analysis.style.keywords.join(", ")}`
      );
    }
    if (analysis.texts && analysis.texts.length > 0) {
      const textDescriptions = analysis.texts
        .map((t) => `${t.hierarchy}: "${t.content}"`)
        .join("; ");
      analysisLines.push(`Text elements: ${textDescriptions}`);
    }

    if (analysisLines.length > 0) {
      parts.push(
        `Replicate the following visual characteristics: ${analysisLines.join(". ")}`
      );
    }
  }

  // 5. Format dimensions
  if (params.format && FORMAT_DIMENSIONS[params.format]) {
    const dim = FORMAT_DIMENSIONS[params.format];
    parts.push(
      `Output dimensions: ${dim.width}x${dim.height} pixels (${dim.aspect} aspect ratio).`
    );
  }

  // 6. Quality suffix
  parts.push(
    "High quality, professional, sharp details, well-composed."
  );

  // If nothing was provided, use a sensible default
  if (parts.length <= 1) {
    parts.unshift("Create a beautiful, professional social media image.");
  }

  return {
    prompt: parts.join("\n\n"),
    negativePrompt,
  };
}
