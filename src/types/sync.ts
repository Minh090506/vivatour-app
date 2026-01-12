/**
 * Sync Types for Bidirectional Google Sheets Sync (Phase 07.5)
 *
 * Types for write operations, results, and retry configuration.
 */

// ============================================
// WRITE OPERATION TYPES
// ============================================

/**
 * Action type for sync operations
 */
export type SyncAction = "CREATE" | "UPDATE" | "DELETE";

/**
 * Model type for sync operations
 */
export type SyncModel = "Request" | "Operator" | "Revenue";

/**
 * Write operation to be executed on Google Sheets
 */
export interface WriteOperation {
  /** Sync action type */
  action: SyncAction;
  /** Model being synced */
  model: SyncModel;
  /** Database record ID */
  recordId: string;
  /** Row index in sheet (1-based, null for CREATE) */
  sheetRowIndex: number | null;
  /** Changed fields with values */
  payload: Record<string, unknown>;
}

/**
 * Row update data for batch operations
 */
export interface RowUpdate {
  /** 1-based row number in sheet */
  rowIndex: number;
  /** Column values (null converted to empty string) */
  values: (string | number | null)[];
}

// ============================================
// WRITE RESULT TYPES
// ============================================

/**
 * Result of a single write operation
 */
export interface WriteResult {
  /** Operation succeeded */
  success: boolean;
  /** Number of rows affected */
  rowsAffected: number;
  /** Updated row index (for CREATE operations) */
  rowIndex?: number;
  /** Error message if failed */
  error?: string;
  /** Error code if failed */
  errorCode?: number;
  /** Whether error is retryable */
  retryable?: boolean;
}

/**
 * Result of batch write operations
 */
export interface BatchWriteResult {
  /** Total operations attempted */
  total: number;
  /** Successful operations */
  succeeded: number;
  /** Failed operations */
  failed: number;
  /** Individual results */
  results: WriteResult[];
}

// ============================================
// RETRY CONFIGURATION
// ============================================

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds (doubles each retry) */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds */
  maxDelayMs: number;
  /** Add random jitter to delay (prevents thundering herd) */
  jitterMs?: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 64000,
  jitterMs: 1000,
};

// ============================================
// ERROR CLASSIFICATION
// ============================================

/**
 * Error category for sync operations
 */
export type ErrorCategory = "retryable" | "permanent" | "auth";

/**
 * Classified error with metadata
 */
export interface ClassifiedError {
  /** Original error */
  error: Error;
  /** Error code (HTTP status or custom) */
  code: number | null;
  /** Error category */
  category: ErrorCategory;
  /** Human-readable message */
  message: string;
  /** Whether to retry this error */
  shouldRetry: boolean;
}

/**
 * HTTP status codes that are retryable
 */
export const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504] as const;

/**
 * HTTP status codes that are permanent failures
 */
export const PERMANENT_STATUS_CODES = [400, 401, 403, 404] as const;

/**
 * Classify an error for retry decision
 */
export function classifyError(error: unknown): ClassifiedError {
  const err = error as { code?: number; message?: string; status?: number };
  const code = err.code ?? err.status ?? null;
  const message = err.message ?? "Unknown error";

  // Auth errors (401, 403)
  if (code === 401 || code === 403) {
    return {
      error: error instanceof Error ? error : new Error(message),
      code,
      category: "auth",
      message: `Authentication error: ${message}`,
      shouldRetry: false,
    };
  }

  // Retryable errors (429, 500, 502, 503, 504)
  if (code !== null && RETRYABLE_STATUS_CODES.includes(code as typeof RETRYABLE_STATUS_CODES[number])) {
    return {
      error: error instanceof Error ? error : new Error(message),
      code,
      category: "retryable",
      message: `Retryable error (${code}): ${message}`,
      shouldRetry: true,
    };
  }

  // Permanent errors (400, 404, etc.)
  if (code !== null && PERMANENT_STATUS_CODES.includes(code as typeof PERMANENT_STATUS_CODES[number])) {
    return {
      error: error instanceof Error ? error : new Error(message),
      code,
      category: "permanent",
      message: `Permanent error (${code}): ${message}`,
      shouldRetry: false,
    };
  }

  // Unknown errors - treat as retryable by default
  return {
    error: error instanceof Error ? error : new Error(message),
    code,
    category: "retryable",
    message: `Unknown error: ${message}`,
    shouldRetry: true,
  };
}

// ============================================
// RATE LIMIT TYPES
// ============================================

/**
 * Rate limit status information
 */
export interface RateLimitStatus {
  /** Requests made in current window */
  requestsInWindow: number;
  /** Milliseconds remaining in window */
  windowRemainingMs: number;
  /** Whether requests should be throttled */
  shouldThrottle: boolean;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Window duration in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  maxPerWindow: number;
}

/**
 * Default rate limit configuration (Google Sheets API)
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxPerWindow: 55, // Stay under 60/min quota
};
