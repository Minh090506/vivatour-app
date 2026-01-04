# Brainstorming Report: Request Module Redesign

**Date:** 2026-01-04
**Session:** 260104-1333
**Status:** Approved for Implementation

---

## Problem Statement

Redesign Request module with 3 requirements:
1. Vietnamese localization for navigation
2. Seller configuration for Booking ID generation
3. 2-Panel UI layout similar to Operator module

---

## Requirements Analysis

### Requirement 1: Vietnamese Localization

**Status:** Already implemented ✅

Current `Header.tsx` navigation:
```javascript
{ name: 'Yêu cầu', href: '/requests' }
```

No changes needed - navigation already uses Vietnamese terminology.

---

### Requirement 2: SellerConfig Extension

**Decision:** Extend existing `ConfigUser` table (not create new table)

**Current Schema:**
```prisma
model ConfigUser {
  id          String   @id @default(uuid())
  userId      String   @unique
  sellerCode  String   // L, N, T (single char)
  canViewAll  Boolean  @default(false)
}
```

**Proposed Change:**
```prisma
model ConfigUser {
  id          String   @id @default(uuid())
  userId      String   @unique
  sellerCode  String?  // Make optional, fallback to name initial
  sellerName  String?  // Display name for reports/UI
  canViewAll  Boolean  @default(false)
}
```

**Booking Code Generation Logic:**
1. Check `sellerCode` from ConfigUser
2. If null → use first letter of seller's name (uppercase)
3. Pattern: `YYYYMMDD{code}XXXX` (e.g., `20260201L0005`)

**File Changes:**
- `prisma/schema.prisma` - Add sellerName field
- `src/lib/request-utils.ts` - Update generateBookingCode() fallback logic

---

### Requirement 3: 2-Panel Layout

**Design Decisions:**

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Panel behavior | Selection-triggered | Right panel empty until user clicks request |
| Edit pattern | Inline table editing | Faster workflow, fewer modal interruptions |
| List columns | Minimal | RQID/BookingCode, Customer, Status badge only |
| Page strategy | Replace existing | Single /requests page with 2-panel layout |
| State management | URL-based (?id=xxx) | Deep-linking, browser back works |

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Yêu cầu" + Filters + "Thêm yêu cầu" button         │
├──────────────────────┬──────────────────────────────────────┤
│ LEFT (w-[350px])     │ RIGHT (flex-1)                       │
│                      │                                      │
│ ┌──────────────────┐ │ Empty: "Chọn yêu cầu từ danh sách"   │
│ │ Search + Filters │ │                                      │
│ ├──────────────────┤ │ Selected:                            │
│ │ Request List     │ │ ┌────────────────────────────────┐  │
│ │ - RQID           │ │ │ Header + Status + Edit button  │  │
│ │ - Customer       │ │ ├────────────────────────────────┤  │
│ │ - Status badge   │ │ │ Customer Info Card             │  │
│ └──────────────────┘ │ ├────────────────────────────────┤  │
│                      │ │ Tour Info Card                 │  │
│ Scrollable list      │ ├────────────────────────────────┤  │
│                      │ │ Services Table (inline edit)   │  │
│                      │ │ + Add Service row              │  │
│                      │ ├────────────────────────────────┤  │
│                      │ │ Notes + History                │  │
│                      │ └────────────────────────────────┘  │
└──────────────────────┴──────────────────────────────────────┘
```

**Reusable Components from Operator Module:**

| Component | Reuse Strategy |
|-----------|----------------|
| `OperatorHistoryPanel` | Direct reuse - generic audit trail |
| Filter pattern | Adapt structure, different fields |
| Card layouts | Same pattern, different content |
| Lock indicator | Future use if requests need locking |

---

## Technical Decisions

### Left Panel List Item Design

```
┌─────────────────────────────────┐
│ RQ-260104-0001           ● LEAD │  <- RQID + Status badge
│ John Doe                    🔔  │  <- Customer + Follow-up indicator
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 20260201L0005          ● BOOKING│  <- BookingCode + Status
│ Jane Smith                      │  <- Customer
└─────────────────────────────────┘
```

### Services Table (Inline Editing)

| Ngày | Loại | Tên DV | NCC | Chi phí | Thao tác |
|------|------|--------|-----|---------|----------|
| 02/01 | Hotel | Sheraton | NCC001 | 5,000,000 | Edit/Delete |
| 03/01 | Transport | Bus | NCC002 | 1,200,000 | Edit/Delete |
| + Thêm dịch vụ | | | | | |

- Inline editing: Click row → editable fields appear
- Add row: Click "+ Thêm dịch vụ" → new editable row
- Save/Cancel buttons appear during edit mode

### Responsive Behavior

- **Desktop (lg+):** Side-by-side panels
- **Tablet (md):** Narrower left panel (280px)
- **Mobile (sm):** Left panel as slide-out drawer

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Seller code collision | Medium | Validate uniqueness on save, show warning |
| Large operator lists | Low | Lazy-load services, paginate if >50 |
| URL state mismatch | Low | Handle 404 gracefully, clear selection |
| Inline edit complexity | Medium | Use React Hook Form with fieldArray |

---

## Success Metrics

1. **Usability:** Users can view/edit request + services without page navigation
2. **Performance:** List loads <500ms, details load <300ms
3. **Consistency:** UI matches Operator module patterns
4. **Completion:** All 3 requirements implemented and tested

---

## Next Steps

1. Create detailed implementation plan with phases
2. Schema migration for ConfigUser.sellerName
3. Build 2-panel layout components
4. Integrate inline services editing
5. Test and deploy

---

## Unresolved Questions

None - all decisions confirmed during brainstorming session.
