/**
 * Apify Service for Wizard
 *
 * Video transcription integration using Apify YouTube Transcript actor.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Uses Apify API for YouTube video transcription
 * - Graceful degradation: returns null if not configured
 * - Extracts transcript text with timestamps
 * - Handles errors without blocking the wizard job
 */

import type { VideoTranscription, ServiceResult } from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Apify API token from environment.
 */
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

/**
 * Apify API endpoint.
 */
const APIFY_API_URL = "https://api.apify.com/v2/acts";

/**
 * YouTube Transcript Actor ID on Apify.
 *
 * Uses the "youtube_transcript" actor which extracts
 * subtitles/transcripts from YouTube videos.
 */
const YOUTUBE_TRANSCRIPT_ACTOR_ID = "apify/youtube-transcript";

/**
 * Check if Apify is configured.
 */
export function isApifyConfigured(): boolean {
  return !!APIFY_API_TOKEN;
}

// ============================================================================
// VIDEO TRANSCRIPTION
// ============================================================================

/**
 * Transcribe a YouTube video using Apify.
 *
 * @param videoUrl - Full YouTube video URL or video ID
 * @returns Service result with transcription data or null
 *
 * @example
 * ```ts
 * const result = await transcribeYouTube("https://youtube.com/watch?v=abc123")
 *
 * if (result.success && result.data) {
 *   console.log(result.data.transcription) // Transcript text
 *   console.log(result.data.metadata?.title) // Video title
 * }
 * ```
 */
export async function transcribeYouTube(
  videoUrl: string
): Promise<ServiceResult<VideoTranscription | null>> {
  // Check if Apify is configured
  if (!APIFY_API_TOKEN) {
    return {
      success: true,
      data: null, // Not an error - just not available
    };
  }

  // Extract YouTube video ID
  const videoId = extractYouTubeVideoId(videoUrl);

  if (!videoId) {
    return {
      success: false,
      error: `Invalid YouTube URL: ${videoUrl}`,
    };
  }

  try {
    // Run the Apify actor
    const transcription = await runTranscriptActor(videoId);

    if (!transcription) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        transcription: transcription.text,
        metadata: {
          title: transcription.title,
          duration: transcription.duration,
          thumbnailUrl: transcription.thumbnailUrl,
        },
      },
    };
  } catch (error) {
    console.error("Error transcribing video:", error);

    // Don't fail the job - return null with success
    return {
      success: true,
      data: null,
    };
  }
}

/**
 * Transcribe multiple YouTube videos.
 *
 * @param videoUrls - Array of YouTube video URLs
 * @returns Service result with combined transcriptions
 */
export async function transcribeMultipleVideos(
  videoUrls: string[]
): Promise<ServiceResult<VideoTranscription[]>> {
  if (!videoUrls.length) {
    return {
      success: true,
      data: [],
    };
  }

  // Process videos sequentially (Apify has rate limits)
  const results: (VideoTranscription | null)[] = [];

  for (const url of videoUrls) {
    const result = await transcribeYouTube(url);
    results.push(result.success ? result.data : null);

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Filter out nulls
  const validResults = results.filter((r): r is VideoTranscription => r !== null);

  return {
    success: true,
    data: validResults,
  };
}

// ============================================================================
// APIFY ACTOR INTEGRATION
// ============================================================================

/**
 * Run the YouTube Transcript actor on Apify.
 *
 * This function runs the actor synchronously and waits for the result.
 */
async function runTranscriptActor(
  videoId: string
): Promise<{
  text: string;
  title?: string;
  duration?: number;
  thumbnailUrl?: string;
} | null> {
  try {
    // Start the actor run
    const runResponse = await fetch(
      `${APIFY_API_URL}/${YOUTUBE_TRANSCRIPT_ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startUrls: [{ url: `https://www.youtube.com/watch?v=${videoId}` }],
          language: "auto", // Auto-detect language
          translate: "en", // Translate to English if needed
          getSubtitles: true,
          includeTranscript: true,
        }),
      }
    );

    if (!runResponse.ok) {
      console.error("Apify run error:", runResponse.status, runResponse.statusText);
      return null;
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;

    if (!runId) {
      return null;
    }

    // Wait for the run to complete
    const result = await waitForActorCompletion(runId, 120000); // 2 minutes timeout

    if (!result) {
      return null;
    }

    // Extract transcript from dataset
    const transcript = extractTranscriptFromDataset(runId);

    return transcript;
  } catch (error) {
    console.error("Apify actor error:", error);
    return null;
  }
}

