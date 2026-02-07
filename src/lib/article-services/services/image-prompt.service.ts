/**
 * Article Image Prompt Service
 *
 * Generates optimized image prompts from article data (title, keyword, type).
 * Used for auto-generating featured images in 16:9 blog header format.
 */

import { buildSimplePrompt } from "@/lib/image-generation/build-prompt";
import type { BuiltPrompt } from "@/types/image-generation";

interface ArticleImageContext {
  title?: string | null;
  primaryKeyword?: string | null;
  articleType?: string | null;
  customInstructions?: string | null;
}

const ARTICLE_TYPE_VISUAL_MAP: Record<string, string> = {
  guia: "educational, step-by-step visual, organized layout",
  "how-to": "instructional, hands-on, practical demonstration",
  listicle: "dynamic, numbered items, clean grid",
  comparativo: "split view, comparison, side-by-side",
  opiniao: "thought-provoking, editorial, single focal point",
  "case-study": "data-driven, professional, charts or graphs",
};

/**
 * Generates an optimized prompt for article featured image.
 * Combines title, keyword, and article type to produce a blog-optimized 16:9 prompt.
 */
export function generateArticleImagePrompt(
  context: ArticleImageContext,
): BuiltPrompt {
  const parts: string[] = [];

  // Core subject from title or keyword
  const subject = context.title || context.primaryKeyword || "blog article";
  parts.push(`Professional blog header image representing "${subject}"`);

  // Article type visual hints
  if (context.articleType && ARTICLE_TYPE_VISUAL_MAP[context.articleType]) {
    parts.push(ARTICLE_TYPE_VISUAL_MAP[context.articleType]);
  }

  // Always 16:9 for blog headers
  parts.push("landscape 16:9 aspect ratio, wide cinematic format");
  parts.push("modern minimalist design, clean composition");
  parts.push("abstract or conceptual representation, no text overlay");

  const prompt = parts.join(". ") + ".";

  return buildSimplePrompt(prompt, "minimal");
}

/**
 * Generates an alt text suggestion from article context.
 */
export function generateAltText(context: ArticleImageContext): string {
  const title = context.title || context.primaryKeyword || "Article";
  return `Imagem destacada para: ${title}`;
}
