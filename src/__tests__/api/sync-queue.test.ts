/**
 * @jest-environment node
 */

// Tests for GET /api/sync/queue
// Covers: Session auth, queue statistics, admin-only detailed views

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
  logError: jest.fn(),
}));

// Mock write-back queue functions
jest.mock("@/lib/sync/write-back-queue", () => ({
  getQueueStats: jest.fn(),
}));

import { GET } from "@/app/api/sync/queue/route";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { getQueueStats } from "@/lib/sync/write-back-queue";

// Helper to create mock NextRequest
function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "GET",
  } as any);
}

describe("GET /api/sync/queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("rejects unauthorized requests", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("accepts authenticated user session", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-123", role: "SELLER" },
      });
      (hasPermission as jest.Mock).mockReturnValue(false);
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 5,
        processing: 1,
        completed: 100,
        failed: 2,
      });
      (prismaMock.syncQueue.findMany as jest.Mock).mockResolvedValue([]);
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("rejects missing user ID in session", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { role: "SELLER" },
      });

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Queue Statistics", () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-123", role: "SELLER" },
      });
      (hasPermission as jest.Mock).mockReturnValue(false);
    });

    it("returns queue stats for all users", async () => {
      const stats = {
        pending: 10,
        processing: 2,
        completed: 200,
        failed: 5,
      };

      (getQueueStats as jest.Mock).mockResolvedValue(stats);
      (prismaMock.syncQueue.findMany as jest.Mock).mockResolvedValue([]);
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.stats).toEqual(stats);
    });

    it("returns zero stats for empty queue", async () => {
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });
      (prismaMock.syncQueue.findMany as jest.Mock).mockResolvedValue([]);
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.stats.pending).toBe(0);
      expect(data.data.stats.failed).toBe(0);
    });
  });

  describe("Admin-Only Data", () => {
    it("returns empty arrays for non-admin users", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-123", role: "SELLER" },
      });
      (hasPermission as jest.Mock).mockReturnValue(false);
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 5,
        processing: 1,
        completed: 100,
        failed: 2,
      });
      (prismaMock.syncQueue.findMany as jest.Mock).mockResolvedValue([]);
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.recentFailed).toEqual([]);
      expect(data.data.recentLogs).toEqual([]);
      expect(prismaMock.syncQueue.findMany).not.toHaveBeenCalled();
    });

    it("returns failed items for admin users", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "admin-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 5,
        processing: 1,
        completed: 100,
        failed: 3,
      });

      const failedItems = [
        {
          id: "item-1",
          model: "Request",
          action: "CREATE",
          recordId: "req-1",
          lastError: "Network timeout",
          retries: 2,
          createdAt: new Date(),
        },
        {
          id: "item-2",
          model: "Operator",
          action: "UPDATE",
          recordId: "op-1",
          lastError: "DB constraint",
          retries: 1,
          createdAt: new Date(),
        },
      ];

      (prismaMock.syncQueue.findMany as jest.Mock).mockResolvedValue(
        failedItems
      );
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.recentFailed).toHaveLength(2);
      expect(data.data.recentFailed[0].lastError).toBe("Network timeout");
      expect(prismaMock.syncQueue.findMany).toHaveBeenCalledWith({
        where: { status: "FAILED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          model: true,
          action: true,
          recordId: true,
          lastError: true,
          retries: true,
          createdAt: true,
        },
      });
    });

    it("returns recent write-back logs for admin users", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "admin-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 100,
        failed: 0,
      });

      const logs = [
        {
          id: "log-1",
          sheetName: "Request",
          action: "WRITE_BACK_CREATE",
          recordId: "req-1",
          status: "SUCCESS",
          syncedAt: new Date("2026-01-10T12:00:00Z"),
        },
        {
          id: "log-2",
          sheetName: "Operator",
          action: "WRITE_BACK_UPDATE",
          recordId: "op-1",
          status: "FAILED",
          syncedAt: new Date("2026-01-10T11:55:00Z"),
        },
      ];

      (prismaMock.syncQueue.findMany as jest.Mock).mockResolvedValue([]);
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue(logs);

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.recentLogs).toHaveLength(2);
      expect(data.data.recentLogs[0].sheetName).toBe("Request");
      expect(prismaMock.syncLog.findMany).toHaveBeenCalledWith({
        where: {
          action: { startsWith: "WRITE_BACK" },
        },
        orderBy: { syncedAt: "desc" },
        take: 20,
      });
    });

    it("returns last processed timestamp from most recent log", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "admin-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 50,
        failed: 0,
      });

      const latestTime = new Date("2026-01-10T15:30:00Z");
      const logs = [
        {
          id: "log-1",
          sheetName: "Request",
          action: "WRITE_BACK_CREATE",
          recordId: "req-1",
          status: "SUCCESS",
          syncedAt: latestTime,
        },
      ];

      (prismaMock.syncQueue.findMany as jest.Mock).mockResolvedValue([]);
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue(logs);

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.lastProcessed).toBe(latestTime.toISOString());
    });

    it("returns null for lastProcessed when no logs exist", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "admin-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });

      (prismaMock.syncQueue.findMany as jest.Mock).mockResolvedValue([]);
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.lastProcessed).toBe(null);
    });
  });

  describe("Response Format", () => {
    it("returns consistent response structure", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-123", role: "SELLER" },
      });
      (hasPermission as jest.Mock).mockReturnValue(false);
      (getQueueStats as jest.Mock).mockResolvedValue({
        pending: 5,
        processing: 1,
        completed: 100,
        failed: 2,
      });
      (prismaMock.syncQueue.findMany as jest.Mock).mockResolvedValue([]);
      (prismaMock.syncLog.findMany as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("stats");
      expect(data.data).toHaveProperty("recentFailed");
      expect(data.data).toHaveProperty("recentLogs");
      expect(data.data).toHaveProperty("lastProcessed");
    });
  });

  describe("Error Handling", () => {
    it("handles database errors gracefully", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-123", role: "SELLER" },
      });
      (hasPermission as jest.Mock).mockReturnValue(false);
      (getQueueStats as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to get queue status");
    });

    it("handles auth errors gracefully", async () => {
      (auth as jest.Mock).mockRejectedValue(new Error("Auth service error"));

      const request = createMockRequest("http://localhost:3000/api/sync/queue");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
