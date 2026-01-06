---
title: "MVP Completion - Testing, Sync, Deploy, AI"
description: "Complete MVP with testing infrastructure, Google Sheets sync, deployment, and AI assistant"
status: in_progress
priority: P0
effort: 14-18h total
branch: master
tags: [testing, sync, deploy, ai, mvp]
created: 2026-01-06
---

# MVP Completion Plan

## Overview

Complete the MVP with 5 phases: Testing infrastructure, Google Sheets sync, Vercel deployment, Knowledge Base import, and AI Chat integration.

## Context

- **Data volume**: 1000-5000 rows, 10-50 new/day
- **Developer**: Solo, no automated testing experience
- **Budget**: < $50/month (Vercel + Supabase)
- **Sheet structure**: Request + Operator + Revenue + Internal_Knowledge
- **Email**: Gmail (Google Workspace)

## Phases

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| [Phase 01](./phase-01-testing-seed-data.md) | Testing Checklist + Seed Data | 2-3h | ✅ done |
| [Phase 02](./phase-02-google-sheets-sync.md) | Google Sheets Sync (append-only) | 4-6h | pending |
| [Phase 03](./phase-03-vercel-deployment.md) | Deploy to Vercel Free | 1-2h | pending |
| [Phase 04](./phase-04-knowledge-base-import.md) | Knowledge Base Import | 2-3h | pending |
| [Phase 05](./phase-05-ai-chat-integration.md) | AI Chat Integration | 3-4h | pending |

## Key Files

**Existing:**
- `prisma/schema.prisma` - SyncLog, KnowledgeItem models ready
- `src/components/layout/AIAssistant.tsx` - UI widget (placeholder)
- `src/lib/permissions.ts` - RBAC system

**Created (Phase 01):**
- `prisma/seed.ts` - Seed script with test users
- `docs/testing-checklist.md` - Manual QA checklist
- `src/lib/logger.ts` - Error logging utility

**To Create:**
- `src/lib/google-sheets.ts` - Sheets API client
- `src/app/api/sync/sheets/route.ts` - Sync endpoint
- `src/app/api/ai/chat/route.ts` - AI endpoint
- `src/lib/knowledge-search.ts` - Knowledge search

## Dependencies

- Google Cloud Service Account (for Sheets API)
- Vercel account
- Supabase production DB
- ANTHROPIC_API_KEY (already in stack)

## Success Criteria

1. Test users exist for all 4 roles
2. Google Sheets data synced to DB (append-only)
3. App deployed and accessible
4. Knowledge Base searchable
5. AI Assistant responds with knowledge context

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Sheet sync conflicts | Upsert by unique key |
| No automated tests | Manual checklist + error logging |
| Budget overrun | Start free tier |
| AI cost | Limit token usage |
