# Phase 3: Testing & Polish

**Duration**: ~30 minutes
**Parallelization**: MUST run after Phase 2 complete
**Dependencies**: Phase 1-A, Phase 1-B, Phase 2

---

## Test Categories

### 1. API Route Tests

#### Revenue CRUD Tests

```bash
# Create revenue (VND)
curl -X POST http://localhost:3000/api/revenues \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "<BOOKING_REQUEST_ID>",
    "paymentDate": "2026-01-06",
    "paymentType": "DEPOSIT",
    "paymentSource": "BANK_TRANSFER",
    "currency": "VND",
    "amountVND": 10000000,
    "userId": "system"
  }'

# Expected: { "success": true, "data": { "id": "...", "amountVND": 10000000, ... } }
```

```bash
# Create revenue (USD with conversion)
curl -X POST http://localhost:3000/api/revenues \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "<BOOKING_REQUEST_ID>",
    "paymentDate": "2026-01-06",
    "paymentType": "FULL_PAYMENT",
    "paymentSource": "WISE",
    "currency": "USD",
    "foreignAmount": 500,
    "exchangeRate": 25000,
    "userId": "system"
  }'

# Expected: { "success": true, "data": { "amountVND": 12500000, "foreignAmount": 500, ... } }
```

```bash
# List revenues
curl http://localhost:3000/api/revenues

# Expected: { "success": true, "data": [...], "total": N }
```

```bash
# Get single revenue
curl http://localhost:3000/api/revenues/<REVENUE_ID>

# Expected: { "success": true, "data": { ... } }
```

```bash
# Update revenue
curl -X PUT http://localhost:3000/api/revenues/<REVENUE_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "paymentType": "PARTIAL",
    "amountVND": 5000000
  }'

# Expected: { "success": true, "data": { "paymentType": "PARTIAL", ... } }
```

```bash
# Delete revenue
curl -X DELETE http://localhost:3000/api/revenues/<REVENUE_ID>

# Expected: { "success": true, "message": "Đã xóa thu nhập" }
```

#### Lock/Unlock Tests

```bash
# Lock revenue
curl -X POST http://localhost:3000/api/revenues/<REVENUE_ID>/lock \
  -H "Content-Type: application/json" \
  -d '{ "userId": "accountant-user-id" }'

# Expected: { "success": true, "data": { "isLocked": true, ... } }
```

```bash
# Try to update locked revenue
curl -X PUT http://localhost:3000/api/revenues/<LOCKED_REVENUE_ID> \
  -H "Content-Type: application/json" \
  -d '{ "amountVND": 999 }'

# Expected: { "success": false, "error": "Thu nhập đã khóa, không thể sửa" }
```

```bash
# Unlock revenue (ADMIN only)
curl -X POST http://localhost:3000/api/revenues/<REVENUE_ID>/unlock \
  -H "Content-Type: application/json" \
  -d '{ "userId": "admin-user-id" }'

# Expected: { "success": true, "data": { "isLocked": false, ... } }
```

#### Validation Tests

```bash
# Missing required fields
curl -X POST http://localhost:3000/api/revenues \
  -H "Content-Type: application/json" \
  -d '{ "requestId": "test" }'

# Expected: { "success": false, "error": "Thiếu thông tin bắt buộc: ..." }
```

```bash
# Invalid payment type
curl -X POST http://localhost:3000/api/revenues \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "<ID>",
    "paymentDate": "2026-01-06",
    "paymentType": "INVALID",
    "paymentSource": "CASH",
    "amountVND": 1000
  }'

# Expected: { "success": false, "error": "Loại thanh toán không hợp lệ: INVALID" }
```

```bash
# Invalid currency
curl -X POST http://localhost:3000/api/revenues \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "<ID>",
    "paymentDate": "2026-01-06",
    "paymentType": "DEPOSIT",
    "paymentSource": "CASH",
    "currency": "XXX",
    "foreignAmount": 100,
    "exchangeRate": 1
  }'

# Expected: { "success": false, "error": "Loại tiền tệ không hợp lệ: XXX" }
```

---

### 2. Currency Conversion Tests

| Currency | Foreign Amount | Exchange Rate | Expected VND |
|----------|----------------|---------------|--------------|
| VND | - | - | 10,000,000 |
| USD | 500 | 25,000 | 12,500,000 |
| EUR | 1,000 | 27,000 | 27,000,000 |
| GBP | 200 | 32,000 | 6,400,000 |
| JPY | 100,000 | 165 | 16,500,000 |

**Test in UI**:
1. Open RevenueForm
2. Select USD currency
3. Enter foreignAmount: 500
4. Enter exchangeRate: 25000
5. Verify amountVND auto-calculates to 12,500,000
6. Switch to VND
7. Verify foreignAmount/exchangeRate cleared

---

### 3. UI Component Tests

#### RevenueForm Tests

