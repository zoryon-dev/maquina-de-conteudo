/**
 * Queue System Types
 *
 * Sistema de filas usando Upstash Redis para processamento assíncrono.
 */

// Tipos de jobs suportados
export enum JobType {
  AI_TEXT_GENERATION = "ai_text_generation",
  AI_IMAGE_GENERATION = "ai_image_generation",
  CAROUSEL_CREATION = "carousel_creation",
  SCHEDULED_PUBLISH = "scheduled_publish",
  WEB_SCRAPING = "web_scraping",
  DOCUMENT_EMBEDDING = "document_embedding",
  WIZARD_NARRATIVES = "wizard_narratives",
  WIZARD_GENERATION = "wizard_generation",
  WIZARD_IMAGE_GENERATION = "wizard_image_generation",
}

// Status dos jobs
export enum JobStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

// Payload para cada tipo de job
export interface AiTextGenerationPayload {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiImageGenerationPayload {
  prompt: string;
  style?: string;
  aspectRatio?: string;
}

/**
 * Payload for wizard image generation job
 * Generates images for wizard content and syncs to library
 */
export interface WizardImageGenerationPayload {
  /** Wizard ID */
  wizardId: number;
  /** User ID for authorization */
  userId: string;
  /** Image generation configuration */
  config: {
    method: "ai" | "html-template";
    aiOptions?: {
      model: string;
      color: string;
      style: string;
      composition?: string;
      mood?: string;
      customColor?: string;
      additionalContext?: string;
    };
    htmlOptions?: {
      template: string;
      title?: string;
      body?: string;
      cta?: string;
      backgroundColor?: string;
      textColor?: string;
      accentColor?: string;
    };
    coverPosts?: {
      coverMethod: "ai" | "html-template";
      coverAiOptions?: any;
      coverHtmlOptions?: any;
      postsMethod: "ai" | "html-template";
      postsAiOptions?: any;
      postsHtmlOptions?: any;
    };
  };
}

export interface CarouselCreationPayload {
  slides: Array<{
    image?: string;
    text: string;
  }>;
  template?: string;
}

export interface ScheduledPublishPayload {
  libraryItemId: number;
  platform: "instagram" | "twitter" | "linkedin";
}

export interface WebScrapingPayload {
  url: string;
  selector?: string;
}

/**
 * Payload for document embedding job
 * Processes a document through chunking and generates Voyage AI embeddings
 */
export interface DocumentEmbeddingPayload {
  /** Document ID to process */
  documentId: number;
  /** User ID for authorization */
  userId: string;
  /** Optional: force re-embedding even if already embedded */
  force?: boolean;
  /** Optional: specific model to use (default: voyage-4-large) */
  model?: "voyage-4-large" | "voyage-4";
}

/**
 * Payload for wizard narratives job
 * Generates 3 narrative options based on user input
 */
export interface WizardNarrativesPayload {
  /** Wizard ID */
  wizardId: number;
  /** User ID for authorization */
  userId: string;
  /** Content type (carousel, text, etc.) */
  contentType: string;
  /** Reference URL for Firecrawl extraction */
  referenceUrl?: string;
  /** Reference video URL for Apify transcription */
  referenceVideoUrl?: string;
  /** Theme/context from user input */
  theme?: string;
  context?: string;
  objective?: string;
  cta?: string;
  targetAudience?: string;
  /** RAG configuration */
  ragConfig?: {
    mode?: "auto" | "manual";
    threshold?: number;
    maxChunks?: number;
    documents?: number[];
    collections?: number[];
  };
}

/**
 * Payload for wizard generation job
 * Generates final content based on selected narrative
 */
export interface WizardGenerationPayload {
  /** Wizard ID */
  wizardId: number;
  /** User ID for authorization */
  userId: string;
  /** Selected narrative ID */
  selectedNarrativeId: string;
  /** Content type (carousel, text, etc.) */
  contentType: string;
  /** Number of slides (for carousels) */
  numberOfSlides?: number;
  /** AI model to use */
  model?: string;
  /** RAG configuration */
  ragConfig?: {
    mode?: "auto" | "manual";
    threshold?: number;
    maxChunks?: number;
    documents?: number[];
    collections?: number[];
  };
}

// Tipo union de todos os payloads
export type JobPayload =
  | AiTextGenerationPayload
  | AiImageGenerationPayload
  | CarouselCreationPayload
  | ScheduledPublishPayload
  | WebScrapingPayload
  | DocumentEmbeddingPayload
  | WizardNarrativesPayload
  | WizardGenerationPayload
  | WizardImageGenerationPayload;

// Estrutura de um job
export interface QueueJob {
  id: number;
  type: JobType;
  status: JobStatus;
  userId: string;
  payload: JobPayload;
  result?: unknown;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Resposta da API de criação de job
export interface CreateJobResponse {
  jobId: number;
  status: JobStatus;
  message: string;
}

// Erro de processamento de job
export interface JobError {
  code: string;
  message: string;
  details?: unknown;
}
