/**
 * Library Sync Service for Wizard
 *
 * Automatically creates library items from wizard-generated content.
 * Called by worker after content generation completes.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wizard generates content and saves to contentWizards.generatedContent (JSONB).
 * This service maps that content to libraryItems table format.
 *
 * Flow:
 * 1. Worker completes content generation
 * 2. createLibraryItemFromWizard() is called
 * 3. GeneratedContent is mapped to LibraryItem format
 * 4. Library item is inserted into database
 * 5. contentWizards.libraryItemId is updated with the new ID
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/db"
import { libraryItems } from "@/db/schema"
import type { GeneratedContent, ContentType } from "./types"
import type { PostType, ContentStatus } from "@/db/schema"

// Re-export ContentType from our types
export type { ContentType } from "./types"

// ============================================================================
// TYPES
// ============================================================================

export interface WizardMetadata {
  theme?: string | null
  objective?: string | null
  targetAudience?: string | null
  context?: string | null
}

export interface CreateLibraryItemFromWizardOptions {
  wizardId: number
  userId: string
  generatedContent: GeneratedContent
  contentType: ContentType
  wizardMetadata?: WizardMetadata
}

export interface CreateLibraryItemResult {
  success: boolean
  libraryItemId?: number
  error?: string
}

interface LibraryItemInput {
  userId: string
  type: PostType
  status: ContentStatus
  title: string
  content: string
  mediaUrl: string | null
  metadata: string
}

// ============================================================================
// TITLE GENERATION
// ============================================================================

/**
 * Generates a title for the library item based on wizard metadata
 *
 * Priority: theme > objective > narrativeTitle > fallback
 */
export function generateTitle(
  contentType: ContentType,
  wizard: WizardMetadata,
  narrativeTitle?: string
): string {
  const prefixMap: Record<string, string> = {
    carousel: "Carrossel",
    text: "Post",
    image: "Imagem",
    video: "Vídeo",
  }

  const prefix = prefixMap[contentType] || "Conteúdo"

  const baseTitle = wizard.theme || wizard.objective || narrativeTitle

  if (baseTitle) {
    // Truncate if too long (max 100 chars)
    const truncated = baseTitle.length > 80
      ? baseTitle.substring(0, 80) + "..."
      : baseTitle
    return `${prefix}: ${truncated}`
  }

  return `${prefix} sem título`
}

// ============================================================================
// CONTENT MAPPING
// ============================================================================

/**
 * Maps GeneratedContent to LibraryItem format based on content type
 */
