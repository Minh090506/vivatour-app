# Brainstorm Report: UI & Workflow Redesign

**Date**: 2026-01-05
**Session**: UI 2-3 Panel + Complete Workflow Architecture

---

## 1. Problem Statement

Cần thiết kế lại giao diện và workflow hoàn chỉnh cho MyVivaTour platform với:
- Giao diện 2-3 panel chuyên nghiệp cho Request, Operator, Revenue
- Phân quyền rõ ràng cho 4 roles: Admin, Seller, Operator, Accountant
- Workflow xuyên suốt từ Request → Booking → Operator → Payment → Accounting
- AI hỗ trợ cơ bản (nhắc việc, chat hỏi đáp)
- Dashboard KPIs cho Admin

---

## 2. Key Decisions Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| UI Layout | Master-Detail + Slide-in panel | Hiện đại, tiết kiệm không gian, UX tốt |
| Authentication | Email/Password | Đơn giản, đủ cho 15+ users nội bộ |
| Data Access | Xem hết, sửa của mình | Minh bạch, collaboration tốt |
| Booking Handoff | First-come-first-claim | Công bằng, tránh duplicate work |
| AI Scope | Basic (reminders + chat) | Khả thi ngay, phức tạp tăng dần |
| Expense Module | Tách biệt với Operator | Rõ ràng, không overlap |
| Dashboard | Full KPIs + Seller perf | Visibility toàn diện cho Admin |

---

## 3. Role-Based Access Matrix

### 3.1 Module Access

| Module | Admin | Seller | Operator | Accountant |
|--------|-------|--------|----------|------------|
| Dashboard | Full | Limited | Limited | Limited |
| Request | Full | CRUD own | View only | View only |
| Operator | Full | View only | CRUD assigned | View + Approve |
| Revenue | Full | View own | View only | CRUD |
| Supplier | Full | View | View | View + Transactions |
| Expense | Full | — | — | CRUD |
| Settings | Full | — | — | — |
| Reports | Full | Own stats | Own stats | Financial |

### 3.2 Action Permissions

| Action | Admin | Seller | Operator | Accountant |
|--------|-------|--------|----------|------------|
| Create Request | ✅ | ✅ | ❌ | ❌ |
| Change Status→BOOKING | ✅ | ✅ (own) | ❌ | ❌ |
| Claim Booking | ✅ | ❌ | ✅ | ❌ |
| Add Service (Operator) | ✅ | ❌ | ✅ (claimed) | ❌ |
| Lock Payment | ✅ | ❌ | ❌ | ✅ |
| Approve Payment | ✅ | ❌ | ❌ | ✅ |
| Add Revenue | ✅ | ❌ | ❌ | ✅ |
| Add Expense | ✅ | ❌ | ❌ | ✅ |
| View All Requests | ✅ | ✅ | ✅ | ✅ |
| Edit Any Request | ✅ | ❌ (own only) | ❌ | ❌ |

---

## 4. UI Architecture

### 4.1 Master-Detail Layout Pattern

```
┌────────────────────────────────────────────────────────────────┐
│ HEADER: Navigation + User Menu + Notifications                 │
├─────────────────────┬──────────────────────────────────────────┤
│                     │                                          │
│   LIST PANEL        │     DETAIL PANEL (Slide-in)              │
│   (40% width)       │     (60% width)                          │
│                     │                                          │
│   ┌─────────────┐   │     ┌────────────────────────────────┐   │
│   │ Filters     │   │     │ Header + Actions               │   │
│   ├─────────────┤   │     ├────────────────────────────────┤   │
│   │ Search      │   │     │                                │   │
│   ├─────────────┤   │     │ TAB 1 │ TAB 2 │ TAB 3          │   │
│   │             │   │     │                                │   │
│   │ Item 1      │──▶│     │ Main Content Area              │   │
│   │ Item 2      │   │     │ - Info fields                  │   │
│   │ Item 3      │   │     │ - Sub-tables                   │   │
│   │ ...         │   │     │ - Actions                      │   │
│   │             │   │     │                                │   │
│   └─────────────┘   │     └────────────────────────────────┘   │
│                     │                                          │
│   Pagination        │     Footer Actions                       │
└─────────────────────┴──────────────────────────────────────────┘
```

### 4.2 Responsive Behavior

| Screen Size | Behavior |
|-------------|----------|
| Desktop (>1200px) | 2-panel side-by-side, 40-60 split |
| Tablet (768-1200px) | List full → Detail slides over |
| Mobile (<768px) | List full → Detail full screen |

### 4.3 Shared Components

