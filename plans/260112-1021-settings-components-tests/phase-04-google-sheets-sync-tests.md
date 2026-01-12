# Phase 04: Google Sheets Sync Tests

## Context
- Plan: [plan.md](./plan.md)
- Setup: [phase-01-test-setup-and-mocks.md](./phase-01-test-setup-and-mocks.md)

## Overview
RTL tests for GoogleSheetsSync (225 lines) - connection status, sync triggers, loading/error states.

## Key Insights
- Fetches status from GET /api/sync/sheets on mount
- Three sheet cards: Request, Operator, Revenue
- Each card has sync button calling POST /api/sync/sheets
- Unconfigured state shows Alert with env var list
- Stats: success count, failed count, lastSync, lastRow

## Requirements

### google-sheets-sync.test.tsx (~12 tests)

**Loading State (2 tests)**
- renders loading spinner on initial load
- hides loader after fetch completes

**Unconfigured State (2 tests)**
- shows Alert when configured: false
- lists required env vars (GOOGLE_SERVICE_ACCOUNT_EMAIL, etc.)

**Configured State (4 tests)**
- renders 3 sheet cards (Request, Operator, Revenue)
- displays sync stats (X synced, Y failed badges)
- shows lastSync timestamp formatted
- shows lastRow number when available

**Sync Actions (4 tests)**
- calls POST /api/sync/sheets with sheetName on sync click
- shows loading spinner during sync
- disables all buttons during sync
- shows toast on sync success/error

## Implementation Steps

1. Create `src/components/settings/__tests__/google-sheets-sync.test.tsx`
2. Setup fetch mock for GET /api/sync/sheets
3. Test unconfigured vs configured branching
4. Test each sheet card rendering
5. Test sync button interactions
6. Mock toast notifications

## Mock Data Structure

```typescript
const mockSyncStatus = {
  configured: true,
  stats: [
    { sheetName: 'Request', status: 'SUCCESS', _count: 150 },
    { sheetName: 'Request', status: 'FAILED', _count: 3 },
    { sheetName: 'Operator', status: 'SUCCESS', _count: 89 },
    { sheetName: 'Revenue', status: 'SUCCESS', _count: 45 },
  ],
  lastSyncs: [
    { sheetName: 'Request', lastSync: '2026-01-12T10:30:00Z', lastRow: 153 },
    { sheetName: 'Operator', lastSync: '2026-01-12T09:15:00Z', lastRow: 89 },
    { sheetName: 'Revenue', lastSync: null, lastRow: null },
  ],
};

const mockSyncStatusUnconfigured = {
  configured: false,
  stats: [],
  lastSyncs: [],
};

const mockSyncResponse = {
  success: true,
  synced: 5,
  errors: 0,
  message: 'Synced 5 rows',
};
```

## Todo List
- [ ] google-sheets-sync.test.tsx - Loading state
- [ ] google-sheets-sync.test.tsx - Unconfigured state
- [ ] google-sheets-sync.test.tsx - Configured rendering
- [ ] google-sheets-sync.test.tsx - Sync actions
- [ ] Verify toast calls
- [ ] Test formatDate helper

## Success Criteria
- [ ] 12 tests pass
- [ ] Unconfigured/configured branching tested
- [ ] All 3 sheets cards tested
- [ ] Sync button states verified
- [ ] Date formatting "vi-VN" locale tested
