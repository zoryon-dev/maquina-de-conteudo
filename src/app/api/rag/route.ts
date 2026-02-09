/**
 * POST /api/rag
 *
 * API endpoint for RAG (Retrieval Augmented Generation) operations.
 *
 * Provides semantic search and context assembly for LLM prompts.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  assembleRagContext,
  getRelevantDocuments,
  isRagAvailable,
  getRagStats,
  buildRagPrompt,
} from "@/lib/rag/assembler";
import type { RagContextOptions, RagCategory } from "@/lib/rag/types";

/**
 * POST /api/rag
 *
 * Assemble RAG context for a query.
 *
 * Body: {
 *   query: string
 *   categories?: RagCategory[]
 *   threshold?: number
 *   maxChunks?: number
 *   maxTokens?: number
 *   hybrid?: boolean
 * }
 */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      query,
      categories,
      threshold,
      maxChunks,
      maxTokens,
      hybrid = false,
      includeSources = true,
    } = body as {
      query: string;
      categories?: RagCategory[];
      threshold?: number;
      maxChunks?: number;
      maxTokens?: number;
      hybrid?: boolean;
      includeSources?: boolean;
    };

    if (!query || typeof query !== "string" || query.length > 2000) {
      return NextResponse.json({ error: "Query is required and must be at most 2000 characters" }, { status: 400 });
    }

    // Check if RAG is available
    const hasRag = await isRagAvailable(userId, categories);

    if (!hasRag) {
      return NextResponse.json({
        context: "",
        sources: [],
        tokensUsed: 0,
        chunksIncluded: 0,
        truncated: false,
        available: false,
        message: "No embedded documents found. Upload and index some documents first.",
      });
    }

    // Assemble RAG context
    const options: RagContextOptions = {
      categories,
      threshold,
      maxChunks,
      maxTokens,
      includeSources,
      hybrid,
    };

    const result = await assembleRagContext(userId, query, options);

    // Build formatted prompt if requested
    const prompt = includeSources ? buildRagPrompt(result.context, query, result.sources) : null;

    return NextResponse.json({
      ...result,
      prompt,
      available: true,
    });
  } catch (error) {
    console.error("[RAG] POST error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to assemble RAG context" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rag
 *
 * Get RAG statistics or check availability.
 *
 * Query params:
 * - stats: Return RAG statistics for the user
 * - available: Return whether RAG is available
 * - query: Search query for relevant documents (returns docs, not full context)
 */
export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statsParam = searchParams.get("stats");
    const availableParam = searchParams.get("available");
    const query = searchParams.get("query");
    const categoriesParam = searchParams.get("categories");

    // Return RAG stats
    if (statsParam === "true") {
      const stats = await getRagStats(userId);
      return NextResponse.json(stats);
    }

    // Check availability
    if (availableParam === "true") {
      const categories = categoriesParam
        ? (categoriesParam.split(",").filter(Boolean) as RagCategory[])
        : undefined;

      const available = await isRagAvailable(userId, categories);
      return NextResponse.json({ available });
    }

    // Search for relevant documents (lighter than full context)
    if (query && query.length > 2000) {
      return NextResponse.json({ error: "Query must be at most 2000 characters" }, { status: 400 });
    }
    if (query) {
      const categories = categoriesParam
        ? (categoriesParam.split(",").filter(Boolean) as RagCategory[])
        : undefined;

      const docs = await getRelevantDocuments(userId, query, {
        categories,
        maxChunks: 5,
      });

      return NextResponse.json({ query, documents: docs });
    }

    // Default: return basic stats
    const stats = await getRagStats(userId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[RAG] GET error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to get RAG information" },
      { status: 500 }
    );
  }
}
