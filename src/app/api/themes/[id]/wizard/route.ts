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
import { wizardStepEnum } from '@/db/schema';
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

    // Fetch the theme
    const [theme] = await db
      .select()
      .from(themes)
      .where(and(eq(themes.id, themeId), eq(themes.userId, userId), isNull(themes.deletedAt)));

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    // Process theme data based on source type
    let wizardTheme = theme.theme || theme.title;
    let wizardContext = theme.context;
    let wizardObjective = theme.objective;
    let referenceUrl = theme.sourceUrl;
    let suggestedContentType: 'image' | 'carousel' | 'video' | 'text' | undefined = undefined;

    // Process theme based on source type using AI
    if (theme.sourceType === 'perplexity') {
      try {
        const processor = new ThemeProcessorService();
        const processed = await processor.processPerplexityTheme({
          title: theme.title,
          theme: theme.theme || theme.title,
          context: theme.context,
          briefing: theme.briefing,
          keyPoints: theme.keyPoints || undefined,
          angles: theme.angles || undefined,
          sourceUrl: theme.sourceUrl,
          sourceData: theme.sourceData as Record<string, unknown> | undefined,
        });

        wizardTheme = processed.theme;
        wizardContext = processed.context;
        wizardObjective = processed.objective;
        referenceUrl = processed.referenceUrl;
      } catch (processorError) {
        console.error('[ThemeWizardAPI] Perplexity processing failed:', processorError);
      }
    } else if (theme.sourceType === 'instagram') {
      try {
        const processed = await processInstagramTheme({
          title: theme.title,
          theme: theme.theme || theme.title,
          context: theme.context,
          briefing: theme.briefing,
          keyPoints: theme.keyPoints || undefined,
          angles: theme.angles || undefined,
          sourceUrl: theme.sourceUrl,
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
          context: theme.context,
          briefing: theme.briefing,
          keyPoints: theme.keyPoints || undefined,
          angles: theme.angles || undefined,
          sourceUrl: theme.sourceUrl,
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
    const [wizard] = await db
      .insert(contentWizards)
      .values({
        userId,
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
