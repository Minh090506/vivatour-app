/**
 * Simple Logger Utility
 *
 * Provides structured error logging for API routes and components.
 * In production, extend to send to external services (Sentry, LogRocket, etc.)
 *
 * @example
 * import { logError, logWarn, logInfo } from '@/lib/logger';
 *
 * try {
 *   // ... code
 * } catch (error) {
 *   logError('api/revenues', error);
 * }
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  stack?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Format error for logging
 */
function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

/**
 * Create log entry
 */
function createLogEntry(
  level: LogLevel,
  context: string,
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    level,
    context,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Output log to console (extend for external services)
 */
function outputLog(entry: LogEntry) {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;

  switch (entry.level) {
    case "error":
      console.error(prefix, entry.message, entry.data || "");
      if (entry.stack) console.error(entry.stack);
      break;
    case "warn":
      console.warn(prefix, entry.message, entry.data || "");
      break;
    case "info":
      console.log(prefix, entry.message, entry.data || "");
      break;
  }

  // TODO: Send to external service in production
  // if (process.env.NODE_ENV === 'production') {
  //   sendToSentry(entry);
  // }
}

/**
 * Log error with context
 *
 * @param context - Source of error (e.g., 'api/revenues', 'components/RevenueForm')
 * @param error - Error object or message
 * @param data - Additional context data
 */
export function logError(
  context: string,
  error: unknown,
  data?: Record<string, unknown>
) {
  const { message, stack } = formatError(error);
  const entry = createLogEntry("error", context, message, data);
  entry.stack = stack;
  outputLog(entry);
}

/**
 * Log warning with context
 */
export function logWarn(
  context: string,
  message: string,
  data?: Record<string, unknown>
) {
  const entry = createLogEntry("warn", context, message, data);
  outputLog(entry);
}

/**
 * Log info with context
 */
export function logInfo(
  context: string,
  message: string,
  data?: Record<string, unknown>
) {
  const entry = createLogEntry("info", context, message, data);
  outputLog(entry);
}

/**
 * Create scoped logger for a specific context
 *
 * @example
 * const log = createLogger('api/revenues');
 * log.error(error);
 * log.info('Revenue created', { id: revenue.id });
 */
export function createLogger(context: string) {
  return {
    error: (error: unknown, data?: Record<string, unknown>) =>
      logError(context, error, data),
    warn: (message: string, data?: Record<string, unknown>) =>
      logWarn(context, message, data),
    info: (message: string, data?: Record<string, unknown>) =>
      logInfo(context, message, data),
  };
}
