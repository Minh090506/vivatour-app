# Phase 02: Google Sheets Sync (Append-Only)

**Status**: pending | **Effort**: 4-6h

## Objective

One-way sync from Google Sheets → PostgreSQL. Append-only (never delete). Sheet remains backup/primary data entry.

---

## Architecture

```
Google Sheet (Source)
    ↓
Service Account Auth
    ↓
/api/sync/sheets (Manual trigger)
    ↓
Read rows > last synced rowIndex
    ↓
Upsert to DB by unique key
    ↓
Log to SyncLog
```

---

## Tasks

### 2.1 Google Cloud Setup (30m)

1. Go to Google Cloud Console
2. Create Service Account
3. Enable Google Sheets API
4. Download JSON key → save as `google-credentials.json`
5. Share Google Sheet with service account email

**ENV vars**:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SHEET_ID=1abc123...
```

---

### 2.2 Sheets API Client (1h)

**File**: `src/lib/google-sheets.ts`

```typescript
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

export interface SheetRow {
  rowIndex: number;
  values: string[];
}

export async function getSheetData(
  sheetName: string,
  startRow: number = 2
): Promise<SheetRow[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A${startRow}:Z`,
  });

  const rows = response.data.values || [];

  return rows.map((values, idx) => ({
    rowIndex: startRow + idx,
    values: values as string[],
  }));
}

export async function getLastSyncedRow(sheetName: string): Promise<number> {
  const { prisma } = await import('@/lib/db');

  const lastSync = await prisma.syncLog.findFirst({
    where: { sheetName, status: 'SUCCESS' },
    orderBy: { rowIndex: 'desc' },
  });

  return lastSync?.rowIndex ?? 1; // Start from row 2 (after header)
}
```

---

### 2.3 Sheet Mappers (1h)

**File**: `src/lib/sheet-mappers.ts`

```typescript
import { prisma } from '@/lib/db';

// Column mapping for Request sheet
// A: code, B: customerName, C: contact, D: country, E: source, F: status, ...
export async function mapRequestRow(row: string[], rowIndex: number) {
  const [code, customerName, contact, country, source, status, pax, tourDays, startDate, endDate, expectedRevenue, expectedCost, notes] = row;

  if (!code || !customerName) return null;

  // Find or create seller (default to first SELLER user)
  const seller = await prisma.user.findFirst({ where: { role: 'SELLER' } });
  if (!seller) throw new Error('No SELLER user found');

  return {
    code: code.trim(),
    customerName: customerName.trim(),
    contact: contact?.trim() || '',
    country: country?.trim() || 'Unknown',
    source: source?.trim() || 'Other',
    status: status?.trim() || 'DANG_LL_CHUA_TL',
    stage: mapStatusToStage(status),
    pax: parseInt(pax) || 1,
    tourDays: tourDays ? parseInt(tourDays) : null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    expectedRevenue: expectedRevenue ? parseFloat(expectedRevenue.replace(/,/g, '')) : null,
    expectedCost: expectedCost ? parseFloat(expectedCost.replace(/,/g, '')) : null,
    notes: notes?.trim() || null,
    sellerId: seller.id,
    sheetRowIndex: rowIndex,
  };
}

function mapStatusToStage(status: string): string {
  const stageMap: Record<string, string> = {
    'DANG_LL_CHUA_TL': 'LEAD',
    'DA_LIEN_HE_KH': 'LEAD',
    'CHO_KH_PHE_DUYET': 'QUOTE',
    'BOOKING': 'OUTCOME',
    'DA_CONFIRM': 'OUTCOME',
  };
  return stageMap[status] || 'LEAD';
}

// Similar mappers for Operator and Revenue sheets...
export async function mapOperatorRow(row: string[], rowIndex: number) {
  // Implementation based on your sheet columns
}

export async function mapRevenueRow(row: string[], rowIndex: number) {
  // Implementation based on your sheet columns
}
```

---

### 2.4 Sync API Endpoint (1.5h)

**File**: `src/app/api/sync/sheets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { getSheetData, getLastSyncedRow } from '@/lib/google-sheets';
import { mapRequestRow } from '@/lib/sheet-mappers';

export async function POST(request: NextRequest) {
  try {
    // Auth check - ADMIN only
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user.role as Role, '*')) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const { sheetName = 'Request' } = await request.json();
    const validSheets = ['Request', 'Operator', 'Revenue'];

    if (!validSheets.includes(sheetName)) {
      return NextResponse.json({ success: false, error: 'Invalid sheet name' }, { status: 400 });
    }

    // Get last synced row
    const lastRow = await getLastSyncedRow(sheetName);

    // Fetch new rows from sheet
    const rows = await getSheetData(sheetName, lastRow + 1);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new rows to sync',
        synced: 0
      });
    }

    let synced = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const data = await mapRequestRow(row.values, row.rowIndex);
        if (!data) continue;

        // Upsert by unique code
        await prisma.request.upsert({
          where: { code: data.code },
          update: { ...data, updatedAt: new Date() },
          create: data,
        });

        // Log success
        await prisma.syncLog.create({
          data: {
            sheetName,
            action: 'SYNC',
            rowIndex: row.rowIndex,
            recordId: data.code,
            status: 'SUCCESS',
          },
        });

        synced++;
      } catch (error) {
        // Log failure
        await prisma.syncLog.create({
          data: {
            sheetName,
            action: 'SYNC',
            rowIndex: row.rowIndex,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} rows, ${errors} errors`,
      synced,
      errors,
      lastRowIndex: rows[rows.length - 1]?.rowIndex,
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Sync failed' },
      { status: 500 }
    );
  }
}

// GET - Check sync status
export async function GET() {
  const stats = await prisma.syncLog.groupBy({
    by: ['sheetName', 'status'],
    _count: true,
    orderBy: { sheetName: 'asc' },
  });

  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { syncedAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: { stats, lastSync },
  });
}
```

---

### 2.5 Sync Button in Settings (30m)

Add to `/settings` page:

```typescript
// In SettingsPage component
const [syncing, setSyncing] = useState(false);
const [syncResult, setSyncResult] = useState<string | null>(null);

const handleSync = async (sheetName: string) => {
  setSyncing(true);
  try {
    const res = await fetch('/api/sync/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetName }),
    });
    const data = await res.json();
    setSyncResult(data.message || 'Sync completed');
    toast.success(data.message);
  } catch {
    toast.error('Sync failed');
  } finally {
    setSyncing(false);
  }
};

// UI
<Card>
  <CardHeader>
    <CardTitle>Google Sheets Sync</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <Button onClick={() => handleSync('Request')} disabled={syncing}>
      Sync Requests
    </Button>
    <Button onClick={() => handleSync('Operator')} disabled={syncing}>
      Sync Operators
    </Button>
    <Button onClick={() => handleSync('Revenue')} disabled={syncing}>
      Sync Revenues
    </Button>
  </CardContent>
</Card>
```

---

## Verification

- [ ] Service Account can read sheet
- [ ] `/api/sync/sheets` POST syncs new rows
- [ ] Existing rows (by code) get updated, not duplicated
- [ ] SyncLog tracks all operations
- [ ] Sync button works in Settings

## Dependencies

```bash
npm install googleapis
```

## ENV Vars

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
```

## Output

- `src/lib/google-sheets.ts`
- `src/lib/sheet-mappers.ts`
- `src/app/api/sync/sheets/route.ts`
- Settings page sync UI
