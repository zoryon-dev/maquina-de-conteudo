/**
 * OAuth Session Endpoint
 *
 * Fetches OAuth session data (pages/accounts) for the frontend to display.
 * This replaces the cookie-based approach which doesn't work with Next.js redirects.
 *
 * Flow:
 * 1. Frontend calls this endpoint with session_id from URL
 * 2. Validate session exists and is not expired
 * 3. Return pages data for display
 * 4. Session is deleted when user selects a page (in save-connection endpoint)
 *
 * Environment variables required:
 * - None (uses database)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { oauthSessions } from "@/db/schema"
import { eq, and, gt } from "drizzle-orm"

/**
 * GET /api/social/oauth-session?session_id={uuid}
 *
 * Query params:
 * - session_id: OAuth session ID from callback redirect
 *
 * Returns:
 * - 401: Unauthorized (no Clerk session)
 * - 400: Missing session_id
 * - 404: Session not found or expired
 * - 200: Success with pages data
 *
 * Response format:
 * {
 *   platform: "instagram" | "facebook",
 *   pages: PageOption[]
 * }
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sessionId = request.nextUrl.searchParams.get("session_id")

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing session_id parameter" },
      { status: 400 }
    )
  }

  console.log("[OAuth Session] Fetching session:", { userId, sessionId })

  // Fetch session from database with validation
  const sessions = await db
    .select()
    .from(oauthSessions)
    .where(
      and(
        eq(oauthSessions.id, sessionId),
        eq(oauthSessions.userId, userId), // User must own the session
        gt(oauthSessions.expiresAt, new Date()) // Session must not be expired
      )
    )
    .limit(1)

  if (!sessions.length) {
    console.error("[OAuth Session] Session not found or expired:", { userId, sessionId })
    return NextResponse.json(
      { error: "Session not found or expired. Please try connecting again." },
      { status: 404 }
    )
  }

  const session = sessions[0]
  const { platform, pagesData } = session
  const pages = (pagesData as { pages: unknown[] }).pages

  console.log("[OAuth Session] Session found:", {
    sessionId,
    platform,
    pagesCount: pages.length,
  })

  // Return platform and pages for frontend
  return NextResponse.json({
    platform,
    pages,
  })
}
