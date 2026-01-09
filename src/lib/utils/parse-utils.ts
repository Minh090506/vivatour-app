/**
 * Safe parsing utilities for type coercion in forms and inputs.
 * Handles undefined, null, empty strings, and NaN values safely.
 */

/**
 * Safely parse a value to integer with default fallback.
 * @param value - Value to parse (string, number, undefined, or null)
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns Parsed integer or default value
 */
export function safeParseInt(
  value: string | number | undefined | null,
  defaultValue = 0
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = typeof value === 'number' ? Math.floor(value) : parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse a value to float with default fallback.
 * @param value - Value to parse (string, number, undefined, or null)
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns Parsed float or default value
 */
export function safeParseFloat(
  value: string | number | undefined | null,
  defaultValue = 0
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse a value to positive integer (>= 1).
 * Useful for fields like "pax", "quantity", etc.
 * @param value - Value to parse
 * @param defaultValue - Default value if parsing fails or result <= 0 (default: 1)
 * @returns Parsed positive integer or default value
 */
export function safePositiveInt(
  value: string | number | undefined | null,
  defaultValue = 1
): number {
  const parsed = safeParseInt(value, defaultValue);
  return parsed > 0 ? parsed : defaultValue;
}

/**
 * Safely parse a value to non-negative float (>= 0).
 * Useful for fields like "cost", "price", etc.
 * @param value - Value to parse
 * @param defaultValue - Default value if parsing fails or result < 0 (default: 0)
 * @returns Parsed non-negative float or default value
 */
export function safeNonNegativeFloat(
  value: string | number | undefined | null,
  defaultValue = 0
): number {
  const parsed = safeParseFloat(value, defaultValue);
  return parsed >= 0 ? parsed : defaultValue;
}

/**
 * Parse optional integer - returns undefined instead of default for empty values.
 * Useful for optional number fields in forms.
 */
export function parseOptionalInt(
  value: string | number | undefined | null
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? Math.floor(value) : parseInt(String(value), 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Parse optional float - returns undefined instead of default for empty values.
 */
export function parseOptionalFloat(
  value: string | number | undefined | null
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(parsed) ? undefined : parsed;
}
