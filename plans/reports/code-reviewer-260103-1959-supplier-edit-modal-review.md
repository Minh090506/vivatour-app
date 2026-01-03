# Code Review: Supplier Edit Modal & Integration

**Reviewer:** code-reviewer
**Date:** 2026-01-03 19:59
**Scope:** New edit modal component and integration into supplier detail page

---

## Summary

Reviewed 3 files implementing edit supplier functionality via modal dialog. Overall code quality is **good** with consistent patterns, proper TypeScript usage, and security best practices. Found **1 high-priority** issue (eslint violation) and **several medium-priority** improvements.

**Build Status:** ✅ Passes
**TypeScript:** ✅ No errors
**Linting:** ⚠️ 1 violation in supplier detail page

---

## Files Reviewed

1. `src/components/suppliers/edit-supplier-modal.tsx` (330 lines) - New
2. `src/app/(dashboard)/suppliers/[id]/page.tsx` (236 lines) - Modified
3. `src/app/layout.tsx` (37 lines) - Modified (Toaster added)

---

## Critical Issues

**None found** ✅

---

## High Priority Findings

### H1: React Hooks ESLint Violation - setState in Effect

**File:** `src/app/(dashboard)/suppliers/[id]/page.tsx:31`
**Severity:** High
**Category:** Performance / Best Practice

```typescript
// Current - PROBLEMATIC
useEffect(() => {
  fetchSupplier();
}, [id]);
```

The `fetchSupplier` function contains `setLoading(false)` which triggers setState synchronously within effect, causing cascading renders.

**Impact:** Performance degradation, potential infinite render loops

**Fix:**
```typescript
// Option 1: Use dependency array properly
useEffect(() => {
  let cancelled = false;

  const loadSupplier = async () => {
    const res = await fetch(`/api/suppliers/${id}`);
    const data = await res.json();
    if (!cancelled && data.success) {
      setSupplier(data.data);
      setLoading(false);
    }
  };

  loadSupplier();
  return () => { cancelled = true; };
}, [id]);

// Option 2: Move fetchSupplier definition inside useEffect
useEffect(() => {
  const fetchSupplier = async () => {
    const res = await fetch(`/api/suppliers/${id}`);
    const data = await res.json();
    if (data.success) {
      setSupplier(data.data);
    }
    setLoading(false);
  };

  fetchSupplier();
}, [id]);
```

---

## Medium Priority Improvements

### M1: Missing Input Validation - parseInt Without Radix

**Files:** `edit-supplier-modal.tsx:102-103`, `supplier-form.tsx:119-120`
**Severity:** Medium
**Category:** Code Quality

```typescript
// Current - Missing radix parameter
creditLimit: formData.creditLimit ? parseInt(formData.creditLimit) : null,
paymentTermDays: formData.paymentTermDays ? parseInt(formData.paymentTermDays) : null,
```

**Risk:** Radix defaults to 10 in modern JS, but explicit is safer

**Fix:**
```typescript
creditLimit: formData.creditLimit ? parseInt(formData.creditLimit, 10) : null,
paymentTermDays: formData.paymentTermDays ? parseInt(formData.paymentTermDays, 10) : null,
```

### M2: No Input Sanitization for XSS Prevention

**File:** `edit-supplier-modal.tsx:98-109`
**Severity:** Medium
**Category:** Security

While `.trim()` is used, no HTML escaping for text fields sent to API. React auto-escapes JSX rendering, but API layer accepts raw strings.

**Current Protection:**
- ✅ React auto-escapes in JSX rendering
- ✅ `.trim()` removes whitespace
- ❌ No HTML entity encoding at API layer

**Risk:** Low-Medium (depends on how data is used server-side or in reports)

**Recommendation:**
If supplier data appears in generated HTML reports/emails, add server-side sanitization:
```typescript
import DOMPurify from 'isomorphic-dompurify';
// In API route
name: DOMPurify.sanitize(body.name.trim())
```

**Note:** Not critical if data only shown via React components (current state).

### M3: Missing Email Validation

**File:** `edit-supplier-modal.tsx:269-274`
**Severity:** Medium
**Category:** Data Integrity

```typescript
<Input
  id="contactEmail"
  type="email"  // HTML5 validation only
  value={formData.contactEmail}
  ...
/>
```

HTML5 `type="email"` provides basic validation, but inconsistent across browsers and bypassable.

