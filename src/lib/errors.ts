/**
 * Application Error Classes
 *
 * Hierarquia de erros específicos para tratamento adequado de exceções.
 * Substitui catch-all genéricos por tipos específicos e type-safe.
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

/**
 * Base error class for all application errors
 * Provides consistent error structure with codes and status codes
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace?.(this, this.constructor)
  }

  /**
   * Convert error to JSON-serializable object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

// ============================================================================
// SPECIFIC ERROR CLASSES
// ============================================================================

/**
 * Validation error - invalid input data
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details)
    this.name = "ValidationError"
  }
}

/**
 * Authentication error - user not authenticated or token invalid
 */
export class AuthError extends AppError {
  constructor(message: string = "Authentication failed", details?: unknown) {
    super(message, "AUTH_ERROR", 401, details)
    this.name = "AuthError"
  }
}

/**
 * Authorization error - user lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Permission denied", details?: unknown) {
    super(message, "FORBIDDEN", 403, details)
    this.name = "ForbiddenError"
  }
}

/**
 * Not found error - resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`
    super(message, "NOT_FOUND", 404, { resource, identifier })
    this.name = "NotFoundError"
  }
}

/**
 * Network/External service error
 */
export class NetworkError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "NETWORK_ERROR", 503, details)
    this.name = "NetworkError"
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded", details?: unknown) {
    super(message, "RATE_LIMITED", 429, details)
    this.name = "RateLimitError"
  }
}

/**
 * Configuration error
 */
export class ConfigError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "CONFIG_ERROR", 500, details)
    this.name = "ConfigError"
  }
}

/**
 * Job/Queue processing error
 */
export class JobError extends AppError {
  constructor(message: string, public jobId?: number, details?: unknown) {
    super(message, "JOB_ERROR", 500, { jobId, ...(details && typeof details === "object" ? details : {}) })
    this.name = "JobError"
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

/**
 * Type guard to check if error is an AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

/**
 * Type guard to check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

/**
 * Type guard to check if error has a code property (like SocialApiError)
 */
export function hasErrorCode(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize unknown error to AppError
 * Converts Error objects, strings, or unknown types to AppError
 */
export function toAppError(error: unknown, defaultCode: string = "UNKNOWN_ERROR"): AppError {
  // Already an AppError - return as-is
  if (isAppError(error)) {
    return error
  }

  // Standard Error object
  if (error instanceof Error) {
    // Check for specific error types to map to AppErrors
    if (error.name === "ValidationError") {
      return new ValidationError(error.message, error)
    }
    if (error.name === "AuthError") {
      return new AuthError(error.message, error)
    }

    // Generic Error -> AppError with stack trace preserved
    const appError = new AppError(error.message, defaultCode, 500, error)
    appError.stack = error.stack
    return appError
  }

  // String error
  if (typeof error === "string") {
    return new AppError(error, defaultCode, 500)
  }

  // Unknown type - try to extract message
  if (error && typeof error === "object" && "message" in error) {
    const msg = String(error.message)
    return new AppError(msg, defaultCode, 500, error)
  }

  // Fallback
  return new AppError("An unknown error occurred", defaultCode, 500, error)
}

/**
 * Extract error message safely from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  if (hasErrorCode(error)) return error.message
  if (isAppError(error)) return error.message
  return "An unknown error occurred"
}

/**
 * Extract error code safely from unknown error
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) return error.code
  if (hasErrorCode(error)) return error.code
  return "UNKNOWN_ERROR"
}

/**
 * Check if error is retryable (network errors, rate limits, etc.)
 */
export function isRetryableError(error: unknown): boolean {
  if (isNetworkError(error)) return true
  if (error instanceof RateLimitError) return true

  // Check for retryable AppError codes
  if (isAppError(error)) {
    return ["NETWORK_ERROR", "RATE_LIMITED", "TIMEOUT"].includes(error.code)
  }

  // Check SocialApiError codes (import from social/types)
  if (hasErrorCode(error)) {
    return ["NETWORK_ERROR", "RATE_LIMITED", "TIMEOUT"].includes(error.code)
  }

  return false
}
