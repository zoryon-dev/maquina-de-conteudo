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

// Tipo union de todos os payloads
export type JobPayload =
  | AiTextGenerationPayload
  | AiImageGenerationPayload
  | CarouselCreationPayload
  | ScheduledPublishPayload
  | WebScrapingPayload;

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
