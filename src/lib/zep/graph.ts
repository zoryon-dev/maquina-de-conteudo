/**
 * Zep Cloud Graph Operations
 *
 * Funções para adicionar dados de negócio ao knowledge graph do Zep.
 * Isso permite que os agentes recuperem contexto sobre:
 * - Conteúdos criados (library_items)
 * - Posts agendados (scheduled_posts)
 * - Estratégias definidas
 * - Marca e informações do negócio
 *
 * Uso:
 * import { addLibraryItemToGraph, addScheduledPostToGraph } from '@/lib/zep/graph'
 */

import { zepClient } from "./client"
import { isZepConfigured } from "./client"

/**
 * Dados de evento para o knowledge graph
 */
interface GraphEventData {
  user_id: string
  event_type: string
  [key: string]: unknown
}

/**
 * Adiciona um item da biblioteca ao knowledge graph do Zep
 *
 * @param userId - ID do usuário (Clerk user ID)
 * @param item - Item da biblioteca com seus dados
 * @returns Promise<void>
 *
 * @example
 * await addLibraryItemToGraph(userId, {
 *   id: 123,
 *   type: 'text',
 *   title: 'Post sobre produto',
 *   status: 'draft',
 *   categoryId: 5,
 * })
 */
export async function addLibraryItemToGraph(
  userId: string,
  item: {
    id: number
    type: string
    title: string | null
    status: string
    categoryId?: number | null
    content?: string | null
    scheduledFor?: Date | null
  }
): Promise<void> {
  if (!isZepConfigured()) {
    return
  }

  const eventData: GraphEventData = {
    user_id: userId,
    event_type: "content_created",
    item_type: item.type,
    item_status: item.status,
    title: item.title || "",
    library_item_id: item.id.toString(),
    category_id: item.categoryId?.toString(),
    scheduled_for: item.scheduledFor?.toISOString(),
  }

  try {
    await zepClient.graph.add({
      userId,
      type: "json",
      data: JSON.stringify(eventData),
    })
  } catch (error) {
    // Don't throw - graph operations are non-blocking
  }
}

/**
 * Adiciona um post agendado ao knowledge graph do Zep
 *
 * @param userId - ID do usuário (Clerk user ID)
 * @param scheduledPost - Post agendado com seus dados
 * @returns Promise<void>
 *
 * @example
 * await addScheduledPostToGraph(userId, {
 *   id: 456,
 *   libraryItemId: 123,
 *   platform: 'instagram',
 *   scheduledFor: new Date('2024-02-01T10:00:00Z'),
 * })
 */
export async function addScheduledPostToGraph(
  userId: string,
  scheduledPost: {
    id: number
    libraryItemId: number
    scheduledFor: Date
    platform: string
  }
): Promise<void> {
  if (!isZepConfigured()) {
    return
  }

  const eventData: GraphEventData = {
    user_id: userId,
    event_type: "post_scheduled",
    scheduled_for: scheduledPost.scheduledFor.toISOString(),
    platform: scheduledPost.platform,
    scheduled_post_id: scheduledPost.id.toString(),
    library_item_id: scheduledPost.libraryItemId.toString(),
  }

  try {
    await zepClient.graph.add({
      userId,
      type: "json",
      data: JSON.stringify(eventData),
    })
  } catch (error) {
    // Don't throw - graph operations are non-blocking
  }
}

/**
 * Registra uma estratégia de conteúdo no knowledge graph
 *
 * @param userId - ID do usuário (Clerk user ID)
 * @param strategy - Dados da estratégia
 * @returns Promise<void>
 *
 * @example
 * await addStrategyToGraph(userId, {
 *   temaPrincipal: 'Luxo Sustentável',
 *   tomDeVoz: 'Sofisticado e educativo',
 *   publicoAlvo: 'Mulheres 25-45, classe A/B',
 *   plataformas: ['instagram', 'linkedin'],
 * })
 */
