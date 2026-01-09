# Phase 3: Excel Export

**Parent Plan:** [plan.md](./plan.md)
**Dependencies:** [Phase 1: API Endpoints](./phase-01-api-endpoints.md), [Phase 2: Dashboard & Charts](./phase-02-dashboard-charts.md)

---

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-09 |
| Priority | P2 |
| Effort | 1h |
| Status | pending |

Install SheetJS (xlsx) package, create server-side export utility, add export API route, and implement export button on reports page.

---

## Key Insights

1. **Library choice**: SheetJS (xlsx) per research
   - Best performance for large datasets
   - Community edition sufficient (no styling needed)
   - Server-side generation recommended

2. **Export format**: Single .xlsx file with multiple sheets
   - Sheet 1: Dashboard KPIs summary
   - Sheet 2: Revenue trends (monthly)
   - Sheet 3: Cost breakdown by service type
   - Sheet 4: Conversion funnel data

3. **Implementation pattern**: Server-side API route
   - Offloads computation from browser
   - Returns file as binary download
   - Uses existing API data aggregation logic

---

## Requirements

### R1: Install xlsx Package
- Add `xlsx` to dependencies
- Verify no security vulnerabilities in latest version

### R2: Create Export Utility
- Generic function to convert JSON to worksheet
- Support for column headers and widths
- Currency formatting for VND values

### R3: Create Export API Route
- `POST /api/reports/export`
- Accepts optional date filters
- Returns .xlsx file as download

### R4: Add Export Button to Dashboard
- Button with download icon
- Shows loading state during export
- Triggers file download on success

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Server-side export | Better memory management, handles large data |
| POST method | Allows body params for complex filters |
| Multi-sheet workbook | Organized data, matches dashboard structure |
| No styling | Community edition sufficient, reduces complexity |

---

## Related Code Files

```
package.json                                  # Add xlsx dependency
src/lib/export.ts                             # Export utility
src/app/api/reports/export/route.ts           # Export API
src/app/(dashboard)/page.tsx                  # Add export button
src/components/reports/export-button.tsx      # New component
```

---

## Implementation Steps

### Step 3.1: Install xlsx Package

```bash
npm install xlsx
```

Verify in `package.json`:
```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

### Step 3.2: Create Export Utility

**File:** `src/lib/export.ts`

```typescript
import * as XLSX from 'xlsx';

export interface ExportSheet {
  name: string;
  data: Record<string, unknown>[];
  headers?: Record<string, string>; // key -> display name
  columnWidths?: number[];
}

/**
 * Create Excel workbook from multiple sheets
 */
export function createWorkbook(sheets: ExportSheet[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    // Transform data with header names
    const transformedData = sheet.data.map((row) => {
      if (!sheet.headers) return row;

      const newRow: Record<string, unknown> = {};
      Object.entries(sheet.headers).forEach(([key, displayName]) => {
        newRow[displayName] = row[key];
      });
      return newRow;
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(transformedData);

    // Set column widths if provided
    if (sheet.columnWidths) {
      ws['!cols'] = sheet.columnWidths.map((width) => ({ wch: width }));
    }

    // Add sheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31)); // Max 31 chars
  });

  return wb;
}

/**
 * Convert workbook to buffer for HTTP response
 */
export function workbookToBuffer(wb: XLSX.WorkBook): Buffer {
  const buffer = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'buffer',
    compression: true,
  });
  return buffer;
}

/**
 * Format currency value for Excel
 */
export function formatCurrencyForExcel(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Generate filename with timestamp
 */
export function generateExportFilename(prefix: string): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}_${dateStr}.xlsx`;
}
```

### Step 3.3: Create Export API Route

