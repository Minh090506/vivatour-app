# Report API Patterns Analysis

## Summary
Two report endpoints analyzed: `/api/reports/profit` and `/api/reports/operator-costs`. Consistent patterns emerge across both with minimal auth/permission checking.

---

## 1. Permission Checking Pattern
**Currently:** NO explicit permission checks in routes.
- No role/user validation
- No auth guards
- Routes are publicly accessible

**Recommendation:** Add middleware/decorator for permission checks before implementing sensitive dashboards.

---

## 2. Response Format

### Standard Structure
```typescript
{
  success: boolean,
  data: TReportData | undefined,
  error?: string
}
```

### HTTP Status Codes
- `200`: Success
- `400`: Invalid input (date format, enum validation)
- `500`: Server error

### Data Structure Pattern
- **Details**: Array of processed records (bookings, operators, etc.)
- **Summary**: Aggregated metrics (totals, averages, counts)
- **Breakdown**: Multiple dimensions (by type, by supplier, by month)

---

## 3. Query Parameter Handling

### Validation Approach
1. **Inline regex validation** (preferred in both routes)
   - `DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/`
   - `BOOKING_CODE_REGEX = /^\d{8}[A-Z]{3}$/`

2. **Helper functions** for reusable logic
   - `isValidDate(dateStr)`: Regex + Date.parse check
   - `isValidBookingCode(code)`: Regex test only

3. **Enum validation via config**
   - `SERVICE_TYPE_KEYS.includes(serviceType)`
   - Uses central `operator-config.ts` for source of truth

### Parameter Types
- **Date ranges**: `startDate`/`endDate` or `fromDate`/`toDate` (optional, YYYY-MM-DD)
- **Filters**: `bookingCode`, `serviceType`, `supplierId` (optional)
- **Extraction**: `searchParams.get()` from NextRequest URL

### WHERE Clause Building
```typescript
const where: Record<string, unknown> = {};
if (startDate || endDate) {
  where.dateField = {};
  if (startDate) where.dateField.gte = new Date(startDate);
  if (endDate) where.dateField.lte = new Date(endDate);
}
```

---

## 4. Error Handling Pattern

### Try-Catch Wrapping
- All route handlers wrapped in try-catch
- Logs to console: `console.error('Error generating report:', error)`
- Extracts message: `error instanceof Error ? error.message : 'Unknown error'`

### Vietnamese Error Messages
- Input validation: `'Ngày bắt đầu không hợp lệ (YYYY-MM-DD)'`
- Type validation: `'Loại dịch vụ không hợp lệ'`
- Generic fallback: `'Lỗi tạo báo cáo: ${message}'`

### Response Pattern
```typescript
NextResponse.json(
  { success: false, error: 'message' },
  { status: statusCode }
)
```

---

## 5. Date Utilities

### Inline Implementation (No Shared Utility)
- **Constants**: DATE_REGEX (duplicated in both routes)
- **Month formatting**: `${year}-${padStart(month, 2, '0')}`
- **Date parsing**: `new Date(dateString)` with validation check
- **ISO format assumption**: Routes expect YYYY-MM-DD

### Missing Centralized Utilities
- No shared date utility library found in `src/lib/`
- Date logic duplicated across routes
- Consider creating `src/lib/date-utils.ts`

---

## 6. Zod Schema Usage

### Current Pattern
- Zod schemas exist in `src/lib/validations/`
- **NOT used in report routes** (manual regex validation instead)
- Revenue schema shows pattern with Vietnamese messages & composite validators

### Opportunity
Create report request schema for consistent validation:
```typescript
export const reportRequestSchema = z.object({
  startDate: z.string().refine(isValidDate),
  endDate: z.string().refine(isValidDate),
  // ...
});
```

---

## Key Findings

| Aspect | Pattern | Status |
|--------|---------|--------|
| Auth/Permissions | None | ⚠️ Needs implementation |
| Date validation | Regex + manual check | Duplicated code |
| Response format | `{success, data, error}` | Consistent |
| Error messages | Vietnamese localized | Consistent |
| Query params | Manual extraction | No Zod schema |
| Aggregations | In-memory calculation | Could optimize with DB aggregation |

---

## Recommendations for Dashboard Reports

1. **Create shared date utility** to eliminate duplication
2. **Add permission middleware** before expanding reports
3. **Consider Zod schemas** for report request validation
4. **Optimize aggregations** - move some calculations to database queries
5. **Extract date regex** to constant file (already duplicated in 2 routes)

---

## Files Analyzed
- `src/app/api/reports/profit/route.ts`
- `src/app/api/reports/operator-costs/route.ts`
- `src/lib/validations/revenue-validation.ts`
