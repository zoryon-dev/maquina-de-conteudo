/**
 * SSE Stream API Route — Job Status
 *
 * GET /api/jobs/[id]/stream
 *
 * Generic SSE endpoint that streams job status updates.
 * - Requires authentication
 * - Verifies the job belongs to the current user
 * - Polls DB every 1 second and pushes status changes via SSE
 * - Sends heartbeat every 30s
 * - Auto-closes after 5 minutes (timeout)
 *
 * Event types:
 *   { type: "status", status: "pending" | "processing", progress?: number }
 *   { type: "completed", data: <job result> }
 *   { type: "failed", error: <error message> }
 */

import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSSEResponse, sleep } from "@/lib/sse/stream-manager";

/** DB poll interval: 1 second */
const POLL_INTERVAL_MS = 1_000;

/** Maximum stream duration: 5 minutes */
const MAX_STREAM_DURATION_MS = 5 * 60 * 1_000;

/** Max consecutive DB poll errors before giving up */
const MAX_CONSECUTIVE_DB_ERRORS = 10;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate first (before creating the stream)
  let userId: string;
  try {
    userId = await ensureAuthenticatedUser();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  const jobId = parseInt(id, 10);

  if (isNaN(jobId)) {
    return new Response(JSON.stringify({ error: "Invalid job ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify the job exists and belongs to the user
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .limit(1);

  if (!job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If the job is already completed or failed, return a single event and close
  if (job.status === "completed" || job.status === "failed") {
    return createSSEResponse(async (send, close) => {
      if (job.status === "completed") {
        send({ type: "completed", data: { status: "completed", result: job.result } });
      } else {
        send({ type: "failed", data: { status: "failed", error: job.error } });
      }
      close();
    }, request);
  }

  // Stream job status updates
  return createSSEResponse(async (send, close) => {
    const startTime = Date.now();
    let lastStatus = job.status;
    let consecutiveDbErrors = 0;

    // Send initial status
    send({
      type: "status",
      data: { status: job.status, jobId: job.id },
    });

    while (true) {
      // Check timeout
      if (Date.now() - startTime > MAX_STREAM_DURATION_MS) {
        send({
          type: "timeout",
          data: { message: "Stream timed out after 5 minutes" },
        });
        close();
        return;
      }

      // Wait before next poll
      await sleep(POLL_INTERVAL_MS);

      // Check if client disconnected (abort signal from createSSEResponse)
      // The sleep utility resolves immediately if aborted

      // Poll job status from DB
      try {
        const [currentJob] = await db
          .select()
          .from(jobs)
          .where(eq(jobs.id, jobId))
          .limit(1);

        // Reset error counter on successful poll
        consecutiveDbErrors = 0;

        if (!currentJob) {
          send({
            type: "failed",
            data: { status: "failed", error: "Job not found" },
          });
          close();
          return;
        }

        // Only send event if status changed or if processing (to update progress)
        const statusChanged = currentJob.status !== lastStatus;
        const isProcessing = currentJob.status === "processing";

        if (statusChanged || isProcessing) {
          lastStatus = currentJob.status;

          if (currentJob.status === "completed") {
            send({
              type: "completed",
              data: {
                status: "completed",
                result: currentJob.result,
              },
            });
            close();
            return;
          }

          if (currentJob.status === "failed") {
            send({
              type: "failed",
              data: {
                status: "failed",
                error: currentJob.error || "Job failed",
              },
            });
            close();
            return;
          }

          // Still processing or pending
          send({
            type: "status",
            data: {
              status: currentJob.status,
              jobId: currentJob.id,
              attempts: currentJob.attempts,
            },
          });
        }
      } catch (error) {
        consecutiveDbErrors++;
        console.error(
          `[SSE:JobStream] DB poll error (${consecutiveDbErrors}/${MAX_CONSECUTIVE_DB_ERRORS}):`,
          error
        );

        if (consecutiveDbErrors >= MAX_CONSECUTIVE_DB_ERRORS) {
          console.error(
            `[SSE:JobStream] Max consecutive DB errors reached for job ${jobId}, closing stream`
          );
          send({
            type: "error",
            data: { error: "Unable to check job status", code: "DB_POLL_FAILED" },
          });
          close();
          return;
        }
        // Transient DB errors — keep retrying
      }
    }
  }, request);
}
