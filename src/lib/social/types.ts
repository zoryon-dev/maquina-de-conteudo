/**
 * Social Media Integration Types
 *
 * Following the storage abstraction layer pattern, this module defines
 * the interface for pluggable social media platform integrations.
 */

/**
 * Supported social media platforms
 */
export enum SocialPlatform {
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook",
}

/**
 * Social connection status
 */
export enum SocialConnectionStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked",
  ERROR = "error",
}

/**
 * Published post status
 */
export enum PublishedPostStatus {
  PUBLISHING = "publishing",
  PUBLISHED = "published",
  FAILED = "failed",
  SCHEDULED = "scheduled",
}

/**
 * Media types for social posts
 */
export enum SocialMediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  CAROUSEL = "CAROUSEL",
  REELS = "REELS",
  STORIES = "STORIES",
}

/**
 * Social connection data from database
 */
export interface SocialConnection {
  id: number
  userId: string
  platform: SocialPlatform
  accountId: string // IG Business ID or FB Page ID
  accountName?: string // Display name
  accountUsername?: string // @username
  accountProfilePic?: string
  accessToken: string // Long-lived token
  tokenExpiresAt?: Date | null
  status: SocialConnectionStatus
  metadata?: SocialConnectionMetadata | null
  lastVerifiedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

/**
 * Additional metadata for social connections
 */
export interface SocialConnectionMetadata {
  permissions?: string[] // Granted OAuth permissions
  scopes?: string[] // OAuth scopes
  pageId?: string // Facebook Page ID
  igUserId?: string // Instagram User ID
}

/**
 * Media configuration for publishing
 */
export interface MediaConfig {
  imageUrl: string // Public URL of the media
  caption?: string // Post caption/text
  mediaType: SocialMediaType
  locationId?: string // For location tagging (Instagram)
  userTags?: UserTag[] // Tag users in post
}

/**
 * User tagging for posts
 */
export interface UserTag {
  username: string // Instagram username (without @)
  x: number // Position X (0-1 range)
  y: number // Position Y (0-1 range)
}

/**
 * Carousel item configuration
 */
export interface CarouselItem {
  imageUrl: string
  mediaType: SocialMediaType.IMAGE | SocialMediaType.VIDEO
}

/**
 * Publish result from platform API
 */
export interface PublishResult {
  platformPostId: string // Platform's post ID
  platformPostUrl: string // URL to view the post
  status: PublishedPostStatus
}

/**
 * Publishing options
 */
export interface PublishOptions {
  scheduledFor?: Date // For server-side scheduling (Instagram)
  published?: boolean // For Facebook native scheduling
  scheduledPublishTime?: number // Unix timestamp for Facebook
}

/**
 * Social metrics from platform
 */
export interface SocialMetrics {
  likeCount?: number
  commentsCount?: number
  sharesCount?: number
  impressions?: number
  reach?: number
  savedCount?: number // Instagram specific
  engagementRate?: number // Calculated metric
}

/**
 * Account-level metrics
 */
export interface AccountMetrics {
  followersCount?: number
  mediaCount?: number
  followCount?: number // Instagram
}

/**
 * Publishing limit info (Instagram)
 */
export interface PublishingLimit {
  quota: number // Total quota per 24h
  usage: number // Current usage
  remaining: number // Remaining quota
  resetTime?: Date // When quota resets
}

/**
 * Container status for Instagram media publishing
 */
export enum ContainerStatus {
  FINISHED = "FINISHED",
  IN_PROGRESS = "IN_PROGRESS",
  ERROR = "ERROR",
  EXPIRED = "EXPIRED",
}

/**
 * Error from social API
 */
export class SocialApiError extends Error {
  constructor(
    message: string,
    public platform: SocialPlatform,
    public code?: string,
    public cause?: unknown
  ) {
    super(message)
    this.name = "SocialApiError"
  }
}

/**
 * Error codes for social operations
 */
export enum SocialErrorCode {
  AUTH_FAILED = "AUTH_FAILED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  RATE_LIMITED = "RATE_LIMITED",
  INVALID_MEDIA = "INVALID_MEDIA",
  PUBLISH_FAILED = "PUBLISH_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  ACCOUNT_DELETED = "ACCOUNT_DELETED",
}
