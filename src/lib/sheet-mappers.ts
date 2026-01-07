/**
 * Sheet Row Mappers
 *
 * Maps Google Sheet rows to database entities.
 * Column order must match actual Google Sheet structure.
 *
 * Customize column indices based on your sheet layout.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Use Prisma.Decimal for type and constructor
const Decimal = Prisma.Decimal;

/**
 * Parse number from sheet cell, handling Vietnamese number format
 */
function parseNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  // Remove dots (thousand sep) and replace comma (decimal sep)
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse date from sheet cell
 * Supports: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY, Excel serial dates
 */
function parseDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;

  // Try DD/MM/YYYY (Vietnamese format)
  const dmyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try YYYY-MM-DD (ISO format)
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(value);
  }

  // Try ISO datetime format (YYYY-MM-DDTHH:mm:ss.sssZ)
  const isoDateTimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoDateTimeMatch) {
    return new Date(value);
  }

  // Try Excel serial date (number between 1 and 100000 typically)
  const serialNum = parseFloat(value);
  if (!isNaN(serialNum) && serialNum > 1 && serialNum < 100000) {
    // Excel serial date: days since 1899-12-30 (Excel epoch)
    // Need to subtract 1 because Excel incorrectly counts 1900 as leap year
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serialNum * 24 * 60 * 60 * 1000);
    return date;
  }

  // Fallback to Date.parse
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Map status text to stage
 */
function mapStatusToStage(status: string): string {
  const normalized = status?.toLowerCase().trim() || "";

  // LEAD stage statuses
  if (
    normalized.includes("mới") ||
    normalized.includes("chưa trả lời") ||
    normalized.includes("đang ll")
  ) {
    return "LEAD";
  }

  // QUOTE stage
  if (normalized.includes("báo giá") || normalized.includes("xây tour")) {
    return "QUOTE";
  }

  // FOLLOWUP stage
  if (
    normalized.includes("f1") ||
    normalized.includes("f2") ||
    normalized.includes("f3") ||
    normalized.includes("f4") ||
    normalized.includes("suy nghĩ")
  ) {
    return "FOLLOWUP";
  }

  // OUTCOME stage
  if (
    normalized.includes("booking") ||
    normalized.includes("kết thúc") ||
    normalized.includes("cancel") ||
    normalized.includes("hoãn")
  ) {
    return "OUTCOME";
  }

  return "LEAD";
}

/**
 * Request data ready for upsert
 */
export interface RequestRowData {
  code: string;
  customerName: string;
  contact: string;
  country: string;
  source: string;
  status: string;
  stage: string;
  pax: number;
  tourDays: number | null;
  startDate: Date | null;
  endDate: Date | null;
  expectedRevenue: Prisma.Decimal | null;
  expectedCost: Prisma.Decimal | null;
  notes: string | null;
  sellerId: string;
  sheetRowIndex: number;
}

/**
 * Map Request sheet row to database fields
 *
 * Syncs ALL rows where seller (A) is not empty.
 * For rows without booking code (T), generates "RQ-{rowIndex}" code.
 *
 * Actual columns from Google Sheet:
 * A(0): Seller (REQUIRED - determines if row is synced)
 * B(1): Name (customerName, REQUIRED)
 * C(2): Contact
 * E(4): Pax
 * F(5): Quốc gia (country)
 * G(6): Nguồn (source)
 * H(7): Trạng thái (status)
 * J(9): Số ngày đi Tour (tourDays)
 * K(10): Ngày dự kiến đi (startDate)
 * L(11): DT dự kiến (expectedRevenue)
 * M(12): Chi phí dự kiến (expectedCost)
 * N(13): Ghi chú (notes)
 * T(19): Mã khách (booking code) - OPTIONAL, auto-generated if empty
 * Z(25): Ngày dự kiến kết thúc (endDate)
 */
