/**
 * Social Connections Endpoint
 *
 * GET - List all user's social connections
 * DELETE - Soft delete a connection
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { socialConnections } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { SocialConnectionStatus } from "@/lib/social/types"

/**
 * GET /api/social/connections
 *
 * Returns all active social connections for the authenticated user.
 */
export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const connections = await db
      .select()
      .from(socialConnections)
      .where(and(eq(socialConnections.userId, userId), isNull(socialConnections.deletedAt)))

    // Return connections without sensitive data
    const safeConnections = connections.map((conn) => ({
      id: conn.id,
      platform: conn.platform,
      accountId: conn.accountId,
      accountName: conn.accountName,
      accountUsername: conn.accountUsername,
      accountProfilePic: conn.accountProfilePic,
      status: conn.status,
      lastVerifiedAt: conn.lastVerifiedAt,
      createdAt: conn.createdAt,
      // Don't expose accessToken or tokenExpiresAt
    }))

    return NextResponse.json({ connections: safeConnections })
  } catch (error) {
    console.error("Error fetching social connections:", error)
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/social/connections
 *
 * Soft delete a social connection.
 *
 * Body:
 * - id: Connection ID to delete
 */
export async function DELETE(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "Missing connection id" }, { status: 400 })
    }

    // Verify ownership
    const connectionResult = await db
      .select()
      .from(socialConnections)
      .where(eq(socialConnections.id, id))

    const connection = connectionResult[0]

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    if (connection.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Soft delete
    await db
      .update(socialConnections)
      .set({
        status: SocialConnectionStatus.REVOKED,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(socialConnections.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting social connection:", error)
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    )
  }
}