```
src/components/
├── layouts/
│   ├── MasterDetailLayout.tsx      # Shared 2-panel container
│   ├── SlideInPanel.tsx            # Reusable slide-in panel
│   └── ContentHeader.tsx           # Page header with actions
├── list/
│   ├── ListContainer.tsx           # Generic list wrapper
│   ├── ListFilters.tsx             # Filter bar component
│   ├── ListItem.tsx                # Base list item
│   └── ListPagination.tsx          # Pagination controls
├── detail/
│   ├── DetailPanel.tsx             # Detail container
│   ├── DetailHeader.tsx            # Title + status + actions
│   ├── DetailTabs.tsx              # Tab navigation
│   └── DetailSection.tsx           # Collapsible section
└── common/
    ├── StatusBadge.tsx             # Unified status display
    ├── RoleBadge.tsx               # User role badge
    └── ClaimButton.tsx             # Operator claim action
```

---

## 5. Workflow Architecture

### 5.1 Request Lifecycle

```
                    ┌─────────────┐
                    │  NEW LEAD   │
                    │ (Seller)    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │  QUOTE  │  │FOLLOWUP │  │  LOST   │
        │(Seller) │  │(Seller) │  │(Seller) │
        └────┬────┘  └────┬────┘  └─────────┘
             │            │
             └─────┬──────┘
                   ▼
            ┌─────────────┐
            │   BOOKING   │──── Generate BookingCode
            │  (Seller)   │──── Notify Operators
            └──────┬──────┘
                   │
                   ▼
            ┌─────────────┐
            │   CLAIMED   │ ◀── Operator claims
            │ (Operator)  │
            └──────┬──────┘
                   │
                   ▼
            ┌─────────────┐
            │ PROCESSING  │──── Add services
            │ (Operator)  │──── Track suppliers
            └──────┬──────┘
                   │
                   ▼
            ┌─────────────┐
            │  COMPLETED  │
            │  (System)   │
            └─────────────┘
```

### 5.2 Payment Approval Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   OPERATOR   │───▶│  ACCOUNTANT  │───▶│   LOCKED     │
│   Submits    │    │  Approves    │    │   Payment    │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   SUPPLIER   │
                    │   Balance    │
                    │   Updated    │
                    └──────────────┘
```

### 5.3 Daily Workflow per Role

**Seller (08:00-17:00)**:
1. Check Dashboard → Follow-up reminders
2. Process new requests from Email/Meta (AI assisted)
3. Update request statuses
4. Convert qualified leads to BOOKING
5. Review AI suggestions for customer responses

**Operator (08:00-17:00)**:
1. Check unclaimed bookings → Claim
2. Add services for claimed bookings
3. Update service details and costs
4. Submit due payments for approval

**Accountant (08:00-17:00)**:
1. Review pending payment approvals
2. Approve/Reject payments
3. Update Revenue (customer payments received)
4. Manage company Expenses
5. Reconcile supplier balances

**Admin (anytime)**:
1. Monitor Dashboard KPIs
2. Review AI daily summary
3. Manage users and permissions
4. Configure system settings

---

## 6. Module Specifications

### 6.1 Request Module (Tab: "Request")

**List Panel Columns**:
- RQID (sortable)
- Customer Name
- Country
- Status Badge
- Stage (LEAD/QUOTE/FOLLOWUP/OUTCOME)
- Next Follow-up (highlight overdue)
- Seller Avatar
- Created Date

**Detail Panel Tabs**:
1. **Info**: Customer details, tour info, dates
2. **Timeline**: Status history, notes
3. **Services**: Linked operators (read-only for Seller)
4. **Revenue**: Linked payments (read-only)

**Actions**:
- Change Status (dropdown)
- Add Note
- Set Follow-up Date
- Convert to Booking (when qualified)

### 6.2 Operator Module (Tab: "Operator")

**List Panel Columns**:
- BookingCode
- Customer Name
- Service Date Range
- Total Cost
- Payment Status
- Claimed By (Operator avatar)
- Due Date (highlight urgent)

**Detail Panel Tabs**:
1. **Booking Info**: Request summary, customer details
2. **Services**: CRUD service items with supplier link
3. **Payments**: Payment status, deadlines
4. **History**: Audit trail

**Actions**:
- Claim Booking (unclaimed only)
- Add Service
- Submit for Payment Approval
- Mark Complete

### 6.3 Revenue Module (Tab: "Revenue")

**List Panel Columns**:
- BookingCode
- Customer Name
- Payment Date
- Amount (VND)
- Currency (if foreign)
- Source (Bank/Cash)
- Status (Received/Pending)

**Detail Panel Tabs**:
1. **Payment Info**: Amount, date, source
2. **Booking Link**: Related booking summary
3. **Notes**: Additional notes

**Actions**:
- Add Payment
- Edit Payment
- Link to Booking

### 6.4 Expense Module (Tab: "Expenses") - NEW

**List Panel Columns**:
- Expense ID
- Category (Salary, Office, Marketing, etc.)
- Description
- Amount
- Date
- Status (Pending/Approved)

**Detail Panel Tabs**:
1. **Details**: Category, description, amount
2. **Attachments**: Receipts, invoices
3. **Approval**: Approval history

**Actions**:
- Add Expense
- Approve (Accountant only)
- Upload Attachment

---

## 7. New Database Requirements

### 7.1 Schema Changes

```prisma
// Add to existing models

