/**
 * @jest-environment node
 */

// Tests for POST /api/sync/retry
// Covers: Auth (ADMIN/cron secret), specific IDs retry, all failed retry

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
  hasPermission: jest.fn(),
}));

// Mock auth-utils (verifyCronSecret)
const mockVerifyCronSecret = jest.fn();
jest.mock("@/lib/auth-utils", () => ({
  verifyCronSecret: (...args: unknown[]) => mockVerifyCronSecret(...args),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

import { POST } from "@/app/api/sync/retry/route";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";

// Helper to create mock NextRequest
function createMockRequest(
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest {
  const init = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(
    new URL("http://localhost:3000/api/sync/retry"),
    init as any
  );
}

describe("POST /api/sync/retry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: cron secret verification returns false
    mockVerifyCronSecret.mockReturnValue(false);
  });

  describe("Authentication", () => {
    it("rejects unauthenticated requests without cron secret", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("rejects non-admin users", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-123", role: "SELLER" },
      });
      (hasPermission as jest.Mock).mockReturnValue(false);

      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Admin only");
    });

    it("accepts admin users", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "admin-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
      (prismaMock.syncQueue.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("accepts valid cron secret", async () => {
      mockVerifyCronSecret.mockReturnValue(true);
      (prismaMock.syncQueue.updateMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const request = createMockRequest(
        {},
        { Authorization: "Bearer test-secret-123" }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(auth).not.toHaveBeenCalled();
    });

    it("rejects invalid cron secret", async () => {
      mockVerifyCronSecret.mockReturnValue(false);
      (auth as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest(
        {},
        { Authorization: "Bearer wrong-secret" }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("rejects cron secret with length mismatch (timing-safe)", async () => {
      mockVerifyCronSecret.mockReturnValue(false);
      (auth as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest(
        {},
        { Authorization: "Bearer short" }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });
  });

  describe("Retry Specific IDs", () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "admin-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
    });

    it("resets specific failed items by ID", async () => {
      const ids = ["item-1", "item-2", "item-3"];
      (prismaMock.syncQueue.updateMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const request = createMockRequest({ ids });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(3);
      expect(prismaMock.syncQueue.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ids },
          status: "FAILED",
        },
        data: {
          status: "PENDING",
          retries: 0,
          lastError: null,
        },
      });
    });

    it("returns 0 when no matching failed items", async () => {
      (prismaMock.syncQueue.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const request = createMockRequest({ ids: ["non-existent-id"] });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(0);
    });

    it("only resets items with FAILED status", async () => {
      (prismaMock.syncQueue.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const request = createMockRequest({ ids: ["item-1", "item-2"] });
      await POST(request);

      expect(prismaMock.syncQueue.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "FAILED",
          }),
        })
      );
    });
  });

  describe("Retry All Failed", () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "admin-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
    });

    it("resets all failed items when no IDs provided", async () => {
      (prismaMock.syncQueue.updateMany as jest.Mock).mockResolvedValue({
        count: 15,
      });

      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(15);
      expect(prismaMock.syncQueue.updateMany).toHaveBeenCalledWith({
        where: { status: "FAILED" },
        data: {
          status: "PENDING",
          retries: 0,
          lastError: null,
        },
      });
    });

    it("resets all failed items when empty IDs array", async () => {
      (prismaMock.syncQueue.updateMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const request = createMockRequest({ ids: [] });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.count).toBe(5);
      expect(prismaMock.syncQueue.updateMany).toHaveBeenCalledWith({
        where: { status: "FAILED" },
        data: expect.any(Object),
      });
    });

    it("handles empty body gracefully", async () => {
      (prismaMock.syncQueue.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      // Create request without body
      const request = new NextRequest(
        new URL("http://localhost:3000/api/sync/retry"),
        { method: "POST" }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Response Format", () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "admin-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
    });

    it("returns consistent success response", async () => {
      (prismaMock.syncQueue.updateMany as jest.Mock).mockResolvedValue({
        count: 7,
      });

      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("count", 7);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "admin-123", role: "ADMIN" },
      });
      (hasPermission as jest.Mock).mockReturnValue(true);
    });

    it("handles database errors gracefully", async () => {
      (prismaMock.syncQueue.updateMany as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Retry failed");
    });

    it("handles auth errors gracefully", async () => {
      (auth as jest.Mock).mockRejectedValue(new Error("Auth service error"));

      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
