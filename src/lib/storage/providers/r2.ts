/**
 * Cloudflare R2 Storage Provider
 *
 * Implements storage interface using Cloudflare R2 (S3-compatible).
 * Uses AWS SDK v3 for S3 operations.
 *
 * @see https://developers.cloudflare.com/r2/api/s3/api/
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Readable } from "stream"
import type {
  IStorageProviderWithBatch,
  UploadResult,
  UploadOptions,
  HealthCheckResult,
  SignedUrlOptions,
  ListOptions,
  ListedFile,
} from "../types"
import { StorageProvider, StorageError, StorageErrorCode } from "../types"
import { getR2Config } from "../config"
import { sanitizeMetadataForS3 } from "../encoding"
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Imported for future use when reading metadata from S3
import { restoreMetadataFromS3 } from "../encoding"

export interface R2StorageConfig {
  /** Cloudflare Account ID */
  accountId?: string
  /** R2 Access Key ID */
  accessKeyId?: string
  /** R2 Secret Access Key */
  secretAccessKey?: string
  /** R2 Bucket name */
  bucketName?: string
  /** Custom R2 endpoint (for testing/custom regions) */
  endpoint?: string
  /** Public URL for the bucket (for public access) */
  publicUrl?: string
}

/**
 * Cloudflare R2 storage provider using S3 SDK
 */
export class R2StorageProvider implements IStorageProviderWithBatch {
  readonly provider = StorageProvider.R2
  private client: S3Client
  private bucketName: string
  private publicUrl?: string

  constructor(config: R2StorageConfig = {}) {
    const cfg = getR2Config()

    this.bucketName = config.bucketName || cfg.bucketName
    this.publicUrl = config.publicUrl || cfg.publicUrl || undefined

    this.client = new S3Client({
      region: "auto",
      endpoint: config.endpoint || cfg.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId || cfg.accessKeyId,
        secretAccessKey: config.secretAccessKey || cfg.secretAccessKey,
      },
    })
  }

  /**
   * Upload a file to R2
   *
   * Note: Metadata is automatically sanitized to ensure ASCII-only values
   * for S3/R2 compatibility. Unicode characters are encoded as \uXXXX escapes.
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    // Sanitize metadata to ensure ASCII-only values (S3/R2 requirement)
    // Unicode characters are encoded as \uXXXX escape sequences
    const sanitizedMetadata = options?.metadata
      ? sanitizeMetadataForS3(options.metadata)
      : undefined

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: options?.contentType || "application/octet-stream",
      Metadata: sanitizedMetadata,
      ContentEncoding: options?.contentEncoding,
    })

    try {
      const response = await this.client.send(command)

      const url = this.getFileUrl(key)

      return {
        key,
        url,
        provider: this.provider,
        metadata: {
          etag: response.ETag,
          contentLength: buffer.length,
          contentType: options?.contentType,
        },
      }
    } catch (error) {
      throw new StorageError(
        `Failed to upload to R2: ${key}`,
        this.provider,
        error,
        StorageErrorCode.UPLOAD_FAILED
      )
    }
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    try {
      await this.client.send(command)
    } catch (error) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } }

      // Ignore NoSuchKey errors (file already gone)
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        return
      }

      throw new StorageError(
        `Failed to delete from R2: ${key}`,
        this.provider,
        error,
        StorageErrorCode.DELETE_FAILED
      )
    }
  }

  /**
   * Get public URL for a file
   * If public URL is configured, returns direct URL. Otherwise returns a placeholder.
   */
  getFileUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`
    }
    // Fallback: R2 native URL format (will require auth if bucket is private)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const endpoint = (this.client.config as any).endpoint?.hostname || "r2.cloudflarestorage.com"
    return `https://${this.bucketName}.${endpoint}/${key}`
  }

  /**
   * Download a file from R2
   */
  async downloadFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    try {
      const response = await this.client.send(command)

      if (!response.Body) {
        throw new StorageError(
          `Empty response body for: ${key}`,
          this.provider,
          undefined,
          StorageErrorCode.DOWNLOAD_FAILED
        )
      }

      // Convert stream to buffer
      const stream = response.Body as Readable
      const chunks: Uint8Array[] = []

      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      return Buffer.concat(chunks)
    } catch (error) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } }

      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        throw new StorageError(
          `File not found in R2: ${key}`,
          this.provider,
          error,
          StorageErrorCode.FILE_NOT_FOUND
        )
      }

      throw new StorageError(
        `Failed to download from R2: ${key}`,
        this.provider,
        error,
        StorageErrorCode.DOWNLOAD_FAILED
      )
    }
  }

  /**
   * Check if a file exists in R2
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
      await this.client.send(command)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get a signed URL for private access
   */
  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = (options?.filename || key)
      .replace(/["\n\r\\]/g, '_')
      .replace(/[^\x20-\x7E]/g, '_');

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ResponseContentDisposition: options?.download
        ? `attachment; filename="${sanitizedFilename}"`
        : undefined,
    })

    const expiresIn = options?.expiresIn || 3600

    try {
      return await getSignedUrl(this.client, command, { expiresIn })
    } catch (error) {
      throw new StorageError(
        `Failed to generate signed URL for: ${key}`,
        this.provider,
        error,
        StorageErrorCode.NETWORK_ERROR
      )
    }
  }

  /**
   * Health check for R2 storage
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      // Try to list objects (limit to 1) to verify connectivity
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1,
      })

      await this.client.send(command)

      return {
        provider: this.provider,
        healthy: true,
        latency: Date.now() - startTime,
      }
    } catch (error) {
      return {
        provider: this.provider,
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Delete multiple files at once
   * R2 supports up to 1000 keys per request
   */
  async deleteFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) return

    // Process in batches of 1000 (R2 limit)
    const batchSize = 1000

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize)

      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: false,
        },
      })

      try {
        await this.client.send(command)
      } catch (error) {
        throw new StorageError(
          `Failed to batch delete from R2`,
          this.provider,
          error,
          StorageErrorCode.DELETE_FAILED
        )
      }
    }
  }

  /**
   * List files in storage with optional prefix filter
   */
  async listFiles(options?: ListOptions): Promise<ListedFile[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: options?.prefix,
      MaxKeys: options?.limit || 1000,
      ContinuationToken: options?.continuationToken,
    })

    try {
      const response = await this.client.send(command)

      return (
        response.Contents?.map((object: { Key?: string; Size?: number; LastModified?: Date; ETag?: string }) => ({
          key: object.Key || "",
          size: object.Size || 0,
          lastModified: object.LastModified || new Date(),
          etag: object.ETag,
        })).filter((item) => item.key !== "") || []
      )
    } catch (error) {
      throw new StorageError(
        `Failed to list R2 objects`,
        this.provider,
        error,
        StorageErrorCode.NETWORK_ERROR
      )
    }
  }
}