export async function mapRequestRow(
  row: string[],
  rowIndex: number
): Promise<RequestRowData | null> {
  // Extract by actual column indices
  const sellerName = row[0]; // A: Seller
  const customerName = row[1]; // B: Name
  const contact = row[2]; // C: Contact
  const pax = row[4]; // E: Pax
  const country = row[5]; // F: Quốc gia
  const source = row[6]; // G: Nguồn
  const status = row[7]; // H: Trạng thái
  const tourDays = row[9]; // J: Số ngày đi Tour
  const startDate = row[10]; // K: Ngày dự kiến đi
  const expectedRevenue = row[11]; // L: DT dự kiến
  const expectedCost = row[12]; // M: Chi phí dự kiến
  const notes = row[13]; // N: Ghi chú
  const code = row[19]; // T: Mã khách (UNIQUE CODE)
  const endDate = row[25]; // Z: Ngày dự kiến kết thúc

  // Skip empty rows or header rows (require seller name, not booking code)
  if (!sellerName?.trim() || sellerName === "Seller") {
    return null;
  }

  // Skip if no customer name (required field)
  if (!customerName?.trim() || customerName === "Name") {
    return null;
  }

  // Generate code: use booking code if exists, otherwise generate from row index
  const bookingCode = code?.trim();
  const generatedCode = bookingCode || `RQ-${rowIndex.toString().padStart(5, "0")}`;

  // Find seller by name or use default
  let seller = await prisma.user.findFirst({
    where: {
      role: "SELLER",
      name: { contains: sellerName?.trim() || "", mode: "insensitive" },
    },
  });

  // Fallback to first SELLER user if not found
  if (!seller) {
    seller = await prisma.user.findFirst({ where: { role: "SELLER" } });
  }

  if (!seller) {
    throw new Error("No SELLER user found for import");
  }

  const revNum = parseNumber(expectedRevenue);
  const costNum = parseNumber(expectedCost);

  return {
    code: generatedCode,
    customerName: customerName.trim(),
    contact: contact?.trim() || "",
    country: country?.trim() || "Unknown",
    source: source?.trim() || "Other",
    status: status?.trim() || "Đang LL - khách chưa trả lời",
    stage: mapStatusToStage(status),
    pax: parseInt(pax) || 1,
    tourDays: parseNumber(tourDays) ? Math.round(parseNumber(tourDays)!) : null,
    startDate: parseDate(startDate),
    endDate: parseDate(endDate),
    expectedRevenue: revNum !== null ? new Decimal(revNum) : null,
    expectedCost: costNum !== null ? new Decimal(costNum) : null,
    notes: notes?.trim() || null,
    sellerId: seller.id,
    sheetRowIndex: rowIndex,
  };
}

/**
 * Operator data ready for upsert
 */
export interface OperatorRowData {
  requestCode: string;
  serviceDate: Date;
  serviceType: string;
  serviceName: string;
  supplier: string | null;
  costBeforeTax: Prisma.Decimal;
  vat: Prisma.Decimal | null;
  totalCost: Prisma.Decimal;
  paymentStatus: string;
  notes: string | null;
  userId: string;
  sheetRowIndex: number;
}

/**
 * Map Operator sheet row to database fields
 *
 * Actual columns from Google Sheet:
 * A(0): Mã khách (requestCode)
 * J(9): Ngày sử dụng dịch vụ (serviceDate)
 * K(10): Loại dịch vụ (serviceType/serviceName)
 * O(14): Chi phí dự kiến trước thuế (costBeforeTax)
 * P(15): Thuế VAT (vat)
 * Q(16): Chi phí dự kiến (totalCost)
 * S(18): Tài khoản thanh toán (supplier - payment account)
 * T(19): Ghi chú (notes)
 * W(22): Dư nợ (remaining balance → paymentStatus)
 */
