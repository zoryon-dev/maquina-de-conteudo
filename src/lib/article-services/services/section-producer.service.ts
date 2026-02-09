/**
 * Article Wizard — Section Producer Service
 *
 * Produces article content section by section using the Section Producer prompt.
 * Each section is generated independently, allowing granular progress tracking.
 */

import type { ServiceResult, ArticleOutline, ProducedSection, BrandVoiceProfile } from "../types";
import { getArticleSystemPromptV2, getSectionProducerPromptV2 } from "../prompts";
import { articleLlmCall } from "./llm";

export async function produceSections(params: {
  outline: ArticleOutline;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  articleType: string;
  synthesizedResearch: string;
  ragContext?: string;
  brandVoiceProfile?: BrandVoiceProfile;
  eeatProfile?: string;
  customInstructions?: string;
  model: string;
  onProgress?: (sectionIndex: number, totalSections: number, heading: string) => Promise<void>;
}): Promise<ServiceResult<ProducedSection[]>> {
  const systemPrompt = getArticleSystemPromptV2();
  const sections: ProducedSection[] = [];
  const totalSections = params.outline.sections.length;

  try {
    for (let i = 0; i < totalSections; i++) {
      const section = params.outline.sections[i];
      await params.onProgress?.(i, totalSections, section.heading);

      // Build context from previously produced sections
      const previousContext = sections.length > 0
        ? sections.map((s) => `## ${s.heading}\n${s.content.substring(0, 200)}...`).join("\n\n")
        : "";

      const userMessage = getSectionProducerPromptV2({
        primaryKeyword: params.primaryKeyword,
        secondaryKeywords: params.secondaryKeywords,
        articleType: params.articleType,
        sectionHeading: section.heading,
        sectionSubheadings: section.subheadings,
        sectionKeyPoints: section.keyPoints,
        estimatedWords: section.estimatedWords,
        sectionIndex: i,
        totalSections,
        previousSectionsContext: previousContext,
        synthesizedResearch: params.synthesizedResearch,
        ragContext: params.ragContext,
        brandVoiceProfile: params.brandVoiceProfile,
        customInstructions: params.customInstructions,
        // V2 GEO fields
        sectionGeoFormat: section.geoFormat,
        sectionTargetQueries: section.targetQueriesAddressed,
        sectionSchemaHint: section.schemaHint ?? undefined,
        citableSnippetSlots: section.citableSnippetSlots,
        eeatProfile: params.eeatProfile,
      });

      const response = await articleLlmCall({
        model: params.model,
        systemPrompt,
        userMessage,
        temperature: 0.6,
      });

      const wordCount = response.split(/\s+/).length;
      sections.push({
        sectionId: `section_${i}`,
        heading: section.heading,
        content: response.trim(),
        wordCount,
        status: "completed",
      });
    }

    return { success: true, data: sections };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article Section Producer] Error:", msg);

    // Return partial results with failed section
    const currentIndex = sections.length;
    if (currentIndex < totalSections) {
      sections.push({
        sectionId: `section_${currentIndex}`,
        heading: params.outline.sections[currentIndex].heading,
        content: "",
        wordCount: 0,
        status: "failed",
      });
    }

    // Return partial data as success so the pipeline can save completed sections.
    // The caller detects partial failure by checking for sections with status: "failed".
    const completedCount = sections.filter((s) => s.status === "completed").length;
    if (completedCount > 0) {
      console.warn(
        `[Article Section Producer] Partial failure: ${completedCount}/${totalSections} sections completed. Error: ${msg}`,
      );
      return { success: true, data: sections };
    }

    return { success: false, error: msg };
  }
}
