// Helper cross-motor para extrair JSON de respostas LLM que podem vir
// envoltas em code fences ou prefixadas por texto conversacional.

export function extractLooseJSON<T = unknown>(text: string, context: string): T {
  if (!text?.trim()) {
    throw new Error(`[${context}] LLM returned empty response.`)
  }
  const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim()
  const first = cleaned.indexOf("{")
  const last = cleaned.lastIndexOf("}")
  if (first < 0 || last < first) {
    const preview = cleaned.slice(0, 200)
    throw new Error(`[${context}] No JSON object found. Preview: ${preview}`)
  }
  const slice = cleaned.slice(first, last + 1)
  try {
    return JSON.parse(slice) as T
  } catch (err) {
    console.error(`[${context}] JSON parse failed. Raw slice:`, slice.slice(0, 500))
    throw err
  }
}
