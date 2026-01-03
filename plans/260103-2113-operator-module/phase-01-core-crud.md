# Phase 1: Core CRUD Implementation

**Priority:** P0 (Must-Have)
**Estimated Tasks:** 15

---

## Overview

Implement basic CRUD operations for Operator module following Supplier module patterns.

---

## Task Breakdown

### 1. Database Schema Updates

#### Task 1.1: Add OperatorHistory model
**File:** `prisma/schema.prisma`

```prisma
model OperatorHistory {
  id          String   @id @default(cuid())
  operatorId  String
  operator    Operator @relation(fields: [operatorId], references: [id], onDelete: Cascade)
  action      String   // CREATE, UPDATE, DELETE, LOCK, UNLOCK, APPROVE
  changes     Json     // {field: {before, after}}
  userId      String
  createdAt   DateTime @default(now())

  @@index([operatorId])
  @@index([createdAt])
  @@map("operator_history")
}
```

#### Task 1.2: Update Operator model relation
**File:** `prisma/schema.prisma`

Add to Operator model:
```prisma
  // Add after notes field
  history     OperatorHistory[]
```

#### Task 1.3: Run migration
```bash
npx prisma db push
npx prisma generate
```

---

### 2. Configuration Files

#### Task 2.1: Create operator config
**File:** `src/config/operator-config.ts`

```typescript
// Service types aligned with Supplier types
export const SERVICE_TYPES = {
  HOTEL: { label: 'Khách sạn', icon: 'Building2' },
  RESTAURANT: { label: 'Nhà hàng', icon: 'UtensilsCrossed' },
  TRANSPORT: { label: 'Vận chuyển', icon: 'Car' },
  GUIDE: { label: 'Hướng dẫn viên', icon: 'User' },
  VISA: { label: 'Visa', icon: 'FileText' },
  VMB: { label: 'Vé máy bay', icon: 'Plane' },
  CRUISE: { label: 'Du thuyền', icon: 'Ship' },
  ACTIVITY: { label: 'Hoạt động/Tour', icon: 'Camera' },
  OTHER: { label: 'Khác', icon: 'MoreHorizontal' },
} as const;

export type ServiceTypeKey = keyof typeof SERVICE_TYPES;
export const SERVICE_TYPE_KEYS = Object.keys(SERVICE_TYPES) as ServiceTypeKey[];

// Payment status options
export const PAYMENT_STATUSES = {
  PENDING: { label: 'Chờ thanh toán', color: 'yellow' },
  PARTIAL: { label: 'Thanh toán một phần', color: 'orange' },
  PAID: { label: 'Đã thanh toán', color: 'green' },
} as const;

export type PaymentStatusKey = keyof typeof PAYMENT_STATUSES;

// Default VAT rate (%)
export const DEFAULT_VAT_RATE = 10;
```

---

### 3. Type Definitions

#### Task 3.1: Add operator types
**File:** `src/types/index.ts`

Add the following types (see plan.md for full definitions):
- `ServiceType`
- `OperatorFilters`
- `ApprovalQueueItem`
- `OperatorHistoryEntry`

---

### 4. Business Logic

#### Task 4.1: Create operator history helper
**File:** `src/lib/operator-history.ts`

```typescript
import { prisma } from './db';

export type HistoryAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOCK' | 'UNLOCK' | 'APPROVE';

interface HistoryEntry {
  operatorId: string;
  action: HistoryAction;
  changes: Record<string, { before: unknown; after: unknown }>;
  userId: string;
}

export async function createOperatorHistory(entry: HistoryEntry) {
  return prisma.operatorHistory.create({
    data: {
      operatorId: entry.operatorId,
      action: entry.action,
      changes: entry.changes,
      userId: entry.userId,
    },
  });
}

export async function getOperatorHistory(operatorId: string, limit = 20) {
  return prisma.operatorHistory.findMany({
    where: { operatorId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// Helper to diff two objects
export function diffObjects(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { before: before[key], after: after[key] };
    }
  }

  return changes;
}
```

#### Task 4.2: Create validation schemas
**File:** `src/lib/operator-validation.ts`

See plan.md for schema definitions.

---

### 5. API Routes

