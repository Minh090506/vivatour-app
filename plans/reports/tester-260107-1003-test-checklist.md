# Google Sheets Sync - Test Implementation Checklist

**Report Date:** 2026-01-07
**Status:** New unit tests needed
**Current Coverage:** 0% (new functions)

---

## Quick Reference

| Function | Tests Needed | Status | Effort |
|----------|-------------|--------|--------|
| getSheetIdForType() | 6 cases | ❌ | 30 min |
| parsePrivateKey() | 5 cases | ❌ | 30 min |
| getSheetConfigStatus() | 4 cases | ❌ | 20 min |
| POST /api/sync/sheets | 4 cases | ❌ | 1 hour |
| GET /api/sync/sheets | 2 cases | ❌ | 30 min |
| Integration tests | 4 cases | ❌ | 2 hours |

**Total Effort:** ~5 hours
**Priority:** P1 (before production deployment)

---

## Unit Tests: getSheetIdForType()

### Test File Location
`src/__tests__/lib/google-sheets.test.ts`

### Test Cases Required

```typescript
describe('getSheetIdForType', () => {
  // Setup
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Test 1: Returns per-sheet ID for Request
  test('should return SHEET_ID_REQUEST when sheetName is "Request"', () => {
    process.env.SHEET_ID_REQUEST = 'req-sheet-123';
    const result = getSheetIdForType('Request');
    expect(result).toBe('req-sheet-123');
  });

  // Test 2: Returns per-sheet ID for Operator
  test('should return SHEET_ID_OPERATOR when sheetName is "Operator"', () => {
    process.env.SHEET_ID_OPERATOR = 'op-sheet-456';
    const result = getSheetIdForType('Operator');
    expect(result).toBe('op-sheet-456');
  });

  // Test 3: Returns per-sheet ID for Revenue
  test('should return SHEET_ID_REVENUE when sheetName is "Revenue"', () => {
    process.env.SHEET_ID_REVENUE = 'rev-sheet-789';
    const result = getSheetIdForType('Revenue');
    expect(result).toBe('rev-sheet-789');
  });

  // Test 4: Falls back to GOOGLE_SHEET_ID
  test('should fall back to GOOGLE_SHEET_ID when per-sheet ID not set', () => {
    process.env.GOOGLE_SHEET_ID = 'fallback-sheet-999';
    delete process.env.SHEET_ID_REQUEST;
    const result = getSheetIdForType('Request');
    expect(result).toBe('fallback-sheet-999');
  });

  // Test 5: Throws error when no ID configured
  test('should throw error when no spreadsheet ID configured', () => {
    delete process.env.SHEET_ID_REQUEST;
    delete process.env.GOOGLE_SHEET_ID;
    expect(() => getSheetIdForType('Request')).toThrow(
      /No spreadsheet ID for Request/
    );
  });

  // Test 6: Throws error for unknown sheet
  test('should throw error for unknown sheet name', () => {
    process.env.GOOGLE_SHEET_ID = 'fallback-sheet';
    expect(() => getSheetIdForType('Unknown')).toThrow();
  });
});
```

### Verification Checklist
- [ ] All 6 test cases pass
- [ ] Coverage for getSheetIdForType reaches 100%
- [ ] Error messages are helpful
- [ ] Environment variables properly isolated

---

## Unit Tests: parsePrivateKey()

### Test Cases Required

