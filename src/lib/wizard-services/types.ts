/**
 * Wizard Services Types
 *
 * Shared types for Wizard background job processing.
 * All services use these interfaces for consistent data flow.
 */

// ============================================================================
// NARRATIVE TYPES
// ============================================================================

export type NarrativeAngle = "criativo" | "estrategico" | "dinamico" | "inspirador";

export interface NarrativeOption {
  id: string;
  title: string;
  description: string;
  angle: NarrativeAngle;
  // Extended fields for richer context
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
