# System Architecture Documentation

## Architecture Overview

MyVivaTour is a full-stack Next.js application using a hybrid architecture that combines PostgreSQL (Supabase) as a local cache with Google Sheets as the source of truth.

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Browser / Client                      │
│                   (React 19 + Next.js 16)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/HTTPS
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Next.js Application (Node.js Server)               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           React Components (Client-Side)                │   │
│  │  - Dashboard, Suppliers, Requests, Revenue, Operators   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           API Routes (Server-Side)                      │   │
│  │  - REST endpoints for CRUD operations                   │   │
│  │  - /api/suppliers, /api/requests, /api/revenue, etc.    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Business Logic Layer                          │   │
│  │  - Prisma ORM, supplier balance calculation, etc.       │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────────────────────────┬───────────┘
           │                                          │
           │ SQL                                      │ HTTP/JSON
           ↓                                          ↓
┌──────────────────────────┐       ┌─────────────────────────────┐
│  PostgreSQL Database     │       │  External Integrations      │
│  (Supabase Hosted)       │       │                             │
│                          │       │  ┌─────────────────────┐    │
│  Tables:                 │       │  │ Google Sheets API   │    │
│  - users                 │       │  │ (Sync Source)       │    │
│  - requests              │       │  └─────────────────────┘    │
│  - operators             │       │  ┌─────────────────────┐    │
│  - revenues              │       │  │ Gmail API           │    │
│  - suppliers             │       │  │ (Email Integration) │    │
│  - supplier_transactions │       │  └─────────────────────┘    │
│  - emails                │       │  ┌─────────────────────┐    │
│  - knowledge_items       │       │  │ Anthropic Claude    │    │
│  - sync_logs             │       │  │ (AI Assistance)     │    │
└──────────────────────────┘       │  └─────────────────────┘    │
                                   │  ┌─────────────────────┐    │
                                   │  │ Google Cloud Auth   │    │
                                   │  │ (OAuth 2.0)         │    │
                                   │  └─────────────────────┘    │
                                   └─────────────────────────────┘
```

---

## Component Architecture

### Frontend Architecture

```
src/
├── app/                           # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── (dashboard)/               # Route group for authenticated area
│   │   ├── layout.tsx            # Dashboard wrapper (Header + AIAssistant)
│   │   ├── page.tsx              # Dashboard home
│   │   ├── suppliers/
│   │   │   ├── page.tsx          # Supplier list
│   │   │   ├── create/           # Create supplier
│   │   │   ├── [id]/             # View/edit supplier
│   │   │   └── reports/          # Supplier reports
│   │   ├── requests/             # Future: Request module
│   │   ├── operators/            # Future: Operator module
│   │   └── revenue/              # Future: Revenue module
│   └── api/                      # API routes
│       ├── suppliers/            # Supplier CRUD
│       ├── supplier-transactions/# Transaction CRUD
│       ├── requests/             # Future
│       ├── operators/            # Future
│       └── revenue/              # Future
│
├── components/
│   ├── ui/                       # shadcn/ui components (Radix + Tailwind)
│   │   ├── button.tsx
│   │   ├── form.tsx              # React Hook Form wrapper
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ... (22+ total)
│   │
│   ├── layout/                   # Global layout components
│   │   ├── Header.tsx            # Navigation + user menu
│   │   └── AIAssistant.tsx       # Floating AI chat widget
│   │
│   └── [feature]/                # Feature-specific components
│       ├── suppliers/
│       │   ├── supplier-form.tsx
│       │   ├── supplier-selector.tsx
│       │   └── transaction-form.tsx
│       ├── requests/             # Future
│       └── operators/            # Future
│
├── lib/                          # Utilities & helpers
│   ├── db.ts                     # Prisma client singleton
│   ├── supplier-balance.ts       # Balance calculation logic
│   └── utils.ts                  # Utility functions (cn)
│
├── hooks/                        # Custom React hooks
│   └── use-supplier.ts           # Future: Supplier fetch hook
│
├── stores/                       # Zustand stores (state management)
│   └── supplier-store.ts         # Future: Supplier state
│
└── types/
    └── index.ts                  # Type definitions
```

### Data Flow: Client → Server → Database

```
User Interaction
      ↓
React Component
      ↓
fetch() / API call
      ↓
Next.js API Route
      ↓
Prisma ORM
      ↓
PostgreSQL Query
      ↓
Return JSON response
      ↓
Update React state
      ↓
