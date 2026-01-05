# MyVivaTour Codebase Summary

## Quick Reference

- **Tech Stack**: Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL
- **Project Type**: Full-stack web application with API routes
- **Package Manager**: npm
- **Dev Server**: `npm run dev` → http://localhost:3000
- **Source Files**: ~40 TypeScript/TSX files organized in `src/` directory
- **Database ORM**: Prisma with PostgreSQL provider

---

## Directory Structure

```
vivatour-app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # Dashboard route group
│   │   │   ├── layout.tsx            # Dashboard layout wrapper
│   │   │   ├── page.tsx              # Dashboard home page
│   │   │   └── suppliers/            # Supplier module pages
│   │   │       ├── page.tsx          # Supplier list
│   │   │       ├── create/page.tsx   # Create supplier
│   │   │       ├── [id]/page.tsx     # View/edit supplier
│   │   │       └── reports/page.tsx  # Supplier reports
│   │   ├── api/                      # Next.js API Routes
│   │   │   ├── suppliers/            # Supplier CRUD
│   │   │   │   ├── route.ts          # GET (list), POST (create)
│   │   │   │   └── [id]/route.ts     # GET, PUT, DELETE (individual)
│   │   │   ├── supplier-transactions/# Transaction management
│   │   │   │   ├── route.ts          # GET (list), POST (create)
│   │   │   │   └── [id]/route.ts     # GET, PUT, DELETE (individual)
│   │   │   └── reports/              # Analytics/reports
│   │   │       └── supplier-balance/ # Balance calculation
│   │   ├── layout.tsx                # Root layout (fonts, metadata)
│   │   └── globals.css               # Global Tailwind CSS
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components (22+)
│   │   │   ├── avatar.tsx            # User avatar
│   │   │   ├── badge.tsx             # Status badge
│   │   │   ├── button.tsx            # Reusable button
│   │   │   ├── calendar.tsx          # Date picker calendar
│   │   │   ├── card.tsx              # Card container
│   │   │   ├── command.tsx           # Command palette
│   │   │   ├── dialog.tsx            # Modal dialog
│   │   │   ├── dropdown-menu.tsx     # Dropdown menu
│   │   │   ├── form.tsx              # Form wrapper (react-hook-form)
│   │   │   ├── input.tsx             # Text input
│   │   │   ├── label.tsx             # Form label
│   │   │   ├── popover.tsx           # Floating popover
│   │   │   ├── select.tsx            # Select dropdown
│   │   │   ├── separator.tsx         # Visual separator
│   │   │   ├── table.tsx             # Data table
│   │   │   ├── tabs.tsx              # Tab navigation
│   │   │   ├── toast.tsx             # Toast notification
│   │   │   ├── tooltip.tsx           # Tooltip
│   │   │   └── ...                   # Additional UI components
│   │   ├── layout/                   # Layout components
│   │   │   ├── Header.tsx            # Top navigation bar
│   │   │   └── AIAssistant.tsx       # Floating AI chat widget
│   │   └── suppliers/                # Supplier-specific components
│   │       ├── supplier-form.tsx     # Create/edit supplier form
│   │       ├── supplier-selector.tsx # Dropdown to select supplier
│   │       └── transaction-form.tsx  # Add transaction form
│   ├── lib/
│   │   ├── db.ts                     # Prisma client singleton (2KB)
│   │   ├── supplier-balance.ts       # Balance calculation logic (2KB)
│   │   └── utils.ts                  # Utility functions: cn() for Tailwind
│   ├── hooks/                        # Custom React hooks (empty, ready for expansion)
│   ├── services/                     # Business logic services (empty, ready for expansion)
│   ├── stores/                       # Zustand store definitions (empty, ready for expansion)
│   └── types/
│       └── index.ts                  # TypeScript interfaces (350+ lines)
├── prisma/
│   └── schema.prisma                 # Database schema (350 lines)
├── public/                           # Static assets (images, fonts)
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── postcss.config.mjs                # PostCSS configuration
├── .env                              # Environment variables (template)
├── SETUP_GUIDE.md                    # Complete setup guide
├── README.md                         # Project README
└── docs/
    ├── project-overview-pdr.md       # Project overview & requirements
    ├── codebase-summary.md           # This file
    ├── code-standards.md             # Code style & standards
    └── system-architecture.md        # Architecture documentation
```

---

## Key Files & Purposes

### Frontend Entry Points

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with global fonts and metadata |
| `src/app/(dashboard)/layout.tsx` | Dashboard layout with Header + AI Assistant |
| `src/app/(dashboard)/page.tsx` | Dashboard home page |
| `src/app/globals.css` | Global Tailwind CSS styles |

