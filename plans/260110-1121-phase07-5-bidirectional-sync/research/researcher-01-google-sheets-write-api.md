# Google Sheets API v4 Write Operations Research
**Phase 07.5 Bidirectional Sync Implementation**
**Date: 2026-01-10**

## 1. batchUpdate vs spreadsheets.values.update

### Decision: Use `spreadsheets.values.*` for data operations

**spreadsheets.values** (correct choice):
- `update` - modify single range
- `batchUpdate` - modify multiple ranges in one call
- `append` - add rows to end of table

**spreadsheets.batchUpdate** (structural changes only):
- Formatting, conditional formatting
- Insert/delete rows or columns
- Sheet structure modifications

**Practical implication:** For row updates in sync, use `values.batchUpdate` to write multiple changed rows in single API call. Reserve `batchUpdate` for schema changes only.

**TypeScript example:**
```typescript
const sheetsAPI = google.sheets({ version: 'v4', auth });
await sheetsAPI.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: 'Sheet1!A1:B2', values: [[value1, value2], [...]] },
      { range: 'Sheet1!C3:D4', values: [[...]] }
    ]
  }
});
```

---

## 2. Rate Limits & Efficient Batching

### Quota: 300 requests/min per project, 60 requests/min per user

**Critical insight:** Per-user limit is bottleneck in multi-user scenarios.

**Batching strategy:**
- Combine 10-50 row updates into single `values.batchUpdate` call
- Reduces API call count, stays within per-user quota
- Max payload: 2 MB per request (rarely hit with structured data)

**Example batching logic:**
```typescript
const batchSize = 25; // rows per API call
for (let i = 0; i < updates.length; i += batchSize) {
  const batch = updates.slice(i, i + batchSize);
  const data = batch.map((row, idx) => ({
    range: `Sheet1!A${row.rowNum}:Z${row.rowNum}`,
    values: [row.values]
  }));

  await sheetsAPI.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data }
  });

  // Small delay between batches to spread load
  await delay(100);
}
```

**When rate limited (429 error):** Implement exponential backoff with jitter.

---

## 3. Append vs Update Operations

### Append: New rows only
- Automatically finds end of table
- Uses `INSERT_ROWS` option to add rows without overwriting
- No need to know exact row numbers
- Slower for bulk operations (finds table boundary first)

**When to use:** Single new record, interactive create operations

```typescript
await sheetsAPI.spreadsheets.values.append({
  spreadsheetId: SHEET_ID,
  range: 'Sheet1!A:Z', // Table range
  valueInputOption: 'USER_ENTERED',
  requestBody: { values: [[...newRow]] }
});
```

### Update: Existing or specific rows
- Requires explicit cell range (A1:Z10)
- Atomic: can update multiple ranges simultaneously
- Better for bulk sync (know exact rows to update)
- Faster when updating many rows

**When to use:** Sync changed rows, batch updates with known positions

**Recommendation for bidirectional sync:** Use `update` because sync operations typically know which rows changed. Append only for new records without sync metadata.

---

## 4. Preserving Formulas: USER_ENTERED vs RAW

### valueInputOption comparison

| Option | Behavior | Formula Handling | Use Case |
|--------|----------|------------------|----------|
| `USER_ENTERED` | Parses input like manual entry | `=SUM(...)` calculated | Sync with formulas, preserve calculations |
| `RAW_VALUES` | Literal text/numbers | `=SUM(...)` becomes text | Import raw data, no formulas |

**Critical for bidirectional sync:** Use `USER_ENTERED` to preserve formulas when updating rows.

```typescript
// ✅ Correct: Formulas preserved
const values = [
  ['John', 25, '=A2*2'],  // Formula preserved
  ['Jane', 30, '=A3*2']
];

await sheetsAPI.spreadsheets.values.update({
  spreadsheetId: SHEET_ID,
  range: 'Sheet1!A1:C2',
  valueInputOption: 'USER_ENTERED', // Parse formulas
  requestBody: { values }
});

// ❌ Wrong: Formulas become text
valueInputOption: 'RAW_VALUES' // =A2*2 becomes literal string
```

**Implication:** Always use `USER_ENTERED` unless you specifically want to overwrite formulas with raw values.

---

## 5. Exponential Backoff Retry Logic

### Algorithm
```
waitTime = min((2^n + jitter), maxBackoff)
where: n = attempt number (0, 1, 2...)
       jitter = random milliseconds (0-1000)
       maxBackoff = 64 seconds
```

### TypeScript implementation for bidirectional sync
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  const baseDelay = 1000; // Start at 1s
  const maxDelay = 64000; // Cap at 64s

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code !== 429) throw error; // Not rate limited
      if (attempt === maxAttempts - 1) throw error;

      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const waitMs = Math.min(exponentialDelay + jitter, maxDelay);

      console.log(`Rate limited. Retry in ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
}

// Usage
await withRetry(() =>
  sheetsAPI.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data }
  })
);
```

### Best practices for sync:
1. **Batch aggressively** - reduce API calls, reduce rate limit hits
2. **Exponential backoff with jitter** - avoid thundering herd
3. **Monitor 429 responses** - indicates need for larger batches
4. **Per-user isolation** - each user token has separate 60 req/min quota
5. **Queue-based approach** - serialize writes to single queue to prevent concurrent quota exhaustion

---

## Implementation Roadmap

### Phase 1: Basic sync
- ✅ Use `values.batchUpdate` for bulk updates
- ✅ Batch 20-50 rows per API call
- ✅ USER_ENTERED mode preserves formulas

### Phase 2: Rate limit handling
- ✅ Implement exponential backoff wrapper
- ✅ Add retry logic for 429 responses
- ✅ Monitor API response times

### Phase 3: Production resilience
- ✅ Queue-based write system (serialize API calls)
- ✅ Metrics: rows/sec, API calls/min, retry rates
- ✅ Graceful degradation on quota exhaustion

---

## Unresolved Questions

1. **Multi-sheet sync:** How to handle updates across multiple sheets efficiently? Sequential or parallel batches?
2. **Conflict detection:** Should sync detect local vs remote changes before updating?
3. **Large dataset scaling:** What's optimal batch size for 1000+ row updates? (Current: 25 rows/call)
4. **Validation:** Should validate formulas before sending USER_ENTERED values?
