# Phase 1-A: Revenue API (Backend)

**Duration**: ~1 hour
**Parallelization**: Can run alongside Phase 1-B (no shared files)
**Dependencies**: None

---

## File Ownership (Exclusive to This Phase)

| File | Operation |
|------|-----------|
| `src/app/api/revenues/route.ts` | CREATE |
| `src/app/api/revenues/[id]/route.ts` | CREATE |
| `src/app/api/revenues/[id]/lock/route.ts` | CREATE |
| `src/app/api/revenues/[id]/unlock/route.ts` | CREATE |
| `src/config/revenue-config.ts` | CREATE |

---

## Step 1: Create Revenue Config

**File**: `src/config/revenue-config.ts`

```typescript
// Revenue configuration - centralized constants

// Payment types
export const PAYMENT_TYPES = {
  DEPOSIT: { label: 'Đặt cọc', color: 'blue' },
  FULL_PAYMENT: { label: 'Thanh toán đủ', color: 'green' },
  PARTIAL: { label: 'Thanh toán một phần', color: 'yellow' },
  REFUND: { label: 'Hoàn tiền', color: 'red' },
} as const;

export type PaymentTypeKey = keyof typeof PAYMENT_TYPES;
export const PAYMENT_TYPE_KEYS = Object.keys(PAYMENT_TYPES) as PaymentTypeKey[];

// Payment sources
export const PAYMENT_SOURCES = {
  BANK_TRANSFER: { label: 'Chuyển khoản', icon: 'Building' },
  CASH: { label: 'Tiền mặt', icon: 'Banknote' },
  CARD: { label: 'Thẻ tín dụng', icon: 'CreditCard' },
  PAYPAL: { label: 'PayPal', icon: 'Globe' },
  WISE: { label: 'Wise', icon: 'Globe' },
  OTHER: { label: 'Khác', icon: 'MoreHorizontal' },
} as const;

export type PaymentSourceKey = keyof typeof PAYMENT_SOURCES;
export const PAYMENT_SOURCE_KEYS = Object.keys(PAYMENT_SOURCES) as PaymentSourceKey[];

// Supported currencies
export const CURRENCIES = {
  VND: { label: 'VND', symbol: '₫', decimals: 0 },
  USD: { label: 'USD', symbol: '$', decimals: 2 },
  EUR: { label: 'EUR', symbol: '€', decimals: 2 },
  GBP: { label: 'GBP', symbol: '£', decimals: 2 },
  AUD: { label: 'AUD', symbol: 'A$', decimals: 2 },
  JPY: { label: 'JPY', symbol: '¥', decimals: 0 },
  SGD: { label: 'SGD', symbol: 'S$', decimals: 2 },
  THB: { label: 'THB', symbol: '฿', decimals: 2 },
} as const;

export type CurrencyKey = keyof typeof CURRENCIES;
export const CURRENCY_KEYS = Object.keys(CURRENCIES) as CurrencyKey[];

// Default exchange rates (fallback, user should input actual rate)
export const DEFAULT_EXCHANGE_RATES: Record<CurrencyKey, number> = {
  VND: 1,
  USD: 25000,
  EUR: 27000,
  GBP: 32000,
  AUD: 16500,
  JPY: 165,
  SGD: 18500,
  THB: 700,
};
```

---

## Step 2: Create Revenue List/Create Route

