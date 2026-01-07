# Codebase Summary

MyVivaTour Platform - Comprehensive directory structure and implementation details.

**Last Updated**: 2026-01-07 (Phase 01: Multi-Spreadsheet Support)

---

## Directory Structure

```
src/
├── app/                              # Next.js App Router (v16)
│   ├── (auth)/                       # Auth route group (Phase 04)
│   │   ├── login/                    # Login page
│   │   │   ├── page.tsx              # Login page component
│   │   │   ├── login-form.tsx        # LoginForm with validation
│   │   │   └── __tests__/            # Login tests
│   │   └── layout.tsx                # Auth layout
│   ├── (dashboard)/                  # Dashboard route group
│   │   ├── suppliers/                # Supplier CRUD pages
│   │   ├── layout.tsx                # Dashboard layout
│   │   └── page.tsx                  # Dashboard home
│   ├── api/                          # REST API routes
│   │   ├── auth/[...nextauth]/       # NextAuth.js v5 handlers
│   │   ├── suppliers/                # Supplier endpoints
│   │   ├── supplier-transactions/    # Transaction endpoints
│   │   └── reports/                  # Report endpoints
│   ├── layout.tsx                    # Root layout with SessionProvider
│   └── page.tsx                      # Home page
├── components/
│   ├── ui/                           # shadcn/ui components (22+)
│   ├── layout/                       # Header, AIAssistant
│   ├── layouts/                      # PHASE 05 NEW
│   │   ├── master-detail-layout.tsx  # Responsive 2-panel layout
│   │   └── slide-in-panel.tsx        # Mobile detail panel
│   ├── providers/                    # PHASE 05 NEW
│   │   └── session-provider-wrapper.tsx # NextAuth SessionProvider wrapper
│   └── suppliers/                    # Feature components
├── lib/
│   ├── db.ts                         # Prisma singleton
│   ├── permissions.ts                # PHASE 04 NEW: RBAC definitions
│   ├── supplier-balance.ts           # Balance utilities
│   └── utils.ts                      # Helpers
├── hooks/
│   └── use-permission.ts             # PHASE 04 NEW: Permission checking hook
├── stores/                           # Zustand state stores
├── types/                            # TypeScript definitions
├── auth.ts                           # PHASE 04: NextAuth.js v5 config
├── middleware.ts                     # PHASE 03: Route protection
└── constants.ts                      # App constants
```

---

## Phase 04: Login Page Implementation

### Components

**src/app/login/page.tsx**
- Server component for /login route
- Centered card layout (Tailwind CSS)
- Vietnamese UI: "MyVivaTour", "Dang nhap de tiep tuc"
- Mobile-responsive design

**src/app/login/login-form.tsx**
- Client component with Suspense boundary
- React Hook Form + Zod validation
- Features:
  - Email & password input fields
  - Form submission via signIn("credentials")
  - Callback URL handling with open redirect protection
  - Toast notifications (sonner)
  - Loading state with spinner
  - Error handling with Vietnamese messages
  - Accessibility: labels, autocomplete

