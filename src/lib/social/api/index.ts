/**
 * Social API Service Factory
 *
 * Following the storage abstraction layer pattern, this module provides
 * a factory function to get the appropriate social media service
 * based on the platform.
 *
 * @pattern Storage Abstraction Layer
 * @see src/lib/storage/providers/index.ts
 */

import type { SocialConnection } from "../types"
import { SocialPlatform } from "../types"
import { InstagramAPIService } from "./instagram"
import { FacebookAPIService } from "./facebook"

/**
 * Get the appropriate social API service for a connection
 *
 * @param connection - Social connection from database
 * @returns Platform-specific API service
 *
 * @example
 * ```ts
 * const connection = await db.query.socialConnections.findFirst(...)
 * const service = getSocialService(connection)
 * const result = await service.publishPost(config)
 * ```
 */
export function getSocialService(
  connection: Pick<SocialConnection, "platform" | "accessToken" | "accountId">
): InstagramAPIService | FacebookAPIService {
  switch (connection.platform) {
    case SocialPlatform.INSTAGRAM:
      return new InstagramAPIService(
        connection.accessToken,
        connection.accountId
      )

    case SocialPlatform.FACEBOOK:
      return new FacebookAPIService(
        connection.accessToken,
        connection.accountId
      )

    default:
      throw new Error(`Unsupported platform: ${connection.platform}`)
  }
}

/**
 * Get Instagram service directly
 *
 * @param accessToken - Instagram access token
 * @param accountId - Instagram Business Account ID
 */
export function getInstagramService(
  accessToken: string,
  accountId: string
): InstagramAPIService {
  return new InstagramAPIService(accessToken, accountId)
}

/**
 * Get Facebook service directly
 *
 * @param accessToken - Facebook page access token
 * @param pageId - Facebook Page ID
 */
export function getFacebookService(
  accessToken: string,
  pageId: string
): FacebookAPIService {
  return new FacebookAPIService(accessToken, pageId)
}

// Re-export services for convenience
export { InstagramAPIService } from "./instagram"
export { FacebookAPIService } from "./facebook"
