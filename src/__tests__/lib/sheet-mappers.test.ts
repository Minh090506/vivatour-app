/**
 * Tests for sheet-mappers.ts
 * Verifies request sync mapping, enum key conversion, and booking code inclusion
 */

import { mapRequestRow } from "@/lib/sheet-mappers";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Mock Prisma
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

// Type-safe mock accessor
const mockUserFindFirst = prisma.user.findFirst as jest.Mock;

const mockSeller = {
  id: "seller-1",
  email: "seller@test.com",
  password: null,
  name: "Test Seller",
  role: "SELLER" as const,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("sheet-mappers.ts - Request Row Mapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindFirst.mockResolvedValue(mockSeller);
  });

  describe("mapRequestRow - Basic Structure", () => {
    test("should extract all required and optional fields from row", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[2] = "john@example.com";
      row[4] = "2";
      row[5] = "United States";
      row[6] = "Website";
      row[7] = "Đã báo giá";
      row[9] = "5";
      row[10] = "15/01/2025";
      row[11] = "5000000";
      row[12] = "3000000";
      row[13] = "VIP customer";
      row[19] = "JOHN-001";
      row[25] = "20/01/2025";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result).not.toBeNull();
      expect(result).toEqual(
        expect.objectContaining({
          code: "RQ-250115-0001",
          customerName: "John Doe",
          contact: "john@example.com",
          pax: 2,
          country: "United States",
          source: "Website",
          notes: "VIP customer",
          sheetRowIndex: 2,
          sellerId: "seller-1",
        })
      );
    });

    test("should include bookingCode in output", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[19] = "BOOKING-CODE-123";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result).not.toBeNull();
      expect(result?.bookingCode).toBe("BOOKING-CODE-123");
    });

    test("should handle null bookingCode when not provided", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[19] = "";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result).not.toBeNull();
      expect(result?.bookingCode).toBeNull();
    });
  });

  describe("mapRequestRow - Vietnamese Status Mapping to Enum Keys", () => {
    const createTestRow = (vietnameseStatus: string) => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[7] = vietnameseStatus;
      row[43] = "RQ-250115-0001";
      return row;
    };

    test("should map 'Đã báo giá' to DA_BAO_GIA enum key", async () => {
      const result = await mapRequestRow(createTestRow("Đã báo giá"), 2);
      expect(result?.status).toBe("DA_BAO_GIA");
    });

    test("should map 'Đang xây Tour' to DANG_XAY_TOUR enum key", async () => {
      const result = await mapRequestRow(createTestRow("Đang xây Tour"), 2);
      expect(result?.status).toBe("DANG_XAY_TOUR");
    });

    test("should map 'F1' to F1 enum key", async () => {
      const result = await mapRequestRow(createTestRow("F1"), 2);
      expect(result?.status).toBe("F1");
    });

    test("should map 'F2' to F2 enum key", async () => {
      const result = await mapRequestRow(createTestRow("F2"), 2);
      expect(result?.status).toBe("F2");
    });

    test("should map 'F3' to F3 enum key", async () => {
      const result = await mapRequestRow(createTestRow("F3"), 2);
      expect(result?.status).toBe("F3");
    });

    test("should map 'F4' variations to F4 enum key", async () => {
      expect((await mapRequestRow(createTestRow("F4"), 2))?.status).toBe("F4");
      expect(
        (await mapRequestRow(createTestRow("F4: Lần cuối"), 2))?.status
      ).toBe("F4");
      expect((await mapRequestRow(createTestRow("Lần cuối"), 2))?.status).toBe(
        "F4"
      );
    });

    test("should map 'Booking' to BOOKING enum key", async () => {
      const result = await mapRequestRow(createTestRow("Booking"), 2);
      expect(result?.status).toBe("BOOKING");
    });

    test("should map 'Khách hoãn' to KHACH_HOAN enum key", async () => {
      const result = await mapRequestRow(createTestRow("Khách hoãn"), 2);
      expect(result?.status).toBe("KHACH_HOAN");
    });

    test("should map 'Đang suy nghĩ' to KHACH_SUY_NGHI enum key", async () => {
      const result = await mapRequestRow(createTestRow("Đang suy nghĩ"), 2);
      expect(result?.status).toBe("KHACH_SUY_NGHI");
    });

    test("should map 'Không đủ TC' to KHONG_DU_TC enum key", async () => {
      const result = await mapRequestRow(createTestRow("Không đủ TC"), 2);
      expect(result?.status).toBe("KHONG_DU_TC");
    });

    test("should map 'Đã kết thúc' to DA_KET_THUC enum key", async () => {
      const result = await mapRequestRow(createTestRow("Đã kết thúc"), 2);
      expect(result?.status).toBe("DA_KET_THUC");
    });

    test("should map 'Cancel' to CANCEL enum key", async () => {
      const result = await mapRequestRow(createTestRow("Cancel"), 2);
      expect(result?.status).toBe("CANCEL");
    });

    test("should map 'Đang LL - khách chưa trả lời' to DANG_LL_CHUA_TL enum key",
      async () => {
        const result = await mapRequestRow(
          createTestRow("Đang LL - khách chưa trả lời"),
          2
        );
        expect(result?.status).toBe("DANG_LL_CHUA_TL");
      }
    );

    test("should map 'Đang LL - khách đã trả lời' to DANG_LL_DA_TL enum key",
      async () => {
        const result = await mapRequestRow(
          createTestRow("Đang LL - khách đã trả lời"),
          2
        );
        expect(result?.status).toBe("DANG_LL_DA_TL");
      }
    );

    test("should default to DANG_LL_CHUA_TL for unknown status", async () => {
      const result = await mapRequestRow(createTestRow("UNKNOWN_STATUS"), 2);
      expect(result?.status).toBe("DANG_LL_CHUA_TL");
    });

    test("should default to DANG_LL_CHUA_TL for empty status", async () => {
      const result = await mapRequestRow(createTestRow(""), 2);
      expect(result?.status).toBe("DANG_LL_CHUA_TL");
    });

    test("should always return string enum key (not Vietnamese label)", async () => {
      const result = await mapRequestRow(createTestRow("Đã báo giá"), 2);
      expect(typeof result?.status).toBe("string");
      expect(result?.status).toMatch(/^[A-Z_0-9]+$/);
    });
  });

  describe("mapRequestRow - Decimal Fields", () => {
    test("should convert expectedRevenue to Prisma.Decimal", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[11] = "5000000";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result?.expectedRevenue).toBeInstanceOf(Prisma.Decimal);
      expect(result?.expectedRevenue?.toString()).toBe("5000000");
    });

    test("should convert expectedCost to Prisma.Decimal", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[12] = "3000000";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result?.expectedCost).toBeInstanceOf(Prisma.Decimal);
      expect(result?.expectedCost?.toString()).toBe("3000000");
    });

    test("should handle Vietnamese decimal format (comma as decimal separator)", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[11] = "5.000.000,50";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result?.expectedRevenue).toBeInstanceOf(Prisma.Decimal);
      expect(result?.expectedRevenue?.toNumber()).toBeCloseTo(5000000.5, 1);
    });

    test("should handle empty Decimal fields as null", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[11] = "";
      row[12] = "";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result?.expectedRevenue).toBeNull();
      expect(result?.expectedCost).toBeNull();
    });
  });

  describe("mapRequestRow - Validation & Filtering", () => {
    test("should return null when Request ID (AR) is empty", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[43] = "";

      const result = await mapRequestRow(row, 2);
      expect(result).toBeNull();
    });

    test("should return null when Seller (A) is empty", async () => {
      mockUserFindFirst.mockResolvedValueOnce(null);

      const row = Array(44).fill("");
      row[0] = "";
      row[1] = "John Doe";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);
      expect(result).toBeNull();
    });

    test("should return null when customer name (B) is empty", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);
      expect(result).toBeNull();
    });

    test("should return null for header rows", async () => {
      const row = [
        "Seller",
        "Name",
        "Contact",
        ...Array(41).fill(""),
        "Request ID",
      ];

      const result = await mapRequestRow(row, 1);
      expect(result).toBeNull();
    });

    test("should throw error when no SELLER user found", async () => {
      mockUserFindFirst.mockResolvedValueOnce(null);

      const row = Array(44).fill("");
      row[0] = "Non-existent Seller";
      row[1] = "John Doe";
      row[43] = "RQ-250115-0001";

      await expect(mapRequestRow(row, 2)).rejects.toThrow(
        "No SELLER user found for import"
      );
    });
  });

  describe("mapRequestRow - Data Types & Conversions", () => {
    test("should convert pax string to number", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[4] = "2";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result?.pax).toBe(2);
      expect(typeof result?.pax).toBe("number");
    });

    test("should default pax to 1 if empty", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[4] = "";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result?.pax).toBe(1);
    });

    test("should parse tourDays as number", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[9] = "5";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result?.tourDays).toBe(5);
      expect(typeof result?.tourDays).toBe("number");
    });

    test("should handle null tourDays when empty", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[9] = "";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result?.tourDays).toBeNull();
    });

    test("should parse dates in DD/MM/YYYY format", async () => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[10] = "15/01/2025";
      row[43] = "RQ-250115-0001";

      const result = await mapRequestRow(row, 2);

      expect(result?.startDate).toBeInstanceOf(Date);
      expect(result?.startDate?.getFullYear()).toBe(2025);
      expect(result?.startDate?.getMonth()).toBe(0);
      expect(result?.startDate?.getDate()).toBe(15);
    });

    test("should trim whitespace from text fields", async () => {
      const row = Array(44).fill("");
      row[0] = "  Test Seller  ";
      row[1] = "  John Doe  ";
      row[2] = "  john@example.com  ";
      row[43] = "  RQ-250115-0001  ";

      const result = await mapRequestRow(row, 2);

      expect(result?.code).toBe("RQ-250115-0001");
      expect(result?.customerName).toBe("John Doe");
      expect(result?.contact).toBe("john@example.com");
    });
  });

  describe("mapRequestRow - Stage Mapping", () => {
    const createTestRow = (vietnameseStatus: string) => {
      const row = Array(44).fill("");
      row[0] = "Test Seller";
      row[1] = "John Doe";
      row[7] = vietnameseStatus;
      row[43] = "RQ-250115-0001";
      return row;
    };

    test("should map quote statuses to QUOTE stage", async () => {
      const result1 = await mapRequestRow(createTestRow("Đã báo giá"), 2);
      const result2 = await mapRequestRow(
        createTestRow("Đang xây Tour"),
        2
      );

      expect(result1?.stage).toBe("QUOTE");
      expect(result2?.stage).toBe("QUOTE");
    });

    test("should map F1-F4 statuses to FOLLOWUP stage", async () => {
      const result1 = await mapRequestRow(createTestRow("F1"), 2);
      const result2 = await mapRequestRow(createTestRow("F4"), 2);

      expect(result1?.stage).toBe("FOLLOWUP");
      expect(result2?.stage).toBe("FOLLOWUP");
    });

    test("should map booking/cancel statuses to OUTCOME stage", async () => {
      const result1 = await mapRequestRow(createTestRow("Booking"), 2);
      const result2 = await mapRequestRow(createTestRow("Cancel"), 2);
      const result3 = await mapRequestRow(
        createTestRow("Đã kết thúc"),
        2
      );

      expect(result1?.stage).toBe("OUTCOME");
      expect(result2?.stage).toBe("OUTCOME");
      expect(result3?.stage).toBe("OUTCOME");
    });

    test("should default to LEAD stage for unknown status", async () => {
      const result = await mapRequestRow(createTestRow("UNKNOWN"), 2);

      expect(result?.stage).toBe("LEAD");
    });
  });

  describe("mapRequestRow - Real-world Integration", () => {
    test("should handle complete real-world request row", async () => {
      mockUserFindFirst.mockResolvedValueOnce({
        id: "seller-123",
        email: "phuong@vivatour.com",
        password: null,
        name: "Phuong Nguyen",
        role: "SELLER" as const,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const row = [
        "Phuong Nguyen",
        "Sarah Johnson",
        "sarah@gmail.com",
        "",
        "4",
        "United States",
        "TripAdvisor",
        "F2",
        "",
        "10",
        "01/03/2025",
        "50000000",
        "30000000",
        "VIP client, needs visa",
        "",
        "",
        "",
        "",
        "",
        "JOHN-VIP-001",
        ...Array(5).fill(""),
        "10/03/2025",
        ...Array(17).fill(""),
        "RQ-250301-0015",
      ];

      const result = await mapRequestRow(row, 10);

      expect(result).toEqual({
        code: "RQ-250301-0015",
        bookingCode: "JOHN-VIP-001",
        customerName: "Sarah Johnson",
        contact: "sarah@gmail.com",
        country: "United States",
        source: "TripAdvisor",
        status: "F2",
        stage: "FOLLOWUP",
        pax: 4,
        tourDays: 10,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        expectedRevenue: expect.any(Prisma.Decimal),
        expectedCost: expect.any(Prisma.Decimal),
        notes: "VIP client, needs visa",
        sellerId: "seller-123",
        sheetRowIndex: 10,
      });
    });
  });
});