**Fix:** Add Zod schema validation (like other forms in codebase):
```typescript
import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().min(1, 'Tên NCC không được để trống'),
  type: z.string().min(1, 'Vui lòng chọn loại NCC'),
  contactEmail: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  // ... other fields
});
```

### M4: useEffect Dependency Lint Warning

**File:** `edit-supplier-modal.tsx:65-69`
**Severity:** Medium
**Category:** Code Quality

```typescript
useEffect(() => {
  if (open) {
    setFormData(getInitialFormData());
  }
}, [open, supplier]); // ⚠️ Missing getInitialFormData in deps
```

**Issue:** `getInitialFormData()` depends on `supplier` prop, but function reference not in deps array.

**Fix:**
```typescript
// Option 1: Move function inside useEffect
useEffect(() => {
  if (open) {
    setFormData({
      name: supplier.name,
      type: supplier.type,
      // ... rest of fields
    });
  }
}, [open, supplier]);

// Option 2: Use useCallback
const getInitialFormData = useCallback((): FormData => ({
  name: supplier.name,
  type: supplier.type,
  // ...
}), [supplier]);

useEffect(() => {
  if (open) setFormData(getInitialFormData());
}, [open, getInitialFormData]);
```

### M5: Inconsistent Error Handling

**File:** `edit-supplier-modal.tsx:123`
**Severity:** Medium
**Category:** User Experience

```typescript
} catch {
  toast.error('Có lỗi xảy ra khi lưu dữ liệu');
}
```

Generic error message doesn't help user understand what went wrong (network issue, validation error, etc.).

**Fix:**
```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi lưu dữ liệu';
  console.error('Failed to update supplier:', error);
  toast.error(message);
}
```

### M6: Missing API Error Response Handling

**File:** `edit-supplier-modal.tsx:113-118`
**Severity:** Medium
**Category:** Error Handling

```typescript
const data = await res.json();

if (!data.success) {
  toast.error(data.error || 'Có lỗi xảy ra');
  return; // ⚠️ Doesn't set loading to false on API error
}
```

**Issue:** Loading state stuck as `true` if API returns `success: false`

**Fix:**
```typescript
const data = await res.json();

if (!data.success) {
  toast.error(data.error || 'Có lỗi xảy ra');
  setLoading(false); // Add this
  return;
}
```

---

## Low Priority Suggestions

### L1: Component Readability - Extract Location Logic

**File:** `edit-supplier-modal.tsx:71-73`
**Severity:** Low
**Category:** Code Organization

Complex location check logic repeated. Extract to helper:

```typescript
const isCustomLocation = useMemo(() => {
  return formData.location === CUSTOM_LOCATION ||
    (formData.location && !(formData.location in SUPPLIER_LOCATIONS));
}, [formData.location]);
```

### L2: Accessibility - Missing ARIA Labels

**File:** `edit-supplier-modal.tsx` (multiple locations)
**Severity:** Low
**Category:** Accessibility

Select components lack `aria-label` for screen readers when placeholder is used.

**Fix:**
```typescript
<Select
  value={formData.type}
  onValueChange={(v) => updateField('type', v)}
  aria-label="Loại nhà cung cấp"
>
```

### L3: Magic Numbers in Styling

**File:** Various
**Severity:** Low
**Category:** Maintainability

```typescript
className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
```

Consider extracting to Tailwind config for reusability:
```typescript
// tailwind.config.ts
theme: {
  extend: {
    maxWidth: {
      'modal-lg': '600px',
    },
  },
}
```

---

## Positive Observations

✅ **Excellent TypeScript Usage**
- Proper interface definitions (`EditSupplierModalProps`, `FormData`)
- Correct type assertions (`PaymentModel`, `keyof FormData`)
- No `any` types

✅ **Security Best Practices**
- Input trimming before submission (`.trim()`)
- XSS protection via React (JSX auto-escaping)
- No SQL injection risks (using Prisma ORM)
- CSRF protection inherited from Next.js

✅ **Consistent with Codebase Patterns**
- Follows naming conventions (kebab-case files, PascalCase exports)
- Uses shadcn/ui components consistently
- Matches existing form patterns (`supplier-form.tsx`)
- Proper error handling with toast notifications

✅ **Good Component Structure**
- Clear separation of concerns
- Proper state management
- Clean props interface
- Logical field grouping in UI

