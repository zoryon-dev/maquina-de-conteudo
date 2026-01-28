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
const OPENROUTER_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'contentMachine'
const OPENROUTER_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!OPENROUTER_API_KEY) {
  // API key validation - handled by isAiConfigured()
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
 * Available text models (via OpenRouter)
 */
export const AVAILABLE_TEXT_MODELS = [
  // OpenAI
  'openai/gpt-5-mini',
  'openai/gpt-5.1',
  'openai/gpt-5.2',
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',

  // Anthropic
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-haiku-4.5',

  // Google
  'google/gemini-3-flash-preview',
  'google/gemini-3-pro-preview',

  // xAI
  'x-ai/grok-4.1-fast',
  'x-ai/grok-4',
] as const

/**
 * Available image models (via OpenRouter)
 */
export const AVAILABLE_IMAGE_MODELS = [
  'google/gemini-3-pro-image-preview',
  'openai/gpt-5-image',
  'bytedance-seed/seedream-4.5',
  'black-forest-labs/flux.2-max',
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
  'openai/gpt-5-mini': {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  'openai/gpt-5.1': {
    id: 'openai/gpt-5.1',
    name: 'GPT-5.1',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  'openai/gpt-5.2': {
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  'openai/gpt-4.1': {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  'openai/gpt-4.1-mini': {
    id: 'openai/gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },

  // Anthropic
  'anthropic/claude-sonnet-4.5': {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    type: 'text',
    contextLength: 200000,
  },
  'anthropic/claude-opus-4.5': {
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    type: 'text',
    contextLength: 200000,
  },
  'anthropic/claude-haiku-4.5': {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    type: 'text',
    contextLength: 200000,
  },

  // Google
  'google/gemini-3-flash-preview': {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    type: 'text',
    contextLength: 1000000,
  },
  'google/gemini-3-pro-preview': {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'Google',
    type: 'text',
    contextLength: 1000000,
  },

  // xAI
  'x-ai/grok-4.1-fast': {
    id: 'x-ai/grok-4.1-fast',
    name: 'Grok 4.1 Fast',
    provider: 'xAI',
    type: 'text',
    contextLength: 131072,
  },
  'x-ai/grok-4': {
    id: 'x-ai/grok-4',
    name: 'Grok 4',
    provider: 'xAI',
    type: 'text',
    contextLength: 131072,
  },

  // Images
  'google/gemini-3-pro-image-preview': {
    id: 'google/gemini-3-pro-image-preview',
    name: 'Gemini 3 Pro Image',
    provider: 'Google',
    type: 'image',
  },
  'openai/gpt-5-image': {
    id: 'openai/gpt-5-image',
    name: 'GPT-5 Image',
    provider: 'OpenAI',
    type: 'image',
  },
  'bytedance-seed/seedream-4.5': {
    id: 'bytedance-seed/seedream-4.5',
    name: 'Seedream 4.5',
    provider: 'ByteDance',
    type: 'image',
  },
  'black-forest-labs/flux.2-max': {
    id: 'black-forest-labs/flux.2-max',
    name: 'Flux 2 Max',
    provider: 'Black Forest Labs',
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
