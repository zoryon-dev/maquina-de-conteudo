/**
 * Zep Cloud Sync API
 *
 * Webhook endpoint for synchronizing Clerk users with Zep Cloud.
 * Creates/updates Zep users when Clerk events occur.
 *
 * POST /api/zep/sync
 *
 * Headers:
 *   - Authorization: Bearer <CLERK_SECRET_KEY> (verified by Clerk middleware)
 *
 * Body (Clerk webhook payload):
 *   - type: "user.created" | "user.updated"
 *   - data: { id, email_addresses, first_name, last_name, image_url, ... }
 */

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { zepClient } from "@/lib/zep/client"
import { isZepConfigured } from "@/lib/zep/client"
import { db } from "@/db"
import { zepThreads } from "@/db/schema"

/**
 * Verify Clerk webhook signature
 */
async function verifyClerkWebhook(request: NextRequest): Promise<boolean> {
  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false
  }

  const whSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!whSecret) {
    return true // Allow in development if secret not set
  }

  try {
    const body = await request.text()
    const crypto = require("crypto")

    const timestamp = svixTimestamp
    const signatureParts = svixSignature.split(",")
    const expectedSignature = crypto
      .createHmac("sha256", whSecret)
      .update(`${svixId}.${timestamp}.${body}`)
      .digest("base64")

    return signatureParts.some((part) => part === expectedSignature)
  } catch {
    return false
  }
}

/**
 * Map Clerk user to Zep user format
 */
function mapClerkUserToZep(clerkUser: {
  id: string
  email_addresses: { email_address: string }[]
  first_name?: string | null
  last_name?: string | null
  image_url?: string | null
}) {
  const primaryEmail = clerkUser.email_addresses?.[0]?.email_address

  return {
    userId: clerkUser.id, // Use Clerk ID as Zep user ID
    displayName: [clerkUser.first_name, clerkUser.last_name]
      .filter(Boolean)
      .join(" ") || primaryEmail?.split("@")[0] || "User",
    email: primaryEmail,
    metadata: {
      source: "clerk",
      clerkId: clerkUser.id,
      imageUrl: clerkUser.image_url,
      firstName: clerkUser.first_name,
      lastName: clerkUser.last_name,
    },
  }
}

export async function POST(request: NextRequest) {
  // Check if Zep is configured
  if (!isZepConfigured()) {
    return NextResponse.json(
      { error: "Zep Cloud is not configured" },
      { status: 503 }
    )
  }

  // Verify webhook signature
  const isValid = await verifyClerkWebhook(request)
  if (!isValid) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const { type, data } = payload

    // Handle user creation or update
    if (type === "user.created" || type === "user.updated") {
      const clerkUser = data

      if (!clerkUser?.id) {
        return NextResponse.json({ error: "Invalid user data" }, { status: 400 })
      }

      // Create or update user in Zep
      const zepUser = mapClerkUserToZep(clerkUser)

      try {
        await zepClient.user.add(zepUser)
      } catch (error: any) {
        // User might already exist, try updating
        if (error.message?.includes("already exists") || error.status === 409) {
          await zepClient.user.update(zepUser.userId, zepUser)
        } else {
          throw error
        }
      }

      // Check if user already has a Zep thread, create if not
      const existingThread = await db
        .select()
        .from(zepThreads)
        .where(eq(zepThreads.userId, clerkUser.id))
        .limit(1)

      if (existingThread.length === 0) {
        // Create default Zep thread for the user
        const crypto = require("crypto")
        const agentSessionId = crypto.randomUUID()

        await db.insert(zepThreads).values({
          userId: clerkUser.id,
          zepThreadId: crypto.randomUUID(), // Will be replaced with actual Zep thread ID
          currentAgent: "zory",
          agentSessionId,
        })
      }

      return NextResponse.json({
        success: true,
        userId: clerkUser.id,
        zepUserId: zepUser.userId,
      })
    }

    return NextResponse.json({ success: true, message: "Event processed" })
  } catch (error: any) {
    console.error("Zep sync error:", error)
    return NextResponse.json(
      {
        error: "Failed to sync user",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// Add HEAD endpoint for webhook verification
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}

// Add GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    configured: isZepConfigured(),
    status: "ok",
  })
}
