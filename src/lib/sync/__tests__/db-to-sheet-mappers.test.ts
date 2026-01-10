/**
 * Tests for DB to Sheet Mappers
 */

import { Prisma } from "@prisma/client";
import {
  mapRequestToRow,
  mapOperatorToRow,
  mapRevenueToRow,
  FORMULA_COLUMNS,
  getWritableColumns,
  filterWritableValues,
  statusKeyToVietnamese,
  type RequestRecord,
  type OperatorRecord,
  type RevenueRecord,
} from "../db-to-sheet-mappers";

describe("DB to Sheet Mappers", () => {
  describe("mapRequestToRow", () => {
    const baseRequest: RequestRecord = {
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
    };

    it("maps all fields to correct column indices", () => {
      const row = mapRequestToRow(baseRequest);

      expect(row[0]).toBe("Ly");                // A: Seller
      expect(row[1]).toBe("John Doe");          // B: Name
      expect(row[2]).toBe("john@example.com");  // C: Contact
      expect(row[4]).toBe("2");                 // E: Pax
      expect(row[5]).toBe("USA");               // F: Country
      expect(row[6]).toBe("TripAdvisor");       // G: Source
      expect(row[7]).toBe("Booking");           // H: Status (Vietnamese)
      expect(row[9]).toBe("5");                 // J: Tour Days
      expect(row[10]).toBe("15/02/2024");       // K: Start Date
      expect(row[11]).toBe("50.000.000");       // L: Expected Revenue
      expect(row[12]).toBe("30.000.000");       // M: Expected Cost
      expect(row[13]).toBe("VIP customer");     // N: Notes
      expect(row[19]).toBe("V240101001");       // T: Booking Code
      expect(row[25]).toBe("20/02/2024");       // Z: End Date
      expect(row[43]).toBe("RQ-240101-0001");   // AR: Request ID
    });

    it("converts status to Vietnamese label", () => {
      const testCases = [
        { status: "BOOKING", expected: "Booking" },
        { status: "CANCEL", expected: "Cancel" },
        { status: "F1", expected: "F1" },
        { status: "DANG_LL_CHUA_TL", expected: "Đang LL - khách chưa trả lời" },
        { status: "DA_KET_THUC", expected: "Đã kết thúc" },
      ];

      for (const { status, expected } of testCases) {
        const row = mapRequestToRow({ ...baseRequest, status });
        expect(row[7]).toBe(expected);
      }
    });

    it("handles null/undefined optional fields", () => {
      const request: RequestRecord = {
        ...baseRequest,
        bookingCode: null,
        tourDays: null,
        startDate: null,
        endDate: null,
        expectedRevenue: null,
        expectedCost: null,
        notes: null,
        seller: undefined,
      };

      const row = mapRequestToRow(request);

      expect(row[0]).toBe("");   // Seller
      expect(row[9]).toBe("");   // Tour Days
      expect(row[10]).toBe("");  // Start Date
      expect(row[11]).toBe("");  // Expected Revenue
      expect(row[12]).toBe("");  // Expected Cost
      expect(row[13]).toBe("");  // Notes
      expect(row[19]).toBe("");  // Booking Code
      expect(row[25]).toBe("");  // End Date
    });

    it("returns array with 52 elements", () => {
      const row = mapRequestToRow(baseRequest);
      expect(row.length).toBe(52);
    });
  });

  describe("mapOperatorToRow", () => {
    const baseOperator: OperatorRecord = {
      serviceDate: new Date("2024-02-15"),
      serviceType: "Hotel",
      serviceName: "Grand Hotel",
      supplier: "Hotel Group",
      costBeforeTax: new Prisma.Decimal(10000000),
      vat: new Prisma.Decimal(1000000),
      totalCost: new Prisma.Decimal(11000000),
      notes: "Confirmed",
      request: { bookingCode: "V240101001" },
    };

    it("maps all fields to correct column indices", () => {
      const row = mapOperatorToRow(baseOperator);

      expect(row[0]).toBe("V240101001");        // A: Booking Code
      expect(row[9]).toBe("15/02/2024");        // J: Service Date
      expect(row[10]).toBe("Hotel");            // K: Service Type
      expect(row[14]).toBe("10.000.000");       // O: Cost Before Tax
      expect(row[15]).toBe("1.000.000");        // P: VAT
      expect(row[18]).toBe("Hotel Group");      // S: Supplier
      expect(row[19]).toBe("Confirmed");        // T: Notes
    });

    it("leaves formula columns as null", () => {
      const row = mapOperatorToRow(baseOperator);

      // Q(16) and W(22) are formula columns
      expect(row[16]).toBeNull();  // Q: Total Cost (formula)
      expect(row[22]).toBeNull();  // W: Debt (formula)
    });

    it("handles null optional fields", () => {
      const operator: OperatorRecord = {
        ...baseOperator,
        supplier: null,
        vat: null,
        notes: null,
        request: undefined,
      };

      const row = mapOperatorToRow(operator);

      expect(row[0]).toBe("");   // Booking Code
      expect(row[15]).toBe("");  // VAT
      expect(row[18]).toBe("");  // Supplier
      expect(row[19]).toBe("");  // Notes
    });
  });

  describe("mapRevenueToRow", () => {
    const baseRevenue: RevenueRecord = {
      paymentDate: new Date("2024-02-15"),
      paymentType: "Deposit",
      foreignAmount: new Prisma.Decimal(2000),
      currency: "USD",
      exchangeRate: new Prisma.Decimal(24500),
      amountVND: new Prisma.Decimal(49000000),
      paymentSource: "Bank transfer",
      request: { bookingCode: "V240101001" },
    };

    it("maps all fields to correct column indices", () => {
      const row = mapRevenueToRow(baseRevenue);

      expect(row[0]).toBe("V240101001");        // A: Booking Code
      expect(row[11]).toBe("Deposit");          // L: Payment Type
      expect(row[12]).toBe("15/02/2024");       // M: Payment Date
      expect(row[13]).toBe("Bank transfer");    // N: Payment Source
      expect(row[16]).toBe("2.000,00");         // Q: Foreign Amount
      expect(row[17]).toBe("24.500,00");        // R: Exchange Rate
      expect(row[18]).toBe("USD");              // S: Currency
      expect(row[19]).toBe("49.000.000");       // T: Amount VND
    });

    it("handles null optional fields", () => {
      const revenue: RevenueRecord = {
        ...baseRevenue,
        foreignAmount: null,
        currency: null,
        exchangeRate: null,
        request: undefined,
      };

      const row = mapRevenueToRow(revenue);

      expect(row[0]).toBe("");     // Booking Code
      expect(row[16]).toBe("");    // Foreign Amount
      expect(row[17]).toBe("");    // Exchange Rate
      expect(row[18]).toBe("VND"); // Currency defaults to VND
    });
  });

  describe("FORMULA_COLUMNS", () => {
    it("has correct formula columns for each sheet", () => {
      expect(FORMULA_COLUMNS.Request).toEqual([]);
      expect(FORMULA_COLUMNS.Operator).toEqual([16, 22]); // Q, W
      expect(FORMULA_COLUMNS.Revenue).toEqual([]);
    });
  });

  describe("getWritableColumns", () => {
    it("returns all columns for Request (no formulas)", () => {
      const cols = getWritableColumns("Request");
      expect(cols.length).toBe(52);
      expect(cols).toContain(16); // Not excluded
    });

    it("excludes formula columns for Operator", () => {
      const cols = getWritableColumns("Operator");
      expect(cols.length).toBe(50); // 52 - 2 formula cols
      expect(cols).not.toContain(16); // Q excluded
      expect(cols).not.toContain(22); // W excluded
    });

    it("handles unknown sheet name", () => {
      const cols = getWritableColumns("Unknown");
      expect(cols.length).toBe(52); // All columns writable
    });
  });

  describe("filterWritableValues", () => {
    it("sets formula columns to null for Operator", () => {
      const row = Array(52).fill("value");
      row[16] = "should be null";
      row[22] = "should be null";

      const filtered = filterWritableValues("Operator", row);

      expect(filtered[16]).toBeNull();
      expect(filtered[22]).toBeNull();
      expect(filtered[0]).toBe("value");
      expect(filtered[14]).toBe("value");
    });

    it("preserves all values for Request (no formulas)", () => {
      const row = Array(52).fill("value");
      const filtered = filterWritableValues("Request", row);

      expect(filtered.every((v) => v === "value")).toBe(true);
    });
  });

  describe("statusKeyToVietnamese", () => {
    it("converts known status keys", () => {
      expect(statusKeyToVietnamese("BOOKING")).toBe("Booking");
      expect(statusKeyToVietnamese("CANCEL")).toBe("Cancel");
      expect(statusKeyToVietnamese("F1")).toBe("F1");
    });

    it("returns original for unknown status", () => {
      expect(statusKeyToVietnamese("UNKNOWN")).toBe("UNKNOWN");
    });
  });

  describe("Date Formatting", () => {
    it("formats dates as DD/MM/YYYY", () => {
      const request: RequestRecord = {
        code: "TEST",
        bookingCode: null,
        customerName: "Test",
        contact: "",
        country: "",
        source: "",
        status: "BOOKING",
        pax: 1,
        tourDays: null,
        startDate: new Date("2024-01-05"),
        endDate: new Date("2024-12-25"),
        expectedRevenue: null,
        expectedCost: null,
        notes: null,
      };

      const row = mapRequestToRow(request);

      expect(row[10]).toBe("05/01/2024"); // Single digit padded
      expect(row[25]).toBe("25/12/2024");
    });
  });

  describe("Number Formatting", () => {
    it("formats numbers with Vietnamese locale (dots as separators)", () => {
      const request: RequestRecord = {
        code: "TEST",
        bookingCode: null,
        customerName: "Test",
        contact: "",
        country: "",
        source: "",
        status: "BOOKING",
        pax: 1,
        tourDays: null,
        startDate: null,
        endDate: null,
        expectedRevenue: new Prisma.Decimal(1234567890),
        expectedCost: new Prisma.Decimal(999),
        notes: null,
      };

      const row = mapRequestToRow(request);

      expect(row[11]).toBe("1.234.567.890"); // Large number
      expect(row[12]).toBe("999");           // Small number (no separator)
    });

    it("formats decimals with 2 decimal places", () => {
      const revenue: RevenueRecord = {
        paymentDate: new Date(),
        paymentType: "Test",
        foreignAmount: new Prisma.Decimal(1234.5),
        currency: "USD",
        exchangeRate: new Prisma.Decimal(24000.00),
        amountVND: new Prisma.Decimal(1000000),
        paymentSource: "Test",
      };

      const row = mapRevenueToRow(revenue);

      expect(row[16]).toBe("1.234,50");    // Q: Foreign Amount
      expect(row[17]).toBe("24.000,00");   // R: Exchange Rate
    });
  });
});
