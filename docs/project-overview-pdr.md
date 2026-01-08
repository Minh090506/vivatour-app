# MyVivaTour Platform - Project Overview & PDR

## Executive Summary

**MyVivaTour** is a comprehensive web platform for Vietnam tour operators to manage customer requests, suppliers (NCC), operators, and revenue. Built with Next.js 16, React 19, and PostgreSQL, the platform unifies tour management operations with AI-powered assistant support and Google Sheets bidirectional sync.

**Version**: 0.1.0 | **Status**: Active Development | **Target**: Tour operators in Vietnam

---

## Project Goals

1. **Centralize Tour Management** - Consolidate customer requests, pricing, and revenue in one system
2. **Supplier Management** - Track supplier relationships, payments, and balances
3. **Revenue Tracking** - Monitor income streams and payment dates with foreign currency support
4. **AI Assistance** - Automate email drafting and knowledge base queries
5. **Data Continuity** - Maintain Google Sheets as source of truth with database caching

---

## Target Users

- **Tour Operators/Sellers** - Create and manage customer tour requests, track follow-ups
- **Accountants** - Monitor financial transactions, supplier balances, revenue
- **Administrators** - Manage users, suppliers, and system configuration

---

## Core Features

### 1. Dashboard Module
- Business overview with key statistics
- Recent customer requests with status indicators
- Follow-up tracking and action items
- Email inbox with AI analysis summaries

### 2. Supplier Module (NCC)
- CRUD operations for suppliers with unique codes
- Three payment models: PREPAID, PAY_PER_USE, CREDIT
- Transaction tracking (deposits, refunds, adjustments, fees)
- Real-time balance calculation
- Supplier type classification (VMB, Hotel, Transport, Guide, Restaurant, Other)
- Contact management and bank account tracking

### 3. Customer Request Module (Planned)
- Create customer tour requests with funnel status (F1-F5)
- Track customer contact (email, WhatsApp, phone)
- Expected revenue and cost estimation
- Linked operators and revenue records
- Follow-up scheduling

### 4. Operator Module (Planned)
- Service/cost management linked to requests
- Supplier assignment for services
- Payment status tracking and deadlines
- Cost breakdown with VAT calculation
- Accounting lock mechanism for finalized records

### 5. Revenue Module (Planned)
- Payment tracking with multiple currencies (default VND)
- Foreign currency exchange rate support
- Deposit and full payment tracking
- Linked to customer requests
- Accounting lock mechanism

### 6. AI Assistant
- Floating chat widget on dashboard
- Email drafting assistance
- Knowledge base queries
- Context-aware responses using internal knowledge items

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16.1.1, React 19, TypeScript, Tailwind CSS 4, Radix UI |
| **Backend** | Next.js API Routes, Prisma 7 ORM |
| **Database** | PostgreSQL (Supabase hosted) |
| **State Management** | Zustand, React Hook Form |
| **UI Components** | shadcn/ui (22+ Radix UI components) |
| **AI** | Anthropic Claude SDK |
| **Forms** | React Hook Form, Zod validation |
| **Styling** | Tailwind CSS 4, CSS variables |
| **Icons** | Lucide React (560+ icons) |
| **Notifications** | Sonner (toast notifications) |
| **External APIs** | Google Sheets API, Gmail API |
| **Auth** | NextAuth.js (planned) |
| **Date Handling** | date-fns 4 |

---

## Data Models

### User
- Email, name, role (ADMIN/SELLER/ACCOUNTANT)
- Manages requests, operators, and revenue records

### Request
- Unique booking code (e.g., 240101-JOHN-US)
- Customer info, contact details, WhatsApp
- Funnel status (F1-F5), source (TripAdvisor, Zalo, Email, Agent)
- Tour details (days, expected date, revenue/cost)
- Follow-up tracking

### Operator
- Linked to Request and optional Supplier
- Service type and name with service date
- Cost breakdown: costBeforeTax, VAT, totalCost
- Payment status (PENDING/PAID/PARTIAL)
- Accounting lock for finalized records

