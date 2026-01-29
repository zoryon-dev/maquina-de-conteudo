/**
 * Discovery Health Check API
 *
 * GET /api/discovery/health
 *
 * Returns the status of all discovery service APIs.
 * Useful for debugging platform-specific issues.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getDiscoveryServiceStatus,
  YouTubeDiscoveryService,
  InstagramDiscoveryService,
  PerplexityDiscoveryService,
} from "@/lib/discovery-services";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  // Get static configuration status
  const configStatus = getDiscoveryServiceStatus();

  // Test each API with a simple query
  const testResults = {
    youtube: { configured: configStatus.youtube, working: false, error: null as string | null },
    instagram: { configured: configStatus.instagram, working: false, error: null as string | null },
    perplexity: { configured: configStatus.perplexity, working: false, error: null as string | null },
  };

  // Test YouTube API
  if (configStatus.youtube) {
    try {
      const youtube = new YouTubeDiscoveryService();
      const results = await youtube.discoverByKeyword("test", "week");
      testResults.youtube.working = Array.isArray(results);
      testResults.youtube.error = null;
    } catch (error) {
      testResults.youtube.working = false;
      testResults.youtube.error = error instanceof Error ? error.message : String(error);
    }
  }

  // Test Instagram/Apify API
  if (configStatus.instagram) {
    try {
      const instagram = new InstagramDiscoveryService();
      const results = await instagram.discoverByKeyword("test");
      testResults.instagram.working = Array.isArray(results);
      testResults.instagram.error = null;
    } catch (error) {
      testResults.instagram.working = false;
      testResults.instagram.error = error instanceof Error ? error.message : String(error);
    }
  }

  // Test Perplexity API
  if (configStatus.perplexity) {
    try {
      const perplexity = new PerplexityDiscoveryService();
      const results = await perplexity.discoverByKeyword("test");
      testResults.perplexity.working = Array.isArray(results);
      testResults.perplexity.error = null;
    } catch (error) {
      testResults.perplexity.working = false;
      testResults.perplexity.error = error instanceof Error ? error.message : String(error);
    }
  }

  const responseTime = Date.now() - startTime;

  // Calculate overall health
  const totalConfigured = Object.values(configStatus).filter(Boolean).length;
  const totalWorking = Object.values(testResults).filter((r) => r.working).length;
  const overallHealth = totalConfigured === 0 ? "unknown" : totalWorking === totalConfigured ? "healthy" : "degraded";

  return NextResponse.json(
    {
      overall: overallHealth,
      responseTime: `${responseTime}ms`,
      config: {
        youtube: configStatus.youtube,
        instagram: configStatus.instagram,
        perplexity: configStatus.perplexity,
        similarity: configStatus.similarity,
        briefing: configStatus.briefing,
      },
      apis: testResults,
      summary: {
        configured: totalConfigured,
        working: totalWorking,
        failed: totalConfigured - totalWorking,
      },
    },
    { status: overallHealth === "healthy" ? 200 : overallHealth === "degraded" ? 207 : 503 }
  );
}
