/**
 * Zep Cloud Client - Singleton
 *
 * Cliente singleton para interação com Zep Cloud.
 * Inclui retry logic para operações que podem falhar temporariamente.
 *
 * @see https://help.getzep.com/sdk-reference
 */

import { ZepClient } from "@getzep/zep-cloud"

const API_KEY = process.env.ZEP_API_KEY!

if (!API_KEY || API_KEY === "sk_") {
  console.warn(
    "ZEP_API_KEY não configurada. A funcionalidade de memória multi-agent estará desabilitada."
  )
}

/**
 * Cliente Zep singleton
 * Reutilize esta instância em toda a aplicação
 */
export const zepClient = new ZepClient({
  apiKey: API_KEY,
})

/**
 * Wrapper com retry logic para operações Zep
 *
 * Usa exponential backoff para retries em caso de falhas temporárias.
 *
 * @example
 * ```ts
 * const thread = await withZepRetry(() =>
 *   zepClient.thread.get({ threadId })
 * )
 * ```
 */
export async function withZepRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = Math.pow(2, i) * 100
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Verifica se Zep está configurado corretamente
 */
export function isZepConfigured(): boolean {
  return !!(API_KEY && API_KEY !== "sk_")
}
