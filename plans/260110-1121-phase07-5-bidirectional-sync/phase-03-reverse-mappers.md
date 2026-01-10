---
date: 2026-01-10
priority: P1
status: pending
review: pending
parent: ./plan.md
---

# Phase 03: Reverse Mappers (DB -> Sheet)

## Context

- Parent: [Phase 07.5 Plan](./plan.md)
- Current: `src/lib/sheet-mappers.ts` (Sheet -> DB only)

## Overview

Create reverse mappers that convert DB records to Sheet row arrays. Must match column indices from existing `sheet-mappers.ts` to ensure correct cell placement.

## Requirements

1. Map Request DB fields to Sheet columns (A-AR)
2. Map Operator DB fields to Sheet columns (A-W)
3. Map Revenue DB fields to Sheet columns (A-T)
4. Skip formula columns (preserve existing formulas)
5. Handle date/number formatting for Vietnamese locale

## Column Mappings Reference

From `sheet-mappers.ts`:

### Request Sheet
| Col | Index | DB Field | Formula? |
|-----|-------|----------|----------|
| A | 0 | seller.name | No |
| B | 1 | customerName | No |
| C | 2 | contact | No |
| E | 4 | pax | No |
| F | 5 | country | No |
| G | 6 | source | No |
| H | 7 | status (Vietnamese) | No |
| J | 9 | tourDays | No |
| K | 10 | startDate | No |
| L | 11 | expectedRevenue | No |
| M | 12 | expectedCost | No |
| N | 13 | notes | No |
| T | 19 | bookingCode | No |
| Z | 25 | endDate | No |
| AR | 43 | code (Request ID) | No |

### Operator Sheet
| Col | Index | DB Field | Formula? |
|-----|-------|----------|----------|
| A | 0 | request.bookingCode | No |
| J | 9 | serviceDate | No |
| K | 10 | serviceType | No |
| O | 14 | costBeforeTax | No |
| P | 15 | vat | No |
| Q | 16 | totalCost | Formula - SKIP |
| S | 18 | supplier | No |
| T | 19 | notes | No |
| W | 22 | debt (computed) | Formula - SKIP |

### Revenue Sheet
| Col | Index | DB Field | Formula? |
|-----|-------|----------|----------|
| A | 0 | request.bookingCode | No |
| L | 11 | paymentType | No |
| M | 12 | paymentDate | No |
| N | 13 | paymentSource | No |
| Q | 16 | foreignAmount | No |
| R | 17 | exchangeRate | No |
| S | 18 | currency | No |
| T | 19 | amountVND | No |

## Implementation

File: `src/lib/sync/db-to-sheet-mappers.ts`