#### Task 5.1: List & Create operators
**File:** `src/app/api/operators/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';

// GET /api/operators - List with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract filters
    const search = searchParams.get('search') || '';
    const requestId = searchParams.get('requestId') || '';
    const supplierId = searchParams.get('supplierId') || '';
    const serviceType = searchParams.get('serviceType') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const isLocked = searchParams.get('isLocked');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { serviceName: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
        { request: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (requestId) where.requestId = requestId;
    if (supplierId) where.supplierId = supplierId;
    if (serviceType) where.serviceType = serviceType;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (isLocked !== null && isLocked !== '') {
      where.isLocked = isLocked === 'true';
    }

    if (fromDate || toDate) {
      where.serviceDate = {};
      if (fromDate) where.serviceDate.gte = new Date(fromDate);
      if (toDate) where.serviceDate.lte = new Date(toDate);
    }

    const [operators, total] = await Promise.all([
      prisma.operator.findMany({
        where,
        include: {
          request: { select: { code: true, customerName: true } },
          supplierRef: { select: { code: true, name: true } },
        },
        orderBy: { serviceDate: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.operator.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: operators,
      total,
      hasMore: offset + operators.length < total,
    });
  } catch (error) {
    console.error('Error fetching operators:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải danh sách: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/operators - Create operator
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.requestId || !body.serviceDate || !body.serviceType || !body.serviceName) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Validate request exists and is F5
    const req = await prisma.request.findUnique({
      where: { id: body.requestId },
    });

    if (!req) {
      return NextResponse.json(
        { success: false, error: 'Booking không tồn tại' },
        { status: 404 }
      );
    }

    if (req.status !== 'F5') {
      return NextResponse.json(
        { success: false, error: 'Chỉ có thể thêm dịch vụ cho Booking đã xác nhận (F5)' },
        { status: 400 }
      );
    }

    // Validate supplier if linked
    if (body.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: body.supplierId },
      });
      if (!supplier) {
        return NextResponse.json(
          { success: false, error: 'NCC không tồn tại' },
          { status: 404 }
        );
      }
      // Auto-fill supplier name if not provided
      if (!body.supplier) {
        body.supplier = supplier.name;
      }
    }

    // Create operator
    const operator = await prisma.operator.create({
      data: {
        requestId: body.requestId,
        supplierId: body.supplierId || null,
        serviceDate: new Date(body.serviceDate),
        serviceType: body.serviceType,
        serviceName: body.serviceName.trim(),
        supplier: body.supplier?.trim() || null,
        costBeforeTax: body.costBeforeTax,
        vat: body.vat || null,
        totalCost: body.totalCost,
        paymentDeadline: body.paymentDeadline ? new Date(body.paymentDeadline) : null,
        bankAccount: body.bankAccount?.trim() || null,
        notes: body.notes?.trim() || null,
        userId: body.userId, // TODO: Get from auth session
      },
      include: {
        request: { select: { code: true, customerName: true } },
        supplierRef: { select: { code: true, name: true } },
      },
    });

    // Create history entry
    await createOperatorHistory({
      operatorId: operator.id,
      action: 'CREATE',
      changes: { created: { before: null, after: operator } },
      userId: body.userId,
    });

    return NextResponse.json({ success: true, data: operator }, { status: 201 });
  } catch (error) {
    console.error('Error creating operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo dịch vụ: ${message}` },
      { status: 500 }
    );
  }
}
```

#### Task 5.2: Get/Update/Delete operator
**File:** `src/app/api/operators/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory, diffObjects } from '@/lib/operator-history';

