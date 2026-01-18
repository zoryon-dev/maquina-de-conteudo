/**
 * Firecrawl Service for Wizard
 *
 * Web scraping integration using Firecrawl API.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Uses Firecrawl REST API for web scraping
 * - Graceful degradation: returns null if not configured
 * - Extracts markdown content from URLs
 * - Handles errors without blocking the wizard job
 */

import type { ExtractedContent, ServiceResult } from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Firecrawl API key from environment.
 */
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

/**
 * Firecrawl API endpoint.
 */
const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

/**
 * Check if Firecrawl is configured.
 */
export function isFirecrawlConfigured(): boolean {
  return !!FIRECRAWL_API_KEY;
}

// ============================================================================
// WEB SCRAPING
// ============================================================================

/**
 * Extract content from a URL using Firecrawl.
 *
 * @param url - The URL to scrape
 * @returns Service result with extracted content or null
 *
 * @example
 * ```ts
 * const result = await extractFromUrl("https://example.com/blog/post")
 *
 * if (result.success && result.data) {
 *   console.log(result.data.content) // Markdown content
 *   console.log(result.data.metadata?.title) // Page title
 * }
 * ```
 */
export async function extractFromUrl(
  url: string
): Promise<ServiceResult<ExtractedContent | null>> {
  // Check if Firecrawl is configured
  if (!FIRECRAWL_API_KEY) {
    return {
      success: true,
      data: null, // Not an error - just not available
    };
  }

  // Validate URL format
  let validUrl: URL;
  try {
    validUrl = new URL(url);
  } catch {
    return {
      success: false,
      error: `Invalid URL format: ${url}`,
    };
  }

  // Only allow HTTP/HTTPS
  if (!["http:", "https:"].includes(validUrl.protocol)) {
    return {
      success: false,
      error: `Unsupported URL protocol: ${validUrl.protocol}`,
    };
  }

  try {
    // Use Firecrawl API to scrape the URL
    const content = await scrapeWithFirecrawl(url);

    if (!content) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        sourceUrl: url,
        content: content.text,
        metadata: {
          title: content.title,
          author: content.author,
          publishDate: content.publishDate,
        },
      },
    };
  } catch (error) {
    console.error("Error extracting from URL:", error);

    // Don't fail the job - return null with success
    return {
      success: true,
      data: null,
    };
  }
}

/**
 * Extract content from multiple URLs.
 *
 * @param urls - Array of URLs to scrape
 * @returns Service result with combined extracted content
 */
export async function extractFromMultipleUrls(
  urls: string[]
): Promise<ServiceResult<ExtractedContent[]>> {
  if (!urls.length) {
    return {
      success: true,
      data: [],
    };
  }

  // Process URLs in parallel (max 3 concurrent)
  const results: (ExtractedContent | null)[] = [];
  const batchSize = 3;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const result = await extractFromUrl(url);
        return result.success ? result.data : null;
      })
    );

    results.push(...batchResults);
  }

  // Filter out nulls and combine
  const validResults = results.filter((r): r is ExtractedContent => r !== null);

  return {
    success: true,
    data: validResults,
  };
}

// ============================================================================
// FIRECRAWL API INTEGRATION
// ============================================================================

/**
 * Scrape a URL using Firecrawl REST API.
 *
 * This function uses the Firecrawl API to extract
 * markdown content from web pages.
 */
async function scrapeWithFirecrawl(
  url: string
): Promise<{
  text: string;
  title?: string;
  author?: string;
  publishDate?: string;
} | null> {
  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl API error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      return null;
    }

    // Extract the markdown content
    const result = data.data as {
      markdown?: string;
      metadata?: {
        title?: string;
        author?: string;
        publishedDate?: string;
      };
    };

    if (!result.markdown) {
      return null;
    }

    return {
      text: result.markdown,
      title: result.metadata?.title,
      author: result.metadata?.author,
      publishDate: result.metadata?.publishedDate,
    };
  } catch (error) {
    console.error("Firecrawl scrape error:", error);
    return null;
  }
}

/**
 * Check if a URL is accessible and can be scraped.
 *
 * @param url - URL to check
 * @returns true if URL is likely accessible
 */
export function isUrlAccessible(url: string): boolean {
  try {
    const validUrl = new URL(url);
    return ["http:", "https:"].includes(validUrl.protocol);
  } catch {
    return false;
  }
}

/**
 * Get a preview of the URL content (first N characters).
 *
 * Useful for showing the user what will be used from the URL.
 *
 * @param url - URL to preview
 * @param maxLength - Maximum characters to return
 * @returns Preview content or null
 */
export async function getUrlPreview(
  url: string,
  maxLength: number = 500
): Promise<string | null> {
  const result = await extractFromUrl(url);

  if (!result.success || !result.data) {
    return null;
  }

  const content = result.data.content;

  if (content.length <= maxLength) {
    return content;
  }

  return content.slice(0, maxLength) + "...";
}
