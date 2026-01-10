/**
 * @jest-environment node
 */

// Tests for POST /api/sync/write-back
// Covers: Cron secret auth, admin user auth, write-back processing, SyncLog creation

import { NextRequest } from "next/server";
import { prismaMock } from "@/lib/__mocks__/db";

// Mock the db module
jest.mock("@/lib/db", () => ({
  basePrisma: prismaMock,
  prisma: prismaMock,
}));

// Mock auth
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock permissions
jest.mock("@/lib/permissions", () => ({
  hasPermission: jest.fn((role, perm) => perm === "*"),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

// Mock write-back queue functions
jest.mock("@/lib/sync/write-back-queue", () => ({
  dequeue: jest.fn(),
  markComplete: jest.fn(),
  markFailed: jest.fn(),
  resetStuck: jest.fn(),
  cleanupCompleted: jest.fn(),
  getQueueStats: jest.fn(),
}));

// Mock sheets writer
jest.mock("@/lib/sync/sheets-writer", () => ({
  updateSheetRows: jest.fn(),
  appendSheetRow: jest.fn(),
}));

// Mock db-to-sheet-mappers
jest.mock("@/lib/sync/db-to-sheet-mappers", () => ({
  mapRequestToRow: jest.fn(() => ["val1", "val2"]),
  mapOperatorToRow: jest.fn(() => ["val1", "val2"]),
  mapRevenueToRow: jest.fn(() => ["val1", "val2"]),
  filterWritableValues: jest.fn((model, values) => values),
}));

import { POST } from "@/app/api/sync/write-back/route";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import {
  dequeue,
  markComplete,
  markFailed,
  resetStuck,
  cleanupCompleted,
  getQueueStats,
} from "@/lib/sync/write-back-queue";
import { appendSheetRow, updateSheetRows } from "@/lib/sync/sheets-writer";
import {
  mapRequestToRow,
  mapOperatorToRow,
  mapRevenueToRow,
  filterWritableValues,
} from "@/lib/sync/db-to-sheet-mappers";

// Helper to create mock NextRequest
function createMockRequest(
  url: string,
  options?: { method?: string; body?: string; headers?: Record<string, string> }
): NextRequest {
  const headers = new Headers(options?.headers);
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options?.method || "POST",
    headers,
    body: options?.body,
  } as any);
}

describe("POST /api/sync/write-back", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret-123";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  describe("Authentication", () => {
    it("accepts cron secret in Authorization header", async () => {
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });
      (resetStuck as jest.Mock).mockResolvedValue(0);
      (dequeue as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-cron-secret-123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(getQueueStats).toHaveBeenCalled();
    });

    it("rejects invalid cron secret", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        {
          method: "POST",
          headers: { Authorization: "Bearer wrong-secret" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("accepts admin user session when no cron secret", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });
      (resetStuck as jest.Mock).mockResolvedValue(0);
      (dequeue as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        { method: "POST" }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(auth).toHaveBeenCalled();
      expect(hasPermission).toHaveBeenCalledWith("ADMIN", "*");
    });

    it("rejects non-admin user session", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-456", role: "SELLER" },
      });
      (hasPermission as jest.Mock).mockReturnValue(false);

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        { method: "POST" }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Admin only");
    });

    it("rejects missing session", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        { method: "POST" }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Queue Processing", () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
    });

    it("processes queue items successfully", async () => {
      const queueItems = [
        {
          id: "item-1",
          action: "CREATE",
          model: "Request",
          recordId: "req-1",
          sheetRowIndex: null,
          payload: {},
        },
      ];

      (resetStuck as jest.Mock).mockResolvedValue(0);
      (dequeue as jest.Mock).mockResolvedValueOnce(queueItems);
      (dequeue as jest.Mock).mockResolvedValueOnce([]);
      (prismaMock.request.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        customerName: "Test",
      });
      (appendSheetRow as jest.Mock).mockResolvedValue(10);
      (prismaMock.request.update as jest.Mock).mockResolvedValue({});
      (markComplete as jest.Mock).mockResolvedValue({});
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 1,
        failed: 0,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-cron-secret-123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.processed).toBe(1);
      expect(data.result.succeeded).toBe(1);
      expect(prismaMock.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SUCCESS",
            action: "WRITE_BACK_CREATE",
          }),
        })
      );
    });

    it("handles failed queue items", async () => {
      const queueItems = [
        {
          id: "item-2",
          action: "UPDATE",
          model: "Operator",
          recordId: "op-1",
          sheetRowIndex: 5,
          payload: {},
        },
      ];

      (resetStuck as jest.Mock).mockResolvedValue(0);
      (dequeue as jest.Mock).mockResolvedValueOnce(queueItems);
      (dequeue as jest.Mock).mockResolvedValueOnce([]);
      (prismaMock.operator.findUnique as jest.Mock).mockResolvedValue(null);
      (markFailed as jest.Mock).mockResolvedValue({});
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 1,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-cron-secret-123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.processed).toBe(1);
      expect(data.result.succeeded).toBe(1); // orphan items marked as success
    });

    it("processes multiple batches", async () => {
      const batchItems = [
        {
          id: "item-1",
          action: "CREATE",
          model: "Request",
          recordId: "req-1",
          sheetRowIndex: null,
          payload: {},
        },
      ];

      (resetStuck as jest.Mock).mockResolvedValue(0);
      (dequeue as jest.Mock)
        .mockResolvedValueOnce(batchItems)
        .mockResolvedValueOnce(batchItems)
        .mockResolvedValueOnce([]);

      (prismaMock.request.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        customerName: "Test",
      });
      (appendSheetRow as jest.Mock).mockResolvedValue(10);
      (prismaMock.request.update as jest.Mock).mockResolvedValue({});
      (markComplete as jest.Mock).mockResolvedValue({});
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 2,
        failed: 0,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-cron-secret-123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data.result.processed).toBe(2);
      expect(dequeue).toHaveBeenCalledTimes(3);
    });

    it("skips DELETE action items", async () => {
      const queueItems = [
        {
          id: "item-3",
          action: "DELETE",
          model: "Revenue",
          recordId: "rev-1",
          sheetRowIndex: 8,
          payload: {},
        },
      ];

      (resetStuck as jest.Mock).mockResolvedValue(0);
      (dequeue as jest.Mock).mockResolvedValueOnce(queueItems);
      (dequeue as jest.Mock).mockResolvedValueOnce([]);
      (markComplete as jest.Mock).mockResolvedValue({});
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 1,
        failed: 0,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-cron-secret-123" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.succeeded).toBe(1);
      // DELETE items should not fetch from DB
      expect(prismaMock.revenue.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("Logging", () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
    });

    it("creates SyncLog on success", async () => {
      const queueItems = [
        {
          id: "item-1",
          action: "CREATE",
          model: "Request",
          recordId: "req-1",
          sheetRowIndex: null,
          payload: {},
        },
      ];

      (resetStuck as jest.Mock).mockResolvedValue(0);
      (dequeue as jest.Mock).mockResolvedValueOnce(queueItems);
      (dequeue as jest.Mock).mockResolvedValueOnce([]);
      (prismaMock.request.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        customerName: "Test",
      });
      (appendSheetRow as jest.Mock).mockResolvedValue(10);
      (prismaMock.request.update as jest.Mock).mockResolvedValue({});
      (markComplete as jest.Mock).mockResolvedValue({});
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 1,
        failed: 0,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-cron-secret-123" },
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(prismaMock.syncLog.create).toHaveBeenCalledWith({
        data: {
          sheetName: "Request",
          action: "WRITE_BACK_CREATE",
          recordId: "req-1",
          rowIndex: null,
          status: "SUCCESS",
        },
      });
    });

    it("creates SyncLog on failure", async () => {
      const queueItems = [
        {
          id: "item-2",
          action: "UPDATE",
          model: "Operator",
          recordId: "op-1",
          sheetRowIndex: 5,
          payload: {},
        },
      ];

      (resetStuck as jest.Mock).mockResolvedValue(0);
      (dequeue as jest.Mock).mockResolvedValueOnce(queueItems);
      (dequeue as jest.Mock).mockResolvedValueOnce([]);
      (prismaMock.operator.findUnique as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );
      (markFailed as jest.Mock).mockResolvedValue({});
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 1,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-cron-secret-123" },
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(prismaMock.syncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "FAILED",
          action: "WRITE_BACK_UPDATE",
          errorMessage: "DB error",
        }),
      });
    });
  });

  describe("Error Handling", () => {
    it("handles unexpected errors gracefully", async () => {
      (auth as jest.Mock).mockRejectedValue(new Error("Auth failed"));

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        { method: "POST" }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Write-back failed");
    });

    it("resets stuck items on start", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
      (resetStuck as jest.Mock).mockResolvedValue(5);
      (dequeue as jest.Mock).mockResolvedValue([]);
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/sync/write-back",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-cron-secret-123" },
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(resetStuck).toHaveBeenCalledWith(10);
    });
  });
});