**File**: `src/app/api/revenues/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PAYMENT_TYPE_KEYS, CURRENCY_KEYS } from '@/config/revenue-config';

// GET /api/revenues - List with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract filters
    const requestId = searchParams.get('requestId') || '';
    const paymentType = searchParams.get('paymentType') || '';
    const paymentSource = searchParams.get('paymentSource') || '';
    const currency = searchParams.get('currency') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const isLocked = searchParams.get('isLocked');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (requestId) where.requestId = requestId;
    if (paymentType) where.paymentType = paymentType;
    if (paymentSource) where.paymentSource = paymentSource;
    if (currency) where.currency = currency;
    if (isLocked !== null && isLocked !== '') {
      where.isLocked = isLocked === 'true';
    }

    if (fromDate || toDate) {
      where.paymentDate = {};
      if (fromDate) where.paymentDate.gte = new Date(fromDate);
      if (toDate) where.paymentDate.lte = new Date(toDate);
    }

    const [revenues, total] = await Promise.all([
      prisma.revenue.findMany({
        where,
        include: {
          request: { select: { code: true, customerName: true, bookingCode: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { paymentDate: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.revenue.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: revenues,
      total,
      hasMore: offset + revenues.length < total,
    });
  } catch (error) {
    console.error('Error fetching revenues:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải danh sách thu nhập: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/revenues - Create revenue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.requestId || !body.paymentDate || !body.paymentType || !body.paymentSource) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: requestId, paymentDate, paymentType, paymentSource' },
        { status: 400 }
      );
    }

    // Validate payment type
    if (!PAYMENT_TYPE_KEYS.includes(body.paymentType)) {
      return NextResponse.json(
        { success: false, error: `Loại thanh toán không hợp lệ: ${body.paymentType}` },
        { status: 400 }
      );
    }

    // Validate request exists
    const req = await prisma.request.findUnique({
      where: { id: body.requestId },
    });

    if (!req) {
      return NextResponse.json(
        { success: false, error: 'Yêu cầu không tồn tại' },
        { status: 404 }
      );
    }

    // Calculate amountVND from foreign currency if needed
    const currency = body.currency || 'VND';
    let amountVND: number;
    let foreignAmount: number | null = null;
    let exchangeRate: number | null = null;

    if (currency === 'VND') {
      amountVND = Number(body.amountVND) || 0;
    } else {
      // Validate currency
      if (!CURRENCY_KEYS.includes(currency)) {
        return NextResponse.json(
          { success: false, error: `Loại tiền tệ không hợp lệ: ${currency}` },
          { status: 400 }
        );
      }

      foreignAmount = Number(body.foreignAmount) || 0;
      exchangeRate = Number(body.exchangeRate) || 0;

      if (foreignAmount <= 0 || exchangeRate <= 0) {
        return NextResponse.json(
          { success: false, error: 'Số tiền ngoại tệ và tỷ giá phải > 0' },
          { status: 400 }
        );
      }

      amountVND = Math.round(foreignAmount * exchangeRate);
    }

    if (amountVND <= 0) {
      return NextResponse.json(
        { success: false, error: 'Số tiền VND phải > 0' },
        { status: 400 }
      );
    }

    // Create revenue
    const revenue = await prisma.revenue.create({
      data: {
        requestId: body.requestId,
        paymentDate: new Date(body.paymentDate),
        paymentType: body.paymentType,
        foreignAmount,
        currency,
        exchangeRate,
        amountVND,
        paymentSource: body.paymentSource,
        notes: body.notes?.trim() || null,
        userId: body.userId || 'system', // TODO: Get from auth session
      },
      include: {
        request: { select: { code: true, customerName: true, bookingCode: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: revenue }, { status: 201 });
  } catch (error) {
    console.error('Error creating revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo thu nhập: ${message}` },
      { status: 500 }
    );
  }
}
```

---

## Step 3: Create Revenue Detail Route (GET/PUT/DELETE)

**File**: `src/app/api/revenues/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PAYMENT_TYPE_KEYS, CURRENCY_KEYS } from '@/config/revenue-config';

