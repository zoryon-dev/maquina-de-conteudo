/**
 * POST /api/library/[id]/regenerate-images
 *
 * Queues a job to regenerate images for a carousel library item.
 * Uses the same wizard_image_generation job type.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { libraryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createJob } from "@/lib/queue/jobs";
import { JobType, type WizardImageGenerationPayload } from "@/lib/queue/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const libraryItemId = parseInt(id, 10);

    if (isNaN(libraryItemId)) {
      return NextResponse.json({ error: "Invalid library item ID" }, { status: 400 });
    }

    // Fetch the library item
    const [item] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, libraryItemId))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: "Library item not found" }, { status: 404 });
    }

    // Verify ownership
    if (item.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only carousels can have image regeneration
    if (item.type !== "carousel") {
      return NextResponse.json(
        { error: "Image regeneration is only available for carousels" },
        { status: 400 }
      );
    }

    // Parse the content to get slides for image generation
    let content;
    try {
      content = typeof item.content === "string" ? JSON.parse(item.content) : item.content;
    } catch {
      return NextResponse.json({ error: "Invalid content format" }, { status: 400 });
    }

    // Parse metadata safely to extract wizardId
    let metadata: Record<string, unknown> = {};
    if (item.metadata) {
      try {
        metadata = typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata;
        if (typeof metadata !== "object" || metadata === null) {
          metadata = {};
        }
      } catch (error) {
        console.error("[RegenerateImages] Failed to parse metadata:", error);
        metadata = {};
      }
    }
    const wizardId = metadata.wizardId;

    if (!wizardId) {
      return NextResponse.json(
        { error: "Cannot regenerate images: original wizard not found" },
        { status: 400 }
      );
    }

    // Update metadata to show processing state
    await db
      .update(libraryItems)
      .set({
        metadata: JSON.stringify({
          ...metadata,
          imageProcessing: {
            status: "processing",
            startedAt: new Date().toISOString(),
          },
        }),
        updatedAt: new Date(),
      })
      .where(eq(libraryItems.id, libraryItemId));

    // Create the image generation job
    // Use a default config for regeneration - user can customize in the future
    const payload: WizardImageGenerationPayload = {
      wizardId,
      userId,
      config: {
        method: "html-template",
        htmlOptions: {
          template: "dark-mode",
          backgroundColor: "#0a0a0f",
          textColor: "#ffffff",
          accentColor: "#a3e635",
        },
      },
    };

    const jobId = await createJob(userId, JobType.WIZARD_IMAGE_GENERATION, payload);

    return NextResponse.json({
      success: true,
      jobId,
      message: "Image regeneration queued successfully",
    });
  } catch (error) {
    console.error("[LIBRARY-REGENERATE] Error queuing image regeneration:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to queue image regeneration",
      },
      { status: 500 }
    );
  }
}
