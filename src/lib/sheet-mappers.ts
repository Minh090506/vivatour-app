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
 * Supports: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
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
 * Expected columns (adjust indices as needed):
 * A: code, B: customerName, C: contact, D: country, E: source,
 * F: status, G: pax, H: tourDays, I: startDate, J: endDate,
 * K: expectedRevenue, L: expectedCost, M: notes
 */
export async function mapRequestRow(
  row: string[],
  rowIndex: number
): Promise<RequestRowData | null> {
  const [
    code,
    customerName,
    contact,
    country,
    source,
    status,
    pax,
    tourDays,
    startDate,
    endDate,
    expectedRevenue,
    expectedCost,
    notes,
  ] = row;

  // Skip empty rows
  if (!code?.trim() || !customerName?.trim()) {
    return null;
  }

  // Find default seller (first SELLER user)
  const seller = await prisma.user.findFirst({ where: { role: "SELLER" } });
  if (!seller) {
    throw new Error("No SELLER user found for import");
  }

  const revNum = parseNumber(expectedRevenue);
  const costNum = parseNumber(expectedCost);

  return {
    code: code.trim(),
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
 * Expected columns:
 * A: requestCode, B: serviceDate, C: serviceType, D: serviceName,
 * E: supplier, F: costBeforeTax, G: vat, H: totalCost,
 * I: paymentStatus, J: notes
 */
export async function mapOperatorRow(
  row: string[],
  rowIndex: number
): Promise<OperatorRowData | null> {
  const [
    requestCode,
    serviceDate,
    serviceType,
    serviceName,
    supplier,
    costBeforeTax,
    vat,
    totalCost,
    paymentStatus,
    notes,
  ] = row;

  // Skip empty rows
  if (!requestCode?.trim() || !serviceName?.trim()) {
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

  return {
    requestCode: requestCode.trim(),
    serviceDate: parsedDate,
    serviceType: serviceType?.trim() || "Other",
    serviceName: serviceName.trim(),
    supplier: supplier?.trim() || null,
    costBeforeTax: new Decimal(cost),
    vat: vatNum !== null ? new Decimal(vatNum) : null,
    totalCost: new Decimal(total),
    paymentStatus: paymentStatus?.trim() || "PENDING",
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
 * Expected columns:
 * A: requestCode, B: paymentDate, C: paymentType, D: foreignAmount,
 * E: currency, F: exchangeRate, G: amountVND, H: paymentSource, I: notes
 */
export async function mapRevenueRow(
  row: string[],
  rowIndex: number
): Promise<RevenueRowData | null> {
  const [
    requestCode,
    paymentDate,
    paymentType,
    foreignAmount,
    currency,
    exchangeRate,
    amountVND,
    paymentSource,
    notes,
  ] = row;

  // Skip empty rows
  if (!requestCode?.trim()) {
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
    notes: notes?.trim() || null,
    userId: accountant.id,
    sheetRowIndex: rowIndex,
  };
}
