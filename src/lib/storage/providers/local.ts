/**
 * Local Storage Provider
 *
 * Implements storage interface using local filesystem.
 * Best for development and small deployments.
 */

import { readFile, writeFile, unlink, mkdir, stat } from "fs/promises"
import { existsSync } from "fs"
import { join, resolve, sep } from "path"
import { cwd } from "process"
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
import { getLocalConfig, isValidStorageKey } from "../config"

export interface LocalStorageConfig {
  /** Upload directory path (relative or absolute) */
  uploadDir?: string
  /** Base URL for generating file URLs */
  baseUrl?: string
}

/**
 * Local filesystem storage provider
 */
export class LocalStorageProvider implements IStorageProviderWithBatch {
  readonly provider = StorageProvider.LOCAL
  private uploadDir: string
  private baseUrl: string

  // SECURITY TODO: Move uploads outside public/ to prevent unauthenticated access.
  // Files should be served through authenticated API routes instead of static hosting.
  // Current path serves files without auth: /uploads/documents/{userId}/{file}
  constructor(config: LocalStorageConfig = {}) {
    const defaultConfig = getLocalConfig()
    this.uploadDir = config.uploadDir || defaultConfig.uploadDir
    this.baseUrl = config.baseUrl || defaultConfig.baseUrl

    // Resolve relative paths to absolute
    if (!this.uploadDir.startsWith("/")) {
      this.uploadDir = join(cwd(), this.uploadDir)
    }
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureDir(): Promise<void> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true })
    }
  }

  /**
   * Get full file path for a key
   */
  private getFilePath(key: string): string {
    if (!isValidStorageKey(key)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    const filePath = join(this.uploadDir, key);
    // Prevent path traversal: ensure resolved path is within uploadDir
    const resolvedPath = resolve(filePath);
    const resolvedUploadDir = resolve(this.uploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir + sep) && resolvedPath !== resolvedUploadDir) {
      throw new Error(`Path traversal detected: ${key}`);
    }
    return filePath;
  }

  /**
   * Upload a file to local storage
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    await this.ensureDir()

    const filePath = this.getFilePath(key)

    // Ensure parent directory exists for nested keys
    const dir = join(filePath, "..")
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    try {
      await writeFile(filePath, buffer, { mode: 0o644 })
    } catch (error) {
      throw new StorageError(
        `Failed to write file: ${key}`,
        this.provider,
        error,
        StorageErrorCode.UPLOAD_FAILED
      )
    }

    return {
      key,
      url: this.getFileUrl(key),
      provider: this.provider,
      metadata: {
        contentLength: buffer.length,
        contentType: options?.contentType,
        lastModified: new Date(),
      },
    }
  }

  /**
   * Delete a file from local storage
   */
  async deleteFile(key: string): Promise<void> {
    const filePath = this.getFilePath(key)

    try {
      await unlink(filePath)
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === "ENOENT") {
        // File doesn't exist, ignore
        return
      }
      throw new StorageError(
        `Failed to delete file: ${key}`,
        this.provider,
        error,
        StorageErrorCode.DELETE_FAILED
      )
    }
  }

  /**
   * Get public URL for a file
   */
  getFileUrl(key: string): string {
    // For local files, return URL relative to base
    return `${this.baseUrl}/uploads/documents/${key}`
  }

  /**
   * Download a file from local storage
   */
  async downloadFile(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key)

    try {
      return await readFile(filePath)
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === "ENOENT") {
        throw new StorageError(
          `File not found: ${key}`,
          this.provider,
          error,
          StorageErrorCode.FILE_NOT_FOUND
        )
      }
      throw new StorageError(
        `Failed to read file: ${key}`,
        this.provider,
        error,
        StorageErrorCode.DOWNLOAD_FAILED
      )
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key)
      await stat(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get signed URL (not applicable for local, returns regular URL)
   */
  async getSignedUrl(key: string, _options?: SignedUrlOptions): Promise<string> {
    return this.getFileUrl(key)
  }

  /**
   * Health check for local storage
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      // Check if directory is accessible
      await this.ensureDir()

      // Try to write and delete a temp file
      const testKey = ".health-check"
      const testPath = this.getFilePath(testKey)
      await writeFile(testPath, Buffer.from("test"), { flag: "wx" })
      await unlink(testPath)

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
   */
  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key))
    await Promise.allSettled(deletePromises)
  }

  /**
   * List files in storage with optional prefix filter
   * Note: This implementation is simplified and may be slow for large directories
   */
  async listFiles(options?: ListOptions): Promise<ListedFile[]> {
    const { readdir } = await import("fs/promises")
    const prefix = options?.prefix || ""
    const limit = options?.limit || 1000

    const results: ListedFile[] = []
    const searchDir = prefix ? this.getFilePath(prefix) : this.uploadDir

    if (!existsSync(searchDir)) {
      return results
    }

    const entries = await readdir(searchDir, { withFileTypes: true })

    for (const entry of entries) {
      if (results.length >= limit) break

      if (entry.isDirectory()) {
        // Recursively list subdirectories
        const subPrefix = prefix ? `${prefix}/${entry.name}` : entry.name
        const subResults = await this.listFiles({ ...options, prefix: subPrefix })
        results.push(...subResults.slice(0, limit - results.length))
      } else if (entry.isFile()) {
        const fullPath = join(searchDir, entry.name)
        const stats = await stat(fullPath)
        const key = prefix ? `${prefix}/${entry.name}` : entry.name

        results.push({
          key,
          size: stats.size,
          lastModified: stats.mtime,
        })
      }
    }

    return results
  }
}
