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
 * Brand auto-inject RAG. Budget menor (1500 tok) pra não dominar o contexto;
 * retorna null em qualquer falha ou zero chunks (graceful degradation).
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
