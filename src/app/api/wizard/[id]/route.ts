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
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const wizardId = parseInt(id, 10);

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    // First try to find wizard with the current clerkUserId
    let [wizard] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, clerkUserId)))
      .limit(1);

    // If not found, try without userId filter (might be from recreated account)
    // Update the wizard to use the current clerkUserId if found
    if (!wizard) {
      const [wizardByAnyUser] = await db
        .select()
        .from(contentWizards)
        .where(eq(contentWizards.id, wizardId))
        .limit(1);

      if (wizardByAnyUser) {
        // Update wizard to use current clerkUserId (account was recreated)
        console.log(`[WizardAPI] Updating wizard ${wizardId} userId from ${wizardByAnyUser.userId} to ${clerkUserId}`);
        [wizard] = await db
          .update(contentWizards)
          .set({ userId: clerkUserId, updatedAt: new Date() })
          .where(eq(contentWizards.id, wizardId))
          .returning();
      } else {
        return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
      }
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
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const wizardId = parseInt(id, 10);

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    console.log(`[WizardAPI] PATCH request for wizard ${wizardId}, clerkUserId: ${clerkUserId}`);

    // Verify ownership - try with clerkUserId first
    let [existing] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, clerkUserId)))
      .limit(1);

    // If not found, try without userId filter (might be from recreated account)
    if (!existing) {
      console.log(`[WizardAPI] Wizard ${wizardId} not found with clerkUserId, trying without userId filter...`);
      const [wizardByAnyUser] = await db
        .select()
        .from(contentWizards)
        .where(eq(contentWizards.id, wizardId))
        .limit(1);

      if (wizardByAnyUser) {
        console.log(`[WizardAPI] Found wizard with different userId, updating from ${wizardByAnyUser.userId} to ${clerkUserId}`);
        // Update wizard to use current clerkUserId (account was recreated)
        [existing] = await db
          .update(contentWizards)
          .set({ userId: clerkUserId, updatedAt: new Date() })
          .where(eq(contentWizards.id, wizardId))
          .returning();
      } else {
        console.log(`[WizardAPI] Wizard ${wizardId} not found`);
        return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
      }
    }

    const body = await request.json();
    const {
      currentStep,
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
      extractedContent,
      researchQueries,
      researchResults,
      narratives,
      selectedNarrativeId,
      customInstructions,
      generatedContent,
      imageGenerationConfig,
      generatedImages,
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
    if (videoDuration !== undefined) updateData.videoDuration = videoDuration;
    if (theme !== undefined) updateData.theme = theme;
    if (context !== undefined) updateData.context = context;
    if (objective !== undefined) updateData.objective = objective;
    if (cta !== undefined) updateData.cta = cta;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    // Handle customInstructions - can come from direct field or from videoIntention fields
    if (customInstructions !== undefined) {
      updateData.customInstructions = customInstructions;
    } else if (customVideoIntention !== undefined || videoIntention !== undefined) {
      updateData.customInstructions = customVideoIntention || videoIntention;
    }
    if (ragConfig !== undefined) updateData.ragConfig = ragConfig as any;
    if (negativeTerms !== undefined) updateData.negativeTerms = negativeTerms as any;
    if (extractedContent !== undefined) updateData.extractedContent = extractedContent as any;
    if (researchQueries !== undefined) updateData.researchQueries = researchQueries as any;
    if (researchResults !== undefined) updateData.researchResults = researchResults as any;
    if (narratives !== undefined) updateData.narratives = narratives as any;
    if (selectedNarrativeId !== undefined) updateData.selectedNarrativeId = selectedNarrativeId;
    if (generatedContent !== undefined) updateData.generatedContent = generatedContent as any;
    if (imageGenerationConfig !== undefined) updateData.imageGenerationConfig = imageGenerationConfig as any;
    if (generatedImages !== undefined) updateData.generatedImages = generatedImages as any;
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
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const wizardId = parseInt(id, 10);

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    console.log(`[WizardAPI] DELETE request for wizard ${wizardId}, clerkUserId: ${clerkUserId}`);

    // Verify ownership - try with clerkUserId first
    let [existing] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, clerkUserId)))
      .limit(1);

    // If not found, try without userId filter (might be from recreated account)
    if (!existing) {
      console.log(`[WizardAPI] Wizard ${wizardId} not found with clerkUserId, trying without userId filter...`);
      const [wizardByAnyUser] = await db
        .select()
        .from(contentWizards)
        .where(eq(contentWizards.id, wizardId))
        .limit(1);

      if (wizardByAnyUser) {
        console.log(`[WizardAPI] Found wizard with different userId, updating from ${wizardByAnyUser.userId} to ${clerkUserId}`);
        // Update wizard to use current clerkUserId (account was recreated)
        [existing] = await db
          .update(contentWizards)
          .set({ userId: clerkUserId, updatedAt: new Date() })
          .where(eq(contentWizards.id, wizardId))
          .returning();
      } else {
        console.log(`[WizardAPI] Wizard ${wizardId} not found`);
        return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
      }
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
