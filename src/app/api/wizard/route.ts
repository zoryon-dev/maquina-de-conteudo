/**
 * Wizard API Routes
 *
 * POST /api/wizard - Create a new wizard
 * GET /api/wizard - List user's wizards
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { contentWizards, type NewContentWizard } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { PostType, WizardStep } from "@/db/schema";

/**
 * POST /api/wizard
 *
 * Creates a new content wizard for the authenticated user.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      contentType,
      numberOfSlides,
      model,
      referenceUrl,
      referenceVideoUrl,
      videoDuration,
      videoIntention,
      customVideoIntention,
      theme,
      context,
      objective,
      cta,
      targetAudience,
      ragConfig,
      negativeTerms,
    } = body as {
      contentType?: PostType;
      numberOfSlides?: number;
      model?: string;
      referenceUrl?: string;
      referenceVideoUrl?: string;
      videoDuration?: string;
      videoIntention?: string;
      customVideoIntention?: string;
      theme?: string;
      context?: string;
      objective?: string;
      cta?: string;
      targetAudience?: string;
      ragConfig?: {
        mode?: "auto" | "manual";
        threshold?: number;
        maxChunks?: number;
        documents?: number[];
        collections?: number[];
      };
      negativeTerms?: string[];
    };

    // Create new wizard with initial step
    // Combine video intention with custom instructions for storage
    const customInstructions = customVideoIntention || videoIntention || undefined;

    const newWizard: NewContentWizard = {
      userId,
      currentStep: "input",
      contentType,
      numberOfSlides,
      model,
      referenceUrl,
      referenceVideoUrl,
      videoDuration,
      theme,
      context,
      objective,
      cta,
      targetAudience,
      customInstructions,
      ragConfig,
      negativeTerms,
    };

    const [wizard] = await db
      .insert(contentWizards)
      .values(newWizard)
      .returning();

    return NextResponse.json(wizard, { status: 201 });
  } catch (error) {
    console.error("Error creating wizard:", error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      {
        error: "Failed to create wizard",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wizard
 *
 * Lists all wizards for the authenticated user.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const step = searchParams.get("step") as WizardStep | null;

    // Build query conditions
    const conditions = [eq(contentWizards.userId, userId)];

    if (step) {
      conditions.push(eq(contentWizards.currentStep, step));
    }

    // Query wizards
    const wizards = await db
      .select()
      .from(contentWizards)
      .where(and(...conditions))
      .orderBy(desc(contentWizards.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ wizards, pagination: { limit, offset } });
  } catch (error) {
    console.error("Error listing wizards:", error);
    return NextResponse.json(
      { error: "Failed to list wizards" },
      { status: 500 }
    );
  }
}
