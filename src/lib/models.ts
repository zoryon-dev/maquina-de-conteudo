/**
 * Modelos de IA disponíveis via OpenRouter
 *
 * @see https://openrouter.ai/models
 *
 * Uso:
 * ```ts
 * import { TEXT_MODELS, IMAGE_MODELS, getModelById } from "@/lib/models"
 *
 * // Listar todos os modelos de texto
 * const textModels = TEXT_MODELS
 *
 * // Encontrar modelo por ID
 * const model = getModelById("openai/gpt-5.2")
 * ```
 */

/**
 * Tipo de modelo
 */
export type ModelType = "text" | "image"

/**
 * Provider do modelo
 */
export type ModelProvider =
  | "openai"
  | "google"
  | "anthropic"
  | "x-ai"
  | "deepseek"
  | "black-forest-labs"
  | "sourceful"
  | "bytedance-seed"

/**
 * Modelo de IA
 */
export interface AIModel {
  /** ID único do modelo no OpenRouter */
  id: string
  /** Nome de exibição */
  name: string
  /** Tipo do modelo */
  type: ModelType
  /** Provider do modelo */
  provider: ModelProvider
}

/**
 * Modelos de Texto disponíveis
 * IDs exatos da OpenRouter
 */
export const TEXT_MODELS: AIModel[] = [
  { id: "openai/gpt-5.2", name: "GPT 5.2", type: "text", provider: "openai" },
  { id: "openai/gpt-5.1", name: "GPT 5.1", type: "text", provider: "openai" },
  { id: "openai/gpt-5.2-chat", name: "GPT 5.2 Chat", type: "text", provider: "openai" },
  { id: "openai/gpt-4.1", name: "GPT 4.1", type: "text", provider: "openai" },
  { id: "openai/gpt-4.1-mini", name: "GPT 4.1 Mini", type: "text", provider: "openai" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview", type: "text", provider: "google" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview", type: "text", provider: "google" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", type: "text", provider: "anthropic" },
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", type: "text", provider: "anthropic" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", type: "text", provider: "anthropic" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", type: "text", provider: "x-ai" },
  { id: "x-ai/grok-4-fast", name: "Grok 4 Fast", type: "text", provider: "x-ai" },
  { id: "deepseek/deepseek-v3.2-speciale", name: "DeepSeek V3.2 Speciale", type: "text", provider: "deepseek" },
]

/**
 * Modelos de Imagem disponíveis
 * IDs exatos da OpenRouter
 */
export const IMAGE_MODELS: AIModel[] = [
  { id: "openai/gpt-5-image", name: "GPT 5 Image", type: "image", provider: "openai" },
  { id: "google/gemini-3-pro-image-preview", name: "Gemini 3 Pro Image Preview", type: "image", provider: "google" },
  { id: "black-forest-labs/flux.2-pro", name: "Flux 2 Pro", type: "image", provider: "black-forest-labs" },
  { id: "black-forest-labs/flux.2-flex", name: "Flux 2 Flex", type: "image", provider: "black-forest-labs" },
  { id: "sourceful/riverflow-v2-max-preview", name: "Riverflow V2 Max Preview", type: "image", provider: "sourceful" },
  { id: "black-forest-labs/flux.2-max", name: "Flux 2 Max", type: "image", provider: "black-forest-labs" },
  { id: "bytedance-seed/seedream-4.5", name: "Seedream 4.5", type: "image", provider: "bytedance-seed" },
]

/**
 * Todos os modelos disponíveis
 */
export const ALL_MODELS = [...TEXT_MODELS, ...IMAGE_MODELS] as const

/**
 * Modelo padrão para texto
 */
export const DEFAULT_TEXT_MODEL = TEXT_MODELS[0]

/**
 * Modelo padrão para imagem
 */
export const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0]

/**
 * Busca um modelo por ID
 */
export function getModelById(id: string): AIModel | undefined {
  return ALL_MODELS.find((model) => model.id === id)
}

/**
 * Retorna models por tipo
 */
export function getModelsByType(type: ModelType): AIModel[] {
  return ALL_MODELS.filter((model) => model.type === type)
}

/**
 * Formata o ID do modelo para exibição
 */
export function formatModelId(id: string): string {
  return id.split("/")[1]?.replace(/-/g, " ") || id
}