// GET /api/operators/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const operator = await prisma.operator.findUnique({
      where: { id },
      include: {
        request: { select: { code: true, customerName: true, status: true } },
        supplierRef: { select: { code: true, name: true, paymentModel: true } },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: operator });
  } catch (error) {
    console.error('Error fetching operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải dịch vụ: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/operators/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get existing operator
    const existing = await prisma.operator.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    // Check if locked
    if (existing.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ đã khóa, không thể chỉnh sửa' },
        { status: 403 }
      );
    }

    // Update operator
    const operator = await prisma.operator.update({
      where: { id },
      data: {
        supplierId: body.supplierId ?? existing.supplierId,
        serviceDate: body.serviceDate ? new Date(body.serviceDate) : existing.serviceDate,
        serviceType: body.serviceType ?? existing.serviceType,
        serviceName: body.serviceName?.trim() ?? existing.serviceName,
        supplier: body.supplier?.trim() ?? existing.supplier,
        costBeforeTax: body.costBeforeTax ?? existing.costBeforeTax,
        vat: body.vat ?? existing.vat,
        totalCost: body.totalCost ?? existing.totalCost,
        paymentDeadline: body.paymentDeadline ? new Date(body.paymentDeadline) : existing.paymentDeadline,
        bankAccount: body.bankAccount?.trim() ?? existing.bankAccount,
        notes: body.notes?.trim() ?? existing.notes,
      },
      include: {
        request: { select: { code: true, customerName: true } },
        supplierRef: { select: { code: true, name: true } },
      },
    });

    // Create history entry
    const changes = diffObjects(
      JSON.parse(JSON.stringify(existing)),
      JSON.parse(JSON.stringify(operator))
    );

    if (Object.keys(changes).length > 0) {
      await createOperatorHistory({
        operatorId: id,
        action: 'UPDATE',
        changes,
        userId: body.userId,
      });
    }

    return NextResponse.json({ success: true, data: operator });
  } catch (error) {
    console.error('Error updating operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi cập nhật: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/operators/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'system';

    // Get existing
    const existing = await prisma.operator.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    // Check if locked
    if (existing.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ đã khóa, không thể xóa' },
        { status: 403 }
      );
    }

    // Create history before delete
    await createOperatorHistory({
      operatorId: id,
      action: 'DELETE',
      changes: { deleted: { before: existing, after: null } },
      userId,
    });

    // Delete operator
    await prisma.operator.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi xóa: ${message}` },
      { status: 500 }
    );
  }
}
```

---

### 6. UI Components

#### Task 6.1: Create operator form
**File:** `src/components/operators/operator-form.tsx`

Key features:
- Request selector (F5 only)
- Service type dropdown
- Supplier combobox (search suppliers)
- Auto-calculate totalCost from costBeforeTax + VAT
- Date pickers for serviceDate and paymentDeadline
- Notes textarea

Follow `supplier-form.tsx` pattern.

#### Task 6.2: Create operator list filters
**File:** `src/components/operators/operator-list-filters.tsx`

Filters:
- Search (serviceName, supplier, request code)
- Service type dropdown
- Payment status dropdown
- Date range (serviceDate)
- Locked status

#### Task 6.3: Create history panel
**File:** `src/components/operators/operator-history-panel.tsx`

Display audit trail with:
- Action badges (CREATE, UPDATE, DELETE, etc.)
- Timestamp
- Changed fields (before → after)

---

### 7. Pages

#### Task 7.1: Operator list page
**File:** `src/app/(dashboard)/operators/page.tsx`

Features:
- Filter bar
- Data table with columns: Date, Booking, Service, Supplier, Cost, Status, Actions
- Pagination
- Link to detail page
- Create button

#### Task 7.2: Create operator page
**File:** `src/app/(dashboard)/operators/create/page.tsx`

Simple wrapper for OperatorForm.

#### Task 7.3: Operator detail page
**File:** `src/app/(dashboard)/operators/[id]/page.tsx`

Features:
- Display all operator info
- Edit form (if not locked)
- History panel
- Lock indicator
- Delete button (if not locked)

---

## Testing Tasks

#### Task 8.1: API tests
**File:** `src/__tests__/api/operators.test.ts`

Test:
- List with filters
- Create with validation
- Update (block if locked)
- Delete (block if locked)

#### Task 8.2: Config tests
**File:** `src/__tests__/config/operator-config.test.ts`

Test SERVICE_TYPES and PAYMENT_STATUSES.

---

## Acceptance Criteria

- [ ] Can create operator linked to F5 request
- [ ] Can link operator to existing supplier
- [ ] Can use text-only supplier (no supplierId)
- [ ] Auto-calculates totalCost
- [ ] Cannot edit/delete locked operators
- [ ] History recorded for all changes
- [ ] List page with functional filters
- [ ] Detail page shows full info + history
