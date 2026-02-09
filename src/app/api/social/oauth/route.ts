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
import { db } from "@/db"
import { oauthSessions } from "@/db/schema"

// Environment variables with defaults
const META_APP_ID = process.env.META_APP_ID
const META_APP_SECRET = process.env.META_APP_SECRET
const META_REDIRECT_URI = process.env.META_REDIRECT_URI

// Meta Graph API version
const META_API_VERSION = "v21.0"

// IMPORTANT: OAuth Dialog uses www.facebook.com, NOT graph.facebook.com
// Graph API is for API calls, OAuth Dialog is for user authorization
const META_OAUTH_DIALOG_URL = `https://www.facebook.com/${META_API_VERSION}`
const META_GRAPH_API_URL = `https://graph.facebook.com/${META_API_VERSION}`

/**
 * OAuth scopes for Instagram Business Login
 *
 * NOTE: We use Facebook OAuth Dialog for Instagram, so we need both
 * Instagram and Facebook Page scopes.
 *
 * Instagram scopes:
 * - instagram_basic: Basic profile data
 * - instagram_content_publish: Publish media
 * - instagram_manage_insights: Access metrics
 * - instagram_manage_comments: Manage comments
 *
 * Facebook Page scopes (required because IG Business is linked to FB Page):
 * - pages_show_list: List user's managed pages
 * - pages_read_engagement: Read page insights and engagement
 * - pages_read_user_content: Read posts and comments on page
 * - pages_manage_posts: Create and manage page posts
 * - pages_manage_metadata: Read page metadata
 * - business_management: Manage business assets
 */
const INSTAGRAM_SCOPES = [
  // Instagram scopes
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "instagram_manage_comments",
  // Facebook Page scopes (required for IG Business)
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "pages_manage_posts",
  "pages_manage_metadata",
  "business_management",
]

/**
 * OAuth scopes for Facebook Pages
 *
 * These scopes allow:
 * - Listing user's pages
 * - Reading page content and insights
 * - Publishing posts
 * - Managing page metadata
 */
const FACEBOOK_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "read_insights",
  "pages_manage_metadata",
  "pages_manage_posts",
  "business_management",
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

  // Generate state for CSRF protection that includes userId
  // Format: base64({userId}:{platform}:{randomUUID})
  // This allows us to recover userId after OAuth redirect when Clerk session may not be available
  const stateId = crypto.randomUUID()
  const stateData = `${userId}:${platform}:${stateId}`
  const state = Buffer.from(stateData).toString('base64')

  // Store state for CSRF validation (server-side)
  // The callback will verify this stateId exists and matches the userId
  await db.insert(oauthSessions).values({
    id: stateId,
    userId: userId,
    platform: platform,
    pagesData: { pages: [], _pending: true }, // Placeholder until callback populates
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
  })

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
 * IMPORTANT: Uses Facebook OAuth Dialog, NOT Instagram OAuth endpoint.
 *
 * Instagram Business Accounts are linked to Facebook Pages, so the OAuth flow
 * must go through Facebook to:
 * 1. Get the user's access token
 * 2. List their managed Facebook Pages
 * 3. Find pages with Instagram Business accounts linked
 * 4. Allow user to select which page/IG account to connect
 *
 * Docs: https://developers.facebook.com/docs/facebook-login/guides/advanced-oauth
 *
 * NOTE: OAuth Dialog URL uses www.facebook.com, NOT graph.facebook.com
 * The 'extras' parameter with JSON is NOT supported and causes errors
 */
function buildInstagramOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: META_APP_ID!,
    redirect_uri: META_REDIRECT_URI!,
    response_type: "code",
    scope: INSTAGRAM_SCOPES.join(","),
    state: `${state}_instagram`,
  })

  // Use Facebook OAuth Dialog (www.facebook.com) for Instagram Business Login
  return `${META_OAUTH_DIALOG_URL}/dialog/oauth?${params}`
}

/**
 * Build Facebook OAuth URL
 *
 * Facebook Login for Pages with proper scopes.
 * After user authorizes, we get the User Access Token which can be
 * exchanged for Page Access Tokens.
 */
function buildFacebookOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: META_APP_ID!,
    redirect_uri: META_REDIRECT_URI!,
    scope: FACEBOOK_SCOPES.join(","),
    response_type: "code",
    state: `${state}_facebook`,
  })

  return `${META_OAUTH_DIALOG_URL}/dialog/oauth?${params}`
}
