# MyVivaTour Platform

A comprehensive web platform for Vietnam tour operators to manage customer requests, suppliers (NCC), operators, and revenue. Built with Next.js 16, React 19, TypeScript, and PostgreSQL (Supabase).

## Overview

MyVivaTour centralizes tour management operations with:
- **Supplier Management**: CRUD with payment models (PREPAID, PAY_PER_USE, CREDIT) and balance tracking
- **Dashboard**: Business overview with recent requests, emails, and action items
- **AI Assistant**: Floating chat widget for email drafting and knowledge queries
- **Hybrid Sync**: PostgreSQL cache with Google Sheets as source of truth
- **Full Vietnamese UI**: Complete Vietnamese language interface

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API Routes, Prisma 7 ORM |
| Database | PostgreSQL (Supabase) |
| UI Components | Radix UI + shadcn/ui (22+ components) |
| Forms | React Hook Form + Zod validation |
| State | Zustand, React Context |
| AI | Anthropic Claude SDK |
| External APIs | Google Sheets, Gmail, Google Cloud Auth |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (Supabase free tier recommended)

### 1. Clone & Install

```bash
git clone <repo-url>
cd vivatour-app
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` (or create `.env`):

```env
# Database
DATABASE_URL="postgresql://user:password@host/database"

# AI & APIs (optional for MVP)
ANTHROPIC_API_KEY="sk-ant-xxx"

# Development
NODE_ENV="development"
```

For full setup, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).

### 3. Setup Database

```bash
# Push Prisma schema to database
npx prisma db push

# View database in Prisma Studio
npx prisma studio
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Dashboard route group
│   │   ├── suppliers/      # Supplier CRUD pages
│   │   ├── layout.tsx      # Dashboard layout
│   │   └── page.tsx        # Dashboard home
│   ├── api/                # REST API routes
│   │   ├── suppliers/
│   │   ├── supplier-transactions/
│   │   └── reports/
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Header, AIAssistant
│   └── suppliers/          # Feature components
├── lib/                    # Utilities & helpers
│   ├── db.ts              # Prisma singleton
│   ├── supplier-balance.ts # Balance calculation
│   └── utils.ts           # Tailwind cn() utility
├── hooks/                  # Custom React hooks
├── stores/                 # Zustand stores
└── types/                  # TypeScript types
```

---

## Key Features (MVP)

### ✅ Supplier Module (Complete)
- List, create, edit, delete suppliers
- Payment model configuration (PREPAID, PAY_PER_USE, CREDIT)
- Transaction tracking (deposits, refunds, adjustments, fees)
- Real-time balance calculation
- Type classification (Hotel, Transport, Guide, etc.)

### ✅ Dashboard
- Business overview layout
- Floating AI Assistant widget
- Navigation header
- Responsive design

### 🚧 Request Module (Planned)
- Customer request CRUD
- Funnel status tracking (F1-F5)
- Follow-up scheduling
- Contact management

### 🚧 Operator Module (Planned)
- Service/cost management
- Payment status tracking
- Supplier linking
- Accounting lock mechanism

### 🚧 Revenue Module (Planned)
- Payment tracking
- Multi-currency support
- Deposit and full payment types
- Accounting lock

### 🚧 AI Assistant (Planned)
- Email drafting assistance
- Knowledge base queries
- Claude API integration
- Gmail API integration

### 🚧 Google Sheets Sync (Planned)
- Bidirectional sync
- Row index mapping
- Sync log audit trail

---

## API Endpoints

### Suppliers
```
GET    /api/suppliers                     # List suppliers
POST   /api/suppliers                     # Create supplier
GET    /api/suppliers/[id]                # Get supplier
PUT    /api/suppliers/[id]                # Update supplier
DELETE /api/suppliers/[id]                # Delete supplier
```

### Supplier Transactions
```
GET    /api/supplier-transactions         # List transactions
POST   /api/supplier-transactions         # Create transaction
GET    /api/supplier-transactions/[id]    # Get transaction
PUT    /api/supplier-transactions/[id]    # Update transaction
DELETE /api/supplier-transactions/[id]    # Delete transaction
```

### Reports
```
GET    /api/reports/supplier-balance      # Get balance summary
```

---

## Database Models

- **User** - Accounts with roles (ADMIN, SELLER, ACCOUNTANT)
- **Request** - Customer tour requests (F1-F5 funnel)
- **Operator** - Services and costs linked to requests
- **Revenue** - Income tracking with currency support
- **Supplier** - Supplier management with payment models
- **SupplierTransaction** - Financial transactions
- **Email** - Gmail integration with AI analysis
- **KnowledgeItem** - AI knowledge base
- **SyncLog** - Google Sheets sync history

---

## Development

### Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

### Development Workflow

1. Update `prisma/schema.prisma` for schema changes
2. Run `npx prisma db push` to sync database
3. Run `npx prisma generate` to regenerate types
4. Update TypeScript types in `src/types/index.ts`
5. Create/update components in `src/components/`
6. Create API routes in `src/app/api/`
7. Test with `npm run dev`
8. Build check with `npm run build`
9. Lint check with `npm run lint`

### Code Standards

- **Naming**: kebab-case files, PascalCase components, camelCase variables
- **Types**: Full TypeScript strict mode
- **Styling**: Tailwind CSS exclusively
- **Forms**: React Hook Form + Zod validation
- **API**: REST with standard response format

See [docs/code-standards.md](./docs/code-standards.md) for detailed guidelines.

---

## Documentation

- [Project Overview & PDR](./docs/project-overview-pdr.md) - Goals, features, requirements
- [Codebase Summary](./docs/codebase-summary.md) - Directory structure, file purposes
- [Code Standards](./docs/code-standards.md) - Naming, patterns, best practices
- [System Architecture](./docs/system-architecture.md) - Architecture, data flow, integrations
- [SETUP_GUIDE](./SETUP_GUIDE.md) - Complete setup guide for Supabase, Google APIs, AI

---

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables
4. Deploy

```bash
npm run build  # Test production build locally
npm start      # Start production server
```

### Docker

```bash
docker build -t vivatour .
docker run -e DATABASE_URL="..." vivatour
```

---

## Contributing

1. Create feature branch: `git checkout -b feature/supplier-balance-report`
2. Make changes following [code standards](./docs/code-standards.md)
3. Test: `npm run dev` and `npm run build`
4. Commit: `git commit -m "feat: add supplier balance report"`
5. Push: `git push origin feature/supplier-balance-report`
6. Submit PR for review

---

## Troubleshooting

### Database Connection Error

```
Error: getaddrinfo ENOTFOUND db.xxxxx.supabase.co
```

- Verify DATABASE_URL is correct
- Check Supabase project is active
- Ensure IP is not blocked (Supabase → Settings → Database)

### Prisma Client Error

```
@prisma/client is not initialized
```

Run: `npx prisma generate`

### API 500 Error

Check terminal/Vercel logs for details. Common causes:
- Missing environment variables
- Database connection issue
- Unhandled error in API route

### TypeScript Errors

Run: `npm run build` to see all type errors

---

## Performance

- **Page Load**: Target < 2 seconds
- **API Response**: Target < 500ms
- **Database Queries**: Indexed by frequently filtered fields
- **Bundle Size**: < 500KB initial JavaScript

See [docs/system-architecture.md](./docs/system-architecture.md) for performance details.

---

## Support

For issues or questions:
1. Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) troubleshooting section
2. Review [docs/](./docs/) for detailed documentation
3. Check GitHub issues
4. Contact the development team

---

## Resources

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Supabase Documentation](https://supabase.com/docs)
