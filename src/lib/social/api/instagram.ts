/**
 * Instagram Graph API Service
 *
 * Handles content publishing, scheduling, and metrics for Instagram.
 *
 * Key API endpoints:
 * - POST /{ig-user-id}/media - Create media container
 * - POST /{ig-user-id}/media_publish - Publish container
 * - GET /{ig-container-id} - Get container status
 * - GET /{ig-user-id}/content_publishing_limit - Get quota
 * - GET /{media-id}/insights - Get media metrics
 */

import type {
  MediaConfig,
  CarouselItem,
  PublishResult,
  PublishingLimit,
  SocialMetrics,
  AccountMetrics,
} from "../types"
import {
  SocialApiError,
  SocialErrorCode,
  SocialPlatform,
  ContainerStatus,
  PublishedPostStatus,
} from "../types"

/**
 * Instagram Graph API Service
 */
export class InstagramAPIService {
  // NOTE: Using graph.facebook.com instead of graph.instagram.com
  // The Instagram Content Publishing API is accessible via both endpoints,
  // but graph.facebook.com is more compatible with Page Access Tokens
  // and has better token parsing support.
  // Reference: https://developers.facebook.com/docs/instagram-api/reference/ig-user/media
  private readonly baseUrl = "https://graph.facebook.com"
  private readonly apiVersion = "v22.0"

  constructor(
    private readonly accessToken: string,
    private readonly accountId: string // IG Business Account ID
  ) {}

  /**
   * Create a media container for a single image/video
   * POST /{ig-user-id}/media
   *
   * Reference: https://developers.facebook.com/docs/instagram-api/reference/ig-user/media
   * Note: access_token should be in request body for POST requests
   *
   * @param config - Media configuration
   * @returns Container ID
   */
  async createContainer(config: MediaConfig): Promise<string> {
    // Build request body as JSON (access_token in body, not query param)
    const body: Record<string, any> = {
      image_url: config.imageUrl,
      access_token: this.accessToken,
    }

    if (config.caption) {
      body.caption = config.caption
    }

    if (config.locationId) {
      body.location_id = config.locationId
    }

    // Add user tags if provided
    if (config.userTags && config.userTags.length > 0) {
      body.user_tags = config.userTags.map((tag) => ({
        username: tag.username,
        x: tag.x,
        y: tag.y,
      }))
    }

    const url = `${this.baseUrl}/${this.apiVersion}/${this.accountId}/media`
    console.log("[Instagram API] Creating container with POST body:", {
      url,
      image_url: body.image_url,
      has_caption: !!body.caption,
      token_prefix: this.accessToken.substring(0, 10) + "...",
    })

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.error) {
      throw this.handleError(data.error)
    }

