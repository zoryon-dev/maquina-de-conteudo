/**
 * Zod Validation Schemas for Generated Images
 *
 * Runtime validation for JSONB fields in the database.
 * Use these schemas when reading/writing generatedImages to ensure data integrity.
 */

import { z } from "zod";

// ============================================================================
// DISCRIMINATED UNION FOR IMAGE METHOD
// ============================================================================

/**
 * Base fields common to all generated images
 */
const baseImageSchema = z.object({
  id: z.string().min(1, "Image ID is required"),
  slideNumber: z.number().int().positive("Slide number must be positive"),
  imageUrl: z.string().url("Image URL must be a valid URL").or(
    z.string().startsWith("data:image/", "Must be a valid data URL or HTTP URL")
  ),
  thumbnailUrl: z.string().url().optional(),
  config: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime({ message: "createdAt must be ISO datetime string" }),
});

/**
 * AI-generated image schema
 * Requires model field, promptUsed is optional but recommended
 */
const aiGeneratedImageSchema = baseImageSchema.extend({
  method: z.literal("ai"),
  model: z.string().min(1, "AI model is required for AI-generated images"),
  promptUsed: z.string().optional(),
  template: z.undefined().optional(), // Explicitly not allowed for AI method
});

/**
 * HTML template generated image schema
 * Requires template field
 */
const htmlTemplateImageSchema = baseImageSchema.extend({
  method: z.literal("html-template"),
  template: z.string().min(1, "Template name is required for HTML template images"),
  model: z.undefined().optional(), // Explicitly not allowed for HTML method
  promptUsed: z.undefined().optional(),
});

/**
 * Discriminated union - image must be either AI or HTML template
 * This ensures the correct fields are present based on the method
 */
export const generatedImageSchema = z.discriminatedUnion("method", [
  aiGeneratedImageSchema,
  htmlTemplateImageSchema,
]);

/**
 * Array of generated images
 */
export const generatedImagesArraySchema = z.array(generatedImageSchema);

// ============================================================================
// TYPES
// ============================================================================

export type GeneratedImage = z.infer<typeof generatedImageSchema>;
export type AiGeneratedImage = z.infer<typeof aiGeneratedImageSchema>;
export type HtmlTemplateImage = z.infer<typeof htmlTemplateImageSchema>;
export type GeneratedImagesArray = z.infer<typeof generatedImagesArraySchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates a single generated image
 * Returns the validated image or throws a Zod error
 */
export function validateGeneratedImage(data: unknown): GeneratedImage {
  return generatedImageSchema.parse(data);
}

/**
 * Validates an array of generated images
 * Returns the validated array or throws a Zod error
 */
export function validateGeneratedImages(data: unknown): GeneratedImagesArray {
  return generatedImagesArraySchema.parse(data);
}

/**
 * Safe validation that returns a result object instead of throwing
 */
export function safeValidateGeneratedImages(data: unknown): {
  success: boolean;
  data?: GeneratedImagesArray;
  error?: string;
} {
  const result = generatedImagesArraySchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format error message
  const errorMessages = result.error.errors.map(
    (e) => `${e.path.join(".")}: ${e.message}`
  );

  return {
    success: false,
    error: `Invalid generatedImages: ${errorMessages.join("; ")}`,
  };
}

/**
 * Parses generatedImages from database JSONB field
 * Returns empty array if null/undefined, validated array otherwise
 * Logs warning if validation fails but returns data anyway (graceful degradation)
 */
export function parseGeneratedImagesFromDb(
  jsonbData: unknown
): GeneratedImagesArray {
  if (jsonbData === null || jsonbData === undefined) {
    return [];
  }

  const validation = safeValidateGeneratedImages(jsonbData);

  if (!validation.success) {
    console.warn(
      "[parseGeneratedImagesFromDb] Validation failed, returning unvalidated data:",
      validation.error
    );
    // Return data anyway for backwards compatibility with existing records
    return Array.isArray(jsonbData) ? (jsonbData as GeneratedImagesArray) : [];
  }

  return validation.data!;
}
