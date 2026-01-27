/**
 * Agents Module - Public API
 *
 * Exports all agent-related types, configs, and prompts.
 *
 * @example
 * ```ts
 * import { AGENTS, getSystemPrompt, type AgentType } from "@/lib/agents"
 * ```
 */

// Types and configs
export {
  AGENTS,
  AGENT_IDS,
  getAgentByHandle,
  getAgentById,
  type AgentType,
  type AgentConfig,
} from "./types"

// System prompts
export {
  AGENT_SYSTEM_PROMPTS,
  AGENT_WELCOME_MESSAGES,
  getSystemPrompt,
  getAgentDescription,
} from "./prompts"
