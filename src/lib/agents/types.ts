/**
 * Agent Types for Multi-Agent System
 *
 * Defines the 4 specialized agents and their configurations.
 */

/**
 * Available agent types
 */
export type AgentType = "zory" | "estrategista" | "criador" | "calendario"

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  id: AgentType
  name: string
  handle: string
  color: string // HSL color string
  icon: string
  description: string
  shortDescription: string // For UI tooltips
  expertise: string[] // Key areas of expertise
  active: boolean // Whether agent is available in UI
}

/**
 * Agent configurations
 *
 * Color values use HSL for consistent theming:
 * - Zory: Cyan (190°) - Generalist, clear and balanced
 * - Estrategista: Purple (262°) - Deep thinking, wisdom
 * - Criador: Green (142°) - Growth, creativity
 * - Calendario: Blue (199°) - Structure, time
 */
export const AGENTS: Record<AgentType, AgentConfig> = {
  zory: {
    id: "zory",
    name: "Zory",
    handle: "@zory",
    color: "hsl(190, 100%, 50%)",
    icon: "Bot",
    description: "Assistente generalista com visão completa do seu negócio",
    shortDescription: "Assistente generalista",
    expertise: ["roteamento", "visão geral", "conversas gerais"],
    active: true,
  },
  estrategista: {
    id: "estrategista",
    name: "Estrategista",
    handle: "@estrategista",
    color: "hsl(262, 80%, 55%)",
    icon: "Target",
    description: "Especialista em posicionamento de marca, tom de voz e análise de desempenho",
    shortDescription: "Posicionamento e estratégia",
    expertise: ["posicionamento", "tom de voz", "análise de desempenho"],
    active: false,
  },
  criador: {
    id: "criador",
    name: "Criador",
    handle: "@criador",
    color: "hsl(142, 70%, 50%)",
    icon: "Sparkles",
    description: "Especialista em criar conteúdo consistente com a marca e estratégias ativas",
    shortDescription: "Criação de conteúdo",
    expertise: ["posts", "carrosséis", "consistência de marca"],
    active: false,
  },
  calendario: {
    id: "calendario",
    name: "Calendário",
    handle: "@calendario",
    color: "hsl(199, 90%, 50%)",
    icon: "Calendar",
    description: "Especialista em agendamento editorial e gerenciamento de frequência de posts",
    shortDescription: "Agendamento editorial",
    expertise: ["agendamento", "frequência", "calendário"],
    active: false,
  },
}

/**
 * Get agent config by handle
 *
 * @example
 * ```ts
 * const agent = getAgentByHandle("@zory") // Returns AGENTS.zory
 * ```
 */
export function getAgentByHandle(handle: string): AgentConfig | undefined {
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`
  return Object.values(AGENTS).find((agent) => agent.handle === cleanHandle)
}

/**
 * Get agent config by ID
 */
export function getAgentById(id: string): AgentConfig | undefined {
  return AGENTS[id as AgentType]
}

/**
 * List of all agent IDs
 */
export const AGENT_IDS: AgentType[] = Object.keys(AGENTS) as AgentType[]