```typescript
describe('parsePrivateKey', () => {
  // Test 1: Handles escaped newlines
  test('should convert escaped newlines (\\\\n) to actual newlines', () => {
    const input = 'MIIEvQIBADANBgkqhkiG9w0BAQE\\nFADAMBgcqhkjOPQMBBQAwI';
    const result = parsePrivateKey(input);
    expect(result).toContain('\n'); // actual newline, not \\n
    expect(result).not.toContain('\\n'); // escaped form removed
  });

  // Test 2: Adds PEM headers if missing
  test('should add PEM headers when missing from raw key', () => {
    const rawKey = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAA4IBQAwggELAgEAAoIBAQC...';
    const result = parsePrivateKey(rawKey);
    expect(result).toContain('-----BEGIN PRIVATE KEY-----');
    expect(result).toContain('-----END PRIVATE KEY-----');
    expect(result).toMatch(/^-----BEGIN/);
  });

  // Test 3: Preserves existing PEM headers
  test('should not duplicate PEM headers if already present', () => {
    const keyWithHeaders = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAA4IBQAwggELAgEAAoIBAQC...
-----END PRIVATE KEY-----`;
    const result = parsePrivateKey(keyWithHeaders);
    expect(result).toBe(keyWithHeaders);
    expect((result.match(/-----BEGIN/g) || []).length).toBe(1);
  });

  // Test 4: Trims whitespace correctly
  test('should trim leading and trailing whitespace', () => {
    const keyWithSpaces = '  MIIEvQIBADANBgkqhkiG9w0BAQE...  ';
    const result = parsePrivateKey(keyWithSpaces);
    expect(result).not.toMatch(/^\s+/); // no leading whitespace after BEGIN
    expect(result).not.toMatch(/\s+$/); // no trailing whitespace before END
  });

  // Test 5: Handles combination of escaped newlines + missing headers
  test('should handle escaped newlines and add PEM headers in one call', () => {
    const input = 'MIIEvQIBADANBgkqhkiG9w0BAQE\\nFADAMBgcqhkjOPQM\\nBBQAwI';
    const result = parsePrivateKey(input);
    expect(result).toContain('-----BEGIN PRIVATE KEY-----');
    expect(result).toContain('\n');
    expect(result).not.toContain('\\n');
  });
});
```

### Verification Checklist
- [ ] All 5 test cases pass
- [ ] Coverage for parsePrivateKey reaches 100%
- [ ] Edge cases handled (empty string, null/undefined not tested since param is required)
- [ ] PEM format validation correct

---

## Unit Tests: getSheetConfigStatus()

### Test Cases Required

```typescript
describe('getSheetConfigStatus', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Test 1: Returns all configured when individual IDs set
  test('should return true for each sheet when per-sheet IDs are configured', () => {
    process.env.SHEET_ID_REQUEST = 'req-123';
    process.env.SHEET_ID_OPERATOR = 'op-456';
    process.env.SHEET_ID_REVENUE = 'rev-789';
    delete process.env.GOOGLE_SHEET_ID;

    const result = getSheetConfigStatus();
    expect(result.Request).toBe(true);
    expect(result.Operator).toBe(true);
    expect(result.Revenue).toBe(true);
  });

  // Test 2: Returns all true when fallback ID set
  test('should return true for all sheets when GOOGLE_SHEET_ID is set', () => {
    delete process.env.SHEET_ID_REQUEST;
    delete process.env.SHEET_ID_OPERATOR;
    delete process.env.SHEET_ID_REVENUE;
    process.env.GOOGLE_SHEET_ID = 'fallback-123';

    const result = getSheetConfigStatus();
    expect(result.Request).toBe(true);
    expect(result.Operator).toBe(true);
    expect(result.Revenue).toBe(true);
  });

  // Test 3: Returns false for unconfigured sheets
  test('should return false when sheet IDs are not configured', () => {
    delete process.env.SHEET_ID_REQUEST;
    delete process.env.SHEET_ID_OPERATOR;
    delete process.env.SHEET_ID_REVENUE;
    delete process.env.GOOGLE_SHEET_ID;

    const result = getSheetConfigStatus();
    expect(result.Request).toBe(false);
    expect(result.Operator).toBe(false);
    expect(result.Revenue).toBe(false);
  });

  // Test 4: Per-sheet ID takes precedence over fallback
  test('should use per-sheet ID when both per-sheet and fallback are set', () => {
    process.env.SHEET_ID_REQUEST = 'req-123';
    process.env.GOOGLE_SHEET_ID = 'fallback-123';

    const result = getSheetConfigStatus();
    // Just verify it returns true (per-sheet value is used)
    expect(result.Request).toBe(true);
    // Others should still work from fallback
    expect(result.Operator).toBe(true);
    expect(result.Revenue).toBe(true);
  });
});
```

### Verification Checklist
- [ ] All 4 test cases pass
- [ ] Coverage for getSheetConfigStatus reaches 100%
- [ ] Returns correct Record<string, boolean> structure
- [ ] Per-sheet precedence verified

---

## API Integration Tests: POST /api/sync/sheets

### Test File Location
`src/__tests__/api/sync-sheets.test.ts`

### Test Cases Required

```typescript
describe('POST /api/sync/sheets', () => {
  // Setup auth mock
  const mockSession = { user: { id: 'user1', role: 'ADMIN' } };

  // Test 1: Rejects sync when sheet not configured
  test('should return 400 when sheet config does not exist', async () => {
    // Mock env: Request sheet not configured
    process.env.SHEET_ID_REQUEST = ''; // empty
    delete process.env.GOOGLE_SHEET_ID;

    const response = await POST(
      new NextRequest(
        'http://localhost/api/sync/sheets',
        {
          method: 'POST',
          body: JSON.stringify({ sheetName: 'Request' }),
        }
      )
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('No spreadsheet ID for Request');
  });

  // Test 2: Accepts sync when per-sheet ID configured
  test('should accept sync when SHEET_ID_REQUEST is configured', async () => {
    process.env.SHEET_ID_REQUEST = 'req-sheet-123';

    const response = await POST(
      new NextRequest(
        'http://localhost/api/sync/sheets',
        {
          method: 'POST',
          body: JSON.stringify({ sheetName: 'Request' }),
        }
      )
    );

    // Should not return 400 for config reason
    expect(response.status).not.toBe(400);
    // (May fail on auth/db, but not config)
  });

  // Test 3: Accepts sync when fallback ID configured
  test('should accept sync when GOOGLE_SHEET_ID is configured', async () => {
    delete process.env.SHEET_ID_REQUEST;
    process.env.GOOGLE_SHEET_ID = 'fallback-sheet-123';

    const response = await POST(
      new NextRequest(
        'http://localhost/api/sync/sheets',
        {
          method: 'POST',
          body: JSON.stringify({ sheetName: 'Request' }),
        }
      )
    );

    // Should not return 400 for config reason
    expect(response.status).not.toBe(400);
  });

  // Test 4: Validates all sheets independently
  test('should validate Operator sheet independently from Request', async () => {
    process.env.SHEET_ID_REQUEST = 'req-123';
    delete process.env.SHEET_ID_OPERATOR;
    delete process.env.GOOGLE_SHEET_ID;

    const response = await POST(
      new NextRequest(
        'http://localhost/api/sync/sheets',
        {
          method: 'POST',
          body: JSON.stringify({ sheetName: 'Operator' }),
        }
      )
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('SHEET_ID_OPERATOR');
  });
});
```

### Verification Checklist
- [ ] All 4 test cases pass
- [ ] Per-sheet validation working in API
- [ ] Error messages include correct env var names
- [ ] Fallback behavior properly tested

---

## API Integration Tests: GET /api/sync/sheets

### Test Cases Required

```typescript
describe('GET /api/sync/sheets', () => {
  // Test 1: Returns per-sheet config in response
  test('should include sheetConfig in GET response', async () => {
    process.env.SHEET_ID_REQUEST = 'req-123';
    process.env.SHEET_ID_OPERATOR = 'op-456';
    delete process.env.SHEET_ID_REVENUE;
    delete process.env.GOOGLE_SHEET_ID;

    const response = await GET();

    const json = await response.json();
    expect(json.data).toBeDefined();
    expect(json.data.sheetConfig).toBeDefined();
    expect(json.data.sheetConfig.Request).toBe(true);
    expect(json.data.sheetConfig.Operator).toBe(true);
    expect(json.data.sheetConfig.Revenue).toBe(false);
  });

  // Test 2: Returns overall configured status
  test('should include configured flag in GET response', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'fake-key';
    process.env.GOOGLE_SHEET_ID = 'sheet-123';

    const response = await GET();

    const json = await response.json();
    expect(json.data.configured).toBe(true);
  });
});
```

### Verification Checklist
- [ ] Both test cases pass
- [ ] Response includes sheetConfig object
- [ ] sheetConfig has Request, Operator, Revenue keys
- [ ] configured flag is boolean

---

## Integration Tests: Multi-Sheet Sync

### Test Cases Required

```typescript
describe('Multi-sheet sync integration', () => {
  // Test 1: Full sync with different spreadsheet IDs
  test('should sync different sheets from different spreadsheets', async () => {
    // Setup
    process.env.SHEET_ID_REQUEST = 'spreadsheet-a';
    process.env.SHEET_ID_OPERATOR = 'spreadsheet-b';
    process.env.SHEET_ID_REVENUE = 'spreadsheet-c';

    // Mock getSheetData to track which spreadsheet ID was used
    const getSheetDataSpy = jest.spyOn(sheetsModule, 'getSheetData');

    // Trigger syncs
    // ... (would need full async flow setup)

    // Verify each was called with correct ID
    expect(getSheetDataSpy).toHaveBeenCalledWith(
      'Request',
      expect.any(Number),
      'spreadsheet-a'
    );
    expect(getSheetDataSpy).toHaveBeenCalledWith(
      'Operator',
      expect.any(Number),
      'spreadsheet-b'
    );
  });

  // Test 2: Fallback to GOOGLE_SHEET_ID for all sheets
  test('should use fallback ID for all sheets when per-sheet not set', async () => {
    process.env.GOOGLE_SHEET_ID = 'universal-sheet';
    delete process.env.SHEET_ID_REQUEST;
    delete process.env.SHEET_ID_OPERATOR;
    delete process.env.SHEET_ID_REVENUE;

    // ... sync logic

    // Verify all calls used fallback
  });

  // Test 3: Private key parsing in Google Auth
  test('should correctly parse private key with escaped newlines', async () => {
    process.env.GOOGLE_PRIVATE_KEY = 'MIIEvQIBADANBgkqhkiG9w0BAQE\\nFAAE...';

    // Trigger auth initialization
    // ... should not throw error

    // Verify auth was created successfully
  });

  // Test 4: Error handling for partially configured sheets
  test('should continue sync even if one sheet not configured', async () => {
    process.env.SHEET_ID_REQUEST = 'sheet-a';
    delete process.env.SHEET_ID_OPERATOR;
    process.env.SHEET_ID_REVENUE = 'sheet-c';

    // Attempt to sync all three
    // Request and Revenue should succeed
    // Operator should be rejected with 400

    // Verify correct error for Operator
    // Verify Request and Revenue not blocked
  });
});
```

### Verification Checklist
- [ ] All 4 integration test cases pass
- [ ] Multi-sheet sync working with different IDs
- [ ] Fallback behavior tested in realistic scenario
- [ ] Private key parsing in auth context working
- [ ] Error isolation verified

---

## Test Execution Checklist

### Before Running Tests
- [ ] Create test file: `src/__tests__/lib/google-sheets.test.ts`
- [ ] Create test file: `src/__tests__/api/sync-sheets.test.ts`
- [ ] Install test dependencies (should already be installed)
- [ ] Review Jest config for test path patterns

### Running Tests
```bash
# Run new tests only
npm test -- google-sheets.test.ts
npm test -- sync-sheets.test.ts

# Run with coverage
npm run test:coverage

# Watch mode while developing
npm run test:watch
```

### Success Criteria
- [ ] All new tests pass (15+ test cases)
- [ ] No test timeout errors
- [ ] Coverage for google-sheets.ts: >90%
- [ ] Coverage for sync/sheets route: >80%
- [ ] No console errors or warnings
- [ ] All existing tests still pass (281 tests)

### After Tests Pass
- [ ] Commit: `test: add unit tests for google-sheets.ts`
- [ ] Commit: `test: add API tests for sync/sheets route`
- [ ] Update PR with test coverage report
- [ ] Get code review approval
- [ ] Merge to main branch

---

## Estimated Timeline

| Task | Hours | Status |
|------|-------|--------|
| Write getSheetIdForType tests | 0.5 | ⏳ TODO |
| Write parsePrivateKey tests | 0.5 | ⏳ TODO |
| Write getSheetConfigStatus tests | 0.3 | ⏳ TODO |
| Write POST /api/sync/sheets tests | 1.0 | ⏳ TODO |
| Write GET /api/sync/sheets tests | 0.5 | ⏳ TODO |
| Write integration tests | 2.0 | ⏳ TODO |
| Run tests & verify coverage | 0.5 | ⏳ TODO |
| Code review & fixes | 0.5 | ⏳ TODO |
| **Total** | **~5.3 hours** | |

---

## Notes

- All test code should follow existing project patterns
- Use jest-mock-extended for Prisma mocks (already installed)
- Mock Google Sheets API calls (don't make real API requests)
- Isolate environment variables between test cases
- Clean up test data after each test
- Add descriptive test names and comments

---

**Last Updated:** 2026-01-07
**Next Review:** After tests are implemented