export async function mapOperatorRow(
  row: string[],
  rowIndex: number
): Promise<OperatorRowData | null> {
  // Extract by actual column indices
  const requestCode = row[0]; // A: Mã khách
  const serviceDate = row[9]; // J: Ngày sử dụng dịch vụ
  const serviceType = row[10]; // K: Loại dịch vụ
  const costBeforeTax = row[14]; // O: Chi phí dự kiến trước thuế
  const vat = row[15]; // P: Thuế VAT
  const totalCost = row[16]; // Q: Chi phí dự kiến
  const supplier = row[18]; // S: Tài khoản thanh toán
  const notes = row[19]; // T: Ghi chú
  const remainingBalance = row[22]; // W: Dư nợ

  // Skip empty rows or header rows
  if (!requestCode?.trim() || requestCode === "Mã khách") {
    return null;
  }

  // Skip if no service type (required field)
  if (!serviceType?.trim()) {
    return null;
  }

  const parsedDate = parseDate(serviceDate);
  if (!parsedDate) {
    return null;
  }

  // Find default operator user
  const operatorUser = await prisma.user.findFirst({
    where: { role: "OPERATOR" },
  });
  if (!operatorUser) {
    throw new Error("No OPERATOR user found for import");
  }

  const cost = parseNumber(costBeforeTax) || 0;
  const vatNum = parseNumber(vat);
  const total = parseNumber(totalCost) || cost;

  // Determine payment status from remaining balance
  const balance = parseNumber(remainingBalance);
  const paymentStatus =
    balance === null || balance === 0 ? "PAID" : "PENDING";

  return {
    requestCode: requestCode.trim(),
    serviceDate: parsedDate,
    serviceType: serviceType.trim(),
    serviceName: serviceType.trim(), // Use serviceType as serviceName
    supplier: supplier?.trim() || null,
    costBeforeTax: new Decimal(cost),
    vat: vatNum !== null ? new Decimal(vatNum) : null,
    totalCost: new Decimal(total),
    paymentStatus,
    notes: notes?.trim() || null,
    userId: operatorUser.id,
    sheetRowIndex: rowIndex,
  };
}

/**
 * Revenue data ready for upsert
 */
export interface RevenueRowData {
  requestCode: string;
  paymentDate: Date;
  paymentType: string;
  foreignAmount: Prisma.Decimal | null;
  currency: string;
  exchangeRate: Prisma.Decimal | null;
  amountVND: Prisma.Decimal;
  paymentSource: string;
  notes: string | null;
  userId: string;
  sheetRowIndex: number;
}

/**
 * Map Revenue sheet row to database fields
 *
 * Actual columns from Google Sheet (note: row 1 is blank, row 2 is headers):
 * A(0): Code (requestCode)
 * L(11): Khoản thu (paymentType)
 * M(12): Ngày thu tiền (paymentDate)
 * N(13): Nguồn thu (paymentSource)
 * Q(16): Thu ngoại tệ (foreignAmount)
 * R(17): Tỷ giá (exchangeRate)
 * S(18): Loại Ngoại tệ (currency)
 * T(19): Tổng tiền Thu (amountVND)
 */
export async function mapRevenueRow(
  row: string[],
  rowIndex: number
): Promise<RevenueRowData | null> {
  // Extract by actual column indices
  const requestCode = row[0]; // A: Code
  const paymentType = row[11]; // L: Khoản thu
  const paymentDate = row[12]; // M: Ngày thu tiền
  const paymentSource = row[13]; // N: Nguồn thu
  const foreignAmount = row[16]; // Q: Thu ngoại tệ
  const exchangeRate = row[17]; // R: Tỷ giá
  const currency = row[18]; // S: Loại Ngoại tệ
  const amountVND = row[19]; // T: Tổng tiền Thu

  // Skip empty rows or header rows
  if (!requestCode?.trim() || requestCode === "Code") {
    return null;
  }

  const parsedDate = parseDate(paymentDate);
  if (!parsedDate) {
    return null;
  }

  // Find default accountant user
  const accountant = await prisma.user.findFirst({
    where: { role: "ACCOUNTANT" },
  });
  if (!accountant) {
    throw new Error("No ACCOUNTANT user found for import");
  }

  const foreignNum = parseNumber(foreignAmount);
  const rateNum = parseNumber(exchangeRate);
  const vndNum = parseNumber(amountVND) || 0;

  return {
    requestCode: requestCode.trim(),
    paymentDate: parsedDate,
    paymentType: paymentType?.trim() || "Deposit",
    foreignAmount: foreignNum !== null ? new Decimal(foreignNum) : null,
    currency: currency?.trim() || "VND",
    exchangeRate: rateNum !== null ? new Decimal(rateNum) : null,
    amountVND: new Decimal(vndNum),
    paymentSource: paymentSource?.trim() || "Bank transfer",
    notes: null, // No notes column in this sheet
    userId: accountant.id,
    sheetRowIndex: rowIndex,
  };
}
