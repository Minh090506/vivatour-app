/**
 * PDF Export Utility
 * Uses browser print API for PDF generation (no dependencies)
 */

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  dateRange?: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Prepare print view and trigger browser print dialog
 * User can save as PDF from the print dialog
 */
export function exportToPdf(options: PdfExportOptions): void {
  const { title, subtitle, dateRange, orientation = 'portrait' } = options;

  // Add print-specific styles
  const styleId = 'pdf-export-styles';
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    @media print {
      /* Hide navigation and non-essential elements */
      header, nav, aside, footer,
      [data-no-print], .no-print,
      button:not([data-print-include]) {
        display: none !important;
      }

      /* Page setup */
      @page {
        size: A4 ${orientation};
        margin: 15mm;
      }

      /* Reset backgrounds */
      body {
        background: white !important;
        color: black !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* Print header */
      .print-header {
        display: block !important;
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #333;
      }

      .print-header h1 {
        font-size: 24px;
        margin: 0 0 5px 0;
      }

      .print-header .subtitle {
        font-size: 14px;
        color: #666;
      }

      .print-header .date-range {
        font-size: 12px;
        color: #888;
        margin-top: 5px;
      }

      /* Ensure charts/cards print correctly */
      .recharts-wrapper {
        max-width: 100% !important;
      }

      /* Page breaks */
      .page-break {
        page-break-before: always;
      }

      /* Table styling */
      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }

      th {
        background-color: #f5f5f5 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    /* Hide print header on screen */
    @media screen {
      .print-header {
        display: none;
      }
    }
  `;

  // Create or update print header
  const headerId = 'pdf-print-header';
  let headerEl = document.getElementById(headerId);

  if (!headerEl) {
    headerEl = document.createElement('div');
    headerEl.id = headerId;
    headerEl.className = 'print-header';
    document.body.insertBefore(headerEl, document.body.firstChild);
  }

  headerEl.innerHTML = `
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
    ${dateRange ? `<div class="date-range">${escapeHtml(dateRange)}</div>` : ''}
    <div class="date-range">In luc: ${new Date().toLocaleString('vi-VN')}</div>
  `;

  // Trigger print
  window.print();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