**Key Security Functions**
- `getSafeCallbackUrl()`: Validates callback URL to prevent open redirects
  - Only allows relative paths starting with /
  - Blocks protocol-relative URLs (//)
  - Default fallback to /requests

**Form Validation Schema**
```typescript
loginSchema = z.object({
  email: z.string().email("Email khong hop le"),
  password: z.string().min(1, "Mat khau bat buoc"),
})
```

**Authentication Flow**
1. User navigates to /login
2. LoginForm renders with Suspense boundary
3. User submits email & password
4. Zod schema validates input
5. signIn("credentials") calls NextAuth.js v5
6. On success: Toast notification, redirect to callback URL or /requests
7. On error: Toast error, form validation messages

### Tests

**src/app/login/__tests__/page.test.tsx**
- Login page component rendering
- Layout structure verification

**src/app/login/__tests__/login-form.test.tsx**
- Form submission behavior
- Input field interactions
- Toast notifications
- Loading states

**src/app/login/__tests__/login-validation.test.ts**
- Zod schema validation
- Email format validation
- Error message accuracy

### Security Features

- Open redirect protection via getSafeCallbackUrl()
- CSRF protection built-in via NextAuth.js v5
- Zod schema validation at client
- Generic error messages (no credential leaks)
- Suspense boundary prevents hydration mismatches
- Password minimal validation at client (server validates)

---

## Authentication & RBAC Layer

### Core Files

| File | Purpose |
|------|---------|
| src/auth.ts | NextAuth.js v5 config: Credentials provider, JWT callbacks, type extensions |
| src/middleware.ts | Route protection: auth check + role-based route access (`roleRoutes`) |
| src/app/api/auth/[...nextauth]/route.ts | NextAuth.js v5 handler exports |
| src/app/(auth)/login/page.tsx | Login page layout |
| src/app/(auth)/login/login-form.tsx | Form with React Hook Form + Zod validation |
| src/lib/permissions.ts | RBAC definitions: roles, permissions, hasPermission() & getPermissions() |
| src/hooks/use-permission.ts | Client hook: can(), canAll(), canAny(), role shortcuts (isAdmin, isSeller, etc.) |

### RBAC System

**Permissions Library** (`src/lib/permissions.ts`):
- Defines 13 granular permissions using `resource:action` convention
- Maps 4 roles to permission sets
- Exports `hasPermission(role, permission)` for server-side checks
- Exports `getPermissions(role)` to fetch all role permissions

**Permission Categories**:
- Request: view, create, edit, edit_own, delete
- Operator: view, create, edit, edit_claimed, claim, approve, delete
- Revenue: view, manage
- Expense: view, manage
- Supplier: view, manage
- User: view, manage

**Permission Hook** (`src/hooks/use-permission.ts`):
- Client-side permission checking via NextAuth `useSession()`
- `can(permission)` - Check single permission
- `canAll(permissions[])` - AND logic (all required)
- `canAny(permissions[])` - OR logic (any match)
- Shortcuts: `isAdmin`, `isAccountant`, `isSeller`, `isOperator`, `isAuthenticated`, `isLoading`

**Middleware Route Access** (`src/middleware.ts`):
```typescript
const roleRoutes = {
  "/requests": ["ADMIN", "SELLER", "OPERATOR", "ACCOUNTANT"],
  "/operators": ["ADMIN", "OPERATOR", "ACCOUNTANT"],
  "/revenue": ["ADMIN", "ACCOUNTANT"],
  "/expense": ["ADMIN", "ACCOUNTANT"],
  "/settings": ["ADMIN"],
  "/suppliers": ["ADMIN", "ACCOUNTANT"],
}
```

### UI Components

**SessionProviderWrapper** (`src/components/providers/session-provider-wrapper.tsx`):
- Client component wrapping NextAuth SessionProvider
- Enables useSession() hook availability throughout app
- Wrapped by root layout

**MasterDetailLayout** (`src/components/layouts/master-detail-layout.tsx`):
- Responsive 2-panel layout with resizable panels (desktop, md+)
- Mobile: Full-width list with Sheet overlay for detail
- Props: master, detail, selectedId, onClose, storageKey (localStorage persistence)
- Examples: requests list/detail, suppliers list/detail

**SlideInPanel** (`src/components/layouts/slide-in-panel.tsx`):
- Mobile detail panel: Right-side sheet overlay
- Props: isOpen, onClose, title, description, children
- Used by MasterDetailLayout for mobile view
- Responsive widths: 85vw (mobile), 540px (sm), 600px (md)

---

## Phase 01: Multi-Spreadsheet Support (Google Sheets Sync)

### Key Features

**Per-Sheet Configuration**:
- Support separate spreadsheet IDs for Request, Operator, and Revenue sheets
- Environment variables: `SHEET_ID_REQUEST`, `SHEET_ID_OPERATOR`, `SHEET_ID_REVENUE`
- Backward compatible with single `GOOGLE_SHEET_ID` fallback
- Configuration status checking via `getSheetConfigStatus()`

### Core Files

| File | Purpose |
|------|---------|
| `src/lib/google-sheets.ts` | Google Sheets API client with multi-sheet support |
| `src/app/api/sync/sheets/route.ts` | Sync endpoints (POST trigger, GET status) |
| `.env.example` | Environment variable templates for per-sheet IDs |

### Implementation Details

**src/lib/google-sheets.ts** (Key functions):
- `getSheetIdForType(sheetName)`: Resolves spreadsheet ID for sheet type (Request, Operator, Revenue)
  - Checks per-sheet env var first (`SHEET_ID_*`)
  - Falls back to `GOOGLE_SHEET_ID`
  - Throws error if no ID configured for sheet
- `parsePrivateKey(key)`: Parses Google service account private key
  - Handles escaped newlines (`\\n` → `\n`)
  - Auto-adds PEM headers if missing
  - Supports raw base64 or formatted PEM keys
- `getSheetConfigStatus()`: Returns configuration status per sheet
  - Returns object: `{ Request: boolean, Operator: boolean, Revenue: boolean }`
  - Checks both per-sheet and fallback env vars
- `getSheetData(sheetName, startRow, spreadsheetId?)`: Fetches rows from sheet tab
- `getLastSyncedRow(sheetName)`: Returns last successfully synced row
- `getSheetHeaders(sheetName, spreadsheetId?)`: Fetches first row (headers)
- `isGoogleSheetsConfigured()`: Overall configuration check (credentials + any sheet ID)

**src/app/api/sync/sheets/route.ts** (API endpoints):

**POST `/api/sync/sheets`** - Trigger sync for a sheet
- Request body: `{ sheetName: "Request" | "Operator" | "Revenue" }`
- Auth: Admin only (via middleware)
- Response: `{ success: boolean, message: string, synced: number, errors: number, lastRowIndex?: number }`
- Flow:
  1. Check auth (admin required)
  2. Verify Google Sheets configured
  3. Validate sheet name in VALID_SHEETS
  4. Check per-sheet configuration status
  5. Get last synced row from SyncLog
  6. Fetch new rows from Google Sheets API
  7. Call appropriate sync function (syncRequestSheet, syncOperatorSheet, syncRevenueSheet)
  8. Log all results in SyncLog table

**GET `/api/sync/sheets`** - Get sync status & statistics
- Auth: Authenticated users
- Response: `{ success: boolean, data: { configured: boolean, sheetConfig: Record<string, boolean>, stats: Array, lastSyncs: Array } }`
- Returns:
  - `configured`: Boolean, overall Google Sheets enabled (credentials + any sheet ID)
  - `sheetConfig`: Per-sheet configuration status (Request, Operator, Revenue)
  - `stats`: Sync statistics grouped by sheet and status (SUCCESS/FAILED)
  - `lastSyncs`: Last sync timestamp and row index per sheet

**Sync Functions** (src/app/api/sync/sheets/route.ts):
- `syncRequestSheet(rows)`: Upserts requests by code, logs sync status per row
- `syncOperatorSheet(rows)`: Creates operators (allows duplicates), links to requests, logs status
- `syncRevenueSheet(rows)`: Creates revenue records (allows multiple per request), links to requests, logs status

### Environment Variables

```env
# Google Sheets Service Account (required for sync)
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-sa@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Per-sheet configuration (Phase 01 - multi-spreadsheet support)
SHEET_ID_REQUEST="spreadsheet-id-for-requests"
SHEET_ID_OPERATOR="spreadsheet-id-for-operators"
SHEET_ID_REVENUE="spreadsheet-id-for-revenues"

# Fallback for single spreadsheet (backward compatible)
GOOGLE_SHEET_ID="fallback-if-all-same-spreadsheet"
```

---

## Tech Stack Summary

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI**: Tailwind CSS 4, shadcn/ui (22+ components)
- **Forms**: React Hook Form, Zod
- **Auth**: NextAuth.js v5 with Credentials provider
- **Database**: PostgreSQL (Supabase), Prisma 7 ORM
- **State**: Zustand, React Context
- **Notifications**: Sonner
- **Testing**: Vitest, React Testing Library

---

## Development Patterns

**Component Organization**
- Page components in page.tsx files
- Feature-specific components collocated
- UI components in components/ui/

**Form Handling**
- React Hook Form for state management
- Zod for TypeScript-first validation
- Sonner for toast notifications

**Styling**
- Tailwind CSS utility classes
- shadcn/ui pre-built components
- Mobile-first responsive design

**API Design**
- REST endpoints with standard CRUD
- NextAuth.js v5 for authentication
- Prisma for database queries

**Testing**
- Vitest for unit tests
- React Testing Library for components
- Test coverage for critical paths

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host/database"

# NextAuth.js v5
NEXTAUTH_SECRET="<generated-secret>"
NEXTAUTH_URL="http://localhost:3000"

# AI & APIs (optional)
ANTHROPIC_API_KEY="sk-ant-xxx"
GOOGLE_SHEETS_API_KEY="xxx"
```

---

## Project Status

| Phase | Component | Status | Date |
|-------|-----------|--------|------|
| 01 | Supplier Module + Multi-Spreadsheet Support | Complete | 2026-01-01, 2026-01-07 |
| 02 | Dashboard Layout + Google Sheets Sync API | Complete | 2026-01-02 |
| 03 | Auth Middleware + Request/Operator/Revenue Sync | Complete | 2026-01-04 |
| 04 | Login Page + RBAC | Complete | 2026-01-05 |
| 05 | Request Module | Pending | TBD |
| 06+ | Operator, Revenue, AI Assistant | Planned | TBD |

