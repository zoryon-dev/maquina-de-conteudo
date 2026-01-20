/**
 * Instagram & Facebook OAuth Initiation Endpoint
 *
 * Initiates the OAuth 2.0 flow for Instagram or Facebook.
 * Redirects user to Meta's authorization page.
 *
 * Environment variables required:
 * - META_APP_ID: Meta App ID
 * - META_APP_SECRET: Meta App Secret (not used here, but required)
 * - META_REDIRECT_URI: OAuth redirect URI
 */

import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

// Environment variables with defaults
const META_APP_ID = process.env.META_APP_ID
const META_REDIRECT_URI = process.env.META_REDIRECT_URI

// OAuth scopes for each platform
const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_manage_insights",
  "instagram_manage_comments",
]

const FACEBOOK_SCOPES = [
  "pages_manage_posts",
  "pages_manage_engagement",
  "pages_read_engagement",
  "public_profile",
]

/**
 * GET /api/social/oauth
 *
 * Query params:
 * - platform: "instagram" | "facebook"
 *
 * Flow:
 * 1. Authenticate user with Clerk
 * 2. Generate state for CSRF protection
 * 3. Redirect to Meta's OAuth page
 */
export async function GET(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  if (!META_APP_ID || !META_REDIRECT_URI) {
    return new Response("Meta OAuth not configured", { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get("platform")

  if (platform !== "instagram" && platform !== "facebook") {
    return new Response("Invalid platform", { status: 400 })
  }

  // Generate state for CSRF protection
  // In production, this should be stored in Redis/DB with expiration
  const state = crypto.randomUUID()

  // Build OAuth URL based on platform
  const oauthUrl =
    platform === "instagram"
      ? buildInstagramOAuthUrl(state)
      : buildFacebookOAuthUrl(state)

  // Redirect to Meta's authorization page
  return redirect(oauthUrl)
}

/**
 * Build Instagram OAuth URL
 *
 * Instagram uses Instagram Basic Display for OAuth,
 * then we exchange for long-lived token and get Business Account info.
 */
function buildInstagramOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: META_APP_ID!,
    redirect_uri: META_REDIRECT_URI!,
    response_type: "code",
    scope: INSTAGRAM_SCOPES.join(","),
    state: `${state}_instagram`,
  })

  return `https://api.instagram.com/oauth/authorize?${params}`
}

/**
 * Build Facebook OAuth URL
 *
 * Facebook uses Facebook Login for Pages.
 * After user authorizes, we get the Page Access Token.
 */
function buildFacebookOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: META_APP_ID!,
    redirect_uri: META_REDIRECT_URI!,
    scope: FACEBOOK_SCOPES.join(","),
    response_type: "code",
    state: `${state}_facebook`,
    // Enable popup for better UX
    display: "popup",
    // Prompt for page selection if user has multiple pages
    extras: JSON.stringify({
      setup: {},
    }),
  })

  return `https://www.facebook.com/v22.0/dialog/oauth?${params}`
}
