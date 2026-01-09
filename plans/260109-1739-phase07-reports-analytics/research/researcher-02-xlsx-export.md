# Excel Export Implementation Research for Next.js

**Date**: 2026-01-09 | **Phase**: 07 Analytics & Reports

---

## 1. Library Comparison: SheetJS vs ExcelJS

### SheetJS (xlsx)
- **Downloads**: ~4.2M weekly | 36K GitHub stars
- **Performance**: Fastest (882ms for 1MB, 13.1s for 15MB)
- **Environments**: Node.js + Browser
- **Community Edition**: Free, open-source
- **Pro Edition**: Styling, images, formulas, charts
- **Security**: Historical vulnerabilities (≤0.19.2), use latest versions
- **Updates**: Less frequent maintenance

**Installation (Community)**:
```bash
npm install xlsx
```

⚠️ **CRITICAL**: Do NOT use npm registry (publicly available version is 2+ years old with high-severity CVE). Use vendor-hosted or GitHub sources for latest versions.

### ExcelJS
- **Downloads**: ~2.9M weekly | 14.9K GitHub stars
- **Performance**: Slower (2.4s for 1MB, crashes at 15MB)
- **Styling Support**: Built-in (no Pro version needed)
- **Environments**: Node.js + Browser
- **Community**: More active maintainers, frequent updates
- **TypeScript**: Native support
- **Use Case**: Complex formatting, smaller datasets

**Installation**:
```bash
npm install exceljs
```

### Recommendation
- **Large data exports** (>10K rows): Use SheetJS
- **Complex styling required**: Use ExcelJS or xlsx-js-style
- **Production stability**: ExcelJS (active maintenance)

---

## 2. Client-Side vs Server-Side Patterns

### Server-Side Export (Recommended for Production)
**Ideal for**: Large datasets, memory constraints, format preprocessing

**Pattern**:
```typescript
// app/api/reports/export-revenue/route.ts
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: Request) {
  const { data, filename } = await req.json();

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Revenue');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  return new Response(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
}
```

**Advantages**:
- Offloads computation from browser
- Handles large files without browser memory issues
- Streaming possible for huge datasets
- Better error handling

**Disadvantages**:
- Network latency
- Server resource consumption

### Client-Side Export (Real-Time Responsiveness)
**Ideal for**: Small-medium datasets, immediate feedback, offline capability

**Pattern**:
```typescript
'use client';
import * as XLSX from 'xlsx';

export function ExportButton({ data }: { data: Revenue[] }) {
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }]; // column widths

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Revenue');

    XLSX.writeFile(wb, `revenue-${Date.now()}.xlsx`);
  };

  return <button onClick={handleExport}>Export to Excel</button>;
}
```

**Advantages**:
- Instant download, no network delay
- Works offline
- Smaller server footprint

**Disadvantages**:
- Browser memory limits (~500MB typical)
- Large datasets cause lag/freezing
- No preprocessing possible

---

## 3. Excel Styling & Formatting

### Using xlsx-js-style (SheetJS + Community Styles)
```bash
npm install xlsx xlsx-js-style
```

**Implementation**:
```typescript
import * as XLSX from 'xlsx-js-style';

const ws = XLSX.utils.json_to_sheet(data);

// Header styling
const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '4472C4' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
  },
};

// Apply header style (assuming headers in row 1)
for (let i = 0; i < Object.keys(data[0]).length; i++) {
  const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
  ws[cellAddress].s = headerStyle;
}

// Currency formatting
ws['B1'].numFmt = '_("$"* #,##0.00_);_("$"* (#,##0.00);_("$"* "-"??_);_(@_)';
```

### Using ExcelJS (TypeScript Friendly)
```bash
npm install exceljs
```

**Implementation**:
```typescript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Revenue');

// Headers
worksheet.columns = [
  { header: 'Date', key: 'date', width: 12 },
  { header: 'Amount', key: 'amount', width: 15 },
];

// Style header row
worksheet.getRow(1).fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4472C4' },
};

worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

// Add data with currency format
data.forEach(row => {
  worksheet.addRow(row);
});

worksheet.columns[1].numFmt = '$#,##0.00';

await workbook.xlsx.writeFile(`revenue.xlsx`);
```

### CSS-Like Style Object (Both Libraries)
```typescript
const cellStyle = {
  fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FF0000' } },
  font: { bold: true, size: 12, color: { rgb: '000000' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  numFmt: '#,##0.00', // Number format
  border: {
    top: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
  },
};
```

---

## 4. Large Data Export Best Practices

