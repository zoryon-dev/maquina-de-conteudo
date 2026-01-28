/**
 * API Route for generating images from library items
 *
 * POST /api/library/[id]/generate-image - Generate image for a library item
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { libraryItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateAiImage } from "@/lib/wizard-services/image-generation.service";
import { generateHtmlTemplateImage } from "@/lib/wizard-services/screenshotone.service";
import type { ImageGenerationConfig } from "@/lib/wizard-services/image-types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const libraryItemId = Number(id);

  try {
    // Fetch the library item
    const [item] = await db
      .select()
      .from(libraryItems)
      .where(
        and(
          eq(libraryItems.id, libraryItemId),
          eq(libraryItems.userId, userId)
        )
      )
      .limit(1);

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Library item not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const config: ImageGenerationConfig = body.config;

    if (!config) {
      return NextResponse.json(
        { success: false, error: "Missing config" },
        { status: 400 }
      );
    }

    // Parse content to extract text for image generation
    let slideContent = "";
    let slideTitle = item.title || "";

    try {
      const parsedContent = JSON.parse(item.content || "{}");
      if (parsedContent.type === "carousel" && parsedContent.slides) {
        // Use first slide for image
        slideTitle = parsedContent.slides[0]?.title || slideTitle;
        slideContent = parsedContent.slides[0]?.content || "";
      } else if (parsedContent.caption) {
        slideContent = parsedContent.caption;
      }
    } catch {
      slideContent = item.title || "";
    }

    // Generate image based on method
    let imageUrl = "";

    if (config.method === "ai") {
      // AI image generation
      const result = await generateAiImage({
        slideNumber: 1,
        slideContent,
        slideTitle,
        config,
      });

      if (!result.success || !result.data) {
        return NextResponse.json(
          { success: false, error: result.error || "Failed to generate image" },
          { status: 500 }
        );
      }

      imageUrl = result.data.imageUrl;
    } else {
      // HTML template method
      const result = await generateHtmlTemplateImage({
        slideNumber: 1,
        slideContent,
        slideTitle,
        config,
      });

      if (!result.success || !result.data) {
        return NextResponse.json(
          { success: false, error: result.error || "Failed to generate image" },
          { status: 500 }
        );
      }

      imageUrl = result.data.imageUrl;
    }

    // Update library item with new image
    const currentMediaUrls = item.mediaUrl ? JSON.parse(item.mediaUrl) : [];
    const updatedMediaUrls = [...currentMediaUrls, imageUrl];

    await db
      .update(libraryItems)
      .set({
        mediaUrl: JSON.stringify(updatedMediaUrls),
        updatedAt: new Date(),
      })
      .where(eq(libraryItems.id, libraryItemId));

    return NextResponse.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error("Error generating image for library item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
