/**
 * Centralized CSV Generator for All Reports
 * Supports Request, Operator, Revenue, Supplier data
 * Vietnamese headers, dd/MM/yyyy dates, 1,500,000 number format
 */

// ============================================
// Formatting Utilities
// ============================================

/**
 * Format number as Vietnamese currency (1,500,000)
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Format date as dd/MM/yyyy
 */
export function formatDateVN(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return `${value.toFixed(1)}%`;
}

/**
 * Format CSV value (escape quotes, handle commas)
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
 * Download CSV file in browser
 */
function downloadCsv(content: string, filename: string): void {
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
 * Generate and download CSV from rows
 */
function exportCsv(headers: string[], rows: string[][], filename: string): void {
  // BOM for UTF-8 Vietnamese support
  const BOM = '\uFEFF';

  const headerLine = headers.map(formatCsvValue).join(',');
  const dataLines = rows.map((row) => row.map(formatCsvValue).join(','));

  const content = BOM + [headerLine, ...dataLines].join('\n');
  downloadCsv(content, filename);
}

// ============================================
// Request Report Export
// ============================================

export interface RequestExportRow {
  code: string;
  customerName: string;
  contact: string;
  pax: number;
  country: string;
  source: string;
  status: string;
  stage: string;
  expectedRevenue: number | null;
  expectedCost: number | null;
  requestDate: Date | string;
  startDate?: Date | string | null;
  sellerName?: string;
}

export function exportRequestReport(data: RequestExportRow[], filename?: string): void {
  const headers = [
    'Ma yeu cau',
    'Khach hang',
    'Lien he',
    'So khach',
    'Quoc gia',
    'Nguon',
    'Trang thai',
    'Giai doan',
    'Doanh thu du kien (VND)',
    'Chi phi du kien (VND)',
    'Ngay yeu cau',
    'Ngay khoi hanh',
    'Nhan vien',
  ];

  const rows = data.map((r) => [
    r.code,
    r.customerName,
    r.contact,
    String(r.pax),
    r.country,
    r.source,
    r.status,
    r.stage,
    formatNumber(r.expectedRevenue),
    formatNumber(r.expectedCost),
    formatDateVN(r.requestDate),
    formatDateVN(r.startDate),
    r.sellerName || '',
  ]);

  const name = filename || `bao-cao-yeu-cau-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

// ============================================
// Operator Cost Report Export
// ============================================

export interface OperatorCostExportRow {
  serviceType: string;
  totalCost: number;
  count: number;
  avgCost: number;
  percentage?: number;
}

export function exportOperatorCostReport(data: OperatorCostExportRow[], filename?: string): void {
  const headers = [
    'Loai dich vu',
    'Tong chi phi (VND)',
    'So luong',
    'Chi phi TB (VND)',
    'Ty le (%)',
  ];

  const rows = data.map((r) => [
    r.serviceType,
    formatNumber(r.totalCost),
    String(r.count),
    formatNumber(r.avgCost),
    formatPercent(r.percentage),
  ]);

  const name = filename || `bao-cao-chi-phi-dieu-hanh-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

// ============================================
// Operator Cost by Supplier Export
// ============================================

export interface OperatorSupplierCostRow {
  supplierName: string;
  supplierCode?: string;
  totalCost: number;
  count: number;
  avgCost: number;
}

export function exportOperatorSupplierCost(data: OperatorSupplierCostRow[], filename?: string): void {
  const headers = [
    'Ma NCC',
    'Ten NCC',
    'Tong chi phi (VND)',
    'So dich vu',
    'Chi phi TB (VND)',
  ];

  const rows = data.map((r) => [
    r.supplierCode || '',
    r.supplierName,
    formatNumber(r.totalCost),
    String(r.count),
    formatNumber(r.avgCost),
  ]);

  const name = filename || `chi-phi-theo-ncc-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

// ============================================
// Operator Monthly Trend Export
// ============================================

export interface OperatorMonthlyTrendRow {
  month: string;
  totalCost: number;
  count: number;
}

export function exportOperatorMonthlyTrend(data: OperatorMonthlyTrendRow[], filename?: string): void {
  const headers = ['Thang', 'Tong chi phi (VND)', 'So dich vu'];

  const rows = data.map((r) => [
    r.month,
    formatNumber(r.totalCost),
    String(r.count),
  ]);

  const name = filename || `xu-huong-chi-phi-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

// ============================================
// Operator Profit Report Export
// ============================================

export interface ProfitExportRow {
  bookingCode: string;
  customerName: string;
  startDate?: Date | string | null;
  pax: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export function exportProfitReport(data: ProfitExportRow[], filename?: string): void {
  const headers = [
    'Ma booking',
    'Khach hang',
    'Ngay khoi hanh',
    'So khach',
    'Doanh thu (VND)',
    'Chi phi (VND)',
    'Loi nhuan (VND)',
    'Ty suat (%)',
  ];

  const rows = data.map((r) => [
    r.bookingCode,
    r.customerName,
    formatDateVN(r.startDate),
    String(r.pax),
    formatNumber(r.revenue),
    formatNumber(r.cost),
    formatNumber(r.profit),
    formatPercent(r.margin),
  ]);

  const name = filename || `bao-cao-loi-nhuan-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

// ============================================
// Operator Revenue (Payment) Report Export
// ============================================

export interface OperatorRevenueExportRow {
  serviceType: string;
  totalCost: number;
  paidAmount: number;
  debt: number;
  count: number;
}

export function exportOperatorRevenueByService(data: OperatorRevenueExportRow[], filename?: string): void {
  const headers = [
    'Loai dich vu',
    'Tong chi phi (VND)',
    'Da thanh toan (VND)',
    'Con no (VND)',
    'So dich vu',
  ];

  const rows = data.map((r) => [
    r.serviceType,
    formatNumber(r.totalCost),
    formatNumber(r.paidAmount),
    formatNumber(r.debt),
    String(r.count),
  ]);

  const name = filename || `thanh-toan-theo-dv-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

export interface OperatorRevenueBySupplierRow {
  supplierName: string;
  supplierCode?: string;
  totalCost: number;
  paidAmount: number;
  debt: number;
  count: number;
}

export function exportOperatorRevenueBySupplier(data: OperatorRevenueBySupplierRow[], filename?: string): void {
  const headers = [
    'Ma NCC',
    'Ten NCC',
    'Tong chi phi (VND)',
    'Da thanh toan (VND)',
    'Con no (VND)',
    'So dich vu',
  ];

  const rows = data.map((r) => [
    r.supplierCode || '',
    r.supplierName,
    formatNumber(r.totalCost),
    formatNumber(r.paidAmount),
    formatNumber(r.debt),
    String(r.count),
  ]);

  const name = filename || `thanh-toan-theo-ncc-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

// ============================================
// Cost Breakdown Report Export
// ============================================

export interface CostBreakdownExportRow {
  bookingCode: string;
  customerName: string;
  startDate?: Date | string | null;
  expectedCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
}

export function exportCostBreakdownReport(data: CostBreakdownExportRow[], filename?: string): void {
  const headers = [
    'Ma booking',
    'Khach hang',
    'Ngay khoi hanh',
    'Chi phi du kien (VND)',
    'Chi phi thuc te (VND)',
    'Chenh lech (VND)',
    'Chenh lech (%)',
  ];

  const rows = data.map((r) => [
    r.bookingCode,
    r.customerName,
    formatDateVN(r.startDate),
    formatNumber(r.expectedCost),
    formatNumber(r.actualCost),
    formatNumber(r.variance),
    formatPercent(r.variancePercent),
  ]);

  const name = filename || `phan-tich-chi-phi-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

// ============================================
// Revenue Report Export (Doanh thu)
// ============================================

export interface RevenueByTypeRow {
  type: string;
  amount: number;
  count: number;
  percentage?: number;
}

export function exportRevenueByType(data: RevenueByTypeRow[], filename?: string): void {
  const headers = [
    'Loai thanh toan',
    'So tien (VND)',
    'So giao dich',
    'Ty le (%)',
  ];

  const rows = data.map((r) => [
    r.type,
    formatNumber(r.amount),
    String(r.count),
    formatPercent(r.percentage),
  ]);

  const name = filename || `doanh-thu-theo-loai-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

export interface RevenueBySourceRow {
  source: string;
  amount: number;
  count: number;
  percentage?: number;
}

export function exportRevenueBySource(data: RevenueBySourceRow[], filename?: string): void {
  const headers = [
    'Nguon',
    'So tien (VND)',
    'So giao dich',
    'Ty le (%)',
  ];

  const rows = data.map((r) => [
    r.source,
    formatNumber(r.amount),
    String(r.count),
    formatPercent(r.percentage),
  ]);

  const name = filename || `doanh-thu-theo-nguon-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

export interface RevenueByCurrencyRow {
  currency: string;
  originalAmount: number;
  amountVND: number;
  avgRate: number;
  count: number;
}

export function exportRevenueByCurrency(data: RevenueByCurrencyRow[], filename?: string): void {
  const headers = [
    'Tien te',
    'So tien goc',
    'Quy doi VND',
    'Ty gia TB',
    'So giao dich',
  ];

  const rows = data.map((r) => [
    r.currency,
    formatNumber(r.originalAmount),
    formatNumber(r.amountVND),
    formatNumber(r.avgRate),
    String(r.count),
  ]);

  const name = filename || `doanh-thu-theo-tien-te-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

// ============================================
// Supplier Balance Report Export
// ============================================

export interface SupplierBalanceExportRow {
  code: string;
  name: string;
  type: string;
  deposits: number;
  costs: number;
  refunds: number;
  balance: number;
}

export function exportSupplierBalance(data: SupplierBalanceExportRow[], filename?: string): void {
  const headers = [
    'Ma NCC',
    'Ten NCC',
    'Loai',
    'Tong nap (VND)',
    'Da chi (VND)',
    'Hoan tien (VND)',
    'So du (VND)',
  ];

  const rows = data.map((r) => [
    r.code,
    r.name,
    r.type,
    formatNumber(r.deposits),
    formatNumber(r.costs),
    formatNumber(r.refunds),
    formatNumber(r.balance),
  ]);

  const name = filename || `bao-cao-cong-no-ncc-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}

// ============================================
// Supplier Transaction Export
// ============================================

export interface SupplierTransactionExportRow {
  transactionDate: Date | string;
  supplierCode: string;
  supplierName: string;
  type: string;
  amount: number;
  description: string | null;
  relatedBookingCode: string | null;
}

export function exportSupplierTransactions(data: SupplierTransactionExportRow[], filename?: string): void {
  const headers = [
    'Ngay',
    'Ma NCC',
    'Ten NCC',
    'Loai GD',
    'So tien (VND)',
    'Mo ta',
    'Ma Booking',
  ];

  const rows = data.map((r) => [
    formatDateVN(r.transactionDate),
    r.supplierCode,
    r.supplierName,
    r.type,
    formatNumber(r.amount),
    r.description || '',
    r.relatedBookingCode || '',
  ]);

  const name = filename || `lich-su-giao-dich-ncc-${formatDateVN(new Date()).replace(/\//g, '-')}`;
  exportCsv(headers, rows, name);
}
