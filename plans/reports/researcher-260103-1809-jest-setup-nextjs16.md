# Jest Setup for Next.js 16 + React 19 + TypeScript

**Research Date:** 2026-01-03
**Project:** MyVivaTour (Next.js 16, React 19, Prisma 7, PostgreSQL)

---

## Executive Summary

Jest + Testing Library is officially recommended for Next.js 16 + React 19. React 19 deprecated `react-test-renderer`, making Testing Library the standard. Main setup: `jest.config.js` via `next/jest`, `jest.setup.ts` for DOM matchers, `@jest-environment node` for API routes. Prisma mocking: use `jest-mock-extended` + singleton pattern or dependency injection. No blocking compatibility issues with React 19 but watch for Suspense rendering gotchas.

---

## 1. Required Packages & Versions

**Install as dev dependencies:**

```bash
npm install -D \
  jest@29.7.0 \
  jest-environment-jsdom@29.7.0 \
  @testing-library/react@16 \
  @testing-library/dom@10 \
  @testing-library/jest-dom@6 \
  @types/jest@29 \
  ts-jest@29 \
  next-test-api-route-handler@4
```

**Optional (Prisma mocking):**

```bash
npm install -D jest-mock-extended@3
```

---

## 2. Jest Configuration (Next.js 16 App Router)

**jest.config.js** (CommonJS format required):

```js
/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.tsx",
  ],
};

module.exports = createJestConfig(customJestConfig);
```

**jest.setup.ts:**

```ts
import "@testing-library/jest-dom";
```

---

## 3. Testing App Router Components

**Example test** (`src/components/__tests__/Title.test.tsx`):

```tsx
import { render, screen } from "@testing-library/react";
import Title from "@/components/Title";

describe("Title", () => {
  it("renders heading text", () => {
    render(<Title text="Test" />);
    expect(screen.getByRole("heading", { name: "Test" })).toBeInTheDocument();
  });
});
```

**Key Points:**
- Test smaller components, not entire pages
- Use `render()` from `@testing-library/react`
- Server Components: use E2E tests (Playwright), not Jest
- For Suspense: wrap render in `await act()` on React 19

---

## 4. API Routes Testing (Next.js App Router)

**Add at top of test file:**

```ts
/**
 * @jest-environment node
 */
```

**Using next-test-api-route-handler (NTARH):**

```ts
/**
 * @jest-environment node
 */
import { testApiHandler } from "next-test-api-route-handler";
import * as handler from "@/app/api/suppliers/route";

describe("GET /api/suppliers", () => {
  it("returns supplier list", async () => {
    await testApiHandler({
      handler: handler.GET,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
      },
    });
  });
});
```

**Mocking Authentication:**

```ts
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(() => Promise.resolve({ user: { id: "123" } })),
}));
```

---

## 5. Prisma Mocking Pattern

**Singleton approach** (`src/lib/prisma-mock.ts`):

```ts
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

beforeEach(() => {
  mockReset(prismaMock);
});

export const prismaMock = jest.mocked(db) as unknown as DeepMockProxy<PrismaClient>;
```

**Test usage:**

```ts
import { prismaMock } from "@/lib/prisma-mock";

it("fetches supplier", async () => {
  prismaMock.supplier.findUnique.mockResolvedValue({
    id: "1",
    name: "Test Hotel",
    code: "HT-001",
    // ... other fields
  });

  const result = await getSupplier("1");
  expect(result.name).toBe("Test Hotel");
});
```

---

## 6. React 19 Compatibility Notes

| Issue | Solution |
|-------|----------|
| `@testing-library/react@16` needed | Explicitly install `@testing-library/dom@10` (moved to peer dep) |
| Suspense fallback stuck rendering | Wrap in `await act()` or use E2E tests for async components |
| `react-test-renderer` deprecated | Use `@testing-library/react` only |
| Peer dependency warnings | Add `"overrides": { "react": "19.x" }` in `package.json` if needed |

---

## 7. Package.json Setup

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@testing-library/react": "^16.x",
    "@testing-library/dom": "^10.x",
    "@testing-library/jest-dom": "^6.x",
    "@types/jest": "^29.x",
    "ts-jest": "^29.x",
    "jest-mock-extended": "^3.x",
    "next-test-api-route-handler": "^4.x"
  }
}
```

---

## 8. Directory Structure

```
src/
├── __tests__/              # Global test utilities
│   └── setup.ts
├── app/
│   └── api/
│       └── suppliers/
│           ├── route.ts
│           └── route.test.ts  (@jest-environment node)
├── components/
│   └── __tests__/
│       └── Title.test.tsx
├── lib/
│   ├── db.ts
│   └── __mocks__/
│       └── db.ts
jest.config.js
jest.setup.ts
```

---

## 9. Quick Start Checklist

- [ ] Install packages (see §1)
- [ ] Create `jest.config.js` (see §2)
- [ ] Create `jest.setup.ts` (see §2)
- [ ] Add `test` scripts to `package.json` (see §7)
- [ ] Create `src/lib/__mocks__/db.ts` for Prisma mocking (see §5)
- [ ] Write first component test (see §3)
- [ ] Write first API route test with `@jest-environment node` (see §4)
- [ ] Run `npm test` to verify setup

---

## 10. Best Practices

1. **Use `next-test-api-route-handler`** for API routes—it precisely emulates Next.js routing
2. **Always mock Prisma** in unit tests; use E2E tests for integration
3. **Test small, focused units**—not entire pages
4. **Keep Server Components E2E tested** (Jest has no async SC support)
5. **Wrap Suspense renders in `await act()`** on React 19
6. **Use dependency injection** for cleaner mocking of services

---

## Resources

- [Next.js Jest Testing](https://nextjs.org/docs/app/guides/testing/jest)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Prisma Testing Guide](https://www.prisma.io/blog/testing-series-1-8eRB5p0Y8o)
- [next-test-api-route-handler](https://www.npmjs.com/package/next-test-api-route-handler)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)

---

**Unresolved Questions:** None. All key setup aspects covered; project can proceed with configuration.
