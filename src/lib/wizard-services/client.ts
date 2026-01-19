/**
 * Wizard Services - Client-Safe Exports
 *
 * This file exports ONLY types and constants that are safe to use in Client Components.
 * No server-side code (database, API calls) is imported here.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * IMPORTANT: This file must ONLY import from type files (.ts files that define types)
 * Do NOT import from service files that access the database or external APIs.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// TYPES (no runtime code, just type definitions)
// ============================================================================

export type {
  NarrativeAngle,
  ContentType,
  ProcessingStep,
} from "./types";

export type {
  NarrativeOption,
  GeneratedSlide,
  GeneratedContent,
  ExtractedContent,
  VideoTranscription,
  SearchResult,
  ProcessingProgress,
  RagConfig,
  RagResult,
  ServiceResult,
  WizardInputData,
  WizardNarrativesInput,
  WizardGenerationInput,
} from "./types";

export type {
  SynthesizedResearch,
  SynthesizerInput,
  ConcreteDataPoint,
  RealExample,
  ErrorRisk,
  FrameworkMetodo,
  Hook,
  ResearchPlannerOutput,
  ResearchQuery,
  QueryIntent,
  QueryLayer,
} from "./synthesis-types";

export type {
  AiImageModel,
  ImageGenerationMethod,
  ColorOption,
  VisualStyle,
  CompositionOption,
  MoodOption,
  AiImageOptions,
  ImageGenerationConfig,
  ImageGenerationInput,
  ImageGenerationResult,
  GeneratedImage,
  PromptGenerationInput,
  PromptGenerationResult,
  HtmlTemplate,
  HtmlTemplateOptions,
  ScreenshotOneConfig,
  ScreenshotOneRenderOptions,
} from "./image-types";

export type {
  WizardMetadata,
  CreateLibraryItemFromWizardOptions,
  CreateLibraryItemResult,
} from "./library-sync";

// ============================================================================
// CONSTANTS (safe values, no side effects)
// ============================================================================

export { INSTAGRAM_DIMENSIONS } from "./image-types";

// AI Image Models list (type-safe, no runtime behavior)
export const AI_IMAGE_MODELS = {
  GEMINI_IMAGE: "google/gemini-3-pro-image-preview",
  OPENAI_IMAGE: "openai/gpt-5-image",
  SEEDREAM: "bytedance-seed/seedream-4.5",
  FLUX: "black-forest-labs/flux.2-max",
} as const;

// Import the type for use in the type guard function
import type { AiImageModel } from "./image-types";

// Type guard for AI image models
export function isAiImageModel(value: string): value is AiImageModel {
  return Object.values(AI_IMAGE_MODELS).includes(value as AiImageModel);
}

// Available color options for UI
export const COLOR_OPTIONS = [
  { value: "vibrante", label: "Vibrante" },
  { value: "pastel", label: "Pastel" },
  { value: "escuro", label: "Escuro" },
  { value: "claro", label: "Claro" },
  { value: "neon", label: "Neon" },
  { value: "terroso", label: "Terroso" },
  { value: "monocromático", label: "Monocromático" },
  { value: "personalizado", label: "Personalizado" },
] as const;

// Available visual styles for UI
export const VISUAL_STYLES = [
  { value: "minimalista", label: "Minimalista" },
  { value: "moderno", label: "Moderno" },
  { value: "vintage", label: "Vintage" },
  { value: "abstrato", label: "Abstrato" },
  { value: "realista", label: "Realista" },
  { value: "cartoon", label: "Cartoon" },
  { value: "aquarela", label: "Aquarela" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "grunge", label: "Grunge" },
  { value: "elegante", label: "Elegante" },
  { value: "lúdico", label: "Lúdico" },
  { value: "profissional", label: "Profissional" },
] as const;

// Available composition options for UI
export const COMPOSITION_OPTIONS = [
  { value: "centralizado", label: "Centralizado" },
  { value: "terços", label: "Regra dos Terços" },
  { value: "simétrico", label: "Simétrico" },
  { value: "assimétrico", label: "Assimétrico" },
  { value: "dinâmico", label: "Dinâmico" },
  { value: "minimal", label: "Minimal" },
] as const;

// Available mood options for UI
export const MOOD_OPTIONS = [
  { value: "energético", label: "Energético" },
  { value: "calmo", label: "Calmo" },
  { value: "misterioso", label: "Misterioso" },
  { value: "alegre", label: "Alegre" },
  { value: "sério", label: "Sério" },
  { value: "dramático", label: "Dramático" },
  { value: "romântico", label: "Romântico" },
  { value: "lúdico", label: "Lúdico" },
  { value: "profissional", label: "Profissional" },
] as const;

// Available HTML templates for UI
export const HTML_TEMPLATES = [
  { value: "gradiente-solid", label: "Gradido Sólido", category: "Gradientes" },
  { value: "gradiente-linear", label: "Gradiente Linear", category: "Gradientes" },
  { value: "gradiente-radial", label: "Gradiente Radial", category: "Gradientes" },
  { value: "gradiente-mesh", label: "Gradiente Mesh", category: "Gradientes" },
  { value: "tipografia-bold", label: "Tipografia Bold", category: "Tipografia" },
  { value: "tipografia-clean", label: "Tipografia Clean", category: "Tipografia" },
  { value: "tipografia-overlay", label: "Tipografia Overlay", category: "Tipografia" },
  { value: "padrão-geométrico", label: "Padrão Geométrico", category: "Padrões" },
  { value: "padrão-círculos", label: "Padrão Círculos", category: "Padrões" },
  { value: "padrão-linhas", label: "Padrão Linhas", category: "Padrões" },
  { value: "padrão-ondas", label: "Padrão Ondas", category: "Padrões" },
  { value: "glassmorphism", label: "Glassmorphism", category: "Estilos" },
  { value: "neomorphism", label: "Neomorphism", category: "Estilos" },
  { value: "brutalista", label: "Brutalista", category: "Estilos" },
  { value: "neumorphism", label: "Neumorphism", category: "Estilos" },
  { value: "dark-mode", label: "Dark Mode", category: "Temas" },
  { value: "light-mode", label: "Light Mode", category: "Temas" },
  { value: "neon-glow", label: "Neon Glow", category: "Temas" },
  { value: "sunset-vibes", label: "Sunset Vibes", category: "Temas" },
] as const;

