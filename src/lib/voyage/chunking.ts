/**
 * Document Chunking
 *
 * Functions for splitting documents into smaller chunks
 * suitable for embedding generation and RAG.
 */

import type { DocumentChunk, ChunkOptions } from "./types"
import { estimateTokens } from "./embeddings"

/**
 * Default chunking options
 *
 * Chunks sized for social media content RAG:
 * - Smaller chunks (800-1300) for better retrieval precision
 * - Moderate overlap (150-200) for context continuity
 * - Optimized for short-form content generation
 */
const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxChunkSize: 1000, // tokens (reduced from 4000 for better precision)
  overlap: 150, // tokens (maintain context between chunks)
  preserveParagraphs: true,
  preserveSentences: true,
}

/**
 * Split a document into chunks for embedding
 *
 * @param content - Full document content
 * @param options - Chunking options
 * @returns Array of document chunks
 *
 * @example
 * ```ts
 * const chunks = await splitDocumentIntoChunks(documentContent, {
 *   maxChunkSize: 4000,
 *   overlap: 200
 * })
 * ```
 */
export async function splitDocumentIntoChunks(
  content: string,
  options: ChunkOptions = {}
): Promise<DocumentChunk[]> {
  if (!content || content.trim().length === 0) {
    return []
  }

  const opts = { ...DEFAULT_OPTIONS, ...options }

  // If content fits in one chunk, return it as-is
  const estimatedTokens = estimateTokens(content)
  if (estimatedTokens <= opts.maxChunkSize) {
    return [
      {
        text: content,
        index: 0,
        startPosition: 0,
        endPosition: content.length,
        estimatedTokens,
      },
    ]
  }

  // Preserve paragraphs if enabled
  if (opts.preserveParagraphs) {
    return chunkByParagraph(content, opts)
  }

  // Otherwise, chunk by sentences
  return chunkBySentence(content, opts)
}

/**
 * Split document by paragraphs
 *
 * @param content - Document content
 * @param options - Chunking options
 * @returns Array of chunks
 */
function chunkByParagraph(
  content: string,
  options: Required<ChunkOptions>
): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const paragraphs = content.split(/\n\s*\n/)

  let currentChunk = ""
  let currentIndex = 0
  let startPosition = 0

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim()
    if (!trimmedParagraph) continue

    const testChunk = currentChunk
      ? `${currentChunk}\n\n${trimmedParagraph}`
      : trimmedParagraph

    if (estimateTokens(testChunk) <= options.maxChunkSize) {
      currentChunk = testChunk
    } else {
      // Save current chunk if it exists
      if (currentChunk) {
        chunks.push(createChunk(currentChunk, currentIndex, startPosition))
        currentIndex++
        startPosition += currentChunk.length
      }

      // Check if single paragraph is too large
      if (estimateTokens(trimmedParagraph) > options.maxChunkSize) {
        const subChunks = chunkLargeText(trimmedParagraph, options)
        for (let i = 0; i < subChunks.length; i++) {
          const subChunk = subChunks[i]
          chunks.push(
            createChunk(subChunk.text, currentIndex, startPosition + subChunk.startPosition)
          )
          currentIndex++
        }
        currentChunk = ""
        startPosition += trimmedParagraph.length
      } else {
        currentChunk = trimmedParagraph
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(createChunk(currentChunk, currentIndex, startPosition))
  }

  return addOverlapToChunks(chunks, options.overlap)
}

/**
 * Split document by sentences
 *
 * @param content - Document content
 * @param options - Chunking options
 * @returns Array of chunks
 */
function chunkBySentence(
  content: string,
  options: Required<ChunkOptions>
): DocumentChunk[] {
  const chunks: DocumentChunk[] = []

  // Split by sentence boundaries
  const sentenceEndings = /[.!?]+\s+/g
  const sentences: string[] = []
  let lastIndex = 0
  let match

  while ((match = sentenceEndings.exec(content)) !== null) {
    sentences.push(content.slice(lastIndex, match.index + match[0].length).trim())
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    sentences.push(content.slice(lastIndex).trim())
  }

  // Group sentences into chunks
  let currentChunk = ""
  let currentIndex = 0
  let startPosition = 0

  for (const sentence of sentences) {
    if (!sentence) continue

    const testChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence

    if (estimateTokens(testChunk) <= options.maxChunkSize) {
      currentChunk = testChunk
    } else {
      if (currentChunk) {
        chunks.push(createChunk(currentChunk, currentIndex, startPosition))
        currentIndex++
        startPosition += currentChunk.length
      }
      currentChunk = sentence
    }
  }

  if (currentChunk) {
    chunks.push(createChunk(currentChunk, currentIndex, startPosition))
  }

  return addOverlapToChunks(chunks, options.overlap)
}

