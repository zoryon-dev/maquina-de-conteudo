/**
 * Wizard Services Types
 *
 * Shared types for Wizard background job processing.
 * All services use these interfaces for consistent data flow.
 */

// ============================================================================
// NARRATIVE TYPES
// ============================================================================

/**
 * Tribal narrative angles based on Seth Godin's "Tribes" philosophy.
 * Each angle represents a different leadership approach for content creation.
 */
export type NarrativeAngle = "herege" | "visionario" | "tradutor" | "testemunha";

export interface NarrativeOption {
  id: string;
  title: string;
  description: string;
  angle: NarrativeAngle;
  // Tribal narrative fields (v4)
  hook?: string; // First sentence that creates immediate recognition
  core_belief?: string; // The shared belief that unites creator and audience
  status_quo_challenged?: string; // What common sense this content questions
  // Extended fields for richer context (legacy, still supported)
  viewpoint?: string;
  whyUse?: string;
  impact?: string;
  tone?: string;
  keywords?: string[];
  differentiation?: string;
  risks?: string;
}

// ============================================================================
// CONTENT TYPES
// ============================================================================

export type ContentType = "text" | "image" | "carousel" | "video";

export interface GeneratedSlide {
  title: string;
  content: string;
  imagePrompt?: string;
  imageUrl?: string; // URL of the generated image (populated after image generation)
  // ZORYON v3.0 additional fields
  numero?: number;
  acao?: string;
}

// ZORYON v4.0 carousel structure
export interface ZoryonCarousel {
  throughline: string; // Central phrase connecting all slides
  capa: {
    titulo: string;
    subtitulo: string;
  };
  slides: Array<{
    numero: number;
    titulo: string;
    corpo: string;
    acao: string;
  }>;
  legenda: string;
}

export interface GeneratedContent {
  type: ContentType;
  slides?: GeneratedSlide[];
  caption?: string;
  hashtags?: string[];
  cta?: string;
  script?: string; // For video type
  metadata: {
    narrativeId: string;
    narrativeTitle: string;
    narrativeAngle: NarrativeAngle;
    model: string;
    generatedAt: string;
    ragUsed: boolean;
    ragSources?: Array<{ id: number; title: string }>;
  };
}

// ============================================================================
// EXTRACTION TYPES
// ============================================================================

export interface ExtractedContent {
  sourceUrl: string;
  content: string;
  metadata?: {
    title?: string;
    author?: string;
    publishDate?: string;
  };
}

export interface VideoTranscription {
  sourceUrl: string;
  transcription: string;
  metadata?: {
    title?: string;
    duration?: number;
    thumbnailUrl?: string;
  };
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchResult {
  query: string;
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

// ============================================================================
// PROGRESS TYPES
// ============================================================================

export type ProcessingStep = "extraction" | "transcription" | "research" | "narratives" | "rag" | "generation";

export interface ProcessingProgress {
  step: ProcessingStep;
  message: string;
  percentage: number;
}

// ============================================================================
// RAG TYPES
// ============================================================================

export interface RagConfig {
  mode?: "auto" | "manual";
  threshold?: number;
  maxChunks?: number;
  documents?: number[];
  collections?: number[];
}

export interface RagResult {
  context: string;
  sources: Array<{ id: number; title: string }>;
  tokensUsed: number;
  chunksIncluded: number;
}

// ============================================================================
// SERVICE RESULT TYPES
// ============================================================================

export type ServiceResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

// ============================================================================
// WIZARD INPUT TYPES
// ============================================================================

export interface WizardInputData {
  contentType: ContentType;
  numberOfSlides?: number;
  model?: string;
  theme?: string;
  context?: string;
  objective?: string;
  cta?: string;
  targetAudience?: string;
  negativeTerms?: string[];
}

export interface WizardNarrativesInput extends WizardInputData {
  referenceUrl?: string;
  referenceVideoUrl?: string;
  extractedContent?: string;
  researchData?: string;
}

export interface WizardGenerationInput extends WizardInputData {
  selectedNarrative: NarrativeOption;
  ragContext?: string;
  ragSources?: Array<{ id: number; title: string }>;
  customInstructions?: string;
}
