/**
 * API Route: Refactor Video Script
 *
 * POST /api/wizard/[id]/refactor-script
 *
 * Refactors an existing video script based on user feedback.
 * Called from the content approval step when user clicks "Refatorar".
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contentWizards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { refactorVideoScript } from "@/lib/wizard-services";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";

// ============================================================================
// TYPES
// ============================================================================

interface RefactorScriptRequestBody {
  refactorInstructions: string;
}

interface RefactorScriptResponse {
  success: boolean;
  data?: {
    script: string;
    meta?: {
      duracao_estimada: string;
      angulo_tribal: string;
      valor_central: string;
    };
  };
  error?: string;
}

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { id: wizardId } = await params;

    // Authenticate user
    const dbUserId = await ensureAuthenticatedUser();

    // Parse request body
    const body: RefactorScriptRequestBody = await request.json();

    // Validate required fields
    if (!body.refactorInstructions) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: refactorInstructions",
        },
        { status: 400 }
      );
    }

    // Verify wizard ownership and get wizard data
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(
        and(
          eq(contentWizards.id, parseInt(wizardId)),
          eq(contentWizards.userId, dbUserId)
        )
      )
      .limit(1);

    if (!wizard) {
      return NextResponse.json(
        {
          success: false,
          error: "Wizard not found",
        },
        { status: 404 }
      );
    }

    // Check if wizard has generated content
    if (!wizard.generatedContent) {
      return NextResponse.json(
        {
          success: false,
          error: "No generated content found to refactor",
        },
        { status: 400 }
      );
    }

    // Get selected narrative details
    const selectedNarrative = wizard.narratives?.find(
      (n: any) => n.id === wizard.selectedNarrativeId
    );

    if (!selectedNarrative) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected narrative not found",
        },
        { status: 400 }
      );
    }

    // Prepare refactoring parameters
    const refactorParams = {
      narrativeAngle: selectedNarrative.angle,
      narrativeTitle: selectedNarrative.title,
      narrativeDescription: selectedNarrative.description,
      duration: (wizard as any).videoDuration || "5-10min",
      intention: undefined as string | undefined,
      theme: wizard.theme || undefined,
      targetAudience: wizard.targetAudience || undefined,
      objective: wizard.objective || undefined,
      cta: wizard.cta || undefined,
      negativeTerms: wizard.negativeTerms || undefined,
      ragContext: undefined as string | undefined,
      narrativeHook: (selectedNarrative as any).hook,
      coreBelief: (selectedNarrative as any).core_belief,
      statusQuoChallenged: (selectedNarrative as any).status_quo_challenged,
      selectedTitle: undefined as string | undefined,
      currentScript: typeof wizard.generatedContent === "string"
        ? wizard.generatedContent
        : JSON.stringify(wizard.generatedContent),
      refactorInstructions: body.refactorInstructions,
    };

    // Call refactoring service
    const result = await refactorVideoScript(refactorParams as any);

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to refactor script",
        },
        { status: 500 }
      );
    }

    // Update wizard with refactored script
    const refactoredScript = JSON.stringify(result.data);
    await db
      .update(contentWizards)
      .set({
        generatedContent: refactoredScript,
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, parseInt(wizardId)));

    const response: RefactorScriptResponse = {
      success: true,
      data: {
        script: refactoredScript,
        meta: result.data.meta,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[REFACTOR-SCRIPT] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error refactoring script",
      },
      { status: 500 }
    );
  }
}
