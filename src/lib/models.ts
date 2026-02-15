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
 * Velocidade do modelo
 */
export type ModelSpeed = "fast" | "medium" | "slow"

/**
 * Custo relativo do modelo
 */
export type ModelCost = "$" | "$$" | "$$$"

/**
 * Modelo de IA
 */
export interface AIModel {
  /** ID unico do modelo no OpenRouter */
  id: string
  /** Nome de exibicao */
  name: string
  /** Tipo do modelo */
  type: ModelType
  /** Provider do modelo */
  provider: ModelProvider
  /** Descricao curta do modelo */
  description?: string
  /** Velocidade relativa */
  speed?: ModelSpeed
  /** Melhor uso do modelo */
  bestFor?: string
  /** Custo relativo */
  cost?: ModelCost
}

/**
 * Modelos de Texto disponíveis
 * IDs exatos da OpenRouter
 */
export const TEXT_MODELS: AIModel[] = [
  { id: "openai/gpt-5.2", name: "GPT 5.2", type: "text", provider: "openai", description: "Modelo mais avancado da OpenAI", speed: "medium", bestFor: "Textos criativos e analise profunda", cost: "$$$" },
  { id: "openai/gpt-5.1", name: "GPT 5.1", type: "text", provider: "openai", description: "Excelente equilibrio qualidade/velocidade", speed: "medium", bestFor: "Uso geral e conteudo", cost: "$$" },
  { id: "openai/gpt-5.2-chat", name: "GPT 5.2 Chat", type: "text", provider: "openai", description: "Otimizado para conversas fluidas", speed: "fast", bestFor: "Dialogos e brainstorming", cost: "$$" },
  { id: "openai/gpt-4.1", name: "GPT 4.1", type: "text", provider: "openai", description: "Solido e confiavel para producao", speed: "medium", bestFor: "Conteudo estruturado", cost: "$$" },
  { id: "openai/gpt-4.1-mini", name: "GPT 4.1 Mini", type: "text", provider: "openai", description: "Rapido e economico", speed: "fast", bestFor: "Tarefas simples e rascunhos", cost: "$" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview", type: "text", provider: "google", description: "Ultra-rapido do Google", speed: "fast", bestFor: "Respostas rapidas e resumos", cost: "$" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview", type: "text", provider: "google", description: "Modelo premium do Google", speed: "medium", bestFor: "Analise e conteudo longo", cost: "$$" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", type: "text", provider: "anthropic", description: "Equilibrio ideal da Anthropic", speed: "medium", bestFor: "Textos criativos e narrativas", cost: "$$" },
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", type: "text", provider: "anthropic", description: "Mais poderoso da Anthropic", speed: "slow", bestFor: "Conteudo complexo e detalhado", cost: "$$$" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", type: "text", provider: "anthropic", description: "Rapido e eficiente", speed: "fast", bestFor: "Tarefas rapidas e iteracao", cost: "$" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", type: "text", provider: "x-ai", description: "Modelo rapido da xAI", speed: "fast", bestFor: "Conteudo atual e trending", cost: "$$" },
  { id: "x-ai/grok-4-fast", name: "Grok 4 Fast", type: "text", provider: "x-ai", description: "Versatil e rapido", speed: "fast", bestFor: "Uso geral rapido", cost: "$" },
  { id: "deepseek/deepseek-v3.2-speciale", name: "DeepSeek V3.2 Speciale", type: "text", provider: "deepseek", description: "Alta qualidade, custo acessivel", speed: "medium", bestFor: "Conteudo tecnico e analise", cost: "$" },
]

/**
 * Modelos de Imagem disponíveis
 * IDs exatos da OpenRouter
 */
export const IMAGE_MODELS: AIModel[] = [
  { id: "openai/gpt-5-image", name: "GPT 5 Image", type: "image", provider: "openai", description: "Versatil com texto em imagem", speed: "medium", bestFor: "Fotos realisticas e texto em imagem", cost: "$$" },
  { id: "google/gemini-3-pro-image-preview", name: "Gemini 3 Pro Image Preview", type: "image", provider: "google", description: "Otimo para edicao e variacao", speed: "medium", bestFor: "Ilustracoes e edicao de imagem", cost: "$$" },
  { id: "black-forest-labs/flux.2-pro", name: "Flux 2 Pro", type: "image", provider: "black-forest-labs", description: "Alta qualidade profissional", speed: "medium", bestFor: "Fotos realisticas de alta qualidade", cost: "$$" },
  { id: "black-forest-labs/flux.2-flex", name: "Flux 2 Flex", type: "image", provider: "black-forest-labs", description: "Rapido e flexivel", speed: "fast", bestFor: "Iteracao rapida e rascunhos visuais", cost: "$" },
  { id: "sourceful/riverflow-v2-max-preview", name: "Riverflow V2 Max Preview", type: "image", provider: "sourceful", description: "Estilo artistico unico", speed: "slow", bestFor: "Ilustracoes artisticas e estilizadas", cost: "$$" },
  { id: "black-forest-labs/flux.2-max", name: "Flux 2 Max", type: "image", provider: "black-forest-labs", description: "Maximo detalhe e resolucao", speed: "slow", bestFor: "Imagens de altissima qualidade", cost: "$$$" },
  { id: "bytedance-seed/seedream-4.5", name: "Seedream 4.5", type: "image", provider: "bytedance-seed", description: "Rapido e economico", speed: "fast", bestFor: "Geracao rapida em volume", cost: "$" },
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