    return data.id
  }

  /**
   * Create a carousel container with multiple media items
   *
   * @param children - Array of container IDs (from createContainer)
   * @param caption - Optional caption for the carousel
   * @returns Carousel container ID
   */
  async createCarouselContainer(
    children: string[],
    caption?: string
  ): Promise<string> {
    const body: Record<string, any> = {
      media_type: "CAROUSEL",
      children: children.join(","),
      access_token: this.accessToken,
    }

    if (caption) {
      body.caption = caption
    }

    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${this.accountId}/media`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()

    if (data.error) {
      throw this.handleError(data.error)
    }

    return data.id
  }

  /**
   * Publish a media container
   * POST /{ig-user-id}/media_publish
   *
   * @param containerId - Container ID from createContainer
   * @returns Published media ID
   */
  async publish(containerId: string): Promise<string> {
    const body = {
      creation_id: containerId,
      access_token: this.accessToken,
    }

    console.log("[Instagram API] Publishing container:", {
      url: `${this.baseUrl}/${this.apiVersion}/${this.accountId}/media_publish`,
      creation_id: containerId,
      token_prefix: this.accessToken.substring(0, 10) + "...",
    })

    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${this.accountId}/media_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()

    if (data.error) {
      throw this.handleError(data.error)
    }

    console.log("[Instagram API] Publish succeeded, media_id:", data.id)
    return data.id
  }

  /**
   * Get the current publishing quota usage
   * GET /{ig-user-id}/content_publishing_limit
   *
   * Instagram API has a 24-hour rolling window limit
   *
   * @returns Publishing quota info
   */
  async getPublishingLimit(): Promise<PublishingLimit> {
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${this.accountId}/content_publishing_limit?access_token=${this.accessToken}`
    )

    const data = await response.json()

    if (data.error) {
      throw this.handleError(data.error)
    }

    const quotaUsage = data.quota_usage

    return {
      quota: quotaUsage?.quota_total || 100,
      usage: quotaUsage?.quota_used || 0,
      remaining: (quotaUsage?.quota_total || 100) - (quotaUsage?.quota_used || 0),
    }
  }

  /**
   * Check the status of a media container
   * GET /{ig-container-id}
   *
   * @param containerId - Container ID to check
   * @returns Container status code
   */
  async getContainerStatus(containerId: string): Promise<ContainerStatus> {
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${containerId}?fields=status_code&access_token=${this.accessToken}`
    )

    const data = await response.json()

    if (data.error) {
      throw this.handleError(data.error)
    }

    return data.status_code
  }

  /**
   * Get metrics for a specific media
   * GET /{media-id}/insights
   *
   * @param mediaId - Published media ID
   * @returns Media metrics
   */
  async getMediaMetrics(mediaId: string): Promise<SocialMetrics> {
    const metrics =
      "like_count,comments_count,saved_count,shares_count,impressions,reach"
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${mediaId}/insights?metric=${metrics}&access_token=${this.accessToken}`
    )

    const data = await response.json()

    if (data.error) {
      throw this.handleError(data.error)
    }

    const result: SocialMetrics = {}

    for (const metric of data.data || []) {
      switch (metric.name) {
        case "like_count":
          result.likeCount = metric.values[0].value
          break
        case "comments_count":
          result.commentsCount = metric.values[0].value
          break
        case "saved_count":
          result.savedCount = metric.values[0].value
          break
        case "shares_count":
          result.sharesCount = metric.values[0].value
          break
        case "impressions":
          result.impressions = metric.values[0].value
          break
        case "reach":
          result.reach = metric.values[0].value
          break
      }
    }

    // Calculate engagement rate
    if (result.impressions && (result.likeCount || result.commentsCount)) {
      const engagements = (result.likeCount || 0) + (result.commentsCount || 0)
      result.engagementRate = (engagements / result.impressions) * 100
    }

    return result
  }

  /**
   * Get account-level metrics
   * GET /{ig-user-id}
   *
   * @returns Account metrics
   */
  async getAccountMetrics(): Promise<AccountMetrics> {
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${this.accountId}?fields=followers_count,media_count&access_token=${this.accessToken}`
    )

    const data = await response.json()

    if (data.error) {
      throw this.handleError(data.error)
    }

    return {
      followersCount: data.followers_count || 0,
      mediaCount: data.media_count || 0,
    }
  }

  /**
   * Publish a complete post (create container + publish)
   * Handles single media and carousels
   *
   * @param config - Media configuration
   * @param isCarousel - Whether this is a carousel
   * @param carouselItems - Carousel items (if isCarousel is true)
   * @returns Publish result
   */
  async publishPost(
    config: MediaConfig,
    isCarousel = false,
    carouselItems?: CarouselItem[]
  ): Promise<PublishResult> {
    let containerId: string

    if (isCarousel && carouselItems && carouselItems.length > 0) {
      // Create individual containers for each item
      const itemContainerIds = await Promise.all(
        carouselItems.map((item) =>
          this.createContainer({
            imageUrl: item.imageUrl,
            mediaType: item.mediaType,
          })
        )
      )

      // Create carousel container
      containerId = await this.createCarouselContainer(
        itemContainerIds,
        config.caption
      )
    } else {
      // Single media container
      containerId = await this.createContainer(config)
    }

    // Wait for container to be ready (Instagram async processing)
    await this.waitForContainer(containerId)

    // Publish the container
    const mediaId = await this.publish(containerId)

    return {
      platformPostId: mediaId,
      platformPostUrl: `https://www.instagram.com/p/${mediaId}/`,
      status: PublishedPostStatus.PUBLISHED,
    }
  }

  /**
   * Wait for a container to finish processing
   *
   * @param containerId - Container ID
   * @param maxAttempts - Maximum polling attempts (default: 10)
   * @param interval - Polling interval in ms (default: 2000)
   */
  private async waitForContainer(
    containerId: string,
    maxAttempts = 10,
    interval = 2000
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getContainerStatus(containerId)

      if (status === ContainerStatus.FINISHED) {
        return
      }

      if (status === ContainerStatus.ERROR || status === ContainerStatus.EXPIRED) {
        throw new SocialApiError(
          `Container processing failed with status: ${status}`,
          SocialPlatform.INSTAGRAM,
          SocialErrorCode.PUBLISH_FAILED
        )
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw new SocialApiError(
      "Container processing timed out",
      SocialPlatform.INSTAGRAM,
      SocialErrorCode.PUBLISH_FAILED
    )
  }

  /**
   * Handle API error and convert to SocialApiError
   */
  private handleError(error: {
    message: string
    code?: number
    error_subcode?: number
    type?: string
  }): SocialApiError {
    let code = SocialErrorCode.PUBLISH_FAILED

    // Log full error details for debugging
    console.error("[Instagram API] Full error details:", JSON.stringify(error, null, 2))

    // Map Instagram error codes to our error types
    if (error.code === 190) {
      code = SocialErrorCode.TOKEN_EXPIRED
    } else if (error.code === 4) {
      code = SocialErrorCode.RATE_LIMITED
    } else if (error.code === 200) {
      code = SocialErrorCode.PERMISSION_DENIED
    } else if (error.code === 100) {
      code = SocialErrorCode.INVALID_MEDIA
    }

    return new SocialApiError(
      error.message,
      SocialPlatform.INSTAGRAM,
      code,
      error
    )
  }
}
