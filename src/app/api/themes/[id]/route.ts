/**
 * Theme Detail API Routes
 *
 * GET /api/themes/[id] - Get a single theme
 * PATCH /api/themes/[id] - Update a theme
 * DELETE /api/themes/[id] - Soft delete a theme
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getThemeAction,
  updateThemeAction,
  deleteThemeAction,
} from '@/actions/themes-actions';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// GET /api/themes/[id]
// ============================================================================

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const themeId = parseInt(id, 10);

    if (isNaN(themeId)) {
      return NextResponse.json({ error: 'Invalid theme ID' }, { status: 400 });
    }

    const theme = await getThemeAction(themeId);

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json(theme);
  } catch (error) {
    console.error('[ThemeDetailAPI] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch theme' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/themes/[id]
// ============================================================================

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const themeId = parseInt(id, 10);

    if (isNaN(themeId)) {
      return NextResponse.json({ error: 'Invalid theme ID' }, { status: 400 });
    }

    const body = await req.json();
    const updatedTheme = await updateThemeAction({ id: themeId, ...body });

    if (!updatedTheme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTheme);
  } catch (error) {
    console.error('[ThemeDetailAPI] PATCH Error:', error);
    return NextResponse.json(
      { error: 'Failed to update theme' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/themes/[id]
// ============================================================================

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const themeId = parseInt(id, 10);

    if (isNaN(themeId)) {
      return NextResponse.json({ error: 'Invalid theme ID' }, { status: 400 });
    }

    const result = await deleteThemeAction(themeId);

    if (!result.success) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ThemeDetailAPI] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete theme' },
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
      'Allow': 'GET, PATCH, DELETE, OPTIONS',
    },
  });
}
