/**
 * Zep Cloud Integration - Public API
 *
 * This module exports all public Zep-related functionality.
 * Import from here to access Zep features.
 *
 * @example
 * ```ts
 * import { zepClient, initializeZep, isZepConfigured } from "@/lib/zep"
 * import { createZepSession, getAgentContext, buildAgentSystemPrompt } from "@/lib/zep"
 * import { AGENT_TEMPLATES } from "@/lib/zep"
 * ```
 */

// Client
export { zepClient, withZepRetry, isZepConfigured } from "./client"

// Templates
export { AGENT_TEMPLATES, getTemplateId, TEMPLATE_IDS } from "./templates"

// Ontology
export { ENTITY_TYPES, EDGE_TYPES } from "./ontology"
export type { EntityType, EdgeType } from "./ontology"

// Setup
export {
  initializeZep,
  getZepProjectInfo,
  checkZepHealth,
  type SetupResult,
} from "./setup"

// Session management
export {
  createZepSession,
  addMessageToThread,
  addMessagesToThread,
  getAgentContext,
  switchAgent,
  getThreadHistory,
  deleteThread,
  getUserThreads,
  buildAgentSystemPrompt,
  type ZepSession,
  type SessionResult,
  type MessageMetadata,
} from "./session"
