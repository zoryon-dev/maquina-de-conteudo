/**
 * SSE Stream Manager (Server-side)
 *
 * Utility for creating Server-Sent Events response streams in API routes.
 * Provides a simple API to push events to clients with proper SSE formatting,
 * heartbeat to keep connections alive, and graceful disconnect handling.
 *
 * Usage:
 * ```ts
 * return createSSEResponse(async (send, close) => {
 *   send({ type: "status", data: { status: "processing" } });
 *   // ...
 *   send({ type: "done", data: result });
 *   close();
 * });
 * ```
 */

export interface SSEEvent {
  type: string;
  data?: unknown;
}

type SendFn = (event: SSEEvent) => void;
type CloseFn = () => void;
type SSEHandler = (send: SendFn, close: CloseFn) => Promise<void>;

/** Default heartbeat interval: 30 seconds */
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Creates a Response object with a Server-Sent Events readable stream.
 *
 * - Sends events in `data: {json}\n\n` format
 * - Heartbeat every 30s to keep the connection alive
 * - Handles client disconnect via AbortController
 * - The handler receives `send()` and `close()` callbacks
 */
export function createSSEResponse(
  handler: SSEHandler,
  request?: Request
): Response {
  const abortController = new AbortController();

  // If the request has a signal, listen for its abort
  if (request?.signal) {
    request.signal.addEventListener("abort", () => {
      abortController.abort();
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      // Helper: write raw SSE text to the stream
      function write(text: string) {
        if (closed || abortController.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // Stream already closed — ignore
          closed = true;
        }
      }

      // send() pushes an SSE event
      const send: SendFn = (event) => {
        const payload = JSON.stringify(event);
        write(`data: ${payload}\n\n`);
      };

      // close() terminates the stream
      const close: CloseFn = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      // Heartbeat — keeps the connection alive
      const heartbeat = setInterval(() => {
        if (closed || abortController.signal.aborted) {
          clearInterval(heartbeat);
          return;
        }
        // SSE comment line (colon prefix) serves as keep-alive
        write(": heartbeat\n\n");
      }, HEARTBEAT_INTERVAL_MS);

      // Listen for client disconnect
      abortController.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      });

      try {
        await handler(send, close);
      } catch (error) {
        // Send error event before closing
        if (!closed && !abortController.signal.aborted) {
          const errorMessage =
            error instanceof Error ? error.message : "Internal server error";
          send({ type: "error", data: { error: errorMessage } });
        }
      } finally {
        clearInterval(heartbeat);
        if (!closed) {
          close();
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}

/**
 * Utility: sleep for a given number of milliseconds.
 * Resolves immediately if the AbortController is aborted.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}
