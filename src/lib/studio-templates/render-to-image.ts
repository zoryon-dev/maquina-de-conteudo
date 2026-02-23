/**
 * Shared utility for rendering Studio slides to PNG images via ScreenshotOne API.
 *
 * Used by:
 * - /api/studio/publish (render all slides for library)
 * - /api/studio/save (render first slide as preview)
 * - /api/wizard/[id]/save-carousel (render all slides for library)
 */

import { renderSlideToHtml } from "@/lib/studio-templates/renderer";
import { getStorageProvider } from "@/lib/storage";
import type { StudioSlide, StudioProfile, StudioHeader } from "@/lib/studio-templates/types";

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREENSHOT_ONE_API = "https://api.screenshotone.com/take";
const SCREENSHOT_ONE_ACCESS_KEY = process.env.SCREENSHOT_ONE_ACCESS_KEY;

/** Timeout per individual slide render request */
const REQUEST_TIMEOUT = 60000; // 1 minute

/** Max slides rendered concurrently to avoid rate limits */
const CONCURRENCY_LIMIT = 3;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if ScreenshotOne is configured and available.
 */
export function isScreenshotOneAvailable(): boolean {
  return !!SCREENSHOT_ONE_ACCESS_KEY;
}

/**
 * Render a single slide to PNG via ScreenshotOne API.
 *
 * @param slide - The studio slide to render
 * @param profile - Author profile (avatar, name, handle)
 * @param header - Header info (category, brand, copyright)
 * @param slideIndex - Zero-based index of the slide
 * @param totalSlides - Total number of slides in the carousel
 * @param deviceScaleFactor - Pixel density (2 = retina, 1 = standard). Default: 2
 * @returns PNG image as Buffer
 * @throws Error if ScreenshotOne is not configured or API fails
 */
export async function renderSlideToImage(
  slide: StudioSlide,
  profile: StudioProfile,
  header: StudioHeader,
  slideIndex: number,
  totalSlides: number,
  deviceScaleFactor: number = 2
): Promise<Buffer> {
  if (!SCREENSHOT_ONE_ACCESS_KEY) {
    throw new Error("ScreenshotOne não configurado");
  }

  const result = renderSlideToHtml({
    slide,
    profile,
    header,
    slideIndex,
    totalSlides,
  });

  const response = await fetch(SCREENSHOT_ONE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_key: SCREENSHOT_ONE_ACCESS_KEY,
      html: result.html,
      viewport_width: 1080,
      viewport_height: 1440,
      format: "png",
      device_scale_factor: deviceScaleFactor,
      cache: false,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ScreenshotOne failed: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ============================================================================
// BATCH RENDERING
// ============================================================================

interface RenderAndUploadOptions {
  slides: StudioSlide[];
  profile: StudioProfile;
  header: StudioHeader;
  userId: string;
  /** Storage key prefix, e.g. "studio/{userId}/carousel/{timestamp}" */
  storagePrefix: string;
  /** Pixel density (default: 2) */
  deviceScaleFactor?: number;
}

interface RenderAndUploadResult {
  imageUrls: string[];
  errors: Array<{ slideIndex: number; error: string }>;
}

/**
 * Render all slides to PNG and upload to storage.
 *
 * Processes slides in batches of CONCURRENCY_LIMIT to balance speed vs rate limits.
 * Returns partial results — slides that fail to render will have empty string in imageUrls.
 */
export async function renderAndUploadAllSlides(
  options: RenderAndUploadOptions
): Promise<RenderAndUploadResult> {
  const { slides, profile, header, userId, storagePrefix, deviceScaleFactor = 2 } = options;
  const storage = getStorageProvider();

  const imageUrls: string[] = new Array(slides.length).fill("");
  const errors: Array<{ slideIndex: number; error: string }> = [];

  // Process in batches of CONCURRENCY_LIMIT
  for (let batchStart = 0; batchStart < slides.length; batchStart += CONCURRENCY_LIMIT) {
    const batchEnd = Math.min(batchStart + CONCURRENCY_LIMIT, slides.length);
    const batch = slides.slice(batchStart, batchEnd);

    const batchPromises = batch.map(async (slide, batchIndex) => {
      const slideIndex = batchStart + batchIndex;

      try {
        console.log(`[RenderToImage] Rendering slide ${slideIndex + 1}/${slides.length}`);

        const imageBuffer = await renderSlideToImage(
          slide,
          profile,
          header,
          slideIndex,
          slides.length,
          deviceScaleFactor
        );

        const key = `${storagePrefix}/slide-${slideIndex + 1}.png`;
        const uploadResult = await storage.uploadFile(imageBuffer, key, {
          contentType: "image/png",
        });

        imageUrls[slideIndex] = uploadResult.url;
        console.log(`[RenderToImage] Slide ${slideIndex + 1} uploaded: ${uploadResult.url}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[RenderToImage] Slide ${slideIndex + 1} failed:`, errorMsg);
        errors.push({ slideIndex, error: errorMsg });
      }
    });

    await Promise.allSettled(batchPromises);
  }

  // Filter out empty strings (failed renders)
  const successfulUrls = imageUrls.filter((url) => url !== "");

  return {
    imageUrls: successfulUrls,
    errors,
  };
}
