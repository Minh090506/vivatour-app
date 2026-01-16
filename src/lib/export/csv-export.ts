/**
 * CSV Export Utility
 * Handles CSV generation with BOM for Vietnamese character support
 */

export interface CsvColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number);
}

/**
 * Format value for CSV (escape quotes, handle commas)
 */
function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format number as VND currency
 */
export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Format date for CSV (YYYY-MM-DD or DD/MM/YYYY)
 */
export function formatDate(date: Date | string, format: 'iso' | 'vn' = 'vn'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  if (format === 'iso') {
    return d.toISOString().split('T')[0];
  }
  // Vietnamese format: DD/MM/YYYY
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Generate CSV content from data array
 */
export function generateCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: CsvColumn<T>[]
): string {
  // BOM for UTF-8 Vietnamese support
  const BOM = '\uFEFF';

  // Header row
  const headers = columns.map(col => formatCsvValue(col.header)).join(',');

  // Data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = typeof col.accessor === 'function'
        ? col.accessor(row)
        : row[col.accessor];
      return formatCsvValue(value);
    }).join(',');
  });

  return BOM + [headers, ...rows].join('\n');
}

/**
 * Download CSV file in browser
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string
): void {
  const content = generateCsv(data, columns);
  downloadCsv(content, filename);
}