### Revenue
- Linked to Request
- Payment date, type (Deposit/Full Payment)
- Multi-currency: foreignAmount, exchangeRate, amountVND
- Payment source (bank transfer, cash)
- Accounting lock

### Supplier (NCC)
- Unique code and name with type
- Payment model: PREPAID, PAY_PER_USE, CREDIT
- Credit limit and payment term days (for CREDIT model)
- Contact info: name, phone, email, bank account
- Active/inactive status

### SupplierTransaction
- Type: DEPOSIT, REFUND, ADJUSTMENT, FEE
- Amount and transaction date
- Proof link (receipt/invoice)
- Related booking code reference

### Email
- Gmail integration with unique gmailId
- Optional link to customer request
- AI analysis: summary, suggested reply
- Read/replied status tracking

### KnowledgeItem
- Category: Policy, FAQ, Template, etc.
- Title, content, keywords for search
- Embedding for AI semantic search
- Active/inactive toggle

### SyncLog
- Tracks Google Sheets sync history
- Sheet name, action (SYNC/CREATE/UPDATE/DELETE)
- Success/failure status with error messages

---

## Integration Requirements

### Supabase (PostgreSQL)
- Hosted PostgreSQL database
- Connection via DATABASE_URL
- Free tier available for development
- Database: `postgres`

### Google Sheets
- Service account for API access
- Bidirectional sync (DB ↔ Sheets)
- Supports Request, Operator, Revenue sheets
- Knowledge base sheet for AI training
- Row index tracking for sync

### Google Gmail API
- OAuth 2.0 authentication
- Email pulling and analysis
- Suggested reply generation via Claude
- Optional for email integration

### Anthropic Claude API
- Text generation for AI assistant
- Email draft assistance
- Knowledge base semantic search
- Context-aware response generation

### NextAuth.js (Planned)
- Email/password authentication
- OAuth provider support
- Session management
- Role-based access control

---

## Architecture Overview

### Hybrid Sync Model
```
Google Sheets (Source of Truth)
        ↓↑
   Sync Log
        ↓↑
PostgreSQL (Cache)
        ↓
  Next.js API Routes
        ↓
   React Frontend
```

### Data Flow
1. **Client** (React) → **API Route** (Next.js)
2. **API Route** → **Prisma ORM** → **PostgreSQL**
3. **Background Sync** → **Google Sheets API** ↔ **PostgreSQL**
4. **AI Assistant** → **Anthropic Claude API** (context from Prisma)
5. **Email Integration** → **Gmail API** → **Prisma** (store + AI analysis)

---

## Non-Functional Requirements

### Performance
- Page load time: < 2 seconds
- API response time: < 500ms
- Database queries: indexed by frequently filtered fields
- Real-time balance calculation for suppliers

### Scalability
- Vertical scaling via Supabase tiers
- Pagination for large datasets (offset/limit)
- Batch operations for sync
- Lazy loading for UI components

### Security
- Environment variables for all secrets
- SQL injection prevention via Prisma ORM
- Input validation with Zod schemas
- NextAuth.js for authentication (planned)
- Role-based access control

### Reliability
- Database transactions for financial operations
- Audit trail via SyncLog
- Error logging and monitoring
- Graceful degradation of AI features

### User Experience
- Full Vietnamese interface (i18n ready)
- Responsive mobile design
- Accessibility compliance (Radix UI)
- Toast notifications (Sonner)
- Form validation feedback

---

## Implementation Roadmap

### Phase 1: MVP (Completed - 2026-01-01)
- [x] Supplier module (CRUD, transactions, balance)
- [x] Dashboard layout with Header and AI Assistant
- [x] TypeScript type system
- [x] Database schema with Prisma
- [x] shadcn/ui component library setup

