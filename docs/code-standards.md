# Code Standards & Guidelines

## Overview

This document defines coding standards for the MyVivaTour project to ensure consistency, maintainability, and code quality across the team.

---

## File Organization

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Page files** | kebab-case | `supplier-list.tsx`, `create.tsx` |
| **Component files** | kebab-case | `supplier-form.tsx`, `ai-assistant.tsx` |
| **API routes** | kebab-case | `suppliers.ts`, `supplier-transactions.ts` |
| **Component exports** | PascalCase | `export function SupplierForm() {}` |
| **Variables/functions** | camelCase | `calculateBalance()`, `totalAmount` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| **Types/Interfaces** | PascalCase | `SupplierType`, `TransactionResponse` |
| **Enums** | PascalCase (singular) | `PaymentModel`, `Role` |
| **Database tables** | lowercase (Prisma) | `suppliers`, `supplier_transactions` |

### Directory Structure Rules

```
src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Route groups with parentheses
│   ├── api/                      # API route groups
│   └── layout.tsx                # Root layout only
├── components/
│   ├── ui/                       # shadcn/ui components (not modified)
│   ├── layout/                   # Global layout components
│   └── [feature]/                # Feature-specific components
├── lib/                          # Utilities and helpers
├── types/                        # Type definitions
├── hooks/                        # Custom React hooks
├── stores/                       # Zustand stores
└── services/                     # Business logic (if needed)
```

### File Placement Rules

1. **Page components**: `src/app/(dashboard)/[feature]/page.tsx`
2. **API endpoints**: `src/app/api/[feature]/route.ts`
3. **UI components**: `src/components/ui/[component].tsx`
4. **Feature components**: `src/components/[feature]/[component].tsx`
5. **Utilities**: `src/lib/[utility].ts`
6. **Types**: `src/types/index.ts`
7. **Custom hooks**: `src/hooks/use-[hook].ts`
8. **Zustand stores**: `src/stores/[store].ts`

---

## TypeScript Standards

### Type Definitions

Always define types for:
- Function parameters and return types
- Component props
- API request/response bodies
- Database query results

```typescript
// Good: Fully typed
interface SupplierFormProps {
  supplierId?: string;
  onSubmit: (data: SupplierFormData) => Promise<void>;
  isLoading?: boolean;
}

export function SupplierForm({ supplierId, onSubmit, isLoading = false }: SupplierFormProps) {
  // implementation
}

// Bad: No types
export function SupplierForm({ supplierId, onSubmit, isLoading }) {
  // implementation
}
```

### Strict Mode

- TypeScript strict mode is enabled
- No `any` type usage without explicit `// @ts-ignore` comment and justification
- Use `unknown` when type is truly unknown, then narrow with type guards

```typescript
// Good
function processData(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  throw new Error('Data must be string');
}

// Bad
function processData(data: any): string {
  return data; // No type safety
}
```

### Unions & Discriminated Unions

Use discriminated unions for related types:

```typescript
// Good: Discriminated union
type TransactionResult =
  | { success: true; data: SupplierTransaction }
  | { success: false; error: string };

// Bad: Multiple optional fields
interface TransactionResult {
  success?: boolean;
  data?: SupplierTransaction;
  error?: string;
}
```

### Imports

- Use ES6 imports
- Organize imports: React first, then external, then local
- Use path aliases (`@/` for `src/`)

```typescript
// Good
import React from 'react';
import { useForm } from 'react-hook-form';
import { prisma } from '@/lib/db';
import { SupplierForm } from '@/components/suppliers/supplier-form';

// Bad
import { SupplierForm } from '../../../components/suppliers/supplier-form';
import { useForm } from 'react-hook-form';
import React from 'react';
```

---

## React Component Standards

### Functional Components

Use functional components with hooks. No class components.

```typescript
// Good
export function SupplierForm() {
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// Bad
class SupplierForm extends React.Component {
  // class implementation
}
```

### Component Structure

```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import type { SupplierFormData } from '@/types';

// Props interface at top
interface SupplierFormProps {
  supplierId?: string;
  onSubmit: (data: SupplierFormData) => Promise<void>;
}

// Component definition with clear name
export function SupplierForm({ supplierId, onSubmit }: SupplierFormProps) {
  // Hooks at top
  const form = useForm<SupplierFormData>();
  const [isLoading, setIsLoading] = React.useState(false);

  // Handlers in middle
  async function handleSubmit(data: SupplierFormData) {
    setIsLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  }

  // JSX at bottom
  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {/* form fields */}
    </form>
  );
}
```

