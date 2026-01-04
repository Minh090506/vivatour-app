---
phase: 5
title: "Booking & Follow-up"
status: pending
effort: 1d
---

# Phase 5: Booking Conversion & Follow-up Widget

## Context

- **Parent Plan:** [plan.md](plan.md)
- **Dependencies:** Phase 4 (UI Pages)
- **Design:** [brainstorm-260104-1039-request-module-design.md](../reports/brainstorm-260104-1039-request-module-design.md)

---

## Overview

Implement booking code generation + operator auto-creation when status=BOOKING. Add follow-up reminder widget to dashboard.

---

## Requirements

### 5.1 Booking Code Generation (API)

Update PUT /api/requests/[id] to handle BOOKING status:

```typescript
// In PUT handler, after status update check
if (body.status === 'BOOKING' && existing.status !== 'BOOKING') {
  // Get seller's code from ConfigUser
  const configUser = await prisma.configUser.findUnique({
    where: { userId: existing.sellerId }
  });

  if (!configUser?.sellerCode) {
    return NextResponse.json(
      { success: false, error: 'Seller chưa được cấu hình mã. Liên hệ Admin.' },
      { status: 400 }
    );
  }

  // Require startDate for booking
  const startDate = body.startDate ? new Date(body.startDate) : existing.startDate;
  if (!startDate) {
    return NextResponse.json(
      { success: false, error: 'Cần nhập ngày bắt đầu tour trước khi chuyển Booking' },
      { status: 400 }
    );
  }

  // Generate booking code only (no auto-operator creation)
  const bookingCode = await generateBookingCode(startDate, configUser.sellerCode);
  updateData.bookingCode = bookingCode;

  // NOTE: Operator entries are created manually by user after BOOKING
}

// Handle revert from BOOKING status - return warning but allow
if (existing.status === 'BOOKING' && body.status !== 'BOOKING') {
  // Include warning in response (bookingCode and operators remain)
  responseWarning = 'Đã chuyển khỏi Booking. Mã booking và operators vẫn được giữ lại.';
}
```

### 5.2 Booking Code Utility Update

Ensure `src/lib/request-utils.ts` generateBookingCode handles collisions:

```typescript
export async function generateBookingCode(
  startDate: Date,
  sellerCode: string
): Promise<string> {
  const dateStr = startDate.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `${dateStr}${sellerCode}`;

  // Get max sequence for this prefix
  const existing = await prisma.request.findMany({
    where: { bookingCode: { startsWith: prefix } },
    orderBy: { bookingCode: 'desc' },
    take: 1,
    select: { bookingCode: true }
  });

  let seq = 1;
  if (existing.length > 0 && existing[0].bookingCode) {
    // Extract sequence from existing code
    const lastSeq = parseInt(existing[0].bookingCode.slice(-4), 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}
```

### 5.3 Follow-up Dashboard Widget