Re-render UI
```

Example: Creating a supplier
```
1. User fills SupplierForm in browser
2. Form validation via Zod
3. onSubmit calls fetch('/api/suppliers', { method: 'POST', body: JSON.stringify(data) })
4. API route /api/suppliers POST handler receives request
5. Validates input, checks for duplicates
6. Prisma creates record: prisma.supplier.create({ data: body })
7. PostgreSQL executes INSERT and returns new supplier
8. API returns { success: true, data: supplier }
9. Client receives response, updates React state
10. Component re-renders with new supplier
11. Toast notification shows success message
```

---

## Backend Architecture

### API Routes Pattern

All API routes follow a consistent pattern:

```
src/app/api/[feature]/route.ts     → /api/[feature]
src/app/api/[feature]/[id]/route.ts → /api/[feature]/[id]
```

Each route exports HTTP method handlers:
- `GET(request)` - Fetch data
- `POST(request)` - Create data
- `PUT(request)` - Update data
- `DELETE(request)` - Delete data

**Authentication Routes** (NextAuth.js v5):

```
src/app/api/auth/[...nextauth]/route.ts → /api/auth/*
```

NextAuth handlers:
- `POST /api/auth/callback/credentials` - Credentials provider login
- `GET /api/auth/providers` - Available providers
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signin` - Sign in (redirect)
- `GET /api/auth/signout` - Sign out (redirect)

### Request/Response Format

```
Request:
POST /api/suppliers
{
  "code": "VNA-001",
  "name": "Supplier Name",
  "type": "HOTEL",
  ...
}

Response (201 Created):
{
  "success": true,
  "data": {
    "id": "clsp1234567890",
    "code": "VNA-001",
    "name": "Supplier Name",
    ...
  }
}

Error Response (400 Bad Request):
{
  "success": false,
  "error": "Supplier code already exists"
}
```

### Query Pattern

Queries accept query parameters for filtering/pagination:

```
GET /api/suppliers?search=abc&type=HOTEL&isActive=true
GET /api/supplier-transactions?supplierId=xxx&type=DEPOSIT&limit=50&offset=0
```

---

## Database Architecture

### Entity Relationship Diagram

```
User (1) ──────── (N) Request
  │                     │
  ├─── (1:N) Operator   └─────── (1:N) Email
  │         │
  │         ├─── (0:N) Supplier ─── (1:N) SupplierTransaction
  │         │
  │         └─── (1:N) Revenue
  │
  └─── (N:1) Role enum


Supplier ──────── (1:N) SupplierTransaction
  │
  └─ Operator (optional N:1 link)
```

### Core Tables

#### users
```sql
id (CUID) PRIMARY KEY
email UNIQUE
password (bcrypt hashed, nullable - for credentials auth)
name
role (enum: ADMIN, SELLER, ACCOUNTANT, OPERATOR)
avatar
createdAt
updatedAt
```

#### suppliers
```sql
id (CUID) PRIMARY KEY
code UNIQUE
name
type (HOTEL, TRANSPORT, GUIDE, etc.)
paymentModel (enum: PREPAID, PAY_PER_USE, CREDIT)
creditLimit
paymentTermDays
contactName
contactPhone
contactEmail
bankAccount
isActive (default: true)
notes
createdAt
updatedAt
```

#### supplier_transactions
```sql
id (CUID) PRIMARY KEY
supplierId (FK to suppliers)
type (enum: DEPOSIT, REFUND, ADJUSTMENT, FEE)
amount
transactionDate
description
proofLink
relatedBookingCode
createdBy (user ID)
createdAt
```

#### requests
```sql
id (CUID) PRIMARY KEY
code UNIQUE (Request ID from column AR - Phase 02c: unique sync key)
rqid UNIQUE (request ID: RQ-YYMMDD-0001, legacy field)
bookingCode (Booking code from column T - for Operator/Revenue linking, NOT unique)
customerName
contact
whatsapp
pax
country
source
status (14 statuses in request funnel)
stage (LEAD, QUOTE, FOLLOWUP, OUTCOME)
tourDays
startDate
endDate
expectedDate
expectedRevenue
expectedCost
requestDate
lastContactDate
nextFollowUp
statusChangedAt
statusChangedBy (FK to users, who changed status)
notes
sellerId (FK to users, the responsible seller)
sheetRowIndex
createdAt
updatedAt

-- Indexes (Phase 02c):
@@index([bookingCode])  -- For Operator/Revenue lookups (not unique)
@@index([code])         -- For Request ID lookups
@@index([status])       -- For request filtering by funnel status
@@index([stage])        -- For request funnel stage
@@index([sellerId])     -- For requests by seller
@@index([sellerId, stage]) -- Composite for seller's stage breakdown
@@index([nextFollowUp])  -- For follow-up scheduling
```

#### operators
```sql
id (CUID) PRIMARY KEY
requestId (FK to requests, CASCADE)
supplierId (FK to suppliers, optional)
serviceDate
serviceType
serviceName
supplier (legacy text field)
costBeforeTax
vat
totalCost
paymentDeadline
paymentStatus (PENDING, PAID, PARTIAL)
paymentDate
bankAccount
isLocked
lockedAt
lockedBy
notes
userId (FK to users)
sheetRowIndex
createdAt
updatedAt
```

#### revenues
```sql
id (CUID) PRIMARY KEY
revenueId UNIQUE (external ID)
requestId (FK to requests, CASCADE)
paymentDate
paymentType
foreignAmount
currency (default: VND)
exchangeRate
amountVND
paymentSource
isLocked
lockedAt
lockedBy
notes
userId (FK to users)
sheetRowIndex
createdAt
updatedAt
```

#### emails
```sql
id (CUID) PRIMARY KEY
gmailId UNIQUE
requestId (FK to requests, optional)
from
to
subject
body TEXT
date
isRead
isReplied
aiSummary TEXT
aiSuggestedReply TEXT
createdAt
```

#### knowledge_items
```sql
id (CUID) PRIMARY KEY
category
title
content TEXT
keywords[] (array)
embedding[] (vector)
isActive (default: true)
sheetRowIndex
createdAt
updatedAt
```

#### sync_logs
```sql
id (CUID) PRIMARY KEY
sheetName
action (SYNC, CREATE, UPDATE, DELETE)
recordId
rowIndex
status (SUCCESS, FAILED)
errorMessage
syncedAt
```

#### config_user
```sql
id (CUID) PRIMARY KEY
userId UNIQUE (FK to users)
sellerCode (Optional: single char for booking code - L, N, T, etc.)
sellerName (Optional: display name for reports/UI)
canViewAll (default: false)
createdAt
updatedAt
```

### Indexing Strategy

Indexes are added for:
- Foreign keys (automatic in Prisma)
- Unique fields (`code`, `email`, `gmailId`, `bookingCode`)
- Frequently filtered fields (`status`, `stage`, `type`, `isActive`, `paymentStatus`)
- Date range queries (`serviceDate`, `paymentDate`, `transactionDate`, `nextFollowUp`)
- Composite filters (common query patterns)

```prisma
@@index([status])           // For request filtering by funnel status
@@index([stage])            // For request funnel stage (LEAD, QUOTE, etc.)
@@index([sellerId])         // For requests by seller
@@index([sellerId, stage])  // For seller + stage filtering
@@index([bookingCode])      // For booking code lookup
@@index([nextFollowUp])     // For follow-up scheduling
@@index([type])             // For supplier type filtering
@@index([isActive])         // For active/inactive filtering
@@index([paymentStatus])    // For operator payment tracking
@@index([serviceDate])      // For date range queries
```

---

## Request Processing Workflow

### Booking Code Generation

**Trigger**: Request status changes to `BOOKING`

**Process**:
1. Client sends PUT request to `/api/requests/[id]` with `status: "BOOKING"` and `startDate`
2. API route checks for `startDate` (required for booking)
3. Calls `generateBookingCode(startDate, sellerId)` utility
4. Function looks up seller's `ConfigUser` record:
   - If `sellerCode` exists (e.g., 'L', 'N', 'T') → use it
   - Else if `user.name` exists → use first letter uppercase
   - Else → fallback to 'X'
5. Format: `YYYYMMDD` + code char + sequence (e.g., "20260201L0005")
6. Query existing codes with same prefix to determine next sequence
7. Return generated booking code
8. Update request with `bookingCode` field

**Example Flow**:
```
PUT /api/requests/req-123
{
  "status": "BOOKING",
  "startDate": "2026-02-01"
}
  ↓
generateBookingCode("2026-02-01", "user-456")
  ↓
SELECT FROM configUser WHERE userId = "user-456"
  ↓
Found: sellerCode = 'L'
  ↓
SELECT COUNT FROM requests WHERE bookingCode LIKE '20260201L%'
  ↓
Found 4 existing codes → next seq = 0005
  ↓
Return: "20260201L0005"
  ↓
Update: bookingCode = "20260201L0005"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "req-123",
    "bookingCode": "20260201L0005",
    "status": "BOOKING",
    "startDate": "2026-02-01T00:00:00Z",
    ...
  }
}
```

---

## Integration Points

### 1. Google Sheets API (Sync) [Phase 01 Multi-Spreadsheet Support]

**Purpose**: Bidirectional sync with Google Sheets as source of truth

**Flow**:
```
Google Sheets (Source of Truth)
        ↓↑
    Sync Service
        ↓↑
    SyncLog (audit trail)
        ↓↑
PostgreSQL Database (Cache)
```

**Sheets Configuration** (Phase 01 - Per-Sheet IDs):
- **Request sheet**: Tracks customer requests (F1-F5 funnel) → `SHEET_ID_REQUEST`
- **Operator sheet**: Tracks services and costs → `SHEET_ID_OPERATOR`
- **Revenue sheet**: Tracks payments → `SHEET_ID_REVENUE`
- **Fallback**: `GOOGLE_SHEET_ID` for single spreadsheet (backward compatible)
- **Internal_Knowledge sheet**: Knowledge base for AI (same spreadsheet as configured sheets)

**Configuration Strategy**:
- Each sheet type supports independent spreadsheet IDs
- Enables multi-workspace setups (separate sheets for different teams/divisions)
- Fallback to single GOOGLE_SHEET_ID if per-sheet IDs not set
- Graceful configuration status checking via `getSheetConfigStatus()`

**Private Key Parsing**:
- Handles escaped newlines from environment variables (`\\n` → `\n`)
- Auto-adds PEM headers if raw base64 key provided
- Robust error handling with clear error messages

**Sync Direction**:
- **Initial**: Pull from Sheets to PostgreSQL
- **Ongoing**: Bidirectional with conflict resolution
- **Tracking**: sheetRowIndex field for row mapping
- **Per-Sheet Tracking**: Each sheet type synced independently

#### Phase 02c: Request Sync Fix (Request ID as Unique Key)

**Changes**:
- **Unique Sync Key**: Request ID (column AR, index 43) replaces previously inconsistent approach
  - Request ID is mandatory field from Google Sheet (cannot be empty)
  - Upsert logic: `prisma.request.upsert({ where: { code: requestId }, ... })`
  - Ensures each request synced only once per unique Request ID

**Database Schema Updates** (Prisma):
- `Request.code`: Changed from `@unique` to regular field (still indexed)
  - Represents Request ID from column AR
  - Renamed semantically from previous "code" to clarify it's the sync key
- `Request.bookingCode`: Removed `@unique` constraint
  - Now used only for Operator/Revenue linking
  - Multiple requests can share same booking code
  - Indexed for fast Operator/Revenue lookups

**Column Mapping** (src/lib/sheet-mappers.ts):
- **Column T (index 19)**: `bookingCode` - Mã khách (booking code for linking)
- **Column AR (index 43)**: `code` / Request ID - Unique identifier for sync

**Google Sheets Range** (src/lib/google-sheets.ts):
- Extended from `A:Z` to `A:AZ` to include all columns through AR (column 44)
- Handles multi-spreadsheet configuration per sheet type

**Sync Scripts** (Phase 02c New):
- `scripts/truncate-request-data.ts`: Safe deletion of Request/Operator/Revenue records
  - Respects foreign key order: Revenue → OperatorHistory → Operator → Request
  - Clears related SyncLog entries
  - Verification step ensures complete truncation
  - Usage: `npx tsx scripts/truncate-request-data.ts`

- `scripts/resync-all-sheets.ts`: Full re-sync of all sheet data
  - Syncs Request, Operator, Revenue sheets from Google Sheets
  - Uses `mapRequestRow` to extract and validate data
  - Upserts by Request ID (code field)
  - Useful after schema changes or data corrections
  - Usage: `npx tsx scripts/resync-all-sheets.ts`

**Migration Implications**:
- Existing bookingCode uniqueness constraints removed
- Old uniqueness on code/rqid preserved (for backward compatibility)
- Data from sheets synced using Request ID as authoritative key

### 2. Gmail API (Email Integration)

**Purpose**: Pull customer emails and generate AI responses

**Flow**:
```
Gmail Inbox
     ↓
Gmail API
     ↓
Email Service
     ↓
PostgreSQL (Email table)
     ↓
Claude AI (summarization)
     ↓
Dashboard UI (email list)
```

**Features**:
- Pull emails with filters
- Store email in `emails` table with `gmailId`
- Link to `requests` via AI matching
- AI summary generation via Claude
- Suggested reply generation

### 3. Anthropic Claude API (AI Assistant)

**Purpose**: AI-powered assistance for email drafting and knowledge queries

**Flow**:
```
User Message (Chat Widget)
        ↓
AI Assistant Component
        ↓
Claude API Request
        ↓
Respond with context from:
  - KnowledgeItems (semantic search)
  - Request history
  - Email conversations
        ↓
Stream response to UI
```

**Use Cases**:
- Email draft assistance (complete sentences)
- Knowledge base queries (FAQ, policies)
- Customer context understanding
- Multi-turn conversation

### 4. NextAuth.js v5 (Authentication & RBAC) [Phase 02-04 Complete]

**Purpose**: User authentication, session management, and role-based access control

**Framework**: NextAuth.js v5 with Credentials provider
**Core Files**:
- `src/auth.ts` - NextAuth configuration with JWT callbacks
- `src/middleware.ts` - Route protection & role-based authorization
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth handlers
- `src/app/(auth)/login/` - Login page with form validation
- `src/lib/permissions.ts` - RBAC permission definitions
- `src/hooks/use-permission.ts` - Client-side permission checking

**Auth Flow**:

```
User navigates to /login
    ↓
LoginForm (React Hook Form + Zod validation)
    ├── Email/password input with accessibility
    ├── Open redirect protection via getSafeCallbackUrl()
    └── Sonner toast notifications
    ↓
signIn("credentials") → NextAuth.js Credentials Provider
    ├── Email lookup in database
    ├── Bcrypt password verification with timing attack protection
    └── Extract user id, email, name, role
    ↓
JWT Token Creation
    ├── Payload: id, email, name, role
    ├── Signed with AUTH_SECRET (min 32 chars)
    └── Stored in httpOnly, secure cookie
    ↓
Session Management (stateless JWT)
    ├── Strategy: JWT
    ├── Max age: 24 hours
    └── Type-safe role in session.user.role
    ↓
Middleware Protection (/src/middleware.ts)
    ├── Public routes: /login, /api/auth, /forbidden
    ├── Authenticated check: Redirect to /login if missing session
    └── Role-based access: Match route to roleRoutes config
    ↓
Route/Component Access
    ├── Protected routes deny unauthenticated access
    └── Role check via middleware (server) or usePermission hook (client)
```

**Role-Based Access Control (RBAC)**:

4 roles with granular permissions:
- **ADMIN** (`*`): Full system access, all permissions via wildcard
- **SELLER**: `request:view`, `request:create`, `request:edit_own`, `operator:view`
- **OPERATOR**: `request:view`, `operator:view`, `operator:claim`, `operator:edit_claimed`
- **ACCOUNTANT**: Revenue, expense, supplier management + operator approval

**Middleware Route Access** (`roleRoutes`):
```
/requests   → ADMIN, SELLER, OPERATOR, ACCOUNTANT
/operators  → ADMIN, OPERATOR, ACCOUNTANT
/revenue    → ADMIN, ACCOUNTANT
/expense    → ADMIN, ACCOUNTANT
/settings   → ADMIN only
/suppliers  → ADMIN, ACCOUNTANT
```

**Permission Checking**:

Server-side (auth utilities):
```typescript
import { auth } from "@/auth"
const session = await auth()
if (session?.user?.role === "ADMIN") { ... }
```

Client-side (usePermission hook):
```typescript
const { can, isAdmin, isSeller } = usePermission()
if (can("request:create")) { ... }
if (isAdmin) { ... }
```

**Security Features**:

1. **Password Hashing**: bcryptjs with timing attack prevention (dummy hash for non-existent users)
2. **AUTH_SECRET Validation**: Enforced minimum 32 characters at startup (fatal error if missing)
3. **Secure Cookies**: httpOnly, secure, sameSite flags (NextAuth.js handles)
4. **CSRF Protection**: Built-in via NextAuth.js v5
5. **JWT Signing**: Cryptographic signing with AUTH_SECRET
6. **Session Expiry**: 24-hour automatic token expiration

**Environment Variables**:
```env
AUTH_SECRET="<openssl rand -base64 32>"    # Required: min 32 chars
DATABASE_URL="postgresql://..."             # For user lookup in Credentials provider
```

**Type Safety**:

Extended NextAuth module declarations in `src/auth.ts`:
```typescript
declare module "next-auth" {
  interface User {
    role: RoleType  // "ADMIN" | "SELLER" | "ACCOUNTANT" | "OPERATOR"
  }
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: RoleType
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    role: RoleType
  }
}
```

**UI Components**:

- **SessionProviderWrapper** (`src/components/providers/session-provider-wrapper.tsx`): Wraps app with NextAuth SessionProvider for useSession availability
- **MasterDetailLayout** (`src/components/layouts/master-detail-layout.tsx`): Responsive 2-panel layout (resizable on desktop, sheet overlay on mobile)
- **SlideInPanel** (`src/components/layouts/slide-in-panel.tsx`): Mobile slide-in detail panel (right-side sheet)

**Future Enhancements**:
- Google OAuth 2.0 provider
- GitHub OAuth 2.0 provider
- Email verification workflow
- Password reset functionality

---

## Data Synchronization Strategy

### Sync Model: PostgreSQL as Cache

```
┌─────────────────────────────────┐
│  Google Sheets (Source Truth)   │
│  - Single source for data       │
│  - Human-editable              │
│  - Backup/audit trail           │
└────────────┬────────────────────┘
             │
             │ Bidirectional Sync
             │
┌────────────┴────────────────────┐
│  PostgreSQL (Cache)             │
│  - Fast queries                 │
│  - Relations enforcement         │
│  - Real-time calculations        │
└─────────────────────────────────┘
             │
             │ Read/Write
             │
┌────────────┴────────────────────┐
│  Next.js Application            │
│  - REST API                      │
│  - Business logic                │
│  - User interface                │
└─────────────────────────────────┘
```

### Sync Process

1. **Initial Load** (first time):
   - Read all data from Google Sheets
   - Insert into PostgreSQL
   - Record in sync_logs with status SUCCESS

2. **Incremental Sync** (scheduled):
   - Check last sync timestamp
   - Query Sheets API for changes since last sync
   - Merge changes into PostgreSQL
   - Update sheetRowIndex for tracking

3. **Conflict Resolution**:
   - Modified in both: Last-write-wins (by timestamp)
   - Deleted in Sheets, exists in DB: Soft delete
   - New in DB: Push to Sheets on next sync

4. **Error Handling**:
   - Log errors in sync_logs
   - Retry with exponential backoff
   - Alert if sync fails repeatedly

### Sync Log Example

```
{
  "sheetName": "requests",
  "action": "UPDATE",
  "recordId": "req_12345",
  "rowIndex": 42,
  "status": "SUCCESS",
  "errorMessage": null,
  "syncedAt": "2024-01-15T10:30:00Z"
}
```

---

## Security Architecture

### Authentication & Authorization

```
Login Request
    ↓
NextAuth.js (planned)
    ├── Email/Password hash (bcrypt)
    ├── OAuth (Google, GitHub)
    └── Session (httpOnly cookie)
    ↓
API Routes
    ├── Check session
    ├── Verify user ID
    └── Check role (ADMIN/SELLER/ACCOUNTANT)
    ↓
Prisma ORM
    ├── Field-level encryption (sensitive data)
    ├── Row-level security (user owns data)
    └── Audit logging
```

### Secret Management

Store in `.env` (not in git):
- `DATABASE_URL` - PostgreSQL connection
- `ANTHROPIC_API_KEY` - Claude API key
- `GOOGLE_PRIVATE_KEY` - Service account key
- `GOOGLE_CLIENT_SECRET` - OAuth secret
- `NEXTAUTH_SECRET` - Session signing key

### Data Protection

- **Database**: SSL/TLS for Supabase connections
- **API**: HTTPS only, no sensitive data in URLs
- **Client**: Secure cookies (httpOnly, sameSite)
- **Audit**: Sync logs for data changes

---

## Deployment Architecture

### Recommended Stack

```
Development:
  - Local PostgreSQL or Supabase
  - Next.js dev server (npm run dev)
  - Node.js 18+

Staging:
  - Supabase (free tier)
  - Vercel preview deployments
  - GitHub branch previews

Production:
  - Supabase (paid tier, backups)
  - Vercel (serverless functions)
  - GitHub Actions (CI/CD)
```

### Deployment Process

```
Push to main branch
        ↓
GitHub Actions trigger
        ↓
Run tests & lint
        ↓
Build Next.js
        ↓
Deploy to Vercel
        ↓
Run database migrations (if any)
        ↓
Health check
        ↓
Deploy complete or rollback
```

---

## Performance Considerations

### Database Performance

- **Indexes**: Added to frequently filtered fields
- **Pagination**: API returns max 50-100 records
- **Aggregations**: Use Prisma `groupBy` for calculations
- **Lazy Loading**: Components load data on demand

### API Performance

- **Caching**: HTTP caching headers (Cache-Control, ETag)
- **Compression**: gzip/brotli enabled by Vercel
- **CDN**: Static assets served from Vercel CDN
- **Response Time**: Target < 500ms for 95th percentile

### Frontend Performance

- **Code Splitting**: Dynamic imports for route groups
- **Image Optimization**: next/image component
- **Font Loading**: Optimized with next/font
- **Bundle Size**: Target < 500KB initial JS

---

## Monitoring & Logging

### Application Logs

```
Development:
  - Prisma logs: queries, errors, warnings
  - Next.js logs: server/client errors
  - Browser console: client-side errors

Production:
  - Vercel logs (analytics, errors)
  - Error tracking (Sentry, LogRocket)
  - Database logs (Supabase)
  - Sync logs (in database)
```

### Metrics to Track

- API response time (p50, p95, p99)
- Database query time
- Error rate (5xx, 4xx)
- Supplier balance calculation time
- Sync success rate

---

## Scalability Plan

### Phase 1: MVP (Current)
- Single Vercel deployment
- Supabase free tier
- Background sync via cron (serverless)

### Phase 2: Scale Users
- Supabase paid tier (more connections)
- Vercel Pro (advanced analytics)
- Database connection pooling

### Phase 3: Scale Data
- Sharding by supplier type
- Caching layer (Redis)
- Background jobs service (Bull/BullMQ)

### Phase 4: Global Scale
- Multi-region Supabase
- Edge functions for latency
- CDN for static assets
- Message queue for async operations

---

## Disaster Recovery

### Backup Strategy

- **Database**: Supabase automated backups (daily, retention: 7 days)
- **Google Sheets**: Serves as secondary backup
- **Code**: Git repository (GitHub)
- **Secrets**: Encrypted in Vercel environment

### Recovery Procedures

1. **Database Corruption**: Restore from Supabase backup
2. **Lost Data**: Recover from Google Sheets sync
3. **Code Disaster**: Revert commit, redeploy
4. **API Key Leak**: Rotate keys in console, update .env

### Recovery Time Objectives (RTO)

- Database failure: < 1 hour
- API failure: < 5 minutes (Vercel auto-rollback)
- Data corruption: < 24 hours (restore from backup)

---

## Phase 07.5: Bidirectional Sync Architecture

### Overview

Phase 07.5 implements bidirectional synchronization infrastructure. Read-sync (Sheets → DB) existed since Phase 01. Write-sync (DB → Sheets) is implemented via database queue in Phase 07.5.1.

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     User Actions                             │
│              (Create/Update/Delete Records)                  │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ↓
        ┌──────────────────────────────┐
        │   API Route Handler          │
        │  (POST/PUT/DELETE /api/...)  │
        └──────────┬───────────────────┘
                   │
                   ├→ Validate input
                   ├→ Update database (Prisma)
                   ├→ Enqueue to SyncQueue
                   └→ Return success response
                       (fire-and-forget)
                       │
                       ↓
            ┌─────────────────────────┐
            │    SyncQueue Table      │
            │  (Status: PENDING)      │
            │  - id, action, model    │
            │  - recordId, payload    │
            │  - retries, lastError   │
            └──────────┬──────────────┘
                       │
                       │ [Background Worker / Cron Job - Phase 07.5.2+]
                       │
                       ↓
            ┌─────────────────────────────────────┐
            │   Sync Worker Process               │
            │  (dequeue → process → mark status)  │
            │                                     │
            │  1. dequeue(25) // Get PENDING      │
            │  2. For each item:                  │
            │     - syncToSheet(item)             │
            │     - markComplete() if success     │
            │     - markFailed() if error         │
            │  3. resetStuck() // Crash recovery  │
            │  4. cleanupCompleted() // Retention │
            └──────────┬────────────────────────┘
                       │
                       ├→ Write to Google Sheets API
                       │
                       ↓
            ┌──────────────────────────┐
            │   Google Sheets          │
            │   (Source of Truth)      │
            └──────────────────────────┘

SyncQueue Status Flow:
  PENDING --dequeue→ PROCESSING
     ↑                    │
     │                    ├→ markComplete() → COMPLETED
     │                    │
     │                    └→ markFailed() →
     │                              │
     │                              └→ retries < maxRetries?
     │                                    YES → PENDING (retry)
     │                                    NO → FAILED
     └─── resetStuck() [Crash recovery]
```

### Database Queue Design

**SyncQueue Model** (src/lib/sync/write-back-queue.ts):

```typescript
export interface EnqueueParams {
  action: "CREATE" | "UPDATE" | "DELETE"; // What changed
  model: "Request" | "Operator" | "Revenue"; // Which table
  recordId: string; // DB record ID
  sheetRowIndex?: number | null; // Row in sheet (null for CREATE)
  payload: Record<string, unknown>; // Changed fields
}

export interface QueueItem {
  id: string;
  action: string;
  model: string;
  recordId: string;
  sheetRowIndex: number | null;
  payload: Prisma.JsonValue;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}
```

### Queue Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `enqueue(params)` | Add item to queue | void |
| `dequeue(batchSize)` | Fetch & mark PENDING items | QueueItem[] |
| `markComplete(id)` | Mark as synced successfully | void |
| `markFailed(id, error)` | Mark failed, retry if retries remaining | void |
| `resetStuck(olderThanMinutes)` | Crash recovery: PROCESSING → PENDING | count |
| `cleanupCompleted(olderThanDays)` | Delete old completed items | count |
| `getQueueStats()` | Get queue status counts | QueueStats |
| `getFailedItems(limit)` | List failed items | Array<FailedItem> |
| `retryFailed(id)` | Manual retry: reset status & counters | void |
| `deleteQueueItem(id)` | Force delete queue item | void |

### Retry Logic

1. **Initial Attempt**: maxRetries = 3
2. **On Failure**:
   - Increment retries counter
   - Store lastError message
   - If retries < maxRetries: Reset to PENDING (automatic retry)
   - If retries ≥ maxRetries: Set to FAILED (manual intervention needed)
3. **Retry Backoff**: Linear (future: exponential via Phase 07.5.2)

### Integration with Existing System

**Enqueue Triggers** (future implementation in each API route):
```typescript
// After successful DB operation
await enqueue({
  action: "CREATE",
  model: "Request",
  recordId: newRequest.id,
  payload: { code, customerName, contact, ... }
});
```

**Sync Flow** (Phase 07.5.2 - background worker):
```typescript
while (true) {
  const items = await dequeue(25); // Get next batch
  for (const item of items) {
    try {
      await syncToSheet(item); // Call Google Sheets API
      await markComplete(item.id);
    } catch (error) {
      await markFailed(item.id, error.message);
    }
  }

  // Maintenance
  await resetStuck(10); // Crash recovery
  await cleanupCompleted(7); // Retention policy
}
```

### Monitoring & Operations

**Queue Health Dashboard** (Phase 07.5.3 - future):
- Live queue stats (pending, processing, completed, failed counts)
- Failed items with error details
- Manual retry/delete UI
- Queue processor status (running/stopped)

**Observability**:
- Console logging: `[SyncQueue] Operation: message`
- Error tracking: failed items with lastError field
- Audit trail: SyncLog table (Phase 01) for completed syncs

### Files Structure

```
src/lib/sync/
├── write-back-queue.ts           # Queue utilities (10 functions, 237 lines)
└── __tests__/
    └── write-back-queue.test.ts  # Unit tests (~150 lines)

prisma/
└── schema.prisma                 # SyncQueue model (+24 lines)
```

---

## Architecture Evolution

### Current (MVP)
- Monolithic Next.js app
- PostgreSQL database
- Direct API calls from client
- Read-sync only (Sheets → DB, Phase 01)

### Phase 07.5 (In Progress)
- Database queue for write-sync (DB → Sheets, Phase 07.5.1)
- Background worker for async processing (Phase 07.5.2)
- Queue monitoring dashboard (Phase 07.5.3)

### Planned
- Microservices for Google Sheets sync
- Message queue for async operations (RabbitMQ/Bull)
- Separate auth service
- Analytics service

### Future
- GraphQL API (instead of REST)
- Real-time updates (WebSockets)
- Multi-tenant architecture
- Mobile app (React Native)
