/**
 * Wizard [id] API Route
 *
 * GET /api/wizard/[id] - Get a wizard by ID
 * PATCH /api/wizard/[id] - Update a wizard
 * DELETE /api/wizard/[id] - Delete/abandon a wizard
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { contentWizards, type NewContentWizard } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { WizardStep } from "@/db/schema";

/**
 * GET /api/wizard/[id]
 *
 * Retrieves a wizard by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const wizardId = parseInt(id, 10);

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
      .limit(1);

    if (!wizard) {
      return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
    }

    return NextResponse.json(wizard);
  } catch (error) {
    console.error("Error getting wizard:", error);
    return NextResponse.json(
      { error: "Failed to get wizard" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/wizard/[id]
 *
 * Updates a wizard (used for auto-save and step transitions).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const wizardId = parseInt(id, 10);

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      currentStep,
      contentType,
      numberOfSlides,
      model,
      referenceUrl,
      referenceVideoUrl,
      theme,
      context,
      objective,
      cta,
      targetAudience,
      ragConfig,
      negativeTerms,
      extractedContent,
      researchQueries,
      researchResults,
      narratives,
      selectedNarrativeId,
      generatedContent,
      libraryItemId,
      jobId,
      // For auto-save: can update updatedAt timestamp automatically
    } = body;

    // Build update object
    const updateData: Partial<NewContentWizard> = {
      updatedAt: new Date(),
    };

    if (currentStep !== undefined) updateData.currentStep = currentStep;
    if (contentType !== undefined) updateData.contentType = contentType;
    if (numberOfSlides !== undefined) updateData.numberOfSlides = numberOfSlides;
    if (model !== undefined) updateData.model = model;
    if (referenceUrl !== undefined) updateData.referenceUrl = referenceUrl;
    if (referenceVideoUrl !== undefined) updateData.referenceVideoUrl = referenceVideoUrl;
    if (theme !== undefined) updateData.theme = theme;
    if (context !== undefined) updateData.context = context;
    if (objective !== undefined) updateData.objective = objective;
    if (cta !== undefined) updateData.cta = cta;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (ragConfig !== undefined) updateData.ragConfig = ragConfig as any;
    if (negativeTerms !== undefined) updateData.negativeTerms = negativeTerms as any;
    if (extractedContent !== undefined) updateData.extractedContent = extractedContent as any;
    if (researchQueries !== undefined) updateData.researchQueries = researchQueries as any;
    if (researchResults !== undefined) updateData.researchResults = researchResults as any;
    if (narratives !== undefined) updateData.narratives = narratives as any;
    if (selectedNarrativeId !== undefined) updateData.selectedNarrativeId = selectedNarrativeId;
    if (generatedContent !== undefined) updateData.generatedContent = generatedContent as any;
    if (libraryItemId !== undefined) updateData.libraryItemId = libraryItemId;
    if (jobId !== undefined) updateData.jobId = jobId;

    // Set completion timestamp if step is completed
    if (currentStep === "completed" && !existing.completedAt) {
      updateData.completedAt = new Date();
    }

    // Set abandoned timestamp if step is abandoned
    if (currentStep === "abandoned" && !existing.abandonedAt) {
      updateData.abandonedAt = new Date();
    }

    const [updated] = await db
      .update(contentWizards)
      .set(updateData)
      .where(eq(contentWizards.id, wizardId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating wizard:", error);
    return NextResponse.json(
      { error: "Failed to update wizard" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wizard/[id]
 *
 * Soft deletes (abandons) a wizard.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const wizardId = parseInt(id, 10);

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
    }

    // Soft delete by setting abandonedAt
    const [deleted] = await db
      .update(contentWizards)
      .set({
        currentStep: "abandoned",
        abandonedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId))
      .returning();

    return NextResponse.json({ success: true, wizard: deleted });
  } catch (error) {
    console.error("Error deleting wizard:", error);
    return NextResponse.json(
      { error: "Failed to delete wizard" },
      { status: 500 }
    );
  }
}