### Phase 2: Authentication (Completed - 2026-01-04)
- [x] NextAuth.js v5 configuration with Credentials provider
- [x] Password hashing with bcryptjs (timing attack prevention)
- [x] JWT session strategy (24-hour expiry)
- [x] Type-safe session & token extensions
- [x] AUTH_SECRET validation (min 32 chars)

### Phase 3: Middleware & Route Protection (Completed - 2026-01-04)
- [x] Middleware for route protection (auth check)
- [x] Role-based route access (`roleRoutes` config)
- [x] Redirect unauthenticated to /login with callbackUrl
- [x] Public routes whitelist (/login, /api/auth, /forbidden)
- [x] 403 Forbidden page for unauthorized roles

### Phase 4: RBAC & Login Page (Completed - 2026-01-05)
- [x] Permission library with 13 granular permissions (`src/lib/permissions.ts`)
- [x] Role-permission mapping (ADMIN, SELLER, OPERATOR, ACCOUNTANT)
- [x] usePermission hook for client-side checks
- [x] Login page UI (/login route)
- [x] LoginForm with React Hook Form + Zod validation
- [x] Open redirect protection (getSafeCallbackUrl)
- [x] Toast notifications (Sonner)
- [x] Suspense boundary for SSR compatibility
- [x] Vietnamese localization
- [x] Comprehensive test coverage

### Phase 5: Responsive Layouts (Completed - 2026-01-05)
- [x] SessionProviderWrapper (NextAuth SessionProvider)
- [x] MasterDetailLayout (responsive 2-panel with resizable desktop + sheet mobile)
- [x] SlideInPanel (right-side mobile detail overlay)
- [x] localStorage persistence for panel sizes
- [x] Mobile-first responsive design

### Phase 6: Core Modules (75% - In Progress)
- [x] Customer Request module (CRUD with list/detail/create/edit views)
- [x] Operator module (CRUD with approval workflow, lock mechanism)
- [x] Revenue module (CRUD with multi-currency support)
- [x] Advanced form components (date picker, multi-select, filters)
- [x] Request/Operator/Revenue detail pages with master-detail layout
- [ ] Operator reports and analytics
- [ ] Revenue reports and analytics

### Phase 7: Integrations (Planned)
- [ ] Google Sheets bidirectional sync
- [ ] Gmail API integration with AI analysis
- [ ] OAuth providers (Google, GitHub)
- [ ] Webhook support for external integrations

### Phase 8: Enhancement (Planned)
- [ ] AI knowledge base management
- [ ] Advanced reporting and analytics
- [ ] Multi-user collaboration features
- [ ] Notification system (email, SMS)

### Phase 9: Production (Planned)
- [ ] Internationalization (i18n)
- [ ] Performance optimization
- [ ] Security audit and hardening
- [ ] Load testing and scalability
- [ ] User documentation and training

---

## Success Metrics

- **User Adoption**: 80%+ of tour operators using platform
- **Data Accuracy**: 100% sync success rate with Google Sheets
- **System Uptime**: 99.5% availability
- **Response Time**: 95th percentile < 500ms
- **Support**: Average resolution time < 24 hours

---

## Dependencies & Constraints

### External Dependencies
- Supabase for database hosting
- Google Cloud for Sheets/Gmail APIs
- Anthropic for Claude AI
- Vercel for deployment (recommended)

### Constraints
- Next.js 16+ required for React 19
- PostgreSQL 12+ (Supabase default)
- Node.js 18+ for development
- Vietnamese locale for UI

### Risk Mitigation
- Google Sheets as fallback for data
- Sync logs for audit trail
- Database backups via Supabase
- Error logging and monitoring

---

## Acceptance Criteria

1. Supplier module fully functional with CRUD and balance tracking
2. All database models created and working with Prisma
3. API routes follow REST conventions with proper error handling
4. UI components use shadcn/ui and Tailwind CSS
5. TypeScript strict mode enabled with no `any` types
6. Google Sheets sync layer designed (not yet implemented)
7. AI assistant placeholder ready for integration
8. README with setup instructions and local dev guide
