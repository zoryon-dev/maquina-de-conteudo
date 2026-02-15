/**
 * useSSE — Client-side hook for consuming Server-Sent Events streams.
 *
 * Features:
 * - Creates an EventSource-like connection using fetch() (for custom headers)
 * - Parses JSON SSE events (`data: {json}\n\n`)
 * - Auto-reconnect on error (max 3 attempts, exponential backoff)
 * - Falls back to polling if SSE fails or is not supported
 * - Cleanup on unmount
 * - Disabled when url is null
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface UseSSEOptions<T> {
  /** SSE endpoint URL. Pass null to disable. */
  url: string | null;
  /** Called for every SSE message */
  onMessage?: (data: T) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when the stream completes (server closes the connection) */
  onComplete?: () => void;
  /** Fallback polling interval in ms (default: 2000) */
  fallbackPollingMs?: number;
  /** Function to call for polling fallback when SSE fails */
  fallbackPollFn?: () => Promise<T | null>;
}

export type SSEStatus = "idle" | "connecting" | "connected" | "error" | "closed";

export interface UseSSEReturn<T> {
  /** Latest data received */
  data: T | null;
  /** Connection status */
  status: SSEStatus;
  /** Last error, if any */
  error: Error | null;
}

/** Maximum number of reconnect attempts before falling back to polling */
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Hook that consumes an SSE stream with automatic fallback to polling.
 */
export function useSSE<T = unknown>(
  options: UseSSEOptions<T>
): UseSSEReturn<T> {
  const {
    url,
    onMessage,
    onError,
    onComplete,
    fallbackPollingMs = 2000,
    fallbackPollFn,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<SSEStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  // Refs to avoid stale closures
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onCompleteRef = useRef(onComplete);
  const fallbackPollFnRef = useRef(fallbackPollFn);
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isUsingPollingRef = useRef(false);

  // Keep refs up to date
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onCompleteRef.current = onComplete;
    fallbackPollFnRef.current = fallbackPollFn;
  }, [onMessage, onError, onComplete, fallbackPollFn]);

  // Cleanup helper
  const cleanup = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    isUsingPollingRef.current = false;
  }, []);

  // Start polling fallback
  const startPollingFallback = useCallback(() => {
    if (isUsingPollingRef.current || !fallbackPollFnRef.current) return;

    isUsingPollingRef.current = true;
    console.log("[useSSE] SSE failed, falling back to polling");

    const poll = async () => {
      if (!isMountedRef.current || !fallbackPollFnRef.current) return;
      try {
        const result = await fallbackPollFnRef.current();
        if (result && isMountedRef.current) {
          setData(result);
          onMessageRef.current?.(result);
        }
      } catch (err) {
        // Polling error — silent, will retry next interval
        console.warn("[useSSE] Polling fallback error:", err);
      }
    };

    // Immediate first poll
    poll();

    // Set up interval
    pollingRef.current = setInterval(poll, fallbackPollingMs);
  }, [fallbackPollingMs]);

  // Connect to SSE stream using fetch (to support custom headers in the future)
  const connectSSE = useCallback(
    async (targetUrl: string) => {
      if (!isMountedRef.current) return;

      // Abort any previous connection
      cleanup();

      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("connecting");
      setError(null);

      try {
        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            Accept: "text/event-stream",
          },
        });

        if (!response.ok) {
          throw new Error(
            `SSE connection failed: ${response.status} ${response.statusText}`
          );
        }

        if (!response.body) {
          throw new Error("SSE response has no body");
        }

        if (isMountedRef.current) {
          setStatus("connected");
          reconnectAttemptsRef.current = 0;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done || controller.signal.aborted) {
            if (isMountedRef.current && !controller.signal.aborted) {
              setStatus("closed");
              onCompleteRef.current?.();
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE messages from buffer
          // Messages are separated by double newline
          const messages = buffer.split("\n\n");
          // Keep incomplete last message in buffer
          buffer = messages.pop() || "";

          for (const message of messages) {
            if (!message.trim()) continue;

            // Skip comment lines (heartbeat)
            const lines = message.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6);
                try {
                  const parsed = JSON.parse(jsonStr) as T;
                  if (isMountedRef.current) {
                    setData(parsed);
                    onMessageRef.current?.(parsed);
                  }
                } catch {
                  // Not valid JSON — skip
                  console.warn("[useSSE] Failed to parse SSE data:", jsonStr);
                }
              }
              // Ignore comment lines (: heartbeat) and other fields
            }
          }
        }
      } catch (err) {
        // Ignore abort errors (cleanup)
        if (controller.signal.aborted) return;

        const sseError =
          err instanceof Error ? err : new Error("SSE connection error");

        if (isMountedRef.current) {
          setError(sseError);
          setStatus("error");
          onErrorRef.current?.(sseError);

          // Retry with exponential backoff
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay =
              1000 * Math.pow(2, reconnectAttemptsRef.current);
            reconnectAttemptsRef.current += 1;
            console.log(
              `[useSSE] Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`
            );

            setTimeout(() => {
              if (isMountedRef.current) {
                connectSSE(targetUrl);
              }
            }, delay);
          } else {
            // Max attempts reached — fall back to polling
            console.warn(
              "[useSSE] Max reconnect attempts reached, switching to polling fallback"
            );
            startPollingFallback();
          }
        }
      }
    },
    [cleanup, startPollingFallback]
  );

  // Main effect: connect when URL changes
  useEffect(() => {
    isMountedRef.current = true;

    if (!url) {
      setStatus("idle");
      setData(null);
      setError(null);
      cleanup();
      return;
    }

    reconnectAttemptsRef.current = 0;
    connectSSE(url);

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [url, connectSSE, cleanup]);

  return { data, status, error };
}