- [ ] Form loads with empty state for new revenue
- [ ] Form loads with pre-filled data for edit
- [ ] Request dropdown shows OUTCOME stage bookings
- [ ] Payment type dropdown works
- [ ] Payment source dropdown works
- [ ] Currency switcher works
- [ ] VND direct input works
- [ ] Foreign currency input + rate works
- [ ] Auto-calculation updates in real-time
- [ ] Submit creates revenue (new)
- [ ] Submit updates revenue (edit)
- [ ] Locked revenue shows warning and disables fields
- [ ] Validation errors show correctly

#### RevenueTable Tests

- [ ] Table renders with revenues
- [ ] Empty state shows when no revenues
- [ ] Edit button appears for unlocked revenues
- [ ] Edit button hidden for locked revenues
- [ ] Lock button works (unlocked → locked)
- [ ] Unlock button shows only for ADMIN (locked → unlocked)
- [ ] Delete confirmation dialog works
- [ ] Delete blocked for locked revenues
- [ ] Currency conversion shows in table cell

#### RevenueSummaryCard Tests

- [ ] Total revenue calculates correctly
- [ ] Deposit total calculates correctly
- [ ] Locked total calculates correctly
- [ ] Refunds subtract from totals
- [ ] Transaction counts are correct

---

### 4. Integration Tests

#### Revenue Page Tests

- [ ] Page loads at `/revenue`
- [ ] Summary cards show
- [ ] Filter by payment type works
- [ ] Filter by date range works
- [ ] Filter by locked status works
- [ ] Refresh button reloads data
- [ ] Add button opens form sheet
- [ ] Edit from table opens form with data
- [ ] Form success closes sheet and refreshes

#### Request Detail Panel Tests

- [ ] Revenue section shows for bookings only
- [ ] Revenue section hidden for non-bookings
- [ ] Revenue summary card shows
- [ ] Revenue table shows revenues
- [ ] Empty state shows when no revenues
- [ ] Refresh from table updates data

---

### 5. Edge Case Tests

#### Multi-Currency Edge Cases

```typescript
// Test: Zero foreign amount
{ currency: 'USD', foreignAmount: 0, exchangeRate: 25000 }
// Expected: Error "Số tiền VND phải > 0"

// Test: Zero exchange rate
{ currency: 'USD', foreignAmount: 500, exchangeRate: 0 }
// Expected: Error "Số tiền ngoại tệ và tỷ giá phải > 0"

// Test: Very large amount
{ currency: 'VND', amountVND: 999999999999999 }
// Expected: Decimal(15,0) should handle this
```

#### Lock/Unlock Edge Cases

```typescript
// Test: Lock already locked
POST /api/revenues/<locked-id>/lock
// Expected: { success: false, error: "Thu nhập đã được khóa" }

// Test: Unlock already unlocked
POST /api/revenues/<unlocked-id>/unlock
// Expected: { success: false, error: "Thu nhập chưa được khóa" }

// Test: Delete locked revenue
DELETE /api/revenues/<locked-id>
// Expected: { success: false, error: "Thu nhập đã khóa, không thể xóa" }
```

---

## Polish Checklist

### Vietnamese Text Verification

- [ ] All form labels in Vietnamese
- [ ] All error messages in Vietnamese
- [ ] All button text in Vietnamese
- [ ] All placeholder text in Vietnamese
- [ ] All toast messages in Vietnamese

### UI Polish

- [ ] Loading states show properly
- [ ] Empty states show properly
- [ ] Error states show properly
- [ ] Currency formatting uses vi-VN locale
- [ ] Date formatting uses formatDate utility
- [ ] Icons are consistent (lucide-react)
- [ ] Colors match existing theme

### Accessibility

- [ ] Form inputs have labels
- [ ] Buttons have visible text or aria-labels
- [ ] Focus states work properly
- [ ] Tab order is logical

---

## Test Data Cleanup

After testing, clean up test data:

```sql
-- Delete test revenues (be careful in production!)
DELETE FROM revenues WHERE notes LIKE '%TEST%';
```

Or use Prisma Studio:
```bash
npx prisma studio
```

---

## Success Criteria

- [ ] All API tests pass
- [ ] All currency conversion tests pass
- [ ] All UI component tests pass
- [ ] All integration tests pass
- [ ] All edge cases handled
- [ ] Vietnamese text throughout
- [ ] No console errors in browser
- [ ] No TypeScript errors

---

## Known Limitations (Document for Future)

1. **No Revenue History**: Unlike Operator, Revenue does not have a history table for audit trail. Add later if needed.

2. **Permission Checks Placeholder**: Lock/unlock routes have TODO comments for permission checking. Will be enforced when auth middleware is added.

3. **No Batch Operations**: Cannot lock/unlock multiple revenues at once. Add later if needed.

4. **Exchange Rate Manual**: User must input exchange rate manually. Could integrate with exchange rate API later.