export function mapGeneratedContentToLibraryItem(
  generatedContent: GeneratedContent,
  wizardMetadata: WizardMetadata,
  wizardId: number,
  userId: string
): LibraryItemInput {
  const { type, metadata } = generatedContent
  const narrativeTitle = metadata.narrativeTitle

  // Generate title
  const title = generateTitle(
    type,
    wizardMetadata,
    narrativeTitle
  )

  // Base metadata (common to all types)
  const baseMetadata = {
    ...metadata,
    wizardId,
    wizardTheme: wizardMetadata.theme,
    wizardObjective: wizardMetadata.objective,
    wizardTargetAudience: wizardMetadata.targetAudience,
    wizardContext: wizardMetadata.context,
    source: "wizard" as const,
  }

  // Type-specific mapping
  switch (type) {
    case "carousel": {
      // Note: Images are generated separately via wizard_image_generation job
      // Mark as processing so UI knows images are pending
      return {
        userId,
        type: type as PostType,
        status: "draft" as ContentStatus,
        title,
        content: JSON.stringify(generatedContent),
        mediaUrl: null, // Will be populated when images are generated
        metadata: JSON.stringify({
          ...baseMetadata,
          slideCount: generatedContent.slides?.length || 0,
          imageProcessing: {
            status: "pending",
            startedAt: new Date().toISOString(),
          },
        }),
      }
    }

    case "text":
    case "image": {
      return {
        userId,
        type: type as PostType,
        status: "draft" as ContentStatus,
        title,
        content: JSON.stringify(generatedContent),
        mediaUrl: null,
        metadata: JSON.stringify({
          ...baseMetadata,
          caption: generatedContent.caption,
          hashtags: generatedContent.hashtags,
          cta: generatedContent.cta,
        }),
      }
    }

    case "video": {
      return {
        userId,
        type: type as PostType,
        status: "draft" as ContentStatus,
        title,
        content: JSON.stringify(generatedContent),
        mediaUrl: null,
        metadata: JSON.stringify({
          ...baseMetadata,
          script: generatedContent.script,
          hashtags: generatedContent.hashtags,
          cta: generatedContent.cta,
        }),
      }
    }

    default:
      throw new Error(`Unsupported content type: ${type}`)
  }
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Creates a library item from wizard-generated content
 *
 * This function is called by the worker after content generation completes.
 * It maps the GeneratedContent to LibraryItem format and inserts it into
 * the library_items table.
 *
 * @param options - Sync options including wizard data and generated content
 * @returns Result with libraryItemId or error
 */
export async function createLibraryItemFromWizard(
  options: CreateLibraryItemFromWizardOptions
): Promise<CreateLibraryItemResult> {
  const { wizardId, userId, generatedContent, contentType, wizardMetadata } = options

  try {
    // Validate input
    if (!generatedContent || !generatedContent.type) {
      console.error(`[createLibraryItemFromWizard] Validation failed: missing type`, {
        hasGeneratedContent: !!generatedContent,
        type: generatedContent?.type
      });
      throw new Error("Invalid generated content: missing type")
    }

    if (generatedContent.type !== contentType) {
      console.error(`[createLibraryItemFromWizard] Validation failed: type mismatch`, {
        expected: contentType,
        got: generatedContent.type
      });
      throw new Error(
        `Content type mismatch: expected ${contentType}, got ${generatedContent.type}`
      )
    }

    // Map to library item format
    const libraryItemInput = mapGeneratedContentToLibraryItem(
      generatedContent,
      wizardMetadata || {},
      wizardId,
      userId
    )

    // Insert into database
    const [libraryItem] = await db
      .insert(libraryItems)
      .values(libraryItemInput)
      .returning()

    return {
      success: true,
      libraryItemId: libraryItem.id,
    }
  } catch (error) {
    console.error(`[createLibraryItemFromWizard] ❌ Error for wizard ${wizardId}:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      contentType,
      generatedContentType: generatedContent?.type
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Re-synchronizes a wizard to the library (for manual retry)
 *
 * Use this when a previous sync failed and needs to be retried.
 *
 * @param wizardId - The wizard ID to re-sync
 * @param userId - The user ID (for authorization)
 * @returns Result with libraryItemId or error
 */
export async function resyncWizardToLibrary(
  wizardId: number,
  userId: string
): Promise<CreateLibraryItemResult> {
  try {
    const { contentWizards } = await import("@/db/schema")
    const { eq, and } = await import("drizzle-orm")

    // Fetch wizard with generated content
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(
        and(
          eq(contentWizards.id, wizardId),
          eq(contentWizards.userId, userId)
        )
      )
      .limit(1)

    if (!wizard) {
      return {
        success: false,
        error: "Wizard not found",
      }
    }

    if (!wizard.generatedContent) {
      return {
        success: false,
        error: "Wizard has no generated content to sync",
      }
    }

    if (wizard.libraryItemId) {
      return {
        success: false,
        error: `Wizard already synced to library item ${wizard.libraryItemId}`,
      }
    }

    // Parse generated content
    const generatedContent = typeof wizard.generatedContent === "string"
      ? JSON.parse(wizard.generatedContent)
      : wizard.generatedContent

    // Create library item
    return await createLibraryItemFromWizard({
      wizardId,
      userId,
      generatedContent,
      contentType: wizard.contentType as ContentType,
      wizardMetadata: {
        theme: wizard.theme,
        objective: wizard.objective,
        targetAudience: wizard.targetAudience,
        context: wizard.context,
      },
    })
  } catch (error) {
    console.error(`[resyncWizardToLibrary] Error for wizard ${wizardId}:`, error)

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
