/**
 * Validation Schemas Export
 *
 * Central export for all Zod validation schemas
 */

export {
  // Schemas
  generatedImageSchema,
  generatedImagesArraySchema,
  // Types
  type GeneratedImage,
  type AiGeneratedImage,
  type HtmlTemplateImage,
  type GeneratedImagesArray,
  // Helpers
  validateGeneratedImage,
  validateGeneratedImages,
  safeValidateGeneratedImages,
  parseGeneratedImagesFromDb,
} from "./generated-images";
