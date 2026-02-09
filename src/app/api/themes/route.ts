/**
 * Themes API Routes
 *
 * GET /api/themes - List all themes for current user
 * POST /api/themes - Create a new theme
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getThemesAction,
  createThemeAction,
  getThemeStatsAction,
} from '@/actions/themes-actions';
import type { ThemeStatus, ThemeSourceType } from '@/db/schema';
import { ensureAuthenticatedUser } from '@/lib/auth/ensure-user';

// ============================================================================
// GET /api/themes
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    await ensureAuthenticatedUser();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ThemeStatus | null;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const sourceType = searchParams.get('sourceType') as ThemeSourceType | null;
    const stats = searchParams.get('stats') === 'true';
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    // New filter params
    const produced = searchParams.get('produced') as 'true' | 'false' | 'all' | null;
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (stats) {
      const themeStats = await getThemeStatsAction();
      return NextResponse.json(themeStats);
    }

    const filters = {
      status: status || undefined,
      category,
      search,
      sourceType: sourceType || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      // New filters
      produced: produced || undefined,
      minScore: minScore ? parseInt(minScore, 10) : undefined,
      maxScore: maxScore ? parseInt(maxScore, 10) : undefined,
      startDate,
      endDate,
    };

    const themes = await getThemesAction(filters);
    return NextResponse.json(themes);
  } catch (error) {
    console.error('[ThemesAPI] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/themes
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    console.log('[ThemesAPI] POST request received');
    const userId = await ensureAuthenticatedUser();
    console.log('[ThemesAPI] User authenticated:', userId);

    const body = await req.json();
    console.log('[ThemesAPI] Request body keys:', Object.keys(body));
    console.log('[ThemesAPI] Source type:', body.sourceType);

    const theme = await createThemeAction(body);
    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    console.error('[ThemesAPI] POST Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to create theme' },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
    },
  });
}