### API Routes (REST Endpoints)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/suppliers` | GET | List suppliers (with filters) |
| `/api/suppliers` | POST | Create new supplier |
| `/api/suppliers/[id]` | GET | Get single supplier |
| `/api/suppliers/[id]` | PUT | Update supplier |
| `/api/suppliers/[id]` | DELETE | Delete supplier |
| `/api/supplier-transactions` | GET | List transactions (with filters) |
| `/api/supplier-transactions` | POST | Create transaction |
| `/api/supplier-transactions/[id]` | GET | Get single transaction |
| `/api/supplier-transactions/[id]` | PUT | Update transaction |
| `/api/supplier-transactions/[id]` | DELETE | Delete transaction |
| `/api/reports/supplier-balance` | GET | Get balance summary for all suppliers |

### Core Libraries

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/db.ts` | 16 | Prisma client singleton for development HMR |
| `src/lib/supplier-balance.ts` | 92 | Calculate supplier balance (deposits - costs) |
| `src/lib/request-utils.ts` | 152 | Request utilities: ID generation, booking code, follow-up calculations |
| `src/lib/utils.ts` | 6 | `cn()` utility to merge Tailwind CSS classes |
| `src/types/index.ts` | 350+ | All TypeScript interfaces and types |

### Database Schema

| Model | Fields | Purpose |
|-------|--------|---------|
| User | id, email, password, name, role | User accounts (ADMIN/SELLER/ACCOUNTANT/OPERATOR) with bcrypt hashed password |
| Request | id, code, bookingCode, customerName, contact, status, etc. | Customer tour requests with booking codes |
| Operator | id, requestId, serviceType, totalCost, paymentStatus | Services/costs for requests |
| Revenue | id, requestId, paymentDate, amountVND, paymentSource | Income tracking |
| Supplier | id, code, name, type, paymentModel, creditLimit | Supplier management (NCC) |
| SupplierTransaction | id, supplierId, type, amount, transactionDate | Financial transactions |
| Email | id, gmailId, from, to, subject, aiSummary | Gmail integration |
| KnowledgeItem | id, category, title, content, keywords | AI knowledge base |
| SyncLog | id, sheetName, action, status, errorMessage | Google Sheets sync history |
| ConfigUser | id, userId, sellerCode, sellerName, canViewAll | User configuration (optional seller code, fallback name) |

---

## Component Library (shadcn/ui)

The project includes 22+ shadcn/ui components built on Radix UI primitives:

**Form Components**: Button, Input, Label, Select, Dialog, Popover, Form
**Data Display**: Table, Badge, Avatar, Card, Separator, Tabs
**Navigation**: Dropdown Menu, Command
**Other**: Calendar, Tooltip, Toast

Each component is styled with Tailwind CSS and supports dark mode via CSS variables.

---

## Data Models Overview

### Request Codes
- **code**: Simple booking code (e.g., "240101-JOHN-US")
- **bookingCode**: YYYYMMDD+SellerCode+Seq (e.g., "20260201L0005") - generated on BOOKING status
- **rqid**: Request ID: RQ-YYMMDD-0001

### Request Funnel Status
- **F1**: Initial inquiry
- **F2**: Quoted
- **F3**: In negotiation
- **F4**: Booked
- **F5**: Completed

### Payment Models
- **PREPAID**: Deposit pool (VMB style)
- **PAY_PER_USE**: Pay per booking
- **CREDIT**: Credit limit with payment terms

### Transaction Types
- **DEPOSIT**: Add funds to supplier account
- **REFUND**: Return from supplier
- **ADJUSTMENT**: Price change or correction
- **FEE**: Service fee or penalty

### Supplier Types
Hotel, Transport, Guide, Restaurant, VMB, Other

---

## API Design Patterns

### Query Parameters (GET requests)

```typescript
// Suppliers list
/api/suppliers?search=abc&type=HOTEL&paymentModel=PREPAID&isActive=true&includeBalance=true

// Transactions list
/api/supplier-transactions?supplierId=xxx&type=DEPOSIT&fromDate=2024-01-01&toDate=2024-12-31&limit=50&offset=0
```

### Request Body (POST/PUT requests)

```typescript
// Create supplier
{
  code: "VNA-001",
  name: "Supplier Name",
  type: "HOTEL",
  paymentModel: "PREPAID",
  creditLimit: 10000000,
  paymentTermDays: 30,
  contactName: "John Doe",
  contactPhone: "+84-123-456-789",
  contactEmail: "john@example.com",
  bankAccount: "123456789",
  isActive: true,
  notes: "Optional notes"
}

// Create transaction
{
  supplierId: "clsp1234567890",
  type: "DEPOSIT",
  amount: 1000000,
  transactionDate: "2024-01-15",
  description: "Monthly deposit",
  proofLink: "https://example.com/invoice.pdf",
  relatedBookingCode: "240101-JOHN-US",
  createdBy: "user123"
}
```

### Request Utility Functions

```typescript
// src/lib/request-utils.ts

// Generate RQID: RQ-YYMMDD-0001 (sequential counter resets daily)
generateRQID(): Promise<string>

