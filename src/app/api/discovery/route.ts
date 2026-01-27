/**
 * Discovery API Route
 *
 * POST /api/discovery
 *
 * Discovers trending topics across multiple platforms (YouTube, Instagram)
 * based on a keyword. Returns AI-enriched topics with briefings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DiscoveryService } from '@/lib/discovery-services/discovery.service';
import type { Platform, TimeRange } from '@/lib/discovery-services/types';

// ============================================================================
// TYPES
// ============================================================================

interface DiscoveryRequestBody {
  keyword: string;
  platforms?: Platform[];
  timeRange?: TimeRange;
  maxResults?: number;
  minSimilarity?: number;
}

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = (await req.json()) as DiscoveryRequestBody;
    const { keyword, platforms, timeRange, maxResults, minSimilarity } = body;

    // Validate required fields
    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json(
        { error: 'keyword is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate platforms
    const validPlatforms: Platform[] = ['youtube', 'instagram', 'perplexity'];
    const selectedPlatforms = platforms?.filter((p) => validPlatforms.includes(p)) || ['youtube', 'instagram', 'perplexity'];

    if (selectedPlatforms.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid platform must be specified' },
        { status: 400 }
      );
    }

    // Discover trending topics
    const service = new DiscoveryService();
    const result = await service.discover({
      keyword,
      platforms: selectedPlatforms,
      timeRange: timeRange || 'week',
      maxResults: maxResults || 10,
      minSimilarity: minSimilarity ?? 0.3,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[DiscoveryAPI] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS (CORS)
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'POST, OPTIONS',
    },
  });
}
