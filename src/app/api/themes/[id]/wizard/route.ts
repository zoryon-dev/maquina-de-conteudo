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

    // Ensure user exists in DB and use resolved DB userId for operations
    const { ensureAuthenticatedUser } = await import('@/lib/auth/ensure-user');
    const userId = await ensureAuthenticatedUser();
    console.log("[ThemeWizardAPI] Resolved DB userId:", userId)

    const { id } = await context.params;
    const themeId = parseInt(id, 10);
    console.log("[ThemeWizardAPI] Creating wizard for themeId:", themeId, "using userId:", userId)

    if (isNaN(themeId)) {
      return NextResponse.json({ error: 'Invalid theme ID' }, { status: 400 });
    }

    // Fetch the theme for the resolved DB userId
    console.log("[ThemeWizardAPI] Fetching theme from database...")

    let theme: Theme | undefined;
    [theme] = await db
      .select()
      .from(themes)
      .where(and(eq(themes.id, themeId), eq(themes.userId, userId), isNull(themes.deletedAt)));

    if (!theme) {
      console.error("[ThemeWizardAPI] Theme not found for id:", themeId, "userId:", userId)
      return NextResponse.json({ error: 'Theme not found. Please try creating a new wizard.' }, { status: 404 });
    }
    console.log("[ThemeWizardAPI] Theme found:", theme.id, "sourceType:", theme.sourceType)

    // Process theme data based on source type
    let wizardTheme = theme.theme || theme.title;
    let wizardContext = theme.context;
    let wizardObjective = theme.briefing || undefined; // objective not in themes schema
    let referenceUrl = theme.sourceUrl;
    let suggestedContentType: 'image' | 'carousel' | 'video' | 'text' | undefined = undefined;
    let processingWarnings: string[] = [];

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
        const errorMsg = processorError instanceof Error ? processorError.message : String(processorError);
        console.error('[ThemeWizardAPI] Perplexity processing failed:', errorMsg);
        processingWarnings.push(`AI processing failed: ${errorMsg}. Using original theme data.`);
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
        const errorMsg = processorError instanceof Error ? processorError.message : String(processorError);
        console.error('[ThemeWizardAPI] Instagram processing failed:', errorMsg);
        suggestedContentType = 'image'; // Default for Instagram
        processingWarnings.push(`Instagram processing failed: ${errorMsg}. Using default content type 'image'.`);
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
        const errorMsg = processorError instanceof Error ? processorError.message : String(processorError);
        console.error('[ThemeWizardAPI] YouTube processing failed:', errorMsg);
        suggestedContentType = 'video'; // Default for YouTube
        processingWarnings.push(`YouTube processing failed: ${errorMsg}. Using default content type 'video'.`);
      }
    }

    // Validate required fields before insertion
    if (!wizardTheme || wizardTheme.trim().length === 0) {
      console.error("[ThemeWizardAPI] Validation failed: wizardTheme is empty")
      return NextResponse.json(
        { error: 'Theme is required to create wizard' },
        { status: 400 }
      );
    }

    // Create a new Wizard with processed theme data
    console.log("[ThemeWizardAPI] Creating wizard in database...")
    console.log("[ThemeWizardAPI] Wizard data:", {
      userId: userId,
      contentType: suggestedContentType,
      theme: wizardTheme,
      hasContext: !!wizardContext,
      hasObjective: !!wizardObjective,
      hasReferenceUrl: !!referenceUrl,
      hasTargetAudience: !!theme.targetAudience,
      hasExtractedContent: !!theme.briefing,
      themeId: themeId,
    })

    try {
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
          // Link to origin theme for tracking
          themeId: themeId,
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

      // NOTE: Theme producedAt is now set when content is actually saved to library
      // (in save-carousel route) to avoid race condition where wizard creation
      // succeeds but content generation fails, leaving theme incorrectly marked as produced.

      return NextResponse.json({
        wizardId: wizard.id,
        theme: {
          id: theme.id,
          title: theme.title,
          theme: theme.theme,
        },
        // Include warnings so frontend can display them to user
        warnings: processingWarnings.length > 0 ? processingWarnings : undefined,
      });
    } catch (dbError) {
      console.error('[ThemeWizardAPI] Database error creating wizard:', dbError);
      if (dbError instanceof Error) {
        console.error('[ThemeWizardAPI] Error message:', dbError.message);
        console.error('[ThemeWizardAPI] Error stack:', dbError.stack);
        
        // Check for common database errors
        if (dbError.message.includes('violates foreign key constraint')) {
          return NextResponse.json(
            { error: 'Invalid user or theme reference' },
            { status: 400 }
          );
        }
        if (dbError.message.includes('violates not-null constraint')) {
          return NextResponse.json(
            { error: 'Missing required fields for wizard creation' },
            { status: 400 }
          );
        }
      }
      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('[ThemeWizardAPI] Unexpected error:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('[ThemeWizardAPI] Error name:', error.name);
      console.error('[ThemeWizardAPI] Error message:', error.message);
      console.error('[ThemeWizardAPI] Error stack:', error.stack);
    } else {
      console.error('[ThemeWizardAPI] Unknown error type:', typeof error, error);
    }

    // Return more detailed error in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment && error instanceof Error
      ? `Failed to create wizard from theme: ${error.message}`
      : 'Failed to create wizard from theme';

    return NextResponse.json(
      { error: errorMessage },
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
