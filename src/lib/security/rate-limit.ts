/**
 * Rate Limiting Helper
 *
 * Uses @upstash/ratelimit with Redis for distributed rate limiting.
 * Falls back to no rate limiting when Redis is not configured (dev mode).
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

function createLimiter(requests: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      analytics: false,
    })
  }
  // Fallback: no rate limiting if Redis not configured
  return null
}

export const rateLimiters = {
  ai: createLimiter(20, "1 m"),
  upload: createLimiter(10, "1 m"),
  discovery: createLimiter(30, "1 m"),
  general: createLimiter(120, "1 m"),
}

export type RateLimitTier = keyof typeof rateLimiters

/**
 * Check rate limit for a user. Returns null if allowed, or a Response if rate limited.
 */
export async function checkRateLimit(
  userId: string,
  tier: RateLimitTier,
): Promise<Response | null> {
  const limiter = rateLimiters[tier]
  if (!limiter) return null // No Redis = no rate limiting (dev mode)

  const { success, limit, remaining, reset } = await limiter.limit(userId)
  if (!success) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    })
  }
  return null
}
