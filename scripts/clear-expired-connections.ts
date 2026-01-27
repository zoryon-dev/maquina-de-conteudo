/**
 * Clear expired social connections
 * Run with: npx tsx scripts/clear-expired-connections.ts
 */

import { config } from "dotenv"
import { resolve } from "path"

// Load .env from project root
config({ path: resolve(__dirname, "../.env") })

import { db } from "../src/db"
import { socialConnections } from "../src/db/schema"
import { eq } from "drizzle-orm"

async function clearExpiredConnections() {
  console.log("Fetching expired social connections...")

  const connections = await db
    .select()
    .from(socialConnections)
    .where(eq(socialConnections.status, "expired"))

  console.log(`Found ${connections.length} expired connection(s)`)

  for (const conn of connections) {
    console.log(`\n[${conn.id}] ${conn.platform} - ${conn.accountName}`)
    console.log(`  Status: ${conn.status}`)
    console.log(`  Username: ${conn.accountUsername}`)
    console.log(`  Token expires at: ${conn.tokenExpiresAt}`)
    console.log(`  Created at: ${conn.createdAt}`)
  }

  if (connections.length === 0) {
    console.log("\nNo expired connections found.")
    return
  }

  console.log("\nDeleting expired connections...")

  for (const conn of connections) {
    await db
      .update(socialConnections)
      .set({ deletedAt: new Date() })
      .where(eq(socialConnections.id, conn.id))
    console.log(`  ✓ Deleted connection ${conn.id} (${conn.platform})`)
  }

  console.log("\nDone! You can now reconnect your accounts.")
}

clearExpiredConnections()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err)
    process.exit(1)
  })