Create `src/components/dashboard/follow-up-widget.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Request } from '@/types';

interface FollowUpWidgetProps {
  limit?: number;
}

export function FollowUpWidget({ limit = 5 }: FollowUpWidgetProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<{
    overdue: Request[];
    today: Request[];
    upcoming: Request[];
  }>({ overdue: [], today: [], upcoming: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowUps() {
      setLoading(true);
      try {
        const [overdueRes, todayRes, upcomingRes] = await Promise.all([
          fetch(`/api/requests?followup=overdue&limit=${limit}`),
          fetch(`/api/requests?followup=today&limit=${limit}`),
          fetch(`/api/requests?followup=upcoming&limit=${limit}`),
        ]);

        const [overdueData, todayData, upcomingData] = await Promise.all([
          overdueRes.json(),
          todayRes.json(),
          upcomingRes.json(),
        ]);

        setRequests({
          overdue: overdueData.success ? overdueData.data : [],
          today: todayData.success ? todayData.data : [],
          upcoming: upcomingData.success ? upcomingData.data : [],
        });
      } catch (err) {
        console.error('Error fetching follow-ups:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFollowUps();
  }, [limit]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Đang tải...
        </CardContent>
      </Card>
    );
  }

  const totalCount = requests.overdue.length + requests.today.length + requests.upcoming.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Follow-up
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/requests?tab=followup')}
        >
          Xem tất cả
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalCount === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            Không có follow-up nào
          </div>
        ) : (
          <>
            {/* Overdue Section */}
            {requests.overdue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Quá hạn ({requests.overdue.length})</span>
                </div>
                {requests.overdue.map((req) => (
                  <FollowUpItem
                    key={req.id}
                    request={req}
                    variant="overdue"
                    onClick={() => router.push(`/requests/${req.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Today Section */}
            {requests.today.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-yellow-600">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Hôm nay ({requests.today.length})</span>
                </div>
                {requests.today.map((req) => (
                  <FollowUpItem
                    key={req.id}
                    request={req}
                    variant="today"
                    onClick={() => router.push(`/requests/${req.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Upcoming Section */}
            {requests.upcoming.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Sắp tới ({requests.upcoming.length})</span>
                </div>
                {requests.upcoming.map((req) => (
                  <FollowUpItem
                    key={req.id}
                    request={req}
                    variant="upcoming"
                    onClick={() => router.push(`/requests/${req.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FollowUpItem({
  request,
  variant,
  onClick,
}: {
  request: Request;
  variant: 'overdue' | 'today' | 'upcoming';
  onClick: () => void;
}) {
  const colors = {
    overdue: 'bg-red-50 hover:bg-red-100 border-red-200',
    today: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    upcoming: 'bg-green-50 hover:bg-green-100 border-green-200',
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${colors[variant]}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{request.customerName}</p>
          <p className="text-sm text-muted-foreground">
            {request.rqid} • {request.country}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {request.status}
        </Badge>
      </div>
      {request.nextFollowUp && (
        <p className="text-xs mt-1 text-muted-foreground">
          {formatDate(request.nextFollowUp)}
        </p>
      )}
    </div>
  );
}
```

### 5.4 Add Widget to Dashboard

Update `src/app/(dashboard)/page.tsx`:

```typescript
import { FollowUpWidget } from '@/components/dashboard/follow-up-widget';

// In the dashboard layout, add:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Existing widgets */}
  <FollowUpWidget limit={5} />
</div>
```

### 5.5 API: Follow-up Filter

Ensure GET /api/requests handles `followup` parameter:

```typescript
// In GET handler
const followup = searchParams.get('followup');

if (followup) {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));
  const threeDaysLater = new Date(todayStart);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  if (followup === 'overdue') {
    where.nextFollowUp = { lt: todayStart };
    where.stage = { not: 'OUTCOME' }; // Only active requests
  } else if (followup === 'today') {
    where.nextFollowUp = { gte: todayStart, lt: todayEnd };
  } else if (followup === 'upcoming') {
    where.nextFollowUp = { gte: todayEnd, lt: threeDaysLater };
  }
}
```

---

## Implementation Steps

- [ ] 5.1 Update PUT /api/requests/[id] with BOOKING logic
- [ ] 5.2 Update generateBookingCode for collision handling
- [ ] 5.3 Create src/components/dashboard/follow-up-widget.tsx
- [ ] 5.4 Update dashboard page with widget
- [ ] 5.5 Update GET /api/requests with followup filter
- [ ] 5.6 Test booking conversion flow
- [ ] 5.7 Test follow-up widget display

---

## Success Criteria

- [ ] Changing status to BOOKING generates unique code
- [ ] Error shown if seller not configured
- [ ] Error shown if startDate missing for booking
- [ ] Warning shown when reverting from BOOKING status
- [ ] Dashboard widget shows overdue/today/upcoming
- [ ] Clicking widget item navigates to request

---

## Security Considerations

- Validate seller has ConfigUser entry before BOOKING
- Ensure bookingCode uniqueness via DB constraint
- Permission check on follow-up widget (seller sees own only)

---

## Related Files

| File | Action |
|------|--------|
| src/app/api/requests/[id]/route.ts | Modify |
| src/lib/request-utils.ts | Modify |
| src/components/dashboard/follow-up-widget.tsx | Create |
| src/app/(dashboard)/page.tsx | Modify |
| src/app/api/requests/route.ts | Modify |