✅ **API Integration**
- Follows API response format (`{ success, data, error }`)
- Proper HTTP methods (PUT for updates)
- Error responses handled
- Loading states managed

✅ **UI/UX Quality**
- Conditional rendering for payment model fields
- Disabled submit button during loading
- Responsive grid layout
- Proper form reset on modal open

---

## Security Audit

### ✅ Passed Checks

1. **XSS Protection:** React auto-escapes, `.trim()` used
2. **SQL Injection:** Prisma parameterized queries
3. **CSRF:** Next.js built-in protection
4. **Input Validation:** Client-side validation present
5. **No Secrets Exposed:** No API keys, credentials in code
6. **Type Safety:** Full TypeScript enforcement

### ⚠️ Recommendations

1. Add server-side validation in API route (currently client-only)
2. Consider rate limiting on `/api/suppliers/[id]` PUT endpoint
3. Add input length limits to prevent DOS via large payloads

---

## Performance Analysis

### Current State
- ✅ No expensive re-renders (proper state management)
- ✅ Dialog lazy-loaded (only renders when open)
- ✅ No unnecessary API calls
- ⚠️ `useEffect` dependency warning (see M4)

### Optimization Opportunities
1. Memoize `isCustomLocation` calculation (low impact)
2. Debounce validation if real-time validation added (not currently needed)

---

## Testing Coverage

**Current State:** No tests found for `edit-supplier-modal.tsx`

**Recommended Test Cases:**
```typescript
describe('EditSupplierModal', () => {
  it('should populate form with supplier data on open', () => {});
  it('should validate required fields before submit', () => {});
  it('should show loading state during submission', () => {});
  it('should call onSuccess callback after successful update', () => {});
  it('should display error toast on API failure', () => {});
  it('should reset form when modal reopens', () => {});
  it('should handle conditional credit fields based on payment model', () => {});
});
```

---

## Recommended Actions

**Priority Order:**

1. **[HIGH]** Fix `useEffect` setState warning in `suppliers/[id]/page.tsx` (H1)
2. **[MEDIUM]** Add `setLoading(false)` in error handler (M6)
3. **[MEDIUM]** Fix `useEffect` dependency warning (M4)
4. **[MEDIUM]** Add radix parameter to `parseInt()` calls (M1)
5. **[LOW]** Add Zod validation schema (M3)
6. **[LOW]** Improve error messages (M5)
7. **[LOW]** Add unit tests for new component

**Immediate Fix (Copy-Paste Ready):**

For `src/app/(dashboard)/suppliers/[id]/page.tsx`:
```typescript
// Replace lines 21-28 with:
useEffect(() => {
  const fetchSupplier = async () => {
    const res = await fetch(`/api/suppliers/${id}`);
    const data = await res.json();
    if (data.success) {
      setSupplier(data.data);
    }
    setLoading(false);
  };

  fetchSupplier();
}, [id]);
```

For `src/components/suppliers/edit-supplier-modal.tsx`:
```typescript
// Line 115: Add setLoading(false) before return
if (!data.success) {
  toast.error(data.error || 'Có lỗi xảy ra');
  setLoading(false); // ← Add this
  return;
}

// Lines 102-103: Add radix
creditLimit: formData.creditLimit ? parseInt(formData.creditLimit, 10) : null,
paymentTermDays: formData.paymentTermDays ? parseInt(formData.paymentTermDays, 10) : null,
```

---

## Metrics

| Metric | Value | Status |
|--------|-------|--------|
| TypeScript Errors | 0 | ✅ Pass |
| Build Status | Success | ✅ Pass |
| ESLint Errors | 1 | ⚠️ Needs Fix |
| Security Issues | 0 critical | ✅ Pass |
| Code Duplication | Low | ✅ Good |
| Naming Conventions | Consistent | ✅ Pass |
| Test Coverage | 0% (new code) | ❌ Missing |

---

## Conclusion

Code quality is **good** with minor improvements needed. The implementation follows project standards, uses proper TypeScript, and maintains consistency with existing patterns. **Primary concern is the ESLint violation causing potential performance issues.** Recommend addressing high/medium priority items before merging.

**Approval Status:** ✅ **Approved with minor fixes required**

---

## Unresolved Questions

1. Should we implement Zod validation for edit modal to match create form pattern?
2. Do supplier contact details appear in any server-rendered HTML reports requiring DOMPurify sanitization?
3. What is the expected behavior if user edits supplier while modal is open and supplier data changes externally?