### Stream Processing (10K+ rows)
```typescript
// Server-side streaming for massive datasets
import { Readable } from 'stream';

export async function GET(req: Request) {
  const batchSize = 1000;
  let offset = 0;
  const ws = XLSX.utils.aoa_to_sheet([['ID', 'Amount', 'Date']]);

  while (true) {
    const batch = await db.revenue.findMany({
      skip: offset,
      take: batchSize,
    });

    if (batch.length === 0) break;

    const rows = batch.map(r => [r.id, r.amount, r.date]);
    XLSX.utils.sheet_add_aoa(ws, rows, { origin: -1 });

    offset += batchSize;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Revenue');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return new Response(buffer, {
    headers: { 'Content-Disposition': 'attachment; filename="revenue.xlsx"' },
  });
}
```

### Memory Management
- **Chunking**: Process 1000-5000 rows at a time
- **Cleanup**: Call `wb = null` after writeFile to free memory
- **Compression**: Use `XLSX.write(wb, { compression: true })`
- **Progressive UI**: Show progress bar during generation

### Performance Checklist
- ✅ Use AOA (Array of Arrays) format, not JSON for >50K rows
- ✅ Set column widths only if necessary
- ✅ Limit styling to headers only
- ✅ Avoid formulas/charts in bulk exports
- ✅ Compress before sending: `Content-Encoding: gzip`

---

## 5. TypeScript Integration

### Type-Safe Exports
```typescript
import * as XLSX from 'xlsx';

interface RevenueRow {
  id: string;
  amount: number;
  currency: 'VND' | 'USD';
  date: Date;
  operatorName: string;
}

async function exportRevenue(data: RevenueRow[]): Promise<Uint8Array> {
  // Transform dates to strings for Excel compatibility
  const exportData = data.map(row => ({
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    date: row.date.toISOString().split('T')[0],
    operatorName: row.operatorName,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Revenue');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

// Usage in route handler
export async function POST(req: Request) {
  const revenues: RevenueRow[] = await db.revenue.findMany();
  const buffer = await exportRevenue(revenues);

  return new Response(buffer, {
    headers: {
      'Content-Disposition': 'attachment; filename="revenue.xlsx"',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
}
```

### ExcelJS TypeScript Types
```typescript
import ExcelJS from 'exceljs';

async function createRevenueReport(data: RevenueRow[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Revenue');

  // Strongly-typed columns
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Date', key: 'date', width: 12 },
  ];

  // Type-safe row addition
  worksheet.addRows(data.map(row => ({
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    date: row.date.toISOString().split('T')[0],
  })));

  await workbook.xlsx.writeFile('revenue.xlsx');
}
```

---

## Installation Commands (Quick Reference)

```bash
# SheetJS Community Edition
npm install xlsx

# SheetJS with Styling
npm install xlsx xlsx-js-style

# ExcelJS (recommended for TypeScript + Styling)
npm install exceljs

# React/Next.js wrapper (optional)
npm install react-xlsx-wrapper
npm install use-export-excel
```

---

## Recommendation for ViVaTour

**Primary Choice**: **SheetJS (xlsx)** for reports module
- Handles large operator/revenue datasets efficiently
- Community edition sufficient for basic exports
- Consider xlsx-js-style for header styling

**Secondary Choice**: **ExcelJS** for complex formatted reports
- Already TypeScript-friendly
- Built-in styling simplifies implementation
- Suitable for small-to-medium exports (operators, revenue summaries)

**Implementation Strategy**:
1. Server-side export for reports (POST `/api/reports/export`)
2. Client-side preview with instant download option
3. Currency formatting (VND/USD) built into templates
4. Progress indication for exports >5K rows

---

## Unresolved Questions

1. Should exports support multi-currency subtotals or simple listing?
2. Is pivot table/grouping needed or flat export sufficient?
3. Maximum expected row count for single export?
4. Do operators need to customize export columns/filters?
5. Should exports be cached or always generated fresh?

---

## Sources

- [xlsx vs exceljs vs xlsx-populate vs excel4node | npm-compare.com](https://npm-compare.com/excel4node,exceljs,xlsx,xlsx-populate)
- [Top Spreadsheet Libraries for React/Next.js in 2025 | Medium](https://medium.com/front-end-world/top-spreadsheet-libraries-for-react-next-js-in-2025-6f7a02ffc3ca)
- [NextJS XLSX Integration Guide | Restack](https://www.restack.io/docs/nextjs-knowledge-nextjs-xlsx-integration)
- [How to Export Data into Excel in Next JS 14 | Medium](https://emdiya.medium.com/how-to-export-data-into-excel-in-next-js-14-820edf8eae6a)
- [How to Create Excel Spreadsheets with Styling | Dave Gray](https://www.davegray.codes/posts/how-to-create-excel-spreadsheets-with-styling-options-using-javascript)
- [Sheets in ReactJS Sites with NextJS | SheetJS Docs](https://docs.sheetjs.com/docs/demos/static/nextjs/)
- [How to Download xlsx Files from a Next.js Route Handler | Dave Gray](https://www.davegray.codes/posts/how-to-download-xlsx-files-from-a-nextjs-route-handler)
