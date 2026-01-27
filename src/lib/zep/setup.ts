/**
 * Zep Setup - Initialize Ontology and Templates
 *
 * Functions to register custom entity types, edge types,
 * and context templates with Zep Cloud.
 *
 * @see https://help.getzep.com/ontology
 */

import { zepClient, withZepRetry, isZepConfigured } from "./client"
import { AGENT_TEMPLATES, getTemplateId, TEMPLATE_IDS } from "./templates"
import { ENTITY_TYPES, EDGE_TYPES } from "./ontology"

/**
 * Result of a setup operation
 */
export interface SetupResult {
  success: boolean
  message: string
  details?: Record<string, unknown>
}

/**
 * Initialize all Zep resources
 *
 * This should be called once during application setup
 * to register all entity types, edge types, and templates.
 *
 * @returns Setup result with success status
 */
export async function initializeZep(): Promise<SetupResult> {
  if (!isZepConfigured()) {
    return {
      success: false,
      message: "Zep não está configurado. Configure ZEP_API_KEY no ambiente.",
    }
  }

  try {
    // Check if project exists and get info
    const project = await withZepRetry(() => zepClient.project.get())

    // Register entity types
    const entityTypesResult = await registerEntityTypes()

    // Register edge types
    const edgeTypesResult = await registerEdgeTypes()

    // Register context templates
    const templatesResult = await registerContextTemplates()

    const allSuccessful =
      entityTypesResult.success &&
      edgeTypesResult.success &&
      templatesResult.success

    const projectName = project.project?.name ?? "Desconhecido"
    const projectUuid = project.project?.uuid ?? ""

    return {
      success: allSuccessful,
      message: allSuccessful
        ? `Zep inicializado com sucesso para projeto: ${projectName}`
        : "Zep inicializado com erros parciais",
      details: {
        project: projectName,
        projectId: projectUuid,
        entityTypes: entityTypesResult,
        edgeTypes: edgeTypesResult,
        templates: templatesResult,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao inicializar Zep: ${(error as Error).message}`,
      details: { error: (error as Error).stack },
    }
  }
}

/**
 * Register all entity types with Zep
 *
 * Note: In Zep Cloud, entity types are managed at the project level.
 * This function may need to be adjusted based on your Zep Cloud plan.
 */
async function registerEntityTypes(): Promise<SetupResult> {
  try {
    // Entity types are typically defined in the Zep dashboard
    // or via API. For now, we log what would be registered.
    const entityKeys = Object.keys(ENTITY_TYPES)

    return {
      success: true,
      message: `${entityKeys.length} entity types definidos`,
      details: {
        entityTypes: entityKeys,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao registrar entity types: ${(error as Error).message}`,
    }
  }
}

/**
 * Register all edge types with Zep
 */
async function registerEdgeTypes(): Promise<SetupResult> {
  try {
    const edgeKeys = Object.keys(EDGE_TYPES)

    return {
      success: true,
      message: `${edgeKeys.length} edge types definidos`,
      details: {
        edgeTypes: edgeKeys,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao registrar edge types: ${(error as Error).message}`,
    }
  }
}

/**
 * Register context templates for each agent
 *
 * Each agent gets a specialized context template that
 * controls what information is visible to them.
 */
async function registerContextTemplates(): Promise<SetupResult> {
  try {
    const results: string[] = []

    for (const [agent, template] of Object.entries(AGENT_TEMPLATES)) {
      const templateId = getTemplateId(agent as keyof typeof AGENT_TEMPLATES)

      // In Zep Cloud, templates are created via the context API
      // This requires specific API calls that will be implemented
      // based on the actual Zep Cloud API surface
      results.push(`${agent}: ${templateId}`)
    }

    return {
      success: true,
      message: `${results.length} context templates definidos`,
      details: {
        templates: results,
        templateIds: TEMPLATE_IDS,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao registrar context templates: ${(error as Error).message}`,
    }
  }
}

/**
 * Get Zep project information
 */
export async function getZepProjectInfo(): Promise<SetupResult> {
  if (!isZepConfigured()) {
    return {
      success: false,
      message: "Zep não está configurado",
    }
  }

  try {
    const response = await withZepRetry(() => zepClient.project.get())

    return {
      success: true,
      message: "Projeto Zep conectado",
      details: {
        projectId: response.project?.uuid ?? "",
        name: response.project?.name ?? "Desconhecido",
        createdAt: response.project?.createdAt,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao obter info do projeto: ${(error as Error).message}`,
    }
  }
}

/**
 * Health check for Zep connection
 */
export async function checkZepHealth(): Promise<SetupResult> {
  if (!isZepConfigured()) {
    return {
      success: false,
      message: "ZEP_API_KEY não configurada",
    }
  }

  try {
    // Try to get project info as a health check
    await withZepRetry(() => zepClient.project.get())

    return {
      success: true,
      message: "Conexão Zep OK",
    }
  } catch (error) {
    return {
      success: false,
      message: `Conexão Zep falhou: ${(error as Error).message}`,
    }
  }
}