// Generate booking code: YYYYMMDDL0001
// Fallback: If no sellerCode, uses first letter of seller name
generateBookingCode(startDate: Date, sellerId: string): Promise<string>

// Calculate end date from start + tourDays (inclusive)
calculateEndDate(startDate: Date, tourDays: number): Date

// Calculate next follow-up date based on ConfigFollowUp stage config
calculateNextFollowUp(stage: string, lastContactDate: Date): Promise<Date | null>

// Get seller code from ConfigUser
getSellerCode(userId: string): Promise<string | null>

// Check if user can view all requests
canUserViewAll(userId: string): Promise<boolean>

// Get follow-up date boundaries for filtering
getFollowUpDateBoundaries(): { todayStart, todayEnd, threeDaysLater }
```

### Response Format

All API endpoints return JSON:

```typescript
// Success response
{
  success: true,
  data: { /* model data */ },
  // For lists
  total?: number,
  hasMore?: boolean,
  // Optional warning for non-fatal issues
  warning?: string
}

// Error response
{
  success: false,
  error: "Error description"
}
```

---

## Build & Deployment

### Scripts
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Dependencies (47 total)
- **Next.js Ecosystem**: next, react, react-dom
- **UI/Styling**: tailwindcss, radix-ui components, shadcn/ui, react-resizable-panels
- **Forms**: react-hook-form, zod, @hookform/resolvers
- **Database**: prisma, @prisma/client
- **APIs**: googleapis, @anthropic-ai/sdk
- **Utils**: date-fns, clsx, tailwind-merge, lucide-react
- **Notifications**: sonner
- **State**: zustand
- **Auth**: next-auth (5.0.0-beta.30), bcryptjs (password hashing)
- **DevTools**: typescript, eslint, tailwindcss postcss

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host/database"

# Google APIs
GOOGLE_SERVICE_ACCOUNT_EMAIL="xxx@xxx.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SHEET_ID_REQUEST="1abc..."
SHEET_ID_OPERATOR="1def..."
SHEET_ID_REVENUE="1ghi..."

# Gmail OAuth
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"

# Anthropic AI
ANTHROPIC_API_KEY="sk-ant-xxx"

# NextAuth (Credentials + Password Authentication)
NEXTAUTH_SECRET="xxx"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_PROVIDERS="credentials"
```

---

## Development Workflow

1. **Start dev server**: `npm run dev`
2. **Create/modify** TypeScript files in `src/`
3. **Database changes**: Update `prisma/schema.prisma` → `npx prisma db push`
4. **View database**: `npx prisma studio` (opens http://localhost:5555)
5. **Generate types**: `npx prisma generate` (auto-runs after schema change)
6. **Build check**: `npm run build` before committing
7. **Lint check**: `npm run lint` before submitting PR

---

## Common Development Tasks

### Add a new API endpoint
1. Create route file: `src/app/api/feature/route.ts`
2. Implement GET/POST/PUT/DELETE functions
3. Return `NextResponse.json()` with typed response
4. Use Prisma for database operations

### Create a new page
1. Create folder: `src/app/(dashboard)/feature/`
2. Create `page.tsx` with React component
3. Use shadcn/ui components from `src/components/ui/`
4. Call API endpoints using `fetch()` or client library

### Add form component
1. Use `react-hook-form` + `zod` for validation
2. Use shadcn/ui Form component wrapper
3. Leverage existing form components (Input, Select, etc.)
4. Return strongly-typed form data

### Extend database
1. Update `prisma/schema.prisma`
2. Add relations and indexes
3. Run `npx prisma db push` to sync
4. Update TypeScript types in `src/types/index.ts`
5. Update API routes as needed

---

## Performance Considerations

- **Prisma Client**: Singleton pattern for connection pooling
- **API Pagination**: Use `limit` and `offset` for large datasets
- **Balance Calculation**: Optimized with `groupBy` aggregation
- **Tailwind CSS**: Purged in production, optimized font loading
- **Lazy Components**: Ready for React Suspense and dynamic imports
- **Database Indexes**: Added to frequently filtered fields

---

## Type Safety

- **TypeScript strict mode**: Enforced in `tsconfig.json`
- **Prisma types**: Auto-generated from schema
- **React types**: React 19 built-in types
- **Form types**: Zod validation schemas for runtime safety
- **API types**: Manually defined in `src/types/index.ts`

---

## Next Steps for Developers

1. **Setup**: Follow `SETUP_GUIDE.md` for Supabase and Google APIs
2. **Exploration**: Run `npm run dev` and explore dashboard
3. **Database**: Use `npx prisma studio` to understand data structure
4. **Modules**: Build Request, Operator, and Revenue modules
5. **Integration**: Implement Google Sheets sync and Gmail API
6. **Testing**: Add unit and integration tests
7. **Deployment**: Deploy to Vercel or similar platform

---

## Useful Resources

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [Anthropic Claude API](https://docs.anthropic.com/)
