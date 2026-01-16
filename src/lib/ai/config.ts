/**
 * Vercel AI SDK Configuration
 *
 * Central configuration for all AI providers via OpenRouter.
 * Voyage embeddings are kept separate (not using SDK).
 */

import { createOpenAI } from '@ai-sdk/openai'

/**
 * Environment variables validation
 */
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Máquina de Conteúdo'
const OPENROUTER_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!OPENROUTER_API_KEY) {
  if (typeof window === 'undefined') {
    console.warn('OPENROUTER_API_KEY environment variable is not set.')
  }
}

/**
 * OpenRouter provider for Vercel AI SDK
 *
 * Uses OpenRouter as an aggregation layer to access multiple
 * LLM providers (OpenAI, Anthropic, Google, etc.) through a single API.
 *
 * OpenRouter requires these headers for ranking and analytics.
 */
export const openrouter = OPENROUTER_API_KEY
  ? createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: OPENROUTER_API_KEY,
      headers: {
        'X-Title': OPENROUTER_APP_NAME,
        'HTTP-Referer': OPENROUTER_APP_URL,
      },
    })
  : null

/**
 * Default models
 */
export const DEFAULT_TEXT_MODEL = process.env.DEFAULT_TEXT_MODEL || 'openai/gpt-4.1'
export const DEFAULT_IMAGE_MODEL = process.env.DEFAULT_IMAGE_MODEL || 'openai/gpt-5-image'

/**
 * Available text models
 */
export const AVAILABLE_TEXT_MODELS = [
  // OpenAI
  'openai/gpt-4.1',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-3.5-turbo',

  // Anthropic
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3-opus',

  // Google
  'google/gemini-2.5-flash-preview',
  'google/gemini-2.5-pro-preview',

  // Meta
  'meta-llama/llama-3.1-70b-instruct',
  'meta-llama/llama-3.1-405b-instruct',

  // xAI
  'x-ai/grok-2-1212',
] as const

/**
 * Available image models
 */
export const AVAILABLE_IMAGE_MODELS = [
  'openai/gpt-5-image',
  'openai/dall-e-3',
  'google/gemini-2.5-pro-image-preview',
  'black-forest-labs/flux.2-pro',
  'black-forest-labs/flux.2-flex',
] as const

/**
 * Type definitions
 */
export type TextModel = typeof AVAILABLE_TEXT_MODELS[number]
export type ImageModel = typeof AVAILABLE_IMAGE_MODELS[number]
export type AiModel = TextModel | ImageModel

/**
 * Get model info
 */
export interface ModelInfo {
  id: string
  name: string
  provider: string
  type: 'text' | 'image'
  contextLength?: number
}

export const MODELS_INFO: Record<string, ModelInfo> = {
  // OpenAI Text
  'openai/gpt-4.1': {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  'openai/gpt-3.5-turbo': {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 16385,
  },
  'openai/dall-e-3': {
    id: 'openai/dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    type: 'image',
  },

  // Anthropic
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    type: 'text',
    contextLength: 200000,
  },
  'anthropic/claude-3.5-haiku': {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    type: 'text',
    contextLength: 200000,
  },
  'anthropic/claude-3-opus': {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    type: 'text',
    contextLength: 200000,
  },

  // Google
  'google/gemini-2.5-flash-preview': {
    id: 'google/gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    type: 'text',
    contextLength: 1000000,
  },
  'google/gemini-2.5-pro-preview': {
    id: 'google/gemini-2.5-pro-preview',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    type: 'text',
    contextLength: 1000000,
  },
  'google/gemini-2.5-pro-image-preview': {
    id: 'google/gemini-2.5-pro-image-preview',
    name: 'Gemini 2.5 Pro Image',
    provider: 'Google',
    type: 'image',
  },

  // Meta
  'meta-llama/llama-3.1-70b-instruct': {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: 'Meta',
    type: 'text',
    contextLength: 131072,
  },
  'meta-llama/llama-3.1-405b-instruct': {
    id: 'meta-llama/llama-3.1-405b-instruct',
    name: 'Llama 3.1 405B',
    provider: 'Meta',
    type: 'text',
    contextLength: 131072,
  },

  // xAI
  'x-ai/grok-2-1212': {
    id: 'x-ai/grok-2-1212',
    name: 'Grok 2',
    provider: 'xAI',
    type: 'text',
    contextLength: 131072,
  },

  // Flux
  'black-forest-labs/flux.2-pro': {
    id: 'black-forest-labs/flux.2-pro',
    name: 'Flux 2 Pro',
    provider: 'Black Forest Labs',
    type: 'image',
  },
  'black-forest-labs/flux.2-flex': {
    id: 'black-forest-labs/flux.2-flex',
    name: 'Flux 2 Flex',
    provider: 'Black Forest Labs',
    type: 'image',
  },

  // GPT-5 Image
  'openai/gpt-5-image': {
    id: 'openai/gpt-5-image',
    name: 'GPT-5 Image',
    provider: 'OpenAI',
    type: 'image',
  },
}

/**
 * Get model info by ID
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return MODELS_INFO[modelId]
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: string): ModelInfo[] {
  return Object.values(MODELS_INFO).filter(m => m.provider === provider)
}

/**
 * Get models by type
 */
export function getTextModels(): ModelInfo[] {
  return Object.values(MODELS_INFO).filter(m => m.type === 'text')
}

export function getImageModels(): ModelInfo[] {
  return Object.values(MODELS_INFO).filter(m => m.type === 'image')
}

/**
 * Type guards
 */
export function isTextModel(model: string): model is TextModel {
  return AVAILABLE_TEXT_MODELS.includes(model as any)
}

export function isImageModel(model: string): model is ImageModel {
  return AVAILABLE_IMAGE_MODELS.includes(model as any)
}

export function isAvailableModel(model: string): model is AiModel {
  return [...AVAILABLE_TEXT_MODELS, ...AVAILABLE_IMAGE_MODELS].includes(model as any)
}

/**
 * Check if AI is configured
 */
export function isAiConfigured(): boolean {
  return !!(
    process.env.OPENROUTER_API_KEY &&
    process.env.VOYAGE_API_KEY
  )
}
