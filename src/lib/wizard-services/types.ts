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

// ZORYON v4.3 carousel structure - Tribal + Acionável
export interface ZoryonCarousel {
  throughline: string; // Central phrase connecting all slides
  valor_central: string; // What the person learns/gains (v4.3)
  capa: {
    titulo: string;
    subtitulo: string;
  };
  slides: Array<{
    numero: number;
    tipo: "problema" | "conceito" | "passo" | "exemplo" | "erro" | "sintese" | "cta"; // v4.3
    titulo: string;
    corpo: string;
    conexao_proximo: string; // Internal field for coherence (v4.3)
  }>;
  legenda: string;
}

// ============================================================================
// VIDEO SCRIPT v4.3 - TRIBAL + ACIONÁVEL
// ============================================================================

/**
 * Video duration options for v4.3 video script generation
 * Formats: "2-5min" | "5-10min" | "+10min" | "+30min"
 */
export type VideoDuration = "2-5min" | "5-10min" | "+10min" | "+30min";

/**
 * Development section types for v4.3
 */
export type DevelopmentSectionType =
  | "problema"
  | "conceito"
  | "passo"
  | "exemplo"
  | "erro"
  | "contraste"
  | "sintese"
  | "cta";

/**
 * Hook type for v4.3
 */
export type HookType = "reconhecimento" | "provocacao" | "promessa" | "pergunta";

/**
 * Single development section in v4.3 format
 */
export interface DevelopmentSection {
  numero: number;
  tipo: DevelopmentSectionType;
  topico: string; // 4-8 words
  insight: string; // What to TEACH in this section
  exemplo?: string; // Optional concrete example
  transicao: string; // Connection to next section
  nota_gravacao: string; // How to deliver (tone, visuals)
}

/**
 * Video script structure v4.3 - Tribal + Actionable
 * Focused on teaching specific, actionable content
 */
export interface VideoScriptStructured {
  meta: {
    duracao_estimada: string; // "X-Y minutos"
    angulo_tribal: NarrativeAngle;
    valor_central: string; // What person LEARNS/GAINS
  };

  thumbnail: {
    titulo: string; // 4-6 words creating curiosity
    expressao: string; // Facial expression suggestion
    texto_overlay: string; // Short text (max 3 words)
    estilo: string; // Visual description
  };

  roteiro: {
    hook: {
      texto: string; // First words (max 15 words)
      tipo: HookType;
      nota_gravacao: string; // How to deliver
    };

    desenvolvimento: DevelopmentSection[];

    cta: {
      texto: string; // Clear action invitation
      proximo_passo: string; // What specifically to do
      nota_gravacao: string; // How to deliver
    };
  };

  notas_producao: {
    tom_geral: string; // Overall tone description
    ritmo: string; // Pacing suggestion
    visuais_chave: string[]; // Visual suggestions
    musica_mood: string; // Background music style
  };

  caption: string; // Full tribal caption (min 200 words)
  hashtags: string[];
}

/**
 * Legacy v4.0 suggestions (kept for backward compatibility)
 * @deprecated Use thumbnail field in VideoScriptStructured v4.3
 */
export interface ThumbnailSuggestions {
  texto_tela: string; // Short text to overlay (max 4 words)
  expressao: string; // Suggested facial expression
  cores: string; // Suggested color palette
  composicao: string; // Suggested composition
}

/**
 * Generated video content with thumbnail support (v4.0)
 */
export interface VideoContentWithThumbnail {
  type: "video";
  script: VideoScriptStructured; // Structured script (not caption format)
  thumbnail?: {
    imageUrl?: string;
    promptUsed?: string;
    method: "ai" | "html-template" | "none";
    config?: import("./image-types").ImageGenerationConfig;
    suggestions?: ThumbnailSuggestions;
  };
  caption?: string; // Tribal caption (separate from script)
  hashtags?: string[];
  cta?: string;
  metadata: {
    narrativeId: string;
    narrativeTitle: string;
    narrativeAngle: NarrativeAngle;
    model: string;
    generatedAt: string;
    ragUsed: boolean;
    ragSources?: Array<{ id: number; title: string }>;
    // v4.0 video metadata
    duration?: VideoDuration;
    intention?: string;
  };
}

export interface GeneratedContent {
  type: ContentType;
  slides?: GeneratedSlide[];
  caption?: string;
  hashtags?: string[];
  cta?: string;
  script?: string | VideoScriptStructured; // For video type - v3.0 string OR v4.0 structured
  thumbnail?: VideoContentWithThumbnail["thumbnail"]; // Thumbnail support (v4.0)
  metadata: {
    narrativeId: string;
    narrativeTitle: string;
    narrativeAngle: NarrativeAngle;
    model: string;
    generatedAt: string;
    ragUsed: boolean;
    ragSources?: Array<{ id: number; title: string }>;
    // v4.3 carousel metadata
    throughline?: string;
    valor_central?: string;
    // v4.0 video metadata
    duration?: VideoDuration;
    intention?: string;
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
    // Video basic info
    videoId?: string;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    publishedAt?: string;
    duration?: number; // in seconds
    language?: string;

    // Channel info
    channelId?: string;
    channelName?: string;
    subscriberCount?: number;

    // Engagement metrics
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;

    // Transcript details
    isAutoGenerated?: boolean;
    availableLanguages?: string[];
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
  videoDuration?: VideoDuration; // NEW: Video duration for narratives
  customInstructions?: string; // NEW: Custom instructions
}

export interface WizardGenerationInput extends WizardInputData {
  selectedNarrative: NarrativeOption;
  ragContext?: string;
  ragSources?: Array<{ id: number; title: string }>;
  customInstructions?: string;
  // v4.0 video-specific fields
  videoDuration?: VideoDuration;
  videoIntention?: string;
  generateThumbnail?: boolean;
  thumbnailConfig?: import("./image-types").ImageGenerationConfig;
  // Selected video title for thumbnail generation
  selectedVideoTitle?: {
    id: string;
    title: string;
    hook_factor: number;
    reason: string;
  };
}
