/**
 * POST /api/embeddings/process
 *
 * Manual trigger for document embedding (dev/testing only).
 * In production, use cron job to call /api/workers periodically.
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Call the worker to process pending jobs
    const workerUrl = new URL("/api/workers", request.url)
    const response = await fetch(workerUrl.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WORKER_SECRET || "dev-secret"}`,
        "Content-Type": "application/json",
      },
    })

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Process embeddings error:", error)
    return NextResponse.json(
      { error: "Failed to process embeddings" },
      { status: 500 }
    )
  }
}
