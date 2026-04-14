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
import type { BrandConfig } from "@/lib/brands/schema";

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

// ============================================================================
// RETRY LOGIC
// ============================================================================

const MAX_RENDER_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 2000, 8000] as const;

/**
 * Renderiza um slide com retry exponencial.
 *
 * Tenta até MAX_RENDER_ATTEMPTS vezes com delays crescentes (0ms, 2s, 8s).
 * Em caso de falha definitiva, retorna { error, slide } ao invés de lançar.
 */
async function renderWithRetry(
  slide: StudioSlide,
  profile: StudioProfile,
  header: StudioHeader,
  slideIndex: number,
  totalSlides: number,
  deviceScaleFactor: number,
  brandingOptions: {
    brand?: BrandConfig | null;
    featureFlags?: { visualTokensV2?: boolean };
  },
  attempt: number = 1
): Promise<{ buffer: Buffer; slideIndex: number } | { error: string; slideIndex: number }> {
  try {
    const buffer = await renderSlideToImage(
      slide,
      profile,
      header,
      slideIndex,
      totalSlides,
      deviceScaleFactor,
      brandingOptions
    );
    return { buffer, slideIndex };
  } catch (err) {
    if (attempt >= MAX_RENDER_ATTEMPTS) {
      console.error("[render-to-image] max retries reached", {
        slide: slideIndex + 1,
        attempt,
        err: err instanceof Error ? err.message : String(err),
      });
      return { error: String(err), slideIndex };
    }
    const delay = RETRY_DELAYS_MS[attempt] ?? 8000;
    console.warn("[render-to-image] retry", {
      slide: slideIndex + 1,
      attempt,
      delayMs: delay,
    });
    await new Promise((r) => setTimeout(r, delay));
    return renderWithRetry(
      slide,
      profile,
      header,
      slideIndex,
      totalSlides,
      deviceScaleFactor,
      brandingOptions,
      attempt + 1
    );
  }
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
  deviceScaleFactor: number = 2,
  brandingOptions: {
    brand?: BrandConfig | null;
    featureFlags?: { visualTokensV2?: boolean };
  } = {}
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
    brand: brandingOptions.brand,
    featureFlags: brandingOptions.featureFlags,
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
  brand?: BrandConfig | null;
  featureFlags?: { visualTokensV2?: boolean };
}

interface RenderAndUploadResult {
  imageUrls: string[];
  errors: Array<{ slideIndex: number; error: string }>;
  /** Números de slide (1-based) que falharam após todos os retries. */
  failedSlides: number[];
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
  const {
    slides,
    profile,
    header,
    userId,
    storagePrefix,
    deviceScaleFactor = 2,
    brand,
    featureFlags,
  } = options;
  const storage = getStorageProvider();

  const imageUrls: string[] = new Array(slides.length).fill("");
  const errors: Array<{ slideIndex: number; error: string }> = [];

  // Process in batches of CONCURRENCY_LIMIT
  for (let batchStart = 0; batchStart < slides.length; batchStart += CONCURRENCY_LIMIT) {
    const batchEnd = Math.min(batchStart + CONCURRENCY_LIMIT, slides.length);
    const batch = slides.slice(batchStart, batchEnd);

    const batchPromises = batch.map(async (slide, batchIndex) => {
      const slideIndex = batchStart + batchIndex;

      console.log(`[RenderToImage] Rendering slide ${slideIndex + 1}/${slides.length}`);

      const result = await renderWithRetry(
        slide,
        profile,
        header,
        slideIndex,
        slides.length,
        deviceScaleFactor,
        { brand, featureFlags }
      );

      if ("error" in result) {
        const errorMsg = result.error;
        console.error(`[RenderToImage] Slide ${slideIndex + 1} failed after retries:`, errorMsg);
        errors.push({ slideIndex, error: errorMsg });
        return;
      }

      try {
        const key = `${storagePrefix}/slide-${slideIndex + 1}.png`;
        const uploadResult = await storage.uploadFile(result.buffer, key, {
          contentType: "image/png",
        });
        imageUrls[slideIndex] = uploadResult.url;
        console.log(`[RenderToImage] Slide ${slideIndex + 1} uploaded: ${uploadResult.url}`);
      } catch (uploadError) {
        const errorMsg = uploadError instanceof Error ? uploadError.message : String(uploadError);
        console.error(`[RenderToImage] Slide ${slideIndex + 1} upload failed:`, errorMsg);
        errors.push({ slideIndex, error: errorMsg });
      }
    });

    await Promise.allSettled(batchPromises);
  }

  // Filter out empty strings (failed renders)
  const successfulUrls = imageUrls.filter((url) => url !== "");
  const failedSlides = errors.map((e) => e.slideIndex + 1); // 1-based for consumer

  return {
    imageUrls: successfulUrls,
    errors,
    failedSlides,
  };
}
