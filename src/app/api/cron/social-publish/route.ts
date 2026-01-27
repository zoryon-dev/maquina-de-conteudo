/**
 * Social Media Scheduled Posts Cron Endpoint
 *
 * This endpoint should be called by an external cron service (Vercel Cron, GitHub Actions, etc.)
 * to process scheduled posts for Instagram (which doesn't have native scheduling).
 *
 * Facebook posts are handled natively, so they only need to be marked as published.
 *
 * Recommended schedule: Every 5 minutes
 *
 * Environment variables:
 * - CRON_SECRET: Secret to authenticate cron calls
 */

import { NextResponse } from "next/server"
import { db } from "@/db"
import { publishedPosts } from "@/db/schema"
import { lt, and, eq, isNull } from "drizzle-orm"
import { createJob } from "@/lib/queue/jobs"
import { PublishedPostStatus } from "@/lib/social/types"

const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret"

/**
 * GET /api/cron/social-publish
 *
 * Query params (for testing):
 * - test: Set to "true" to skip auth in development
 *
 * Process:
 * 1. Verify CRON_SECRET
 * 2. Find scheduled posts due to be published
 * 3. Enqueue jobs for each post
 * 4. Return count of jobs enqueued
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  const secret = authHeader?.replace("Bearer ", "")

  // Allow test mode in development
  const { searchParams } = new URL(request.url)
  const testMode = searchParams.get("test") === "true" && process.env.NODE_ENV === "development"

  if (secret !== CRON_SECRET && !testMode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // IMPORTANT: Use UTC for comparison since scheduledFor is stored in UTC
    // new Date() gives local time, so we use new Date().toISOString() for UTC
    const nowUtc = new Date()

    // Find all scheduled posts that are due
    // Instagram: needs worker processing
    // Facebook: already scheduled natively, just need to mark as published
    const duePosts = await db
      .select()
      .from(publishedPosts)
      .where(
        and(
          eq(publishedPosts.status, PublishedPostStatus.SCHEDULED),
          lt(publishedPosts.scheduledFor!, nowUtc as any),
          isNull(publishedPosts.deletedAt)
        )
      )

    if (duePosts.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: "No scheduled posts due",
      })
    }

    let enqueuedCount = 0
    let facebookCount = 0

    for (const post of duePosts) {
      if (post.platform === "instagram") {
        // Instagram: Enqueue job for worker to process
        if (!post.platformPostId) {
          // Create job in database with correct signature
          await createJob(
            post.userId,
            "social_publish_instagram" as any,
            {
              publishedPostId: post.id,
              userId: post.userId,
            } as any,
            {
              priority: 1, // High priority for scheduled posts
            }
          )

          // Job is automatically enqueued if Redis is configured
          enqueuedCount++
        } else {
          // Already has platformPostId, meaning it was scheduled natively somehow
          // Just mark as published
          await db
            .update(publishedPosts)
            .set({
              status: PublishedPostStatus.PUBLISHED,
              publishedAt: now,
              updatedAt: now,
            })
            .where(eq(publishedPosts.id, post.id))

          enqueuedCount++
        }
      } else if (post.platform === "facebook") {
        // Facebook: Already scheduled natively via scheduled_publish_time
        // Just mark as published (the post should already be on Facebook)
        await db
          .update(publishedPosts)
          .set({
            status: PublishedPostStatus.PUBLISHED,
            publishedAt: now,
            updatedAt: now,
          })
          .where(eq(publishedPosts.id, post.id))

        facebookCount++
      }
    }

    return NextResponse.json({
      processed: enqueuedCount + facebookCount,
      instagramEnqueued: enqueuedCount,
      facebookMarked: facebookCount,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Cron social publish error:", error)
    return NextResponse.json(
      { error: "Cron processing failed" },
      { status: 500 }
    )
  }
}
