import { assembleRagContext } from "@/lib/rag/assembler"
import type { RagContextResult } from "@/lib/rag/types"

const BRAND_AUTO_INJECT_OPTIONS = {
  categories: ["brand"] as const,
  threshold: 0.4,
  maxChunks: 5,
  maxTokens: 1500,
  includeSources: true,
} as const

/**
 * Busca auto-inject de contexto da marca (category='brand') pra injeção em
 * toda geração de conteúdo. Budget menor que user RAG pra não dominar contexto.
 *
 * Graceful degradation: retorna null em qualquer erro ou quando não há chunks.
 *
 * @param userId - ID do usuário (Clerk)
 * @param query - Query semântica pra buscar chunks relevantes
 * @param _brandId - Reservado pra futuro multi-brand filtering (hoje não usado)
 */
export async function getBrandAutoRagContext(
  userId: string,
  query: string,
  _brandId?: number
): Promise<RagContextResult | null> {
  try {
    const result = await assembleRagContext(userId, query, {
      ...BRAND_AUTO_INJECT_OPTIONS,
      categories: [...BRAND_AUTO_INJECT_OPTIONS.categories],
    })

    if (!result.context || result.chunksIncluded === 0) return null

    return result
  } catch (err) {
    console.error("[rag/brand-auto-inject] falha:", err)
    return null
  }
}
