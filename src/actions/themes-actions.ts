/**
 * Themes Server Actions
 *
 * Server actions for managing themes discovered via Discovery Service.
 * Supports CRUD operations with soft delete.
 */

'use server';

import { ensureAuthenticatedUser } from '@/lib/auth/ensure-user';
import { db } from '@/db';
import { themes, themeTags, tags } from '@/db/schema';
import { eq, and, isNull, isNotNull, desc, ilike, inArray, sql, gte, lte } from 'drizzle-orm';
import type {
  Theme,
  NewTheme,
  ThemeStatus,
  ThemeSourceType,
} from '@/db/schema';
import type { TrendingTopicWithBriefing } from '@/lib/discovery-services/types';

// ============================================================================
// TYPES
// ============================================================================

export interface ThemeFilters {
  status?: ThemeStatus;
  category?: string;
  search?: string;
  sourceType?: ThemeSourceType;
  page?: number;
  limit?: number;
  // New filters
  produced?: 'true' | 'false' | 'all'; // Filter by production status
  minScore?: number; // Minimum engagement score
  maxScore?: number; // Maximum engagement score
  startDate?: string; // ISO date string - filter by createdAt
  endDate?: string; // ISO date string - filter by createdAt
}

export interface PaginatedThemesResponse {
  items: Theme[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateThemeInput {
  title: string;
  theme: string;
  context?: string;
  targetAudience?: string;
  briefing?: string;
  keyPoints?: string[];
  angles?: string[];
  sourceType?: ThemeSourceType;
  sourceUrl?: string;
  sourceData?: Record<string, unknown>;
  engagementScore?: number;
  category?: string;
  tags?: string[];
  status?: ThemeStatus;
}

export interface UpdateThemeInput extends Partial<CreateThemeInput> {
  id: number;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all themes for the current user with pagination support.
 */
export async function getThemesAction(filters?: ThemeFilters): Promise<PaginatedThemesResponse | Theme[]> {
  const userId = await ensureAuthenticatedUser();

  const page = filters?.page || 1;
  const limit = filters?.limit || 12;
  const offset = (page - 1) * limit;

  const conditions = [isNull(themes.deletedAt), eq(themes.userId, userId)];

  if (filters?.status) {
    conditions.push(eq(themes.status, filters.status));
  }

  if (filters?.category) {
    conditions.push(eq(themes.category, filters.category));
  }

  if (filters?.sourceType) {
    conditions.push(eq(themes.sourceType, filters.sourceType));
  }

  if (filters?.search) {
    conditions.push(ilike(themes.title, `%${filters.search}%`));
  }

  // Filter by production status
  if (filters?.produced === 'true') {
    conditions.push(isNotNull(themes.producedAt));
  } else if (filters?.produced === 'false') {
    conditions.push(isNull(themes.producedAt));
  }
  // 'all' or undefined = no filter

  // Filter by engagement score range
  if (filters?.minScore !== undefined) {
    conditions.push(gte(themes.engagementScore, filters.minScore));
  }
  if (filters?.maxScore !== undefined) {
    conditions.push(lte(themes.engagementScore, filters.maxScore));
  }

  // Filter by date range (createdAt)
  if (filters?.startDate) {
    conditions.push(gte(themes.createdAt, new Date(filters.startDate)));
  }
  if (filters?.endDate) {
    // Add 1 day to include the end date fully
    const endDatePlusOne = new Date(filters.endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    conditions.push(lte(themes.createdAt, endDatePlusOne));
  }

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(themes)
    .where(and(...conditions));

  // Get paginated items
  const userThemes = await db
    .select()
    .from(themes)
    .where(and(...conditions))
    .orderBy(desc(themes.createdAt))
    .limit(limit)
    .offset(offset);

  // If pagination parameters are provided, return paginated response
  if (filters?.page || filters?.limit) {
    return {
      items: userThemes,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  // For backward compatibility, return array if no pagination
  return userThemes;
}

/**
 * Get a single theme by ID.
 */
export async function getThemeAction(id: number) {
  const userId = await ensureAuthenticatedUser();

  console.log(`[getThemeAction] Fetching theme ${id}, userId: ${userId}`);

  const [theme] = await db
    .select()
    .from(themes)
    .where(and(eq(themes.id, id), eq(themes.userId, userId), isNull(themes.deletedAt)));

  return theme || null;
}

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create a new theme.
 */
export async function createThemeAction(data: CreateThemeInput) {
  const userId = await ensureAuthenticatedUser();

  console.log('[createThemeAction] Creating theme for user:', userId);
  console.log('[createThemeAction] Theme data:', JSON.stringify({ ...data, sourceData: '[omitted]' }));

  try {
    const [theme] = await db
      .insert(themes)
      .values({
        userId,
        title: data.title,
        theme: data.theme,
        context: data.context,
        targetAudience: data.targetAudience,
        briefing: data.briefing,
        keyPoints: data.keyPoints || [],
        angles: data.angles || [],
        sourceType: data.sourceType || 'manual',
        sourceUrl: data.sourceUrl,
        sourceData: data.sourceData,
        engagementScore: data.engagementScore,
        category: data.category,
        tags: data.tags || [],
        status: data.status || 'active',
      })
      .returning();

    console.log('[createThemeAction] Theme created successfully:', theme.id);
    return theme;
  } catch (error) {
    console.error('[createThemeAction] Database error:', error);
    if (error instanceof Error) {
      console.error('[createThemeAction] Error message:', error.message);
      console.error('[createThemeAction] Error stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Create themes from discovery results.
 */
export async function createThemesFromDiscoveryAction(
  topics: TrendingTopicWithBriefing[]
): Promise<Theme[]> {
  const userId = await ensureAuthenticatedUser();

  if (topics.length === 0) {
    return [];
  }

  const values = topics.map((topic) => ({
    userId,
    title: topic.title,
    theme: topic.theme,
    context: topic.context,
    targetAudience: topic.targetAudience,
    briefing: topic.briefing,
    keyPoints: topic.keyPoints || [],
    angles: topic.suggestedAngles || [],
    sourceType: topic.source.type as ThemeSourceType,
    sourceUrl: topic.source.url,
    sourceData: topic.source.rawData,
    engagementScore: topic.metrics.engagementScore,
    trendingAt: new Date(),
    status: 'active' as ThemeStatus,
  }));

  const createdThemes = await db
    .insert(themes)
    .values(values)
    .returning();

  return createdThemes;
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update an existing theme.
 */
export async function updateThemeAction(data: UpdateThemeInput) {
  const userId = await ensureAuthenticatedUser();

  const { id, ...updateData } = data;

  const [theme] = await db
    .update(themes)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(and(eq(themes.id, id), eq(themes.userId, userId), isNull(themes.deletedAt)))
    .returning();

  return theme || null;
}

/**
 * Update theme status.
 */
export async function updateThemeStatusAction(id: number, status: ThemeStatus) {
  const userId = await ensureAuthenticatedUser();

  const [theme] = await db
    .update(themes)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(themes.id, id), eq(themes.userId, userId), isNull(themes.deletedAt)))
    .returning();

  return theme || null;
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Soft delete a theme.
 */
export async function deleteThemeAction(id: number) {
  const userId = await ensureAuthenticatedUser();

  const [theme] = await db
    .update(themes)
    .set({ deletedAt: new Date() })
    .where(and(eq(themes.id, id), eq(themes.userId, userId), isNull(themes.deletedAt)))
    .returning();

  return { success: !!theme };
}

/**
 * Delete multiple themes.
 */
export async function deleteThemesAction(ids: number[]) {
  const userId = await ensureAuthenticatedUser();

  const result = await db
    .update(themes)
    .set({ deletedAt: new Date() })
    .where(
      and(
        inArray(themes.id, ids),
        eq(themes.userId, userId),
        isNull(themes.deletedAt)
      )
    );

  return { success: true };
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Get theme categories for the current user.
 */
export async function getThemeCategoriesAction() {
  const userId = await ensureAuthenticatedUser();

  const userThemes = await db
    .select({ category: themes.category })
    .from(themes)
    .where(and(eq(themes.userId, userId), isNull(themes.deletedAt)));

  const categories = [
    ...new Set(userThemes.map((t) => t.category).filter(Boolean) as string[]),
  ];

  return categories;
}

/**
 * Get theme statistics.
 */
export async function getThemeStatsAction() {
  const userId = await ensureAuthenticatedUser();

  const userThemes = await db
    .select()
    .from(themes)
    .where(and(eq(themes.userId, userId), isNull(themes.deletedAt)));

  const byStatus = userThemes.reduce(
    (acc, theme) => {
      const status = theme.status ?? 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const bySource = userThemes.reduce(
    (acc, theme) => {
      const sourceType = theme.sourceType ?? 'unknown';
      acc[sourceType] = (acc[sourceType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    total: userThemes.length,
    byStatus,
    bySource,
  };
}