model Request {
  // ... existing fields
  claimedById     String?
  claimedBy       User?     @relation("ClaimedRequests", fields: [claimedById], references: [id])
  claimedAt       DateTime?
}

model User {
  // ... existing fields
  claimedRequests Request[] @relation("ClaimedRequests")
}

// NEW: Expense Module
model Expense {
  id          String   @id @default(cuid())
  category    String   // SALARY, OFFICE, MARKETING, TRAVEL, OTHER
  description String
  amount      Decimal  @db.Decimal(15, 0)
  expenseDate DateTime
  status      String   @default("PENDING") // PENDING, APPROVED, REJECTED

  // Approval
  approvedBy  String?
  approvedAt  DateTime?

  // Attachments
  attachments String[] // URLs to uploaded files

  // Metadata
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
  @@index([expenseDate])
  @@index([status])
  @@map("expenses")
}
```

### 7.2 API Endpoints Required

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/requests/[id]/claim` | POST | Operator claims booking |
| `/api/expenses` | GET, POST | Expense CRUD |
| `/api/expenses/[id]` | GET, PUT, DELETE | Individual expense |
| `/api/expenses/[id]/approve` | POST | Approve expense |
| `/api/dashboard/kpis` | GET | Dashboard metrics |
| `/api/dashboard/seller-performance` | GET | Seller stats |

---

## 8. AI Integration Points

### 8.1 Phase 1 (Basic - Implement Now)

1. **Follow-up Reminder Service**
   - Cron job kiểm tra `nextFollowUp` so với ngày hiện tại
   - Tạo notification badges trên UI
   - Daily summary cho mỗi Seller

2. **Knowledge Base Chat**
   - Chatbot widget (đã có placeholder)
   - Query against KnowledgeItem table
   - Claude API for response generation

### 8.2 Phase 2 (Advanced - Future)

1. Email/Meta message parsing
2. Suggested responses
3. Automated daily reports for Admin

---

## 9. Implementation Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Role-based UI complexity | High | Medium | Use centralized permission hooks |
| Claim race condition | Medium | Low | Database transaction + optimistic lock |
| Panel performance on mobile | Medium | Medium | Lazy load, virtualized lists |
| 15+ concurrent users | Low | Low | Connection pooling, caching |

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time | < 2s | Lighthouse |
| Time to Claim Booking | < 5s | User analytics |
| Follow-up Overdue Rate | < 10% | Dashboard KPI |
| User Satisfaction | > 4/5 | Survey |
| Zero Duplicate Claims | 100% | Audit log |

---

## 11. Recommended Implementation Order

### Phase A: Foundation (1 tuần)
1. Authentication với Email/Password (NextAuth.js)
2. Role-based middleware và hooks
3. MasterDetailLayout component
4. SlideInPanel component

### Phase B: Core UI Redesign (2 tuần)
1. Request module với new layout
2. Claim mechanism cho Operator
3. Operator module với new layout
4. Revenue module basic

### Phase C: Accounting & Admin (1 tuần)
1. Expense module CRUD
2. Payment approval workflow
3. Dashboard KPIs
4. Seller performance stats

### Phase D: AI Basic (1 tuần)
1. Follow-up reminder service
2. Knowledge base chat widget
3. Notification system

---

## 12. Unresolved Questions

1. **Notification delivery**: In-app only hay cần Email/Telegram notification?
2. **Offline support**: Có cần PWA capabilities cho mobile?
3. **Multi-language**: Chỉ Vietnamese hay cần English cho foreign staff?
4. **File attachments**: Lưu trữ ở đâu? Supabase Storage hay external?
5. **Audit trail depth**: Log tất cả changes hay chỉ critical fields?

---

## 13. Next Steps

1. **User confirms** các unresolved questions ở trên
2. **Create detailed plan** cho Phase A (Foundation)
3. **Design review** UI mockups trước khi implement
4. **Database migration** plan cho schema changes