// GET /api/revenues/[id] - Get single revenue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const revenue = await prisma.revenue.findUnique({
      where: { id },
      include: {
        request: { select: { id: true, code: true, customerName: true, bookingCode: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!revenue) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: revenue });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải thu nhập: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/revenues/[id] - Update revenue
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if revenue exists
    const existing = await prisma.revenue.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    // Check if locked
    if (existing.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Thu nhập đã khóa, không thể sửa' },
        { status: 400 }
      );
    }

    // Validate payment type if provided
    if (body.paymentType && !PAYMENT_TYPE_KEYS.includes(body.paymentType)) {
      return NextResponse.json(
        { success: false, error: `Loại thanh toán không hợp lệ: ${body.paymentType}` },
        { status: 400 }
      );
    }

    // Calculate amountVND if currency changed
    const currency = body.currency || existing.currency || 'VND';
    let amountVND = existing.amountVND;
    let foreignAmount = existing.foreignAmount;
    let exchangeRate = existing.exchangeRate;

    if (body.currency !== undefined || body.foreignAmount !== undefined || body.exchangeRate !== undefined || body.amountVND !== undefined) {
      if (currency === 'VND') {
        amountVND = Number(body.amountVND ?? existing.amountVND) || 0;
        foreignAmount = null;
        exchangeRate = null;
      } else {
        if (!CURRENCY_KEYS.includes(currency)) {
          return NextResponse.json(
            { success: false, error: `Loại tiền tệ không hợp lệ: ${currency}` },
            { status: 400 }
          );
        }

        foreignAmount = Number(body.foreignAmount ?? existing.foreignAmount) || 0;
        exchangeRate = Number(body.exchangeRate ?? existing.exchangeRate) || 0;
        amountVND = Math.round(foreignAmount * exchangeRate);
      }

      if (Number(amountVND) <= 0) {
        return NextResponse.json(
          { success: false, error: 'Số tiền VND phải > 0' },
          { status: 400 }
        );
      }
    }

    // Update revenue
    const revenue = await prisma.revenue.update({
      where: { id },
      data: {
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
        paymentType: body.paymentType,
        foreignAmount,
        currency,
        exchangeRate,
        amountVND,
        paymentSource: body.paymentSource,
        notes: body.notes?.trim(),
      },
      include: {
        request: { select: { code: true, customerName: true, bookingCode: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: revenue });
  } catch (error) {
    console.error('Error updating revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi cập nhật thu nhập: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/revenues/[id] - Delete revenue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if exists
    const existing = await prisma.revenue.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    // Check if locked
    if (existing.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Thu nhập đã khóa, không thể xóa' },
        { status: 400 }
      );
    }

    await prisma.revenue.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa thu nhập' });
  } catch (error) {
    console.error('Error deleting revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi xóa thu nhập: ${message}` },
      { status: 500 }
    );
  }
}
```

---

## Step 4: Create Lock Route

**File**: `src/app/api/revenues/[id]/lock/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/revenues/[id]/lock - ACCOUNTANT can lock
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = body.userId || 'system';

    // TODO: Verify user has revenue:manage permission
    // const user = await getUser(userId);
    // if (!hasPermission(user.role, 'revenue:manage')) {
    //   return NextResponse.json(
    //     { success: false, error: 'Không có quyền khóa thu nhập' },
    //     { status: 403 }
    //   );
    // }

    const revenue = await prisma.revenue.findUnique({ where: { id } });

    if (!revenue) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    if (revenue.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Thu nhập đã được khóa' },
        { status: 400 }
      );
    }

    const lockedAt = new Date();

    const updated = await prisma.revenue.update({
      where: { id },
      data: {
        isLocked: true,
        lockedAt,
        lockedBy: userId,
      },
      include: {
        request: { select: { code: true, customerName: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error locking revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi khóa thu nhập: ${message}` },
      { status: 500 }
    );
  }
}
```

---

## Step 5: Create Unlock Route

**File**: `src/app/api/revenues/[id]/unlock/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/revenues/[id]/unlock - ADMIN only
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = body.userId || 'system';

    // TODO: Verify user is ADMIN
    // const user = await getUser(userId);
    // if (user.role !== 'ADMIN') {
    //   return NextResponse.json(
    //     { success: false, error: 'Chỉ Admin được mở khóa thu nhập' },
    //     { status: 403 }
    //   );
    // }

    const revenue = await prisma.revenue.findUnique({ where: { id } });

    if (!revenue) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    if (!revenue.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Thu nhập chưa được khóa' },
        { status: 400 }
      );
    }

    const updated = await prisma.revenue.update({
      where: { id },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
      },
      include: {
        request: { select: { code: true, customerName: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error unlocking revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi mở khóa thu nhập: ${message}` },
      { status: 500 }
    );
  }
}
```

---

## Success Criteria

- [ ] `GET /api/revenues` returns list with filters
- [ ] `POST /api/revenues` creates revenue with multi-currency support
- [ ] `GET /api/revenues/[id]` returns single revenue
- [ ] `PUT /api/revenues/[id]` updates (blocked if locked)
- [ ] `DELETE /api/revenues/[id]` deletes (blocked if locked)
- [ ] `POST /api/revenues/[id]/lock` locks revenue
- [ ] `POST /api/revenues/[id]/unlock` unlocks (ADMIN only placeholder)
- [ ] Currency conversion: foreignAmount * exchangeRate = amountVND
- [ ] Vietnamese error messages throughout

---

## Conflict Prevention

This phase creates NEW files only:
- `src/app/api/revenues/` directory (NEW)
- `src/config/revenue-config.ts` (NEW)

NO existing files modified - safe for parallel execution with Phase 1-B.
