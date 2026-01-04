# Request Module Redesign - Implementation Plan

**Created:** 2026-01-04
**Session:** 260104-1333
**Status:** Ready for Implementation
**Brainstorming Report:** `plans/reports/brainstorm-260104-1333-request-module-redesign.md`

---

## Overview

Redesign Request module with 2-panel layout (list + details) and SellerConfig extension.

### Requirements
1. ~~Vietnamese localization~~ ✅ Already done
2. SellerConfig extension (add `sellerName`, update booking code fallback)
3. 2-Panel UI layout with inline services editing

### Key Decisions (from Brainstorming)
| Aspect | Decision |
|--------|----------|
| Panel behavior | Selection-triggered (right panel empty until click) |
| Edit pattern | Inline table editing for services |
| List columns | Minimal (RQID/BookingCode, Customer, Status) |
| Page strategy | Replace existing /requests page |
| State | URL-based (?id=xxx) |
| Seller fallback | Use first letter of seller name if no sellerCode |

---

## Architecture

### File Structure Changes

```
src/
├── app/(dashboard)/requests/
│   ├── page.tsx              # REPLACE: 2-panel layout
│   ├── [id]/page.tsx         # KEEP: Redirect to /requests?id={id}
│   └── create/page.tsx       # KEEP: Create form
├── components/requests/
│   ├── index.ts              # UPDATE: Export new components
│   ├── request-table.tsx     # KEEP (fallback)
│   ├── request-filters.tsx   # KEEP (adapt for panel)
│   ├── request-form.tsx      # KEEP
│   ├── request-status-badge.tsx # KEEP
│   ├── request-list-panel.tsx    # NEW: Left panel with list
│   ├── request-list-item.tsx     # NEW: List item component
│   ├── request-detail-panel.tsx  # NEW: Right panel with details
│   └── request-services-table.tsx # NEW: Inline editable services
├── lib/
│   └── request-utils.ts      # UPDATE: Fallback booking code logic
└── prisma/
    └── schema.prisma         # UPDATE: ConfigUser.sellerName
```

### Component Hierarchy

```
RequestsPage (2-panel layout)
├── Header (title + add button)
├── RequestFilters (horizontal bar)
└── PanelContainer (flex)
    ├── RequestListPanel (w-[350px])
    │   ├── Search input
    │   └── ScrollArea
    │       └── RequestListItem[] (clickable)
    └── RequestDetailPanel (flex-1)
        ├── EmptyState (when no selection)
        └── Content (when selected)
            ├── Header (RQID + status + edit)
            ├── CustomerInfoCard
            ├── TourInfoCard
            ├── RequestServicesTable (inline edit)
            └── NotesSection
```

---

## Phases

### Phase 1: Schema & Utils Update
**Status:** ✅ DONE (2026-01-04)
**Files:** `prisma/schema.prisma`, `src/lib/request-utils.ts`, migration

### Phase 2: New Components
**Files:** `request-list-panel.tsx`, `request-list-item.tsx`, `request-detail-panel.tsx`

### Phase 3: 2-Panel Page Layout
**Files:** `src/app/(dashboard)/requests/page.tsx`

### Phase 4: Inline Services Table
**Files:** `request-services-table.tsx`, API updates

### Phase 5: Integration & Testing
**Files:** Polish, responsive behavior, testing

---

## Detailed Phase Files

- [Phase 1: Schema & Utils](./phase-01-schema-utils.md)
- [Phase 2: New Components](./phase-02-new-components.md)
- [Phase 3: 2-Panel Layout](./phase-03-panel-layout.md)
- [Phase 4: Services Table](./phase-04-services-table.md)
- [Phase 5: Integration](./phase-05-integration.md)

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Seller code collision | Validate uniqueness, show warning on duplicate initials |
| Large operator lists | Lazy-load, limit to 50 per page |
| URL state mismatch | Handle 404, clear selection |
| Inline edit complexity | Use controlled inputs, simple state |

---

## Success Criteria

- [x] ConfigUser has sellerName field ✅
- [x] Booking code uses seller initial fallback ✅
- [ ] 2-panel layout renders correctly
- [ ] List item shows RQID/BookingCode, customer, status
- [ ] Right panel shows details on selection
- [ ] Inline services table allows add/edit/delete
- [ ] URL reflects selected request (?id=xxx)
- [ ] Responsive on tablet (narrower panel)
