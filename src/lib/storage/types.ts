/**
 * Storage Abstraction Layer - Types
 *
 * Defines the interface for pluggable storage providers.
 * Supports both local filesystem and Cloudflare R2 storage.
 */

/**
 * Storage provider types
 */
export enum StorageProvider {
  LOCAL = "local",
  R2 = "r2",
}

/**
 * File metadata returned from storage
 */
export interface StorageMetadata {
  contentType?: string
  contentLength?: number
  etag?: string
  versionId?: string
  lastModified?: Date
  customMetadata?: Record<string, string>
}

/**
 * Upload result containing file location info
 */
export interface UploadResult {
  /** Unique key/identifier for the file in storage */
  key: string
  /** Public URL to access the file */
  url: string
  /** Which provider stored the file */
  provider: StorageProvider
  /** Optional metadata from storage operation */
  metadata?: StorageMetadata
}

/**
 * Upload options for storage providers
 */
export interface UploadOptions {
  /** MIME content type */
  contentType?: string
  /** Custom metadata to attach */
  metadata?: Record<string, string>
  /** Content encoding (e.g., "gzip") */
  contentEncoding?: string
}

/**
 * Signed URL options for private access
 */
export interface SignedUrlOptions {
  /** Expiration time in seconds (default: 3600) */
  expiresIn?: number
  /** Force download with content-disposition */
  download?: boolean
  /** Filename for download */
  filename?: string
}

/**
 * List options for batch operations
 */
export interface ListOptions {
  /** Prefix to filter results */
  prefix?: string
  /** Maximum number of results */
  limit?: number
  /** Continuation token for pagination */
  continuationToken?: string
}

/**
 * Listed file information
 */
export interface ListedFile {
  key: string
  size: number
  lastModified: Date
  etag?: string
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  provider: StorageProvider
  healthy: boolean
  latency?: number
  error?: string
}

/**
 * Base storage interface - all providers must implement this
 */
export interface IStorageProvider {
  /** Provider identifier */
  readonly provider: StorageProvider

  /**
   * Upload a file to storage
   * @param buffer - File content as buffer
   * @param key - Unique key/identifier for the file
   * @param options - Upload options (content type, metadata, etc.)
   * @returns Upload result with URL and metadata
   */
  uploadFile(
    buffer: Buffer,
    key: string,
    options?: UploadOptions
  ): Promise<UploadResult>

  /**
   * Delete a file from storage
   * @param key - File key to delete
   */
  deleteFile(key: string): Promise<void>

  /**
   * Get the public URL for a file
   * @param key - File key
   * @returns Public URL string
   */
  getFileUrl(key: string): string

  /**
   * Download a file from storage
   * @param key - File key to download
   * @returns File content as buffer
   */
  downloadFile(key: string): Promise<Buffer>

  /**
   * Check if a file exists in storage
   * @param key - File key to check
   * @returns True if file exists
   */
  fileExists(key: string): Promise<boolean>

  /**
   * Get a signed URL for private access (optional)
   * @param key - File key
   * @param options - Signed URL options
   * @returns Signed URL string
   */
  getSignedUrl?(key: string, options?: SignedUrlOptions): Promise<string>

  /**
   * Health check for the storage provider
   * @returns Health check result
   */
  healthCheck(): Promise<HealthCheckResult>
}

/**
 * Extended storage interface with batch operations
 */
export interface IStorageProviderWithBatch extends IStorageProvider {
  /**
   * Delete multiple files at once
   * @param keys - Array of file keys to delete
   */
  deleteFiles(keys: string[]): Promise<void>

  /**
   * List files in storage with optional prefix filter
   * @param options - List options
   * @returns Array of listed files
   */
  listFiles?(options?: ListOptions): Promise<ListedFile[]>
}

/**
 * Custom error class for storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public provider: StorageProvider,
    public cause?: unknown,
    public code?: string
  ) {
    super(message)
    this.name = "StorageError"
  }
}

/**
 * Error codes for storage operations
 */
export enum StorageErrorCode {
  UPLOAD_FAILED = "UPLOAD_FAILED",
  DOWNLOAD_FAILED = "DOWNLOAD_FAILED",
  DELETE_FAILED = "DELETE_FAILED",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  INVALID_KEY = "INVALID_KEY",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  AUTH_FAILED = "AUTH_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
}