```typescript
/**
 * Reverse Mappers: DB Fields -> Sheet Row Arrays
 *
 * Converts database records back to Google Sheet row format.
 * Column indices must match sheet-mappers.ts for consistency.
 */

import { Prisma } from "@prisma/client";

// Max column index (AZ = 51, but we only use up to AR = 43)
const MAX_COLUMNS = 52;

/**
 * Vietnamese status labels (reverse of VIETNAMESE_TO_STATUS_KEY)
 */
const STATUS_KEY_TO_VIETNAMESE: Record<string, string> = {
  DANG_LL_CHUA_TL: "Đang LL - khách chưa trả lời",
  DANG_LL_DA_TL: "Đang LL - khách đã trả lời",
  DA_BAO_GIA: "Đã báo giá",
  DANG_XAY_TOUR: "Đang xây Tour",
  F1: "F1",
  F2: "F2",
  F3: "F3",
  F4: "F4: Lần cuối",
  BOOKING: "Booking",
  KHACH_HOAN: "Khách hoãn",
  KHACH_SUY_NGHI: "Đang suy nghĩ",
  KHONG_DU_TC: "Không đủ TC",
  DA_KET_THUC: "Đã kết thúc",
  CANCEL: "Cancel",
};

/**
 * Format date to DD/MM/YYYY (Vietnamese format)
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format number with Vietnamese locale (dot as thousand separator)
 */
function formatNumber(value: number | Prisma.Decimal | null | undefined): string {
  if (value === null || value === undefined) return "";
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  if (isNaN(num)) return "";
  // Vietnamese format: 1.000.000 (dots as thousand separators)
  return num.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
}

/**
 * Format decimal with 2 decimal places
 */
function formatDecimal(value: number | Prisma.Decimal | null | undefined): string {
  if (value === null || value === undefined) return "";
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  if (isNaN(num)) return "";
  return num.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Create empty row array
 */
function createEmptyRow(): (string | null)[] {
  return Array(MAX_COLUMNS).fill(null);
}

/**
 * Request DB record type (with seller relation)
 */
export interface RequestRecord {
  code: string;
  bookingCode: string | null;
  customerName: string;
  contact: string;
  country: string;
  source: string;
  status: string;
  pax: number;
  tourDays: number | null;
  startDate: Date | null;
  endDate: Date | null;
  expectedRevenue: Prisma.Decimal | null;
  expectedCost: Prisma.Decimal | null;
  notes: string | null;
  seller?: { name: string | null };
}

/**
 * Map Request record to sheet row
 *
 * Column mapping:
 * A(0)=Seller, B(1)=Name, C(2)=Contact, E(4)=Pax, F(5)=Country,
 * G(6)=Source, H(7)=Status, J(9)=TourDays, K(10)=StartDate,
 * L(11)=Revenue, M(12)=Cost, N(13)=Notes, T(19)=BookingCode,
 * Z(25)=EndDate, AR(43)=Code
 */
export function mapRequestToRow(record: RequestRecord): (string | null)[] {
  const row = createEmptyRow();

  row[0] = record.seller?.name || "";           // A: Seller
  row[1] = record.customerName;                  // B: Name
  row[2] = record.contact;                       // C: Contact
  row[4] = record.pax.toString();                // E: Pax
  row[5] = record.country;                       // F: Country
  row[6] = record.source;                        // G: Source
  row[7] = STATUS_KEY_TO_VIETNAMESE[record.status] || record.status; // H: Status
  row[9] = record.tourDays?.toString() || "";    // J: Tour Days
  row[10] = formatDate(record.startDate);        // K: Start Date
  row[11] = formatNumber(record.expectedRevenue); // L: Expected Revenue
  row[12] = formatNumber(record.expectedCost);   // M: Expected Cost
  row[13] = record.notes || "";                  // N: Notes
  row[19] = record.bookingCode || "";            // T: Booking Code
  row[25] = formatDate(record.endDate);          // Z: End Date
  row[43] = record.code;                         // AR: Request ID

  return row;
}

/**
 * Operator DB record type (with request relation)
 */
export interface OperatorRecord {
  serviceDate: Date;
  serviceType: string;
  serviceName: string;
  supplier: string | null;
  costBeforeTax: Prisma.Decimal;
  vat: Prisma.Decimal | null;
  totalCost: Prisma.Decimal;
  notes: string | null;
  request?: { bookingCode: string | null };
}

/**
 * Map Operator record to sheet row
 *
 * Column mapping:
 * A(0)=BookingCode, J(9)=ServiceDate, K(10)=ServiceType,
 * O(14)=CostBeforeTax, P(15)=VAT, Q(16)=SKIP (formula),
 * S(18)=Supplier, T(19)=Notes, W(22)=SKIP (formula)
 */
export function mapOperatorToRow(record: OperatorRecord): (string | null)[] {
  const row = createEmptyRow();

  row[0] = record.request?.bookingCode || "";    // A: Booking Code
  row[9] = formatDate(record.serviceDate);       // J: Service Date
  row[10] = record.serviceType;                  // K: Service Type
  row[14] = formatNumber(record.costBeforeTax);  // O: Cost Before Tax
  row[15] = formatNumber(record.vat);            // P: VAT
  // row[16] = SKIP - totalCost is formula in sheet
  row[18] = record.supplier || "";               // S: Supplier
  row[19] = record.notes || "";                  // T: Notes
  // row[22] = SKIP - debt is formula in sheet

  return row;
}

/**
 * Revenue DB record type (with request relation)
 */
export interface RevenueRecord {
  paymentDate: Date;
  paymentType: string;
  foreignAmount: Prisma.Decimal | null;
  currency: string | null;
  exchangeRate: Prisma.Decimal | null;
  amountVND: Prisma.Decimal;
  paymentSource: string;
  request?: { bookingCode: string | null };
}

/**
 * Map Revenue record to sheet row
 *
 * Column mapping:
 * A(0)=BookingCode, L(11)=PaymentType, M(12)=PaymentDate,
 * N(13)=PaymentSource, Q(16)=ForeignAmount, R(17)=ExchangeRate,
 * S(18)=Currency, T(19)=AmountVND
 */
export function mapRevenueToRow(record: RevenueRecord): (string | null)[] {
  const row = createEmptyRow();

  row[0] = record.request?.bookingCode || "";    // A: Booking Code
  row[11] = record.paymentType;                  // L: Payment Type
  row[12] = formatDate(record.paymentDate);      // M: Payment Date
  row[13] = record.paymentSource;                // N: Payment Source
  row[16] = formatDecimal(record.foreignAmount); // Q: Foreign Amount
  row[17] = formatDecimal(record.exchangeRate);  // R: Exchange Rate
  row[18] = record.currency || "VND";            // S: Currency
  row[19] = formatNumber(record.amountVND);      // T: Amount VND

  return row;
}

/**
 * Column indices that contain formulas (DO NOT overwrite)
 */
export const FORMULA_COLUMNS: Record<string, number[]> = {
  Request: [], // No formula columns in Request sheet
  Operator: [16, 22], // Q=totalCost, W=debt
  Revenue: [], // No formula columns in Revenue sheet
};

/**
 * Get writable columns for a sheet (excluding formulas)
 */
export function getWritableColumns(sheetName: string): number[] {
  const formulaCols = FORMULA_COLUMNS[sheetName] || [];
  return Array.from({ length: MAX_COLUMNS }, (_, i) => i).filter(
    (i) => !formulaCols.includes(i)
  );
}

/**
 * Filter row to only writable columns
 */
export function filterWritableValues(
  sheetName: string,
  row: (string | null)[]
): (string | null)[] {
  const formulaCols = FORMULA_COLUMNS[sheetName] || [];
  return row.map((value, index) => (formulaCols.includes(index) ? null : value));
}
```