### Props Guidelines

1. Define explicit interface for props
2. Keep props shallow (max 5-7 props per component)
3. Destructure in function parameters
4. Use optional chaining for optional props

```typescript
// Good: Clear props
interface HeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
}

// Bad: Too many props, unclear purpose
function Header(title, subtitle, onClose, isSticky, bgColor, padding, rounded) {
  // hard to use
}
```

### Hooks Usage

- Custom hooks start with `use` prefix
- Extract logic into custom hooks if used twice or complex
- Place hooks at top of component
- Never call hooks conditionally

```typescript
// Good: Custom hook
function useSupplierBalance(supplierId: string) {
  const [balance, setBalance] = React.useState<SupplierBalance | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    async function fetchBalance() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/suppliers/${supplierId}`);
        const data = await response.json();
        setBalance(data.balance);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, [supplierId]);

  return { balance, isLoading };
}

// Usage
const { balance, isLoading } = useSupplierBalance(supplierId);
```

---

## API Route Standards

### Endpoint Structure

```typescript
// src/app/api/suppliers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Supplier } from '@prisma/client';

// GET /api/suppliers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const suppliers = await prisma.supplier.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// POST /api/suppliers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.code || !body.name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check for duplicates
    const existing = await prisma.supplier.findUnique({
      where: { code: body.code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Code already exists' },
        { status: 409 }
      );
    }

    // Create resource
    const supplier = await prisma.supplier.create({
      data: {
        code: body.code,
        name: body.name,
        type: body.type,
      },
    });

    return NextResponse.json(
      { success: true, data: supplier },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
```

### API Response Format

All endpoints must return consistent JSON:

```typescript
// Success response
{
  "success": true,
  "data": { /* resource or array */ },
  // optional for list endpoints:
  "total": 100,
  "hasMore": true
}

// Error response
{
  "success": false,
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

- **200**: GET success, data returned
- **201**: POST success, resource created
- **400**: Bad request (missing/invalid parameters)
- **404**: Resource not found
- **409**: Conflict (duplicate entry, etc.)
- **500**: Server error

### Error Handling

Always catch and log errors properly:

```typescript
try {
  // operation
} catch (error) {
  console.error('Descriptive error context:', error);
  return NextResponse.json(
    { success: false, error: 'User-friendly error message' },
    { status: 500 }
  );
}
```

---

## Prisma/Database Standards

### Schema Organization

Group models by feature with comments:

```prisma
// User & Auth
model User {
  // fields and relations
}

// Request Module
model Request {
  // fields and relations
}

// Supplier Module
model Supplier {
  // fields and relations
}
```

### Field Definitions

- Use appropriate data types
- Add indexes to frequently filtered fields
- Use `@default(now())` for timestamps
- Use `@updatedAt` for update tracking
- Always include `createdAt` and `updatedAt`

```prisma
model Supplier {
  id              String    @id @default(cuid())
  code            String    @unique
  name            String
  type            String
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  transactions    SupplierTransaction[]
  operators       Operator[]

  // Indexes for common queries
  @@index([type])
  @@index([isActive])
  @@index([code])
  @@map("suppliers")
}
```

### Query Best Practices

1. **Select needed fields only** (for performance):
```typescript
const suppliers = await prisma.supplier.findMany({
  select: { id: true, code: true, name: true },
});
```

2. **Include relations strategically**:
```typescript
const supplier = await prisma.supplier.findUnique({
  where: { id: supplierId },
  include: { transactions: { take: 10 } }, // Limit related records
});
```

3. **Use aggregations for calculations**:
```typescript
const costSum = await prisma.operator.aggregate({
  where: { supplierId },
  _sum: { totalCost: true },
});
```

4. **Paginate large result sets**:
```typescript
const suppliers = await prisma.supplier.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
});
```

---

## Styling Standards

### Tailwind CSS

- Use Tailwind classes exclusively
- No inline styles
- Use CSS variables for theme colors
- Leverage responsive prefixes (sm:, md:, lg:, xl:)

```tsx
// Good: Tailwind classes
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
  Submit
</button>

// Bad: Inline styles
<button style={{ padding: '8px 16px', background: 'blue' }}>
  Submit
</button>
```

### Component Styling

Use the `cn()` utility from `src/lib/utils.ts`:

```tsx
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function Button({ variant = 'primary', className }: ButtonProps) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md transition-colors',
        variant === 'primary' && 'bg-blue-600 hover:bg-blue-700 text-white',
        variant === 'secondary' && 'bg-gray-200 hover:bg-gray-300 text-gray-900',
        className // Allow prop-based overrides
      )}
    >
      {/* content */}
    </button>
  );
}
```

### Dark Mode

CSS variables are set up for dark mode. Use them:

```tsx
<div className="bg-white dark:bg-slate-950 text-black dark:text-white">
  {/* content */}
</div>
```

---

## Form Standards

### Using React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define validation schema
const supplierSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  paymentModel: z.enum(['PREPAID', 'PAY_PER_USE', 'CREDIT']),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export function SupplierForm() {
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: '',
      name: '',
      type: '',
      paymentModel: 'PREPAID',
    },
  });

  async function onSubmit(data: SupplierFormData) {
    const response = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create supplier');
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* shadcn/ui form fields */}
    </form>
  );
}
```

---

## Code Comments

### When to Comment

- **Complex business logic**: Explain the "why", not the "what"
- **Edge cases**: Document unusual conditions
- **Performance optimizations**: Explain trade-offs
- **TODO items**: Track future work

### Comment Format

```typescript
// Single line comment for brief explanations
// This explains why we're doing something unusual

