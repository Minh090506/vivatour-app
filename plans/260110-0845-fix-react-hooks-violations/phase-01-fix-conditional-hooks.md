# Phase 01: Fix Conditional Hooks

## Context
- Parent: [plan.md](./plan.md)
- Priority: P0 (Production blocker)
- Status: ⏳ Pending

## Overview

**File**: `src/app/(dashboard)/requests/[id]/edit/page.tsx`

**Issue**: React Hooks called conditionally after early return (lines 30-32)

```tsx
// PROBLEM: Early return before hooks
if (!id) {
  router.replace('/requests');
  return null;  // ← Hooks below this won't always run
}

const [request, setRequest] = useState<Request | null>(null);  // ← Violation!
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

**Root Cause**: React requires hooks to be called in the same order every render. Early returns break this rule.

## Solution

Move ALL hooks to top of component, before any conditional logic:

```tsx
export default function RequestEditPage() {
  const router = useRouter();
  const params = useParams();

  // ALL hooks FIRST
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Safe params validation
  const rawId = params.id;
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  // useEffect for redirect (instead of early return)
  useEffect(() => {
    if (!id) {
      router.replace('/requests');
    }
  }, [id, router]);

  // ... rest of component

  // Conditional renders at END (after all hooks)
  if (!id) return null;
  if (loading) return <Loading />;
}
```

## Implementation Steps

1. Move useState declarations to line 20-22 (before id validation)
2. Convert early `router.replace` to useEffect
3. Keep conditional renders at bottom (after all hooks)
4. Test: Verify component still works

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/(dashboard)/requests/[id]/edit/page.tsx` | Reorder hooks, add redirect useEffect |

## Success Criteria

- [ ] No "hooks called conditionally" error
- [ ] Component still redirects on invalid ID
- [ ] Edit functionality preserved

## Risk Assessment

**Low risk**: Simple reordering, no logic changes.
