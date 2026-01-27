# Instagram Publishing API Errors (Jan 2026)

## Error: "Cannot parse access token"

### Symptom
```
{
  "error": {
    "message": "Cannot parse access token",
    "type": "OAuthException",
    "code": 190
  }
}
```

### Root Cause
Using `https://graph.instagram.com` as the base URL for Instagram Content Publishing API. The `graph.instagram.com` endpoint has limited token format support and doesn't accept Page Access Tokens properly.

### Solution
Change base URL from `graph.instagram.com` to `graph.facebook.com`:

```typescript
// ❌ WRONG
private readonly baseUrl = "https://graph.instagram.com"

// ✅ CORRECT
private readonly baseUrl = "https://graph.facebook.com"
```

**Why?** The Instagram Content Publishing API is accessible via both endpoints, but `graph.facebook.com`:
- Has better token parsing support
- Is more compatible with Page Access Tokens
- Is the documented endpoint for Content Publishing operations

Reference: [Instagram Content Publishing API](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media)

---

## Error: Carousel Only Publishing First Image

### Symptom
When publishing a carousel with multiple images, only the first image is published to Instagram.

### Root Cause
The code was treating all posts as single media posts, always using `mediaUrls[0]` and not implementing the carousel-specific flow.

### Solution
1. Add `isCarouselItem` flag to `MediaConfig` interface
2. Detect carousel posts (multiple URLs)
3. Create individual containers with `is_carousel_item: true`
4. Create parent carousel container with children

```typescript
// Detect carousel
const isCarousel = mediaUrls.length > 1

if (isCarousel) {
  // Create individual containers for each item
  const itemContainerIds = await Promise.all(
    carouselItems.map((item) =>
      this.createContainer({
        imageUrl: item.imageUrl,
        isCarouselItem: true,  // IMPORTANT
      })
    )
  )

  // Create parent carousel container
  containerId = await this.createCarouselContainer(
    itemContainerIds,
    config.caption
  )
}
```

---

## Error: Token in Query Parameter vs JSON Body

### Symptom
```
{
  "error": {
    "message": "Invalid parameter",
    "type": "OAuthException",
    "code": 100
  }
}
```

### Root Cause
Sending `access_token` as a query parameter in POST requests instead of in the JSON body.

### Solution
For POST requests to Instagram Graph API, always send `access_token` in the JSON body:

```typescript
// ❌ WRONG - Query parameter
const response = await fetch(
  `https://graph.facebook.com/v22.0/${igUserId}/media?access_token=${token}`,
  {
    method: "POST",
    body: formData,
  }
)

// ✅ CORRECT - JSON body
const response = await fetch(
  `https://graph.facebook.com/v22.0/${igUserId}/media`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: caption,
      access_token: token,  // In body
    }),
  }
)
```

---

## Error: OAuth Session Expired (Next.js Redirect Limitation)

### Symptom
After OAuth callback, user can select pages but gets "Session expired" error when saving connection.

### Root Cause
Next.js `NextResponse.redirect()` does NOT send `Set-Cookie` headers. This is a known limitation:
- GitHub Discussion: [Next.js #48434](https://github.com/vercel/next.js/discussions/48434)

Cookies are discarded when using `NextResponse.redirect()`, so the session data is lost.

### Solution
Use database session storage instead of cookies:

1. Create `oauthSessions` table with 15-minute TTL
2. Store OAuth data in database during callback
3. Pass `session_id` in URL redirect
4. Fetch session data when saving connection

```typescript
// Callback: Save to database
const sessionId = crypto.randomUUID()
await db.insert(oauthSessions).values({
  id: sessionId,
  userId,
  platform: "instagram",
  longLivedToken,
  pagesData: { pages: pagesWithInstagram },
  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
})

// Redirect with session_id
redirect(`/settings?session_id=${sessionId}`)

// Save connection: Fetch from database
const session = await db.query.oauthSessions.findOne({ id: sessionId })
if (!session || new Date() > session.expiresAt) {
  return { error: "Session expired" }
}

// Clean up after use
await db.delete(oauthSessions).where({ id: sessionId })
```

---

## Error: Using Wrong Token Type

### Symptom
```
{
  "error": {
    "message": "Invalid OAuth access token - Does not have permission",
    "code": 190
  }
}
```

### Root Cause
Using User Access Token for Content Publishing API instead of Page Access Token.

### Solution
Use Page Access Token (prefix `EAF`) for Instagram Content Publishing API:

```typescript
// ❌ WRONG - User Access Token
const service = getInstagramService(connection.accessToken, accountId)

// ✅ CORRECT - Page Access Token
const service = getInstagramService(connection.pageAccessToken, accountId)
```

**Token Types Reference:**

| Prefix | Type | Duration | Usage |
|---------|------|----------|-------|
| `EAA` / `EAAB` | User Access Token (Short) | 1-2 hours | Initial OAuth |
| `EAAE` | User Access Token (Long) | 60 days | Fetch pages, debug |
| `EAF` | Page Access Token | 60 days (effectively permanent) | **Content Publishing** |

---

## Debugging Token Issues

### Using debug_token Endpoint

```typescript
const appAccessToken = `${META_APP_ID}|${META_APP_SECRET}`
const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${appAccessToken}`

const debug = await fetch(debugUrl).then(r => r.json())
console.log(debug.data)
// {
//   type: "USER" | "PAGE",
//   is_valid: true,
//   scopes: ["instagram_basic", "instagram_content_publish", ...],
//   granular_scopes: [{ scope, target_ids }],
//   expires_at: 1234567890
// }
```

### Checking Publishing Quota

```typescript
const limitUrl = `https://graph.facebook.com/v21.0/${igAccountId}/content_publishing_limit?access_token=${token}`
const limit = await fetch(limitUrl).then(r => r.json())
// {
//   quota_usage: {
//     quota_total: 100,
//     quota_used: 5
//   }
// }
```

---

## Related Files

- `src/lib/social/api/instagram.ts` - Instagram API service
- `src/app/api/social/publish/route.ts` - Publish endpoint
- `src/lib/social/types.ts` - Type definitions
- `src/app/api/social/callback/route.ts` - OAuth callback handler
- `src/app/api/social/save-connection/route.ts` - Connection saver

---

## References

- [Instagram Content Publishing API](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media)
- [Facebook OAuth Dialog](https://developers.facebook.com/docs/facebook-login/guides/advanced-oauth)
- [Token Reference](https://developers.facebook.com/docs/facebook-login/guides/access-tokens)
- [Next.js Redirect Discussion](https://github.com/vercel/next.js/discussions/48434)

---

*Documented: January 2026*