**File:** `src/app/api/reports/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import {
  createWorkbook,
  workbookToBuffer,
  generateExportFilename,
  formatCurrencyForExcel,
} from '@/lib/export';
import { SERVICE_TYPES } from '@/config/operator-config';
import { REQUEST_STAGES } from '@/config/request-config';

// POST /api/reports/export
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chua dang nhap' },
        { status: 401 }
      );
    }

    const role = session.user.role as Role;
    if (!hasPermission(role, 'revenue:view')) {
      return NextResponse.json(
        { success: false, error: 'Khong co quyen xuat bao cao' },
        { status: 403 }
      );
    }

    // Parse optional filters from body
    const body = await request.json().catch(() => ({}));
    const { fromDate, toDate } = body as { fromDate?: string; toDate?: string };

    // Calculate date ranges (default: current month)
    const now = new Date();
    const currentMonthStart = fromDate
      ? new Date(fromDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = toDate
      ? new Date(toDate + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const prevMonthStart = new Date(
      currentMonthStart.getFullYear(),
      currentMonthStart.getMonth() - 1,
      1
    );
    const prevMonthEnd = new Date(
      currentMonthStart.getFullYear(),
      currentMonthStart.getMonth(),
      0,
      23, 59, 59, 999
    );

    // Fetch all data in parallel
    const [
      currentRevenues,
      prevRevenues,
      currentOperators,
      prevOperators,
      revenues12Months,
      operators,
      requestsByStage,
      bookingCount,
    ] = await Promise.all([
      // Current period revenue
      prisma.revenue.aggregate({
        where: { paymentDate: { gte: currentMonthStart, lte: currentMonthEnd } },
        _sum: { amountVND: true },
      }),
      // Previous period revenue
      prisma.revenue.aggregate({
        where: { paymentDate: { gte: prevMonthStart, lte: prevMonthEnd } },
        _sum: { amountVND: true },
      }),
      // Current period costs
      prisma.operator.aggregate({
        where: { serviceDate: { gte: currentMonthStart, lte: currentMonthEnd } },
        _sum: { totalCost: true },
      }),
      // Previous period costs
      prisma.operator.aggregate({
        where: { serviceDate: { gte: prevMonthStart, lte: prevMonthEnd } },
        _sum: { totalCost: true },
      }),
      // 12 months revenue for trends
      prisma.revenue.findMany({
        where: {
          paymentDate: {
            gte: new Date(now.getFullYear(), now.getMonth() - 11, 1),
          },
        },
        select: { paymentDate: true, amountVND: true },
      }),
      // All operators for cost breakdown
      prisma.operator.findMany({
        where: { serviceDate: { gte: currentMonthStart, lte: currentMonthEnd } },
        select: { serviceType: true, totalCost: true },
      }),
      // Requests by stage
      prisma.request.groupBy({
        by: ['stage'],
        _count: { id: true },
      }),
      // Booking count
      prisma.request.count({
        where: { stage: 'OUTCOME', status: 'BOOKING' },
      }),
    ]);

    // Calculate KPIs
    const revenue = Number(currentRevenues._sum.amountVND || 0);
    const prevRevenue = Number(prevRevenues._sum.amountVND || 0);
    const cost = Number(currentOperators._sum.totalCost || 0);
    const prevCost = Number(prevOperators._sum.totalCost || 0);
    const profit = revenue - cost;
    const prevProfit = prevRevenue - prevCost;

    const calcChange = (current: number, prev: number): number => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 1000) / 10;
    };

    // Sheet 1: KPIs Summary
    const kpisData = [
      {
        metric: 'Doanh thu',
        value: formatCurrencyForExcel(revenue),
        change: `${calcChange(revenue, prevRevenue)}%`,
        unit: 'VND',
      },
      {
        metric: 'Chi phi',
        value: formatCurrencyForExcel(cost),
        change: `${calcChange(cost, prevCost)}%`,
        unit: 'VND',
      },
      {
        metric: 'Loi nhuan',
        value: formatCurrencyForExcel(profit),
        change: `${calcChange(profit, prevProfit)}%`,
        unit: 'VND',
      },
      {
        metric: 'So booking',
        value: bookingCount.toString(),
        change: '--',
        unit: '',
      },
    ];

    // Sheet 2: Revenue Trends
    const monthlyRevenue = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue.set(key, 0);
    }
    revenues12Months.forEach((rev) => {
      const date = new Date(rev.paymentDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyRevenue.has(key)) {
        monthlyRevenue.set(key, monthlyRevenue.get(key)! + Number(rev.amountVND));
      }
    });
    const trendsData = Array.from(monthlyRevenue.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({
        month,
        revenue: formatCurrencyForExcel(amount),
      }));

    // Sheet 3: Cost Breakdown
    const costByType = new Map<string, { total: number; count: number }>();
    operators.forEach((op) => {
      const type = op.serviceType;
      if (!costByType.has(type)) {
        costByType.set(type, { total: 0, count: 0 });
      }
      const entry = costByType.get(type)!;
      entry.total += Number(op.totalCost);
      entry.count += 1;
    });
    const costBreakdownData = Array.from(costByType.entries())
      .map(([type, data]) => ({
        serviceType: SERVICE_TYPES[type as keyof typeof SERVICE_TYPES]?.label || type,
        totalCost: formatCurrencyForExcel(data.total),
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Sheet 4: Conversion Funnel
    const totalRequests = requestsByStage.reduce((sum, s) => sum + s._count.id, 0);
    const funnelData = ['LEAD', 'QUOTE', 'FOLLOWUP', 'OUTCOME'].map((stage) => {
      const found = requestsByStage.find((s) => s.stage === stage);
      const count = found?._count.id || 0;
      return {
        stage: REQUEST_STAGES[stage as keyof typeof REQUEST_STAGES]?.label || stage,
        count,
        percentage: totalRequests > 0 ? `${((count / totalRequests) * 100).toFixed(1)}%` : '0%',
      };
    });

    // Create workbook
    const wb = createWorkbook([
      {
        name: 'Tong quan KPI',
        data: kpisData,
        headers: {
          metric: 'Chi so',
          value: 'Gia tri',
          change: 'Thay doi MoM',
          unit: 'Don vi',
        },
        columnWidths: [20, 20, 15, 10],
      },
      {
        name: 'Xu huong doanh thu',
        data: trendsData,
        headers: {
          month: 'Thang',
          revenue: 'Doanh thu (VND)',
        },
        columnWidths: [15, 20],
      },
      {
        name: 'Chi phi theo dich vu',
        data: costBreakdownData,
        headers: {
          serviceType: 'Loai dich vu',
          totalCost: 'Tong chi phi (VND)',
          count: 'So luong',
        },
        columnWidths: [20, 20, 10],
      },
      {
        name: 'Conversion Funnel',
        data: funnelData,
        headers: {
          stage: 'Giai doan',
          count: 'So luong',
          percentage: 'Ti le',
        },
        columnWidths: [15, 15, 10],
      },
    ]);

    // Convert to buffer
    const buffer = workbookToBuffer(wb);
    const filename = generateExportFilename('dashboard_report');

    // Return as download
    return new Response(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error exporting report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi xuat bao cao: ${message}` },
      { status: 500 }
    );
  }
}
```

### Step 3.4: Create Export Button Component

**File:** `src/components/reports/export-button.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ExportButtonProps {
  fromDate?: string;
  toDate?: string;
}

