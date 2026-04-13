/**
 * Wizard API Routes
 *
 * POST /api/wizard - Create a new wizard
 * GET /api/wizard - List user's wizards
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { contentWizards, type NewContentWizard } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { WizardStep } from "@/db/schema";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { createWizardSchema } from "./schema";

/**
 * POST /api/wizard
 *
 * Creates a new content wizard for the authenticated user.
 */
export async function POST(request: Request) {
  const userId = await ensureAuthenticatedUser();

  try {
    const body = await request.json();
    const parsed = createWizardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      contentType,
      numberOfSlides,
      model,
      motor,
      motorOptions,
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
    } = parsed.data;

    // Create new wizard with initial step
    // Combine video intention with custom instructions for storage
    const customInstructions = customVideoIntention || videoIntention || undefined;

    const newWizard: NewContentWizard = {
      userId,
      currentStep: "input",
      contentType,
      numberOfSlides,
      model,
      ...(motor ? { motor } : {}),
      ...(motorOptions ? { motorOptions } : {}),
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
    console.error("[Wizard] Error creating wizard:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to create wizard" },
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
  const userId = await ensureAuthenticatedUser();

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