/**
 * Wait for Apify actor run to complete.
 *
 * Polls the run status until it finishes or times out.
 */
async function waitForActorCompletion(
  runId: string,
  timeout: number
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(
        `${APIFY_API_URL}/${YOUTUBE_TRANSCRIPT_ACTOR_ID}/runs/${runId}?token=${APIFY_API_TOKEN}`
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const status = data.data?.status;

      if (status === "SUCCEEDED") {
        return true;
      }

      if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
        return false;
      }

      // Still running, wait and poll again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Extract transcript from Apify dataset.
 *
 * Retrieves the dataset items from the completed run.
 */
async function extractTranscriptFromDataset(
  runId: string
): Promise<{
  text: string;
  title?: string;
  duration?: number;
  thumbnailUrl?: string;
} | null> {
  try {
    const response = await fetch(
      `${APIFY_API_URL}/${YOUTUBE_TRANSCRIPT_ACTOR_ID}/runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
    );

    if (!response.ok) {
      return null;
    }

    const items = await response.json();

    if (!items.data || items.data.length === 0) {
      return null;
    }

    const item = items.data[0];

    // Extract transcript text
    let transcriptText = "";

    if (item.transcript) {
      if (Array.isArray(item.transcript)) {
        transcriptText = item.transcript
          .map((t: { text?: string }) => t.text || "")
          .join(" ");
      } else if (typeof item.transcript === "string") {
        transcriptText = item.transcript;
      }
    }

    // Fallback to subtitles
    if (!transcriptText && item.subtitles) {
      if (Array.isArray(item.subtitles)) {
        transcriptText = item.subtitles
          .map((s: { text?: string }) => s.text || "")
          .join(" ");
      } else if (typeof item.subtitles === "string") {
        transcriptText = item.subtitles;
      }
    }

    if (!transcriptText) {
      return null;
    }

    return {
      text: transcriptText,
      title: item.title,
      duration: item.duration,
      thumbnailUrl: item.thumbnailUrl || item.thumbnail,
    };
  } catch (error) {
    console.error("Error extracting transcript from dataset:", error);
    return null;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract YouTube video ID from various URL formats.
 *
 * Supports:
 * - youtube.com/watch?v=VIDEO_ID
 * - youtu.be/VIDEO_ID
 * - youtube.com/embed/VIDEO_ID
 * - youtube.com/shorts/VIDEO_ID
 * - VIDEO_ID (direct)
 */
export function extractYouTubeVideoId(url: string): string | null {
  // If it's already just a video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  try {
    const urlObj = new URL(url);

    // Handle youtu.be short URLs
    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1);
    }

    // Handle youtube.com URLs
    if (urlObj.hostname.includes("youtube.com")) {
      // Check for watch?v= parameter
      const watchParam = urlObj.searchParams.get("v");
      if (watchParam) {
        return watchParam;
      }

      // Check for embed/VIDEO_ID format
      const embedMatch = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) {
        return embedMatch[1];
      }

      // Check for shorts/VIDEO_ID format
      const shortsMatch = urlObj.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) {
        return shortsMatch[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a valid YouTube URL.
 */
export function isYouTubeUrl(url: string): boolean {
  return !!extractYouTubeVideoId(url);
}

/**
 * Get thumbnail URL for a YouTube video.
 *
 * Returns the maxresdefault (high quality) thumbnail.
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