export function ExportButton({ fromDate, toDate }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate, toDate }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get filename from header or generate
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || 'report.xlsx';

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Xuat bao cao thanh cong');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Loi xuat bao cao');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Dang xuat...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Xuat Excel
        </>
      )}
    </Button>
  );
}
```

### Step 3.5: Add Export Button to Dashboard

**Update:** `src/app/(dashboard)/page.tsx`

Add to the header section (after greeting):

```typescript
import { ExportButton } from '@/components/reports/export-button';

// In the return JSX, update the header section:
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">
      {getGreeting()}, Minh!
    </h1>
    <p className="text-muted-foreground">
      Tong quan hoat dong kinh doanh cua ban
    </p>
  </div>
  <div className="flex items-center gap-4">
    <ExportButton />
    <div className="flex items-center gap-2 text-muted-foreground">
      <Calendar className="h-4 w-4" />
      <span className="text-sm">{displayDate}</span>
    </div>
  </div>
</div>
```

### Step 3.6: Update Component Index

**File:** `src/components/reports/index.ts` (add export)

```typescript
export { KPICard } from './kpi-card';
export { RevenueTrendChart } from './revenue-trend-chart';
export { CostBreakdownChart } from './cost-breakdown-chart';
export { ConversionFunnelChart } from './conversion-funnel-chart';
export { ExportButton } from './export-button';
```

---

## Todo List

- [ ] Run `npm install xlsx`
- [ ] Create `src/lib/export.ts`
- [ ] Create `src/app/api/reports/export/route.ts`
- [ ] Create `src/components/reports/export-button.tsx`
- [ ] Update `src/app/(dashboard)/page.tsx` with export button
- [ ] Update `src/components/reports/index.ts`
- [ ] Test export downloads valid .xlsx file
- [ ] Verify file opens correctly in Excel/Google Sheets

---

## Success Criteria

- [ ] `npm install xlsx` completes without errors
- [ ] Export button appears on dashboard
- [ ] Clicking export triggers download
- [ ] Downloaded file has 4 sheets with correct data
- [ ] Currency values formatted correctly
- [ ] Loading state shows during export
- [ ] Error handling works (toast notification)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| xlsx package vulnerability | High | Use latest version, monitor advisories |
| Large export crashes browser | Low | Server-side generation handles memory |
| Filename encoding issues | Low | Use ASCII-safe filename |
| Concurrent export requests | Medium | Add rate limiting if needed |

---

## Security Considerations

- Auth required for export endpoint
- Permission check (`revenue:view`)
- No user input in filename (server-generated)
- Date filters validated

---

## Next Steps

After completing Phase 3:
1. Full integration testing
2. Performance testing with large datasets
3. Consider adding date range picker to export
4. Optional: Add scheduled export feature
