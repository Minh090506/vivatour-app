---
parent: ./plan.md
phase: 01
title: "Add SyncContext with AsyncLocalStorage"
status: pending
priority: P2
effort: 45min
---

# Phase 01: Add SyncContext with AsyncLocalStorage

## Context Links

- Parent: [plan.md](./plan.md)
- Reference: `src/lib/sync/sync-extensions.ts`
- Docs: `docs/codebase-summary.md`

## Overview

Add request-scoped sync context using Node.js AsyncLocalStorage for thread-safe flag management.

## Key Insights

1. **AsyncLocalStorage** provides request-scoped storage without globals
2. **withSyncDisabled()** wrapper executes callback with tracking disabled
3. **isSyncDisabled()** check in extension hooks
4. Pattern similar to Next.js request context

## Requirements

1. Create `sync-context.ts` with AsyncLocalStorage
2. Export `withSyncDisabled(callback)` function
3. Export `isSyncDisabled()` check function
4. Update `sync-extensions.ts` to check flag
5. Add unit tests

## Architecture

```
┌─────────────────────────────────────────┐
│  API Route / Sync Job                   │
│                                         │
│  await withSyncDisabled(async () => {   │
│    await prisma.request.createMany(...) │  ← No queue entries
│  })                                     │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  sync-context.ts                        │
│  ┌─────────────────────────────────┐    │
│  │ AsyncLocalStorage<SyncContext>  │    │
│  │ { syncDisabled: boolean }       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  sync-extensions.ts                     │
│                                         │
│  if (isSyncDisabled()) return result;   │  ← Skip queue
│  queueAsync(...)                        │
└─────────────────────────────────────────┘
```

## Related Code Files

| File | Action | Lines |
|------|--------|-------|
| `src/lib/sync/sync-context.ts` | CREATE | ~40 |
| `src/lib/sync/sync-extensions.ts` | MODIFY | +10 |
| `src/lib/sync/__tests__/sync-context.test.ts` | CREATE | ~60 |

## Implementation Steps

### Step 1: Create sync-context.ts

```typescript
// src/lib/sync/sync-context.ts
import { AsyncLocalStorage } from "async_hooks";

interface SyncContext {
  syncDisabled: boolean;
}

const syncContextStorage = new AsyncLocalStorage<SyncContext>();

/**
 * Check if sync tracking is disabled for current context
 */
export function isSyncDisabled(): boolean {
  const context = syncContextStorage.getStore();
  return context?.syncDisabled ?? false;
}

/**
 * Execute callback with sync tracking disabled
 * Use for batch imports from Google Sheets
 */
export async function withSyncDisabled<T>(
  callback: () => Promise<T>
): Promise<T> {
  return syncContextStorage.run({ syncDisabled: true }, callback);
}
```

### Step 2: Update sync-extensions.ts

Add import and flag check in queueAsync function:

```typescript
import { isSyncDisabled } from "./sync-context";

function queueAsync(...) {
  // Skip if sync disabled (batch import mode)
  if (isSyncDisabled()) return;

  setImmediate(async () => {
    // existing logic
  });
}
```

### Step 3: Add Unit Tests

```typescript
// src/lib/sync/__tests__/sync-context.test.ts
import { isSyncDisabled, withSyncDisabled } from "../sync-context";

describe("sync-context", () => {
  describe("isSyncDisabled", () => {
    it("returns false by default", () => {
      expect(isSyncDisabled()).toBe(false);
    });
  });

  describe("withSyncDisabled", () => {
    it("returns true inside callback", async () => {
      let insideValue = false;
      await withSyncDisabled(async () => {
        insideValue = isSyncDisabled();
      });
      expect(insideValue).toBe(true);
    });

    it("returns false after callback", async () => {
      await withSyncDisabled(async () => {});
      expect(isSyncDisabled()).toBe(false);
    });

    it("propagates return value", async () => {
      const result = await withSyncDisabled(async () => 42);
      expect(result).toBe(42);
    });

    it("isolates concurrent calls", async () => {
      const results: boolean[] = [];
      await Promise.all([
        withSyncDisabled(async () => {
          await new Promise(r => setTimeout(r, 10));
          results.push(isSyncDisabled());
        }),
        (async () => {
          results.push(isSyncDisabled());
        })(),
      ]);
      expect(results).toContain(true);
      expect(results).toContain(false);
    });
  });
});
```

## Todo List

- [ ] Create `src/lib/sync/sync-context.ts`
- [ ] Update `src/lib/sync/sync-extensions.ts` with flag check
- [ ] Create `src/lib/sync/__tests__/sync-context.test.ts`
- [ ] Run tests: `npm test sync-context`
- [ ] Run existing tests: `npm test sync-extensions`

## Success Criteria

1. `withSyncDisabled()` executes callback with disabled flag
2. `isSyncDisabled()` returns true only inside wrapper
3. Concurrent requests isolated (no cross-contamination)
4. Existing sync-extensions tests pass
5. New unit tests pass

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| AsyncLocalStorage unavailable | High | Node.js 16+ required, already met |
| Performance overhead | Low | AsyncLocalStorage is optimized, minimal overhead |
| Test isolation | Medium | Jest resets between tests |

## Security Considerations

- No external input handling
- No credentials involved
- Flag is read-only after set

## Next Steps

After implementation:
1. Update batch sync routes to use `withSyncDisabled()`
2. Document usage in codebase-summary.md