## Success Criteria

1. Request mapper populates correct column indices
2. Operator mapper skips formula columns (Q, W)
3. Revenue mapper populates correct column indices
4. Date format matches Vietnamese locale (DD/MM/YYYY)
5. Number format matches Vietnamese locale (dot separators)
6. Status codes converted to Vietnamese labels

## Testing

```typescript
import {
  mapRequestToRow,
  mapOperatorToRow,
  mapRevenueToRow,
} from "@/lib/sync/db-to-sheet-mappers";

// Test Request mapping
const requestRow = mapRequestToRow({
  code: "RQ-240101-0001",
  bookingCode: "V240101001",
  customerName: "John Doe",
  contact: "john@example.com",
  country: "USA",
  source: "TripAdvisor",
  status: "BOOKING",
  pax: 2,
  tourDays: 5,
  startDate: new Date("2024-02-15"),
  endDate: new Date("2024-02-20"),
  expectedRevenue: new Prisma.Decimal(50000000),
  expectedCost: new Prisma.Decimal(30000000),
  notes: "VIP customer",
  seller: { name: "Ly" },
});

console.log(requestRow[0]);  // "Ly"
console.log(requestRow[1]);  // "John Doe"
console.log(requestRow[7]);  // "Booking"
console.log(requestRow[43]); // "RQ-240101-0001"

// Test Operator mapping (formula columns should be null)
const operatorRow = mapOperatorToRow({
  serviceDate: new Date("2024-02-15"),
  serviceType: "Hotel",
  serviceName: "Grand Hotel",
  supplier: "Hotel Group",
  costBeforeTax: new Prisma.Decimal(10000000),
  vat: new Prisma.Decimal(1000000),
  totalCost: new Prisma.Decimal(11000000),
  notes: null,
  request: { bookingCode: "V240101001" },
});

console.log(operatorRow[16]); // null (formula column)
console.log(operatorRow[22]); // null (formula column)
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong column index | High | Verify against sheet-mappers.ts |
| Formula overwrite | High | FORMULA_COLUMNS exclusion list |
| Date format mismatch | Medium | Use consistent DD/MM/YYYY |
| Number format issues | Low | Use vi-VN locale |
