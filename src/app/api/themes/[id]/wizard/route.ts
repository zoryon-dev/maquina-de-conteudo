/**
 * Theme to Wizard Integration API
 *
 * POST /api/themes/[id]/wizard
 *
 * Creates a new Wizard from a saved theme, pre-filling
 * the theme, context, and target audience.
 *
 * For Perplexity themes, uses AI to process the context into
 * a better theme format and extracts the best reference URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { themes, contentWizards } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { Theme } from '@/db/schema';
import { ThemeProcessorService } from '@/lib/discovery-services/perplexity/theme-processor.service';
import {
  processInstagramTheme,
  processYouTubeTheme,
} from '@/lib/discovery-services/social/social-theme-processor.service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// POST /api/themes/[id]/wizard
// ============================================================================

export async function POST(req: NextRequest, context: RouteContext) {
  console.log("[ThemeWizardAPI] POST request received")
  try {
    // Get Clerk user ID - this is the source of truth for authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      console.error("[ThemeWizardAPI] Unauthorized: No clerkUserId")
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("[ThemeWizardAPI] Clerk userId:", clerkUserId)

    // Ensure user exists in DB (for new accounts), but use clerkUserId for all operations
    const { ensureAuthenticatedUser } = await import('@/lib/auth/ensure-user');
    await ensureAuthenticatedUser(); // Just to ensure DB sync happens

    const { id } = await context.params;
    const themeId = parseInt(id, 10);
    console.log("[ThemeWizardAPI] Creating wizard for themeId:", themeId, "using clerkUserId:", clerkUserId)

    if (isNaN(themeId)) {
      return NextResponse.json({ error: 'Invalid theme ID' }, { status: 400 });
    }

    // Fetch the theme - try with clerkUserId first, then try without userId filter
    // (theme might have been created with an old Clerk ID after account recreation)
    console.log("[ThemeWizardAPI] Fetching theme from database...")

    let theme: Theme | undefined;
    [theme] = await db
      .select()
      .from(themes)
      .where(and(eq(themes.id, themeId), eq(themes.userId, clerkUserId), isNull(themes.deletedAt)));

    if (!theme) {
      // Try fetching without userId filter - theme might be from old account
      console.log("[ThemeWizardAPI] Theme not found with clerkUserId, trying without userId filter...")
      const themeResults = await db
        .select()
        .from(themes)
        .where(and(eq(themes.id, themeId), isNull(themes.deletedAt)));
      const themeByAnyUser: Theme | undefined = themeResults[0];

      if (themeByAnyUser) {
        console.log("[ThemeWizardAPI] Found theme but with different userId, updating to clerkUserId:", themeByAnyUser.userId, "->", clerkUserId)
        // Update theme to use current clerkUserId
        const updatedTheme = await db
          .update(themes)
          .set({ userId: clerkUserId, updatedAt: new Date() })
          .where(eq(themes.id, themeId))
          .returning();
        theme = updatedTheme[0];
      } else {
        console.error("[ThemeWizardAPI] Theme not found for id:", themeId)
        return NextResponse.json({ error: 'Theme not found. Please try creating a new wizard.' }, { status: 404 });
      }
    }
    console.log("[ThemeWizardAPI] Theme found:", theme.id, "sourceType:", theme.sourceType)

    // Process theme data based on source type
    let wizardTheme = theme.theme || theme.title;
    let wizardContext = theme.context;
    let wizardObjective = theme.briefing || undefined; // objective not in themes schema
    let referenceUrl = theme.sourceUrl;
    let suggestedContentType: 'image' | 'carousel' | 'video' | 'text' | undefined = undefined;

    // Process theme based on source type using AI
    if (theme.sourceType === 'perplexity') {
      console.log("[ThemeWizardAPI] Processing perplexity theme...")
      try {
        const processor = new ThemeProcessorService();
        const processed = await processor.processPerplexityTheme({
          title: theme.title,
          theme: theme.theme || theme.title,
          context: theme.context || undefined,
          briefing: theme.briefing || undefined,
          keyPoints: theme.keyPoints || undefined,
          angles: theme.angles || undefined,
          sourceUrl: theme.sourceUrl || undefined,
          sourceData: theme.sourceData as Record<string, unknown> | undefined,
        });

        wizardTheme = processed.theme;
        wizardContext = processed.context;
        wizardObjective = processed.objective;
        referenceUrl = processed.referenceUrl;
        console.log("[ThemeWizardAPI] Perplexity theme processed successfully")
      } catch (processorError) {
        console.error('[ThemeWizardAPI] Perplexity processing failed:', processorError);
      }
    } else if (theme.sourceType === 'instagram') {
      try {
        const processed = await processInstagramTheme({
          title: theme.title,
          theme: theme.theme || theme.title,
          context: theme.context || undefined,
          briefing: theme.briefing || undefined,
          keyPoints: theme.keyPoints || undefined,
          angles: theme.angles || undefined,
          sourceUrl: theme.sourceUrl || undefined,
          sourceData: theme.sourceData as Record<string, unknown> | undefined,
        });

        wizardTheme = processed.theme;
        wizardContext = processed.context;
        wizardObjective = processed.objective;
        suggestedContentType = processed.suggestedContentType;
      } catch (processorError) {
        console.error('[ThemeWizardAPI] Instagram processing failed:', processorError);
        suggestedContentType = 'image'; // Default for Instagram
      }
    } else if (theme.sourceType === 'youtube') {
      try {
        const processed = await processYouTubeTheme({
          title: theme.title,
          theme: theme.theme || theme.title,
          context: theme.context || undefined,
          briefing: theme.briefing || undefined,
          keyPoints: theme.keyPoints || undefined,
          angles: theme.angles || undefined,
          sourceUrl: theme.sourceUrl || undefined,
          sourceData: theme.sourceData as Record<string, unknown> | undefined,
        });

        wizardTheme = processed.theme;
        wizardContext = processed.context;
        wizardObjective = processed.objective;
        suggestedContentType = processed.suggestedContentType;
      } catch (processorError) {
        console.error('[ThemeWizardAPI] YouTube processing failed:', processorError);
        suggestedContentType = 'video'; // Default for YouTube
      }
    }

    // Create a new Wizard with processed theme data
    console.log("[ThemeWizardAPI] Creating wizard in database...")
    const [wizard] = await db
      .insert(contentWizards)
      .values({
        userId: clerkUserId,
        currentStep: 'input' as const,
        contentType: suggestedContentType,
        theme: wizardTheme,
        context: wizardContext || undefined,
        referenceUrl: referenceUrl || undefined,
        objective: wizardObjective || undefined,
        targetAudience: theme.targetAudience || undefined,
        // Pre-fill with briefing if available
        extractedContent: theme.briefing
          ? {
              title: theme.title,
              briefing: theme.briefing,
              keyPoints: theme.keyPoints || [],
              angles: theme.angles || [],
            }
          : undefined,
      })
      .returning();

    console.log("[ThemeWizardAPI] Wizard created successfully:", wizard.id)

    return NextResponse.json({
      wizardId: wizard.id,
      theme: {
        id: theme.id,
        title: theme.title,
        theme: theme.theme,
      },
    });
  } catch (error) {
    console.error('[ThemeWizardAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create wizard from theme' },
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
      'Allow': 'POST, OPTIONS',
    },
  });
}