/**
 * Multi-line comment for complex logic
 *
 * This function calculates the supplier balance by summing
 * deposits and refunds, then subtracting fees and costs.
 * Note: Adjustments are treated as deposits.
 */

// TODO: Implement retry logic when API fails
// FIXME: This query is slow with large datasets
```

### Avoid These Comments

```typescript
// Bad: States the obvious
const name = user.name; // Get the name
totalCost = costBeforeTax + vat; // Add VAX to cost

// Bad: Too vague
const x = calculateThing(); // Do something important
```

---

## Testing Standards

### Test File Organization

- Place tests next to the code they test
- Use `.test.ts` or `.spec.ts` suffix
- Organize tests by feature

```
src/lib/
├── supplier-balance.ts
├── supplier-balance.test.ts
└── __tests__/
    └── supplier-balance.test.ts
```

### Test Structure

```typescript
import { calculateSupplierBalance } from '@/lib/supplier-balance';

describe('calculateSupplierBalance', () => {
  it('should calculate balance correctly with deposits and costs', async () => {
    // Arrange
    const supplierId = 'test-supplier-id';

    // Act
    const result = await calculateSupplierBalance(supplierId);

    // Assert
    expect(result.balance).toBe(expectedAmount);
  });

  it('should handle zero transactions', async () => {
    // Test edge case
  });
});
```

---

## Error Handling

### User-Friendly Errors

Always provide context-specific error messages:

```typescript
// Good: Specific error message
return NextResponse.json(
  { success: false, error: 'Supplier code already exists. Please use a unique code.' },
  { status: 409 }
);

// Bad: Generic error
return NextResponse.json(
  { success: false, error: 'Error' },
  { status: 500 }
);
```

### Client-Side Error Handling

```typescript
try {
  const response = await fetch('/api/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const result = await response.json();
  return result.data;
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('Failed to create supplier:', message);
  // Show toast notification to user
}
```

---

## Performance Guidelines

1. **Memoization**: Use `React.memo()` for components receiving expensive props
2. **Lazy Loading**: Code split large features with `React.lazy()`
3. **Database Queries**: Always paginate and use indexes
4. **API Calls**: Cancel in-flight requests on component unmount
5. **Bundle Size**: Monitor with `npm run build` output

---

## Git & Commits

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

Types:
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **style**: Code style (no logic changes)
- **refactor**: Refactor code
- **test**: Add/update tests
- **chore**: Build, dependencies, etc.

Examples:
```
feat: add supplier balance calculation API
fix: correct VAT calculation in operator costs
docs: add API route documentation
refactor: extract supplier-balance logic into lib
```

---

## Code Review Checklist

Before submitting a PR:

- [ ] Code follows naming conventions
- [ ] TypeScript strict mode compliance
- [ ] Types are defined for functions/components
- [ ] Error handling is comprehensive
- [ ] API responses follow standard format
- [ ] Tailwind CSS used (no inline styles)
- [ ] Database queries optimized
- [ ] Tests added for new features
- [ ] README/docs updated if needed
- [ ] `npm run lint` and `npm run build` pass

---

## Tools & Configuration

- **ESLint**: Config in `eslintrc.json`
- **TypeScript**: Config in `tsconfig.json`
- **Tailwind**: Config in `tailwind.config.ts`
- **Prettier**: Format on save in IDE

Install IDE extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