/**
 * Chunk text that's too large for a single chunk
 *
 * @param text - Large text to split
 * @param options - Chunking options
 * @returns Array of text chunks
 */
function chunkLargeText(
  text: string,
  options: Required<ChunkOptions>
): Array<{ text: string; startPosition: number; endPosition: number }> {
  const chunks: Array<{ text: string; startPosition: number; endPosition: number }> = []

  // Split by character count approximation
  const approxCharLength = Math.floor((options.maxChunkSize * 4) * 0.9) // 90% to be safe
  let position = 0

  while (position < text.length) {
    let end = Math.min(position + approxCharLength, text.length)

    // Try to end at a sentence boundary
    if (end < text.length) {
      const lastSentenceEnd = text.lastIndexOf(".", end)
      if (lastSentenceEnd > position + approxCharLength * 0.5) {
        end = lastSentenceEnd + 1
      } else {
        // Try to end at a word boundary
        const lastSpace = text.lastIndexOf(" ", end)
        if (lastSpace > position + approxCharLength * 0.5) {
          end = lastSpace + 1
        }
      }
    }

    chunks.push({
      text: text.slice(position, end).trim(),
      startPosition: position,
      endPosition: end,
    })

    position = end
  }

  return chunks
}

/**
 * Add overlap between chunks for context continuity
 *
 * @param chunks - Array of chunks
 * @param overlapTokens - Number of tokens to overlap
 * @returns Chunks with overlap added
 */
function addOverlapToChunks(
  chunks: DocumentChunk[],
  overlapTokens: number
): DocumentChunk[] {
  if (chunks.length <= 1 || overlapTokens <= 0) {
    return chunks
  }

  const overlapChars = Math.floor((overlapTokens * 4))

  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1]
    const currentChunk = chunks[i]

    // Get overlap text from end of previous chunk
    const overlapStart = Math.max(0, prevChunk.text.length - overlapChars)
    const overlapText = prevChunk.text.slice(overlapStart)

    // Prepend overlap to current chunk
    currentChunk.text = overlapText + currentChunk.text
    // Adjust start position
    currentChunk.startPosition -= overlapText.length
  }

  return chunks.map((chunk, index) => ({
    ...chunk,
    index,
    estimatedTokens: estimateTokens(chunk.text),
  }))
}

/**
 * Create a chunk object
 */
function createChunk(
  text: string,
  index: number,
  startPosition: number
): DocumentChunk {
  return {
    text,
    index,
    startPosition,
    endPosition: startPosition + text.length,
    estimatedTokens: estimateTokens(text),
  }
}

/**
 * Reconstruct original text from chunks
 *
 * @param chunks - Array of chunks
 * @param overlap - Overlap used in tokens
 * @returns Reconstructed text
 */
export function reconstructFromChunks(
  chunks: DocumentChunk[],
  overlap = 0
): string {
  if (chunks.length === 0) return ""

  // Sort chunks by index
  const sorted = [...chunks].sort((a, b) => a.index - b.index)

  if (overlap <= 0) {
    return sorted.map((c) => c.text).join("")
  }

  // Remove overlap when reconstructing
  const overlapChars = Math.floor((overlap * 4))
  const result: string[] = []

  for (let i = 0; i < sorted.length; i++) {
    const chunk = sorted[i]
    if (i === 0) {
      result.push(chunk.text)
    } else {
      // Remove overlap from start
      result.push(chunk.text.slice(overlapChars))
    }
  }

  return result.join("")
}

/**
 * Get recommended chunking options for a document category
 *
 * @param category - Document category
 * @returns Chunking options
 *
 * Chunk sizes optimized for social media RAG (800-1300 tokens):
 * - products: Smallest (products need precise details)
 * - brand: Larger (guidelines need context)
 * - audience: Medium (personas benefit from context)
 * - content: Medium (examples vary in length)
 * - competitors: Medium (analysis needs context)
 */
export function getChunkingOptionsForCategory(category: string): ChunkOptions {
  switch (category) {
    case "products":
      // Shorter chunks for product descriptions - need precise retrieval
      return { maxChunkSize: 800, overlap: 100, preserveParagraphs: true }

    case "brand":
      // Larger chunks for brand guidelines - context matters
      return { maxChunkSize: 1300, overlap: 200, preserveParagraphs: true }

    case "audience":
      // Medium chunks for personas
      return { maxChunkSize: 1000, overlap: 150, preserveParagraphs: true }

    case "content":
      // Medium chunks for content examples
      return { maxChunkSize: 1200, overlap: 150, preserveParagraphs: false }

    case "competitors":
      // Medium chunks for competitive analysis
      return { maxChunkSize: 1000, overlap: 150, preserveParagraphs: true }

    default:
      // Default chunking
      return {}
  }
}
