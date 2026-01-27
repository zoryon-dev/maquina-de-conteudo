/**
 * Facebook Graph API Service
 *
 * Handles content publishing, scheduling, and metrics for Facebook Pages.
 *
 * Key API endpoints:
 * - POST /{page-id}/feed - Create post
 * - POST /{page-id}/photos - Create photo post
 * - GET /{post-id}/insights - Get post metrics
 * - GET /{page-id} - Get page info
 *
 * Facebook supports native scheduling via scheduled_publish_time parameter.
 */

import type {
  MediaConfig,
  PublishResult,
  SocialMetrics,
  AccountMetrics,
} from "../types"
import {
  SocialApiError,
  SocialErrorCode,
  SocialPlatform,
  PublishedPostStatus,
} from "../types"

/**
 * Facebook Graph API Service
 */
export class FacebookAPIService {
  private readonly baseUrl = "https://graph.facebook.com"
  private readonly apiVersion = "v22.0"

  constructor(
    private readonly accessToken: string,
    private readonly pageId: string // Facebook Page ID
  ) {}

  /**
   * Publish a post (with optional native scheduling)
   *
   * Facebook supports native scheduling via:
   * - published: false
   * - scheduled_publish_time: Unix timestamp
   *
   * Scheduled range: 10 minutes to 30 days from request time
   *
   * @param config - Post configuration
   * @param isPhoto - Whether this is a photo post
   * @param scheduledTime - Optional Unix timestamp for scheduling
   * @returns Published post ID
   */
  async publishPost(
    config: {
      message?: string
      url?: string // For photo posts
      link?: string // For link posts
      published?: boolean
      scheduledPublishTime?: number // Unix timestamp
    },
    isPhoto = false
  ): Promise<string> {
    // Use /photos endpoint for photo posts, /feed for text/link posts
    const endpoint = isPhoto
      ? `${this.baseUrl}/${this.apiVersion}/${this.pageId}/photos`
      : `${this.baseUrl}/${this.apiVersion}/${this.pageId}/feed`

    const params = new URLSearchParams({
      access_token: this.accessToken,
    })

    if (config.message) {
      params.append("message", config.message)
    }

    if (isPhoto && config.url) {
      params.append("url", config.url)
    }

    if (!isPhoto && config.link) {
      params.append("link", config.link)
    }

    // Native scheduling support
    if (config.published !== undefined) {
      params.append("published", config.published.toString())
    }

    if (config.scheduledPublishTime !== undefined) {
      params.append(
        "scheduled_publish_time",
        config.scheduledPublishTime.toString()
      )
    }

    const response = await fetch(`${endpoint}?${params}`, {
      method: "POST",
    })

    const data = await response.json()

    if (data.error) {
      throw this.handleError(data.error)
    }

    return data.id
  }

  /**
   * Publish a complete post (single photo)
   *
   * @param config - Media configuration
   * @param scheduledFor - Optional scheduled date
   * @returns Publish result
   */
  async publishPhoto(
    config: MediaConfig,
    scheduledFor?: Date
  ): Promise<PublishResult> {
    let scheduledPublishTime: number | undefined

    if (scheduledFor) {
      // Validate scheduling range (10 minutes to 30 days)
      const now = Date.now()
      const scheduledTime = scheduledFor.getTime()
      const minTime = now + 10 * 60 * 1000 // 10 minutes
      const maxTime = now + 30 * 24 * 60 * 60 * 1000 // 30 days

      if (scheduledTime < minTime) {
        throw new SocialApiError(
          "Facebook posts must be scheduled at least 10 minutes in advance",
          SocialPlatform.FACEBOOK,
          SocialErrorCode.INVALID_MEDIA
        )
      }

      if (scheduledTime > maxTime) {
        throw new SocialApiError(
          "Facebook posts cannot be scheduled more than 30 days in advance",
          SocialPlatform.FACEBOOK,
          SocialErrorCode.INVALID_MEDIA
        )
      }

      scheduledPublishTime = Math.floor(scheduledTime / 1000)
    }

    const postId = await this.publishPost(
      {
        message: config.caption,
        url: config.imageUrl,
        published: scheduledFor ? false : true,
        scheduledPublishTime,
      },
      true // isPhoto
    )

    return {
      platformPostId: postId,
      platformPostUrl: `https://www.facebook.com/${postId}/`,
      status: scheduledFor
        ? PublishedPostStatus.SCHEDULED
        : PublishedPostStatus.PUBLISHED,
    }
  }

  /**
   * Get metrics for a specific post
   * GET /{post-id}/insights
   *
   * @param postId - Published post ID
   * @returns Post metrics
   */
  async getPostMetrics(postId: string): Promise<SocialMetrics> {
    const metrics =
      "post_impressions,post_impressions_unique,post_engaged_users,post_reactions_like_total,post_comments,post_shares"
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${postId}/insights?metric=${metrics}&access_token=${this.accessToken}`
    )

    const data = await response.json()

    if (data.error) {
      throw this.handleError(data.error)
    }

    const result: SocialMetrics = {}

    for (const metric of data.data || []) {
      switch (metric.name) {
        case "post_reactions_like_total":
          result.likeCount = metric.values[0].value
          break
        case "post_comments":
          result.commentsCount = metric.values[0].value
          break
        case "post_shares":
          result.sharesCount = metric.values[0].value
          break
        case "post_impressions":
        case "post_impressions_unique":
          if (!result.impressions) {
            result.impressions = metric.values[0].value
          }
          break
        case "post_engaged_users":
          // Total engaged users
          break
      }
    }

    // Calculate engagement rate
    if (result.impressions && result.likeCount) {
      result.engagementRate = (result.likeCount / result.impressions) * 100
    }

    return result
  }

  /**
   * Get page-level metrics
   * GET /{page-id}
   *
   * @returns Page metrics
   */
  async getPageMetrics(): Promise<AccountMetrics> {
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${this.pageId}?fields=fan_count,followers_count&access_token=${this.accessToken}`
    )

    const data = await response.json()

    if (data.error) {
      throw this.handleError(data.error)
    }

    return {
      followersCount: data.fan_count || data.followers_count || 0,
      mediaCount: 0, // Facebook doesn't expose post count easily
    }
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

    // Map Facebook error codes to our error types
    if (error.code === 190) {
      if (error.error_subcode === 458) {
        code = SocialErrorCode.TOKEN_EXPIRED
      } else {
        code = SocialErrorCode.AUTH_FAILED
      }
    } else if (error.code === 4) {
      code = SocialErrorCode.RATE_LIMITED
    } else if (error.code === 200) {
      code = SocialErrorCode.PERMISSION_DENIED
    } else if (error.code === 100) {
      code = SocialErrorCode.INVALID_MEDIA
    }

    return new SocialApiError(
      error.message,
      SocialPlatform.FACEBOOK,
      code,
      error
    )
  }
}
