/**
 * Tests for Google Sheets Writer Module
 */

import {
  updateSheetRows,
  appendSheetRow,
  updateSheetRowsBatched,
  shouldThrottle,
  recordRequest,
  getRateLimitStatus,
  resetRateLimiter,
  type RowUpdate,
} from "../sheets-writer";
import { getSheetConfig } from "@/lib/google-sheets";

// Mock google-sheets module
jest.mock("@/lib/google-sheets", () => ({
  getSheetConfig: jest.fn(),
}));

// Mock googleapis
const mockBatchUpdate = jest.fn();
const mockAppend = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
    },
    sheets: jest.fn().mockImplementation(() => ({
      spreadsheets: {
        values: {
          batchUpdate: mockBatchUpdate,
          append: mockAppend,
        },
      },
    })),
  },
}));

const mockGetSheetConfig = getSheetConfig as jest.MockedFunction<typeof getSheetConfig>;

describe("SheetsWriter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimiter();

    // Set up env vars
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@example.iam.gserviceaccount.com";
    process.env.GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----";

    // Default mock config
    mockGetSheetConfig.mockReturnValue({
      spreadsheetId: "test-spreadsheet-id",
      tabName: "Request",
      headerRow: 1,
    });
  });

  afterEach(() => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
  });

  describe("updateSheetRows", () => {
    it("returns 0 when updates array is empty", async () => {
      const result = await updateSheetRows("Request", []);
      expect(result).toBe(0);
      expect(mockBatchUpdate).not.toHaveBeenCalled();
    });

    it("throws when no spreadsheet ID configured", async () => {
      mockGetSheetConfig.mockReturnValue({
        spreadsheetId: undefined,
        tabName: "Request",
        headerRow: 1,
      });

      await expect(updateSheetRows("Request", [{ rowIndex: 5, values: ["test"] }])).rejects.toThrow(
        "No spreadsheet ID for Request"
      );
    });

    it("calls batchUpdate with correct parameters", async () => {
      mockBatchUpdate.mockResolvedValue({ data: {} });

      const updates: RowUpdate[] = [
        { rowIndex: 5, values: ["Seller", "Customer A", "a@test.com"] },
        { rowIndex: 6, values: ["Seller", "Customer B", "b@test.com"] },
      ];

      const result = await updateSheetRows("Request", updates);

      expect(result).toBe(2);
      expect(mockBatchUpdate).toHaveBeenCalledWith({
        spreadsheetId: "test-spreadsheet-id",
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: [
            {
              range: "Request!A5:AZ5",
              values: [["Seller", "Customer A", "a@test.com"]],
            },
            {
              range: "Request!A6:AZ6",
              values: [["Seller", "Customer B", "b@test.com"]],
            },
          ],
        },
      });
    });

    it("converts null values to empty strings", async () => {
      mockBatchUpdate.mockResolvedValue({ data: {} });

      const updates: RowUpdate[] = [{ rowIndex: 5, values: ["Seller", null, "email@test.com", null] }];

      await updateSheetRows("Request", updates);

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            data: [
              expect.objectContaining({
                values: [["Seller", "", "email@test.com", ""]],
              }),
            ],
          }),
        })
      );
    });

    it("retries on 429 rate limit error", async () => {
      // Skip retry delays for this test
      jest.spyOn(global, "setTimeout").mockImplementation((fn: TimerHandler) => {
        if (typeof fn === "function") fn();
        return 0 as unknown as NodeJS.Timeout;
      });

      const error429 = { code: 429, message: "Rate limited" };
      mockBatchUpdate.mockRejectedValueOnce(error429).mockResolvedValueOnce({ data: {} });

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await updateSheetRows("Request", [{ rowIndex: 5, values: ["test"] }]);

      expect(result).toBe(1);
      expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("rate limited"));

      consoleSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it("throws non-429 errors immediately", async () => {
      const error500 = { code: 500, message: "Server error" };
      mockBatchUpdate.mockRejectedValue(error500);

      await expect(updateSheetRows("Request", [{ rowIndex: 5, values: ["test"] }])).rejects.toEqual(
        error500
      );

      expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    });

    it("throws after max retries on 429", async () => {
      // Skip retry delays for this test by making setTimeout instant
      jest.spyOn(global, "setTimeout").mockImplementation((fn: TimerHandler) => {
        if (typeof fn === "function") fn();
        return 0 as unknown as NodeJS.Timeout;
      });

      const error429 = { code: 429, message: "Rate limited" };
      mockBatchUpdate.mockRejectedValue(error429);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await expect(updateSheetRows("Request", [{ rowIndex: 5, values: ["test"] }])).rejects.toEqual(
        error429
      );

      // Should attempt 5 times (maxAttempts)
      expect(mockBatchUpdate).toHaveBeenCalledTimes(5);

      consoleSpy.mockRestore();
      jest.restoreAllMocks();
    });
  });

  describe("appendSheetRow", () => {
    it("throws when no spreadsheet ID configured", async () => {
      mockGetSheetConfig.mockReturnValue({
        spreadsheetId: undefined,
        tabName: "Request",
        headerRow: 1,
      });

      await expect(appendSheetRow("Request", ["test"])).rejects.toThrow(
        "No spreadsheet ID for Request"
      );
    });

    it("calls append with correct parameters", async () => {
      mockAppend.mockResolvedValue({
        data: {
          updates: {
            updatedRange: "Request!A25:AZ25",
          },
        },
      });

      const values = ["Seller", "New Customer", "new@test.com"];
      const result = await appendSheetRow("Request", values);

      expect(result).toBe(25);
      expect(mockAppend).toHaveBeenCalledWith({
        spreadsheetId: "test-spreadsheet-id",
        range: "Request!A:AZ",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [["Seller", "New Customer", "new@test.com"]],
        },
      });
    });

    it("returns 0 when updatedRange not parseable", async () => {
      mockAppend.mockResolvedValue({
        data: {
          updates: {
            updatedRange: "InvalidRange",
          },
        },
      });

      const result = await appendSheetRow("Request", ["test"]);
      expect(result).toBe(0);
    });

    it("converts null values to empty strings", async () => {
      mockAppend.mockResolvedValue({
        data: { updates: { updatedRange: "Request!A10:AZ10" } },
      });

      await appendSheetRow("Request", ["Seller", null, "email"]);

      expect(mockAppend).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            values: [["Seller", "", "email"]],
          },
        })
      );
    });
  });

  describe("updateSheetRowsBatched", () => {
    it("returns 0 for empty updates", async () => {
      const result = await updateSheetRowsBatched("Request", []);
      expect(result).toBe(0);
      expect(mockBatchUpdate).not.toHaveBeenCalled();
    });

    it("processes small batches in single call", async () => {
      mockBatchUpdate.mockResolvedValue({ data: {} });

      const updates: RowUpdate[] = Array(10)
        .fill(null)
        .map((_, i) => ({ rowIndex: i + 2, values: [`row-${i}`] }));

      const result = await updateSheetRowsBatched("Request", updates);

      expect(result).toBe(10);
      expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    });

    it("splits large batches into chunks of 25", async () => {
      mockBatchUpdate.mockResolvedValue({ data: {} });

      const updates: RowUpdate[] = Array(60)
        .fill(null)
        .map((_, i) => ({ rowIndex: i + 2, values: [`row-${i}`] }));

      const result = await updateSheetRowsBatched("Request", updates);

      expect(result).toBe(60);
      // 60 / 25 = 3 batches (25 + 25 + 10)
      expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
    });
  });

  describe("Rate Limit Manager", () => {
    beforeEach(() => {
      resetRateLimiter();
    });

    describe("shouldThrottle", () => {
      it("returns false when under limit", () => {
        expect(shouldThrottle()).toBe(false);
      });

      it("returns true when at limit", () => {
        // Record 55 requests (MAX_PER_MINUTE)
        for (let i = 0; i < 55; i++) {
          recordRequest();
        }
        expect(shouldThrottle()).toBe(true);
      });

      it("resets after window expires", () => {
        // Record requests
        for (let i = 0; i < 55; i++) {
          recordRequest();
        }
        expect(shouldThrottle()).toBe(true);

        // Simulate window expiry by manipulating Date.now
        const originalNow = Date.now;
        Date.now = () => originalNow() + 61000; // 61 seconds later

        expect(shouldThrottle()).toBe(false);

        Date.now = originalNow;
      });
    });

    describe("recordRequest", () => {
      it("increments request count", () => {
        const before = getRateLimitStatus().requestsInWindow;
        recordRequest();
        const after = getRateLimitStatus().requestsInWindow;

        expect(after).toBe(before + 1);
      });

      it("resets count after window expires", () => {
        recordRequest();
        recordRequest();
        expect(getRateLimitStatus().requestsInWindow).toBe(2);

        // Simulate window expiry
        const originalNow = Date.now;
        Date.now = () => originalNow() + 61000;

        recordRequest();
        expect(getRateLimitStatus().requestsInWindow).toBe(1);

        Date.now = originalNow;
      });
    });

    describe("getRateLimitStatus", () => {
      it("returns correct status", () => {
        recordRequest();
        recordRequest();

        const status = getRateLimitStatus();

        expect(status.requestsInWindow).toBe(2);
        expect(status.windowRemainingMs).toBeGreaterThan(0);
        expect(status.windowRemainingMs).toBeLessThanOrEqual(60000);
        expect(status.shouldThrottle).toBe(false);
      });

      it("shows shouldThrottle when at limit", () => {
        for (let i = 0; i < 55; i++) {
          recordRequest();
        }

        const status = getRateLimitStatus();
        expect(status.shouldThrottle).toBe(true);
      });
    });

    describe("resetRateLimiter", () => {
      it("resets all counters", () => {
        for (let i = 0; i < 10; i++) {
          recordRequest();
        }

        resetRateLimiter();

        const status = getRateLimitStatus();
        expect(status.requestsInWindow).toBe(0);
        expect(status.shouldThrottle).toBe(false);
      });
    });
  });
});
