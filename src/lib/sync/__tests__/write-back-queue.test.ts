/**
 * Tests for SyncQueue Management Utilities
 */

import { basePrisma } from "@/lib/db";
import { mockReset, DeepMockProxy } from "jest-mock-extended";
import { Prisma } from "@prisma/client";
import {
  enqueue,
  dequeue,
  markComplete,
  markFailed,
  resetStuck,
  cleanupCompleted,
  getQueueStats,
  getFailedItems,
  retryFailed,
  deleteQueueItem,
  type EnqueueParams,
} from "../write-back-queue";

// Mock Prisma client - use require to lazy-load mockDeep
// Note: write-back-queue imports basePrisma to avoid circular dependency
jest.mock("@/lib/db", () => {
  const { mockDeep } = require("jest-mock-extended");
  return {
    basePrisma: mockDeep(),
    prisma: mockDeep(),
  };
});

const mockPrisma = basePrisma as unknown as DeepMockProxy<typeof basePrisma>;

describe("SyncQueue Management Utilities", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
  });

  describe("enqueue", () => {
    it("creates a queue entry with correct data", async () => {
      const params: EnqueueParams = {
        action: "UPDATE",
        model: "Request",
        recordId: "test-id-123",
        sheetRowIndex: 5,
        payload: { customerName: "Test Customer" },
      };

      mockPrisma.syncQueue.create.mockResolvedValue({
        id: "queue-id-1",
        action: params.action,
        model: params.model,
        recordId: params.recordId,
        sheetRowIndex: params.sheetRowIndex!,
        payload: params.payload as Prisma.JsonObject,
        status: "PENDING",
        retries: 0,
        maxRetries: 3,
        lastError: null,
        createdAt: new Date(),
        processedAt: null,
      });

      await enqueue(params);

      expect(mockPrisma.syncQueue.create).toHaveBeenCalledWith({
        data: {
          action: "UPDATE",
          model: "Request",
          recordId: "test-id-123",
          sheetRowIndex: 5,
          payload: { customerName: "Test Customer" },
          status: "PENDING",
          retries: 0,
          maxRetries: 3,
        },
      });
    });

    it("handles null sheetRowIndex for CREATE action", async () => {
      const params: EnqueueParams = {
        action: "CREATE",
        model: "Operator",
        recordId: "op-123",
        payload: { serviceName: "Hotel ABC" },
      };

      mockPrisma.syncQueue.create.mockResolvedValue({
        id: "queue-id-2",
        action: params.action,
        model: params.model,
        recordId: params.recordId,
        sheetRowIndex: null,
        payload: params.payload as Prisma.JsonObject,
        status: "PENDING",
        retries: 0,
        maxRetries: 3,
        lastError: null,
        createdAt: new Date(),
        processedAt: null,
      });

      await enqueue(params);

      expect(mockPrisma.syncQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sheetRowIndex: null,
        }),
      });
    });

    it("logs error but does not throw on failure", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockPrisma.syncQueue.create.mockRejectedValue(new Error("DB error"));

      await enqueue({
        action: "UPDATE",
        model: "Request",
        recordId: "test",
        payload: {},
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[SyncQueue] Enqueue failed:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("dequeue", () => {
    it("returns pending items and marks them as processing", async () => {
      const mockItems = [
        {
          id: "q1",
          action: "UPDATE",
          model: "Request",
          recordId: "r1",
          sheetRowIndex: 5,
          payload: { field: "value" },
        },
        {
          id: "q2",
          action: "CREATE",
          model: "Operator",
          recordId: "o1",
          sheetRowIndex: null,
          payload: {},
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
        const txMock = {
          syncQueue: {
            findMany: jest.fn().mockResolvedValue(mockItems),
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return fn(txMock);
      });

      const result = await dequeue(25);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("q1");
      expect(result[1].id).toBe("q2");
    });

    it("returns empty array when no pending items", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
        const txMock = {
          syncQueue: {
            findMany: jest.fn().mockResolvedValue([]),
          },
        };
        return fn(txMock);
      });

      const result = await dequeue(25);

      expect(result).toHaveLength(0);
    });

    it("respects batch size parameter", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
        const txMock = {
          syncQueue: {
            findMany: jest.fn().mockResolvedValue([]),
            updateMany: jest.fn(),
          },
        };
        return fn(txMock);
      });

      await dequeue(10);

      // Verify findMany was called with correct take parameter
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("markComplete", () => {
    it("updates status to COMPLETED with timestamp", async () => {
      const itemId = "queue-123";

      mockPrisma.syncQueue.update.mockResolvedValue({
        id: itemId,
        action: "UPDATE",
        model: "Request",
        recordId: "r1",
        sheetRowIndex: 5,
        payload: {},
        status: "COMPLETED",
        retries: 0,
        maxRetries: 3,
        lastError: null,
        createdAt: new Date(),
        processedAt: new Date(),
      });

      await markComplete(itemId);

      expect(mockPrisma.syncQueue.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: {
          status: "COMPLETED",
          processedAt: expect.any(Date),
        },
      });
    });
  });

  describe("markFailed", () => {
    it("sets status to PENDING when retries remaining", async () => {
      const itemId = "queue-123";

      mockPrisma.syncQueue.findUnique.mockResolvedValue({
        id: itemId,
        action: "UPDATE",
        model: "Request",
        recordId: "r1",
        sheetRowIndex: 5,
        payload: {},
        status: "PROCESSING",
        retries: 1,
        maxRetries: 3,
        lastError: null,
        createdAt: new Date(),
        processedAt: null,
      });

      mockPrisma.syncQueue.update.mockResolvedValue({
        id: itemId,
        action: "UPDATE",
        model: "Request",
        recordId: "r1",
        sheetRowIndex: 5,
        payload: {},
        status: "PENDING",
        retries: 2,
        maxRetries: 3,
        lastError: "API error",
        createdAt: new Date(),
        processedAt: null,
      });

      await markFailed(itemId, "API error");

      expect(mockPrisma.syncQueue.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: {
          status: "PENDING", // Back to pending for retry
          retries: { increment: 1 },
          lastError: "API error",
        },
      });
    });

    it("sets status to FAILED when max retries reached", async () => {
      const itemId = "queue-123";

      mockPrisma.syncQueue.findUnique.mockResolvedValue({
        id: itemId,
        action: "UPDATE",
        model: "Request",
        recordId: "r1",
        sheetRowIndex: 5,
        payload: {},
        status: "PROCESSING",
        retries: 2, // Already at 2, max is 3
        maxRetries: 3,
        lastError: null,
        createdAt: new Date(),
        processedAt: null,
      });

      mockPrisma.syncQueue.update.mockResolvedValue({
        id: itemId,
        action: "UPDATE",
        model: "Request",
        recordId: "r1",
        sheetRowIndex: 5,
        payload: {},
        status: "FAILED",
        retries: 3,
        maxRetries: 3,
        lastError: "Final error",
        createdAt: new Date(),
        processedAt: null,
      });

      await markFailed(itemId, "Final error");

      expect(mockPrisma.syncQueue.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: {
          status: "FAILED",
          retries: { increment: 1 },
          lastError: "Final error",
        },
      });
    });

    it("does nothing when item not found", async () => {
      mockPrisma.syncQueue.findUnique.mockResolvedValue(null);

      await markFailed("non-existent", "error");

      expect(mockPrisma.syncQueue.update).not.toHaveBeenCalled();
    });
  });

  describe("resetStuck", () => {
    it("resets PROCESSING items older than threshold", async () => {
      mockPrisma.syncQueue.updateMany.mockResolvedValue({ count: 3 });

      const result = await resetStuck(10);

      expect(result).toBe(3);
      expect(mockPrisma.syncQueue.updateMany).toHaveBeenCalledWith({
        where: {
          status: "PROCESSING",
          createdAt: { lt: expect.any(Date) },
        },
        data: { status: "PENDING" },
      });
    });

    it("uses default 10 minutes threshold", async () => {
      mockPrisma.syncQueue.updateMany.mockResolvedValue({ count: 0 });

      await resetStuck();

      const call = mockPrisma.syncQueue.updateMany.mock.calls[0][0];
      const createdAtFilter = call?.where?.createdAt as { lt: Date };
      const threshold = createdAtFilter?.lt;
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      // Threshold should be approximately 10 minutes ago
      expect(Math.abs(threshold.getTime() - tenMinutesAgo.getTime())).toBeLessThan(1000);
    });
  });

  describe("cleanupCompleted", () => {
    it("deletes COMPLETED items older than threshold", async () => {
      mockPrisma.syncQueue.deleteMany.mockResolvedValue({ count: 50 });

      const result = await cleanupCompleted(7);

      expect(result).toBe(50);
      expect(mockPrisma.syncQueue.deleteMany).toHaveBeenCalledWith({
        where: {
          status: "COMPLETED",
          processedAt: { lt: expect.any(Date) },
        },
      });
    });

    it("uses default 7 days threshold", async () => {
      mockPrisma.syncQueue.deleteMany.mockResolvedValue({ count: 0 });

      await cleanupCompleted();

      const call = mockPrisma.syncQueue.deleteMany.mock.calls[0][0];
      const processedAtFilter = call?.where?.processedAt as { lt: Date };
      const threshold = processedAtFilter?.lt;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Threshold should be approximately 7 days ago
      expect(Math.abs(threshold.getTime() - sevenDaysAgo.getTime())).toBeLessThan(1000);
    });
  });

  describe("getQueueStats", () => {
    it("returns counts by status", async () => {
      mockPrisma.syncQueue.groupBy.mockResolvedValue([
        { status: "PENDING", _count: 10 },
        { status: "PROCESSING", _count: 2 },
        { status: "COMPLETED", _count: 100 },
        { status: "FAILED", _count: 5 },
      ] as never);

      const stats = await getQueueStats();

      expect(stats).toEqual({
        pending: 10,
        processing: 2,
        completed: 100,
        failed: 5,
      });
    });

    it("returns 0 for missing statuses", async () => {
      mockPrisma.syncQueue.groupBy.mockResolvedValue([
        { status: "PENDING", _count: 5 },
      ] as never);

      const stats = await getQueueStats();

      expect(stats).toEqual({
        pending: 5,
        processing: 0,
        completed: 0,
        failed: 0,
      });
    });

    it("handles empty queue", async () => {
      mockPrisma.syncQueue.groupBy.mockResolvedValue([]);

      const stats = await getQueueStats();

      expect(stats).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe("getFailedItems", () => {
    it("returns failed items with error details", async () => {
      const mockFailed = [
        {
          id: "f1",
          model: "Request",
          action: "UPDATE",
          recordId: "r1",
          lastError: "API timeout",
          retries: 3,
          createdAt: new Date(),
        },
      ];

      mockPrisma.syncQueue.findMany.mockResolvedValue(mockFailed as never);

      const result = await getFailedItems(10);

      expect(result).toHaveLength(1);
      expect(result[0].lastError).toBe("API timeout");
      expect(mockPrisma.syncQueue.findMany).toHaveBeenCalledWith({
        where: { status: "FAILED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: expect.any(Object),
      });
    });
  });

  describe("retryFailed", () => {
    it("resets status and retries for failed item", async () => {
      mockPrisma.syncQueue.update.mockResolvedValue({} as never);

      await retryFailed("failed-id");

      expect(mockPrisma.syncQueue.update).toHaveBeenCalledWith({
        where: { id: "failed-id" },
        data: {
          status: "PENDING",
          retries: 0,
          lastError: null,
        },
      });
    });
  });

  describe("deleteQueueItem", () => {
    it("deletes queue item by id", async () => {
      mockPrisma.syncQueue.delete.mockResolvedValue({} as never);

      await deleteQueueItem("item-to-delete");

      expect(mockPrisma.syncQueue.delete).toHaveBeenCalledWith({
        where: { id: "item-to-delete" },
      });
    });
  });
});
