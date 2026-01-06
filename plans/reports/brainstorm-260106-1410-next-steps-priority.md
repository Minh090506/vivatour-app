# Brainstorm Report: Next Steps Priority Order
**Date**: 2026-01-06 | **Status**: Agreed

---

## Context

User completed core modules (Supplier, Operator, Request, Revenue, Auth/RBAC) and asked about next steps for:
1. Google Sheet Sync
2. Testing & QA
3. AI Assistant Integration
4. Deployment

## User Profile

- **Data volume**: 1000-5000 rows, 10-50 new rows/day
- **Testing experience**: Solo developer, no automated testing experience
- **Budget**: < $50/month
- **Sheet structure**: Request + Operator + Revenue (matches schema)
- **Email**: Gmail (Google Workspace) - can use Gmail API

---

## Evaluated Options

### Option 1: Google Sheet Sync (Append-only)

**Approach**: Scheduled sync với row index tracking
- Cron job 15-30 min (hoặc manual trigger)
- Track bằng `sheetRowIndex` (đã có trong schema)
- Upsert by unique key, không xóa data cũ

**Pros**: Simple, predictable, sheet vẫn dùng được
**Cons**: Near-realtime khó, manual input vẫn cần trên Sheet

### Option 2: Testing Strategy (Solo Dev)

**Approach**: Manual checklist + Error logging
- Testing checklist per module (markdown)
- Error boundary + Sentry/LogRocket logging
- Seed data script for test users/data

**Pros**: Realistic for solo dev, quick to implement
**Cons**: Not automated, relies on discipline

### Option 3: AI Assistant Integration

**Approach**: Phased implementation
- Phase A: Knowledge Base import từ Internal_Knowledge sheet
- Phase B: Claude API chat integration
- Phase C: Gmail integration (later, complex OAuth)

**Pros**: High user value, data already exists
**Cons**: Gmail OAuth complex, AI costs

### Option 4: Deployment

**Stack**: Vercel + Supabase (< $50/month or free tier)
- Vercel Pro $20 or Free
- Supabase Pro $25 or Free (500MB limit)

**Checklist**: ENV vars, security hardening, DB migration, domain

---

## Agreed Solution: Priority Order

| Priority | Task | Effort | Rationale |
|----------|------|--------|-----------|
| 1 | Testing Checklist + Seed Data | 2-3h | Foundation for quality |
| 2 | Google Sheet Sync (basic) | 4-6h | Core business value |
| 3 | Deploy to Vercel Free | 1-2h | Real usage validation |
| 4 | Knowledge Base Import | 2-3h | AI foundation |
| 5 | AI Chat Integration | 3-4h | User experience |

---

## Implementation Considerations

### Testing Phase
- Create markdown checklist for each module
- Seed script for ADMIN, SELLER, ACCOUNTANT, OPERATOR users
- Basic error logging setup

### Sync Phase
- Google Sheets API v4 với Service Account
- API route: `/api/sync/sheets`
- Manual trigger button (Vercel cron limited on free tier)
- SyncLog for audit trail

### Deploy Phase
- Start với Vercel Free + Supabase Free
- Upgrade khi traffic grows
- Custom domain optional

### AI Phase
- Import Internal_Knowledge → KnowledgeItem table
- Simple keyword search (no embeddings initially)
- Claude API integration for chat widget

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Sheet sync conflicts | Upsert by unique key, log conflicts |
| No automated tests | Comprehensive checklist, error logging |
| Budget overrun | Start free tier, monitor usage |
| Gmail OAuth complexity | Defer to Phase C, manual email for now |

---

## Next Steps

1. Create detailed implementation plan cho priority order
2. Start with Phase 1: Testing checklist + Seed data
3. Proceed sequentially through phases

---

## Unresolved Questions

- Exact column mapping cho Google Sheet → DB?
- Custom domain cần hay không?
- AI token budget monthly?
