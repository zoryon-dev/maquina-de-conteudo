/**
 * Article Images API
 *
 * POST  /api/articles/:id/images  → Generate image for article
 * GET   /api/articles/:id/images  → List article images
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles, articleImages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { getStorageProvider } from "@/lib/storage";
import { generateArticleImagePrompt, optimizeUserImagePrompt, generateAltText } from "@/lib/article-services/services/image-prompt.service";
import { buildPrompt, validateFields } from "@/lib/image-generation/build-prompt";
import type { ImagePromptFields } from "@/types/image-generation";
import type { AiImageModel } from "@/lib/wizard-services/image-types";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_MODELS: AiImageModel[] = [
  "google/gemini-3-pro-image-preview",
  "openai/gpt-5-image",
  "bytedance-seed/seedream-4.5",
  "black-forest-labs/flux.2-max",
];

/**
 * Extracts image URL from OpenRouter response (same as studio route)
 */
function extractImageUrlFromResponse(response: unknown): string | null {
  const data = response as Record<string, unknown>;

  const buildDataUrl = (base64: string, mimeType?: string): string => {
    const safeMimeType = mimeType && typeof mimeType === "string" ? mimeType : "image/png";
    return `data:${safeMimeType};base64,${base64}`;
  };

  if (Array.isArray(data.choices)) {
    const firstChoice = data.choices[0] as Record<string, unknown> | undefined;
    const message = firstChoice?.message as Record<string, unknown> | undefined;

    if (Array.isArray(message?.images) && message.images.length > 0) {
      const firstImage = message.images[0] as Record<string, unknown>;
      if (firstImage.inlineData && typeof firstImage.inlineData === "object") {
        const inlineData = firstImage.inlineData as Record<string, unknown>;
        if (inlineData.data && typeof inlineData.data === "string") {
          return buildDataUrl(inlineData.data, inlineData.mimeType as string | undefined);
        }
      }
      if (firstImage.url && typeof firstImage.url === "string") return firstImage.url;
      if (firstImage.image_url && typeof firstImage.image_url === "object") {
        const imageUrl = (firstImage.image_url as Record<string, unknown>).url;
        if (typeof imageUrl === "string") return imageUrl;
      }
    }

    const content = message?.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        if (typeof item === "object" && item !== null) {
          const itemObj = item as Record<string, unknown>;
          if (itemObj.image_url && typeof itemObj.image_url === "object") {
            const url = (itemObj.image_url as Record<string, unknown>).url;
            if (typeof url === "string") return url;
          }
          if (itemObj.url && typeof itemObj.url === "string") return itemObj.url;
        }
      }
    }

    if (typeof content === "string") {
      if (content.startsWith("http://") || content.startsWith("https://")) return content;
      try {
        const parsed = JSON.parse(content);
        if (parsed.url && typeof parsed.url === "string") return parsed.url;
        if (parsed.image && typeof parsed.image === "string") return parsed.image;
      } catch {
        // Not JSON
      }
    }
  }

  if (data.url && typeof data.url === "string") return data.url;
  if (data.image && typeof data.image === "string") return data.image;

  return null;
}

// ============================================================================
// GET — List images for an article
// ============================================================================

export async function GET(request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser();
  const { id } = await params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
  }

  try {
    // Verify ownership
    const [article] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const images = await db
      .select()
      .from(articleImages)
      .where(eq(articleImages.articleId, articleId))
      .orderBy(desc(articleImages.createdAt));

    return NextResponse.json({ images });
  } catch (error) {
    console.error("[ArticleImages API] List error:", error);
    return NextResponse.json({ error: "Failed to list images" }, { status: 500 });
  }
}

// ============================================================================
// POST — Generate image for an article
// ============================================================================

interface GenerateRequest {
  autoPrompt?: boolean;
  userPrompt?: string;
  fields?: ImagePromptFields;
  imageType?: "featured" | "inline" | "social_share";
  model?: AiImageModel;
}

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser();
  const { id } = await params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
  }

  try {
    // Verify ownership
    const [article] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const body: GenerateRequest = await request.json();
    const {
      autoPrompt = true,
      userPrompt,
      fields,
      imageType = "featured",
      model,
    } = body;

    // Select model
    let selectedModel: AiImageModel = "google/gemini-3-pro-image-preview";
    if (model && VALID_MODELS.includes(model)) {
      selectedModel = model;
    }

    // Build prompt
    let builtPrompt: { prompt: string; negativePrompt: string; previewText: string };

    if (userPrompt && userPrompt.trim()) {
      // User custom prompt mode: optimize the user's description
      builtPrompt = optimizeUserImagePrompt(userPrompt.trim(), {
        title: article.finalTitle || article.title,
        primaryKeyword: article.primaryKeyword,
        articleType: article.articleType,
        customInstructions: article.customInstructions,
      });
    } else if (fields) {
      // Manual mode: user-provided fields
      const validation = validateFields(fields);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.errors.join(". ") },
          { status: 400 },
        );
      }
      builtPrompt = buildPrompt(fields);
    } else {
      // Auto mode: generate from article context
      builtPrompt = generateArticleImagePrompt({
        title: article.finalTitle || article.title,
        primaryKeyword: article.primaryKeyword,
        articleType: article.articleType,
        customInstructions: article.customInstructions,
      });
    }

    console.log(`[ArticleImages] Generating ${imageType} for article ${articleId} with ${selectedModel}`);
    console.log(`[ArticleImages] Prompt: "${builtPrompt.prompt.slice(0, 200)}..."`);

    // Call OpenRouter
    const imageResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
      },
      body: JSON.stringify({
        model: selectedModel,
        modalities: ["image", "text"],
        messages: [{ role: "user", content: builtPrompt.prompt }],
        max_tokens: 1000,
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("[ArticleImages] Generation failed:", imageResponse.status, errorText);
      return NextResponse.json(
        { error: `Erro ao gerar imagem: ${imageResponse.status}` },
        { status: 502 },
      );
    }

    const imageData = await imageResponse.json();
    const imageUrl = extractImageUrlFromResponse(imageData);

    if (!imageUrl) {
      console.error("[ArticleImages] No image URL in response:", JSON.stringify(imageData).slice(0, 500));
      return NextResponse.json(
        { error: "Não foi possível extrair a imagem da resposta" },
        { status: 502 },
      );
    }

    // Upload to storage if base64
    let finalUrl = imageUrl;
    let storageKey: string | null = null;

    if (imageUrl.startsWith("data:")) {
      const storage = getStorageProvider();
      const timestamp = Date.now();
      storageKey = `articles/${userId}/${articleId}/${imageType}-${timestamp}.png`;

      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      const uploadResult = await storage.uploadFile(imageBuffer, storageKey, {
        contentType: "image/png",
      });

      finalUrl = uploadResult.url;
      console.log(`[ArticleImages] Uploaded to: ${finalUrl}`);
    }

    // Generate alt text
    const altText = generateAltText({
      title: article.finalTitle || article.title,
      primaryKeyword: article.primaryKeyword,
    });

    // Save to database
    const [saved] = await db
      .insert(articleImages)
      .values({
        articleId,
        imageType,
        imageUrl: finalUrl,
        storageKey,
        promptUsed: builtPrompt.prompt,
        negativePrompt: builtPrompt.negativePrompt,
        generationConfig: { autoPrompt, model: selectedModel },
        modelUsed: selectedModel,
        altText,
      })
      .returning();

    return NextResponse.json({
      success: true,
      image: saved,
    });
  } catch (error) {
    console.error("[ArticleImages API] Generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