export async function addStrategyToGraph(
  userId: string,
  strategy: {
    temaPrincipal: string
    tomDeVoz?: string
    publicoAlvo?: string
    plataformas?: string[]
    validadeInicio?: Date
    validadeFim?: Date | null
  }
): Promise<void> {
  if (!isZepConfigured()) {
    return
  }

  const eventData: GraphEventData = {
    user_id: userId,
    event_type: "strategy_defined",
    tema_principal: strategy.temaPrincipal,
    tom_de_voz: strategy.tomDeVoz,
    publico_alvo: strategy.publicoAlvo,
    plataformas: strategy.plataformas?.join(","),
    validade_inicio: strategy.validadeInicio?.toISOString(),
    validade_fim: strategy.validadeFim?.toISOString(),
  }

  try {
    await zepClient.graph.add({
      userId,
      type: "json",
      data: JSON.stringify(eventData),
    })
  } catch (error) {
    // Non-blocking
  }
}

/**
 * Registra ideia de conteúdo no knowledge graph
 *
 * @param userId - ID do usuário (Clerk user ID)
 * @param idea - Dados da ideia
 * @returns Promise<void>
 */
export async function addIdeaToGraph(
  userId: string,
  idea: {
    descricao: string
    categoria?: string
    prioridade?: "baixa" | "media" | "alta"
  }
): Promise<void> {
  if (!isZepConfigured()) {
    return
  }

  const eventData: GraphEventData = {
    user_id: userId,
    event_type: "idea_created",
    descricao: idea.descricao,
    categoria: idea.categoria,
    prioridade: idea.prioridade,
  }

  try {
    await zepClient.graph.add({
      userId,
      type: "json",
      data: JSON.stringify(eventData),
    })
  } catch (error) {
    // Non-blocking
  }
}

/**
 * Registra informações da marca no knowledge graph
 *
 * @param userId - ID do usuário (Clerk user ID)
 * @param brand - Dados da marca
 * @returns Promise<void>
 */
export async function addBrandToGraph(
  userId: string,
  brand: {
    nome: string
    segmento?: string
    valores?: string[]
  }
): Promise<void> {
  if (!isZepConfigured()) {
    return
  }

  const eventData: GraphEventData = {
    user_id: userId,
    event_type: "brand_registered",
    nome: brand.nome,
    segmento: brand.segmento,
    valores: brand.valores?.join(","),
  }

  try {
    await zepClient.graph.add({
      userId,
      type: "json",
      data: JSON.stringify(eventData),
    })
  } catch (error) {
    // Non-blocking
  }
}

/**
 * Busca eventos no knowledge graph do usuário
 *
 * @param userId - ID do usuário (Clerk user ID)
 * @param eventType - Tipo de evento para filtrar (opcional)
 * @returns Promise<EventData[]>
 */
export async function getGraphEvents(
  _userId: string,
  _eventType?: string
): Promise<GraphEventData[]> {
  if (!isZepConfigured()) {
    return []
  }

  try {
    // Zep Cloud SDK doesn't have a direct "get graph events" method
    // This is a placeholder for when the API becomes available
    // For now, we'll return an empty array
    return []
  } catch (error) {
    return []
  }
}

/**
 * Sincroniza itens existentes da biblioteca para o knowledge graph
 *
 * Use isso para backfill de dados históricos
 *
 * @param userId - ID do usuário (Clerk user ID)
 * @param items - Array de itens da biblioteca
 * @returns Promise<{success: number, failed: number}>
 */
export async function syncLibraryItemsToGraph(
  userId: string,
  items: Array<{
    id: number
    type: string
    title: string | null
    status: string
    categoryId?: number | null
    scheduledFor?: Date | null
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const item of items) {
    try {
      await addLibraryItemToGraph(userId, item)
      success++
    } catch {
      failed++
    }
  }

  return { success, failed }
}

/**
 * Exportações agregadas
 */
export const graphOperations = {
  addLibraryItem: addLibraryItemToGraph,
  addScheduledPost: addScheduledPostToGraph,
  addStrategy: addStrategyToGraph,
  addIdea: addIdeaToGraph,
  addBrand: addBrandToGraph,
  getEvents: getGraphEvents,
  syncLibraryItems: syncLibraryItemsToGraph,
}
