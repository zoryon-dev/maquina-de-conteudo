/**
 * Server Actions for Creative Studio
 *
 * Handles generation history, favorites, and stats.
 * All actions are authenticated and protected.
 */

"use server";

import { db } from "@/db";
import { creativeProjects, creativeOutputs } from "@/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";

// ============================================================================
// TYPES
// ============================================================================

export interface HistoryOutput {
  id: number;
  imageUrl: string;
  thumbnailUrl: string | null;
  format: string;
  width: number | null;
  height: number | null;
  generationPrompt: string | null;
  modelUsed: string | null;
  generationTimeMs: number | null;
  isFavorite: boolean | null;
  createdAt: Date;
  projectId: number;
  projectMode: string;
  projectTitle: string | null;
  presetUsed: string | null;
}

export interface HistoryParams {
  page?: number;
  limit?: number;
  model?: string;
  format?: string;
  favoritesOnly?: boolean;
}

export interface HistoryResult {
  outputs: HistoryOutput[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GenerationStats {
  totalGenerations: number;
  totalFavorites: number;
  byModel: Array<{ model: string; count: number }>;
  byFormat: Array<{ format: string; count: number }>;
}

// ============================================================================
// GENERATION HISTORY
// ============================================================================

/**
 * Fetch generation history with pagination and filters.
 */
export async function getGenerationHistoryAction(
  params: HistoryParams = {}
): Promise<HistoryResult> {
  let userId: string;
  try {
    userId = await ensureAuthenticatedUser();
  } catch {
    return { outputs: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  try {
    // Build WHERE conditions
    const conditions = [eq(creativeProjects.userId, userId)];

    if (params.favoritesOnly) {
      conditions.push(eq(creativeOutputs.isFavorite, true));
    }

    // Use raw SQL for optional filters
    const modelFilter = params.model
      ? sql`${creativeOutputs.modelUsed} = ${params.model}`
      : sql`1=1`;

    const formatFilter = params.format
      ? sql`${creativeOutputs.format} = ${params.format}`
      : sql`1=1`;

    // Count total
    const countResult = await db
      .select({ total: count() })
      .from(creativeOutputs)
      .innerJoin(
        creativeProjects,
        eq(creativeOutputs.projectId, creativeProjects.id)
      )
      .where(
        and(
          eq(creativeProjects.userId, userId),
          params.favoritesOnly ? eq(creativeOutputs.isFavorite, true) : undefined,
          params.model ? eq(creativeOutputs.modelUsed, params.model) : undefined,
          params.format ? eq(creativeOutputs.format, params.format) : undefined
        )
      );

    const total = countResult[0]?.total ?? 0;

    // Fetch outputs with project data joined
    const outputs = await db
      .select({
        id: creativeOutputs.id,
        imageUrl: creativeOutputs.imageUrl,
        thumbnailUrl: creativeOutputs.thumbnailUrl,
        format: creativeOutputs.format,
        width: creativeOutputs.width,
        height: creativeOutputs.height,
        generationPrompt: creativeOutputs.generationPrompt,
        modelUsed: creativeOutputs.modelUsed,
        generationTimeMs: creativeOutputs.generationTimeMs,
        isFavorite: creativeOutputs.isFavorite,
        createdAt: creativeOutputs.createdAt,
        projectId: creativeProjects.id,
        projectMode: creativeProjects.mode,
        projectTitle: creativeProjects.title,
        presetUsed: creativeProjects.presetUsed,
      })
      .from(creativeOutputs)
      .innerJoin(
        creativeProjects,
        eq(creativeOutputs.projectId, creativeProjects.id)
      )
      .where(
        and(
          eq(creativeProjects.userId, userId),
          params.favoritesOnly ? eq(creativeOutputs.isFavorite, true) : undefined,
          params.model ? eq(creativeOutputs.modelUsed, params.model) : undefined,
          params.format ? eq(creativeOutputs.format, params.format) : undefined
        )
      )
      .orderBy(desc(creativeOutputs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      outputs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[CreativeStudio:History] Error:", error);
    return { outputs: [], total: 0, page, limit, totalPages: 0 };
  }
}

// ============================================================================
// TOGGLE FAVORITE
// ============================================================================

/**
 * Toggle favorite status on an output.
 */
export async function toggleFavoriteAction(
  outputId: number
): Promise<{ success: boolean; isFavorite: boolean }> {
  let userId: string;
  try {
    userId = await ensureAuthenticatedUser();
  } catch {
    return { success: false, isFavorite: false };
  }

  try {
    // Verify ownership via project
    const outputResult = await db
      .select({
        id: creativeOutputs.id,
        isFavorite: creativeOutputs.isFavorite,
        projectUserId: creativeProjects.userId,
      })
      .from(creativeOutputs)
      .innerJoin(
        creativeProjects,
        eq(creativeOutputs.projectId, creativeProjects.id)
      )
      .where(
        and(
          eq(creativeOutputs.id, outputId),
          eq(creativeProjects.userId, userId)
        )
      )
      .limit(1);

    const output = outputResult[0];
    if (!output) {
      return { success: false, isFavorite: false };
    }

    const newFavorite = !output.isFavorite;

    await db
      .update(creativeOutputs)
      .set({ isFavorite: newFavorite })
      .where(eq(creativeOutputs.id, outputId));

    return { success: true, isFavorite: newFavorite };
  } catch (error) {
    console.error("[CreativeStudio:ToggleFavorite] Error:", error);
    return { success: false, isFavorite: false };
  }
}

// ============================================================================
// GENERATION STATS
// ============================================================================

/**
 * Get generation statistics for the current user.
 */
export async function getGenerationStatsAction(): Promise<GenerationStats> {
  let userId: string;
  try {
    userId = await ensureAuthenticatedUser();
  } catch {
    return { totalGenerations: 0, totalFavorites: 0, byModel: [], byFormat: [] };
  }

  try {
    // Total generations
    const totalResult = await db
      .select({ total: count() })
      .from(creativeOutputs)
      .innerJoin(
        creativeProjects,
        eq(creativeOutputs.projectId, creativeProjects.id)
      )
      .where(eq(creativeProjects.userId, userId));

    const totalGenerations = totalResult[0]?.total ?? 0;

    // Total favorites
    const favResult = await db
      .select({ total: count() })
      .from(creativeOutputs)
      .innerJoin(
        creativeProjects,
        eq(creativeOutputs.projectId, creativeProjects.id)
      )
      .where(
        and(
          eq(creativeProjects.userId, userId),
          eq(creativeOutputs.isFavorite, true)
        )
      );

    const totalFavorites = favResult[0]?.total ?? 0;

    // By model
    const byModelResult = await db
      .select({
        model: creativeOutputs.modelUsed,
        count: count(),
      })
      .from(creativeOutputs)
      .innerJoin(
        creativeProjects,
        eq(creativeOutputs.projectId, creativeProjects.id)
      )
      .where(eq(creativeProjects.userId, userId))
      .groupBy(creativeOutputs.modelUsed);

    const byModel = byModelResult
      .filter((r) => r.model)
      .map((r) => ({ model: r.model!, count: r.count }));

    // By format
    const byFormatResult = await db
      .select({
        format: creativeOutputs.format,
        count: count(),
      })
      .from(creativeOutputs)
      .innerJoin(
        creativeProjects,
        eq(creativeOutputs.projectId, creativeProjects.id)
      )
      .where(eq(creativeProjects.userId, userId))
      .groupBy(creativeOutputs.format);

    const byFormat = byFormatResult.map((r) => ({
      format: r.format,
      count: r.count,
    }));

    return { totalGenerations, totalFavorites, byModel, byFormat };
  } catch (error) {
    console.error("[CreativeStudio:Stats] Error:", error);
    return { totalGenerations: 0, totalFavorites: 0, byModel: [], byFormat: [] };
  }
}
