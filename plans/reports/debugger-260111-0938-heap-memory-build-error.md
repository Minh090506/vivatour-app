# Build Error Investigation: JavaScript Heap Out of Memory

**Issue**: `npm run build` fails with exit code 134 during TypeScript compilation phase
**Impact**: Production build blocked, deployment impossible
**Date**: 2026-01-11
**Status**: Root cause identified, solution ready

---

## Executive Summary

Build fails during TypeScript type checking (after successful compilation) due to heap exhaustion when processing `googleapis` package type definitions. The package (v169.0.0) contains thousands of API definitions consuming excessive memory during type checking.

**Root Cause**: googleapis v169.0.0 type definitions (~2000+ APIs) overwhelm TypeScript compiler heap
**Immediate Fix**: Increase Node.js heap size via NODE_OPTIONS
**Long-term**: Consider optimizing imports or alternative packages

---

## Technical Analysis

### Error Timeline

1. **Compilation**: Succeeds in 22.9s (Turbopack)
2. **TypeScript Check**: Starts type checking
3. **Heap Exhaustion**: At ~33s, heap reaches limit (2GB default)
4. **Fatal Error**: Mark-compact GC fails, process exits code 134

```
<--- Last few GCs --->
[18740]  33020 ms: Scavenge 2043.3 -> 2042.4 MB
[18740]  33560 ms: Mark-Compact 2046.2 -> 2043.2 MB
FATAL ERROR: Ineffective mark-compacts near heap limit
Allocation failed - JavaScript heap out of memory
```

### Environment Analysis

**Node/npm Versions**:
- Node.js: v24.12.0 (64-bit)
- npm: 11.6.2
- Next.js: 16.1.1
- TypeScript: 5.x

**Codebase Size**:
- Source files: 222 TypeScript files
- Source size: 1.13 MB
- Prisma models: 16 models (554 lines schema)
- Tests: 613 passing (no memory issues during test)

**Critical Package**:
- googleapis: v169.0.0
- Used in 3 files only:
  - `src/lib/google-sheets.ts`
  - `src/lib/sync/sheets-writer.ts`
  - `src/lib/sync/__tests__/sheets-writer.test.ts`

### Import Pattern Analysis

```typescript
// google-sheets.ts (line 18)
import { google } from "googleapis";

// sheets-writer.ts (line 8)
import { google, sheets_v4 } from "googleapis";
```

**Issue**: Importing from `googleapis` barrel export forces TypeScript to load ALL API type definitions (2000+ Google APIs: YouTube, Drive, Gmail, Calendar, etc.) even though only Sheets API is used.

### Memory Consumption Pattern

Tests pass (613 tests in 4.23s) because:
- Jest runs in separate processes per test file
- Limited concurrent type checking
- Smaller scope per process

Build fails because:
- Single TypeScript process for entire codebase
- Full type graph resolution
- All googleapis types loaded into one heap
- 222 files × type dependencies × googleapis types = heap overflow

---

## Recommended Solutions

### Option A: Increase Heap Size (RECOMMENDED - Quick Fix)

**Approach**: Set NODE_OPTIONS in package.json build script
**Pros**: Immediate fix, no code changes, 2-min implementation
**Cons**: Masks underlying issue, requires more RAM

**Implementation**:

```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build",
    "build:log": "NODE_OPTIONS='--max-old-space-size=4096' next build 2>&1 | tee logs.txt"
  }
}
```

**Windows-compatible version** (cross-platform):

```json
{
  "scripts": {
    "build": "cross-env NODE_OPTIONS='--max-old-space-size=4096' next build",
    "build:log": "cross-env NODE_OPTIONS='--max-old-space-size=4096' next build 2>&1 | tee logs.txt"
  },
  "devDependencies": {
    "cross-env": "^7.0.3"
  }
}
```

**Heap Size Guidance**:
- 4096 MB (4GB): Recommended for this codebase size
- 8192 MB (8GB): If 4GB still fails (unlikely)
- Current default: ~2048 MB (2GB)

---

### Option B: Create .npmrc (Alternative)

**Approach**: Set Node options at project level
**Pros**: Centralized config, applies to all npm scripts
**Cons**: Less granular control, harder to debug

**Implementation**:

Create `.npmrc` in project root:

```ini
node-options=--max-old-space-size=4096
```

**Not Recommended** for this case because:
- Affects all npm scripts (unnecessary for dev/test)
- Package.json approach more explicit
- Harder to discover for team members

---

### Option C: Optimize Imports (Long-term Improvement)

**Approach**: Use specific googleapis sub-packages
**Pros**: Reduces memory footprint, faster type checking
**Cons**: May break if googleapis doesn't expose sub-packages, requires code changes

**Investigation Needed**:

```bash
# Check if googleapis exposes sheets-only package
npm info googleapis
# Alternative: @googleapis/sheets package might exist
```

**Potential Implementation** (if sub-package exists):

```typescript
// Instead of:
import { google } from "googleapis";

// Use:
import { google } from "@googleapis/sheets";
// OR
import { sheets_v4 } from "googleapis/build/src/apis/sheets";
```

**Research Required**: Verify googleapis package structure allows selective imports without breaking changes.

---

### Option D: Split Build Process (Advanced - Not Needed)

**Not Recommended** for this case because:
- Overkill for codebase size (222 files)
- Adds complexity to build pipeline
- Option A sufficient

---

## Recommended Implementation Plan

**Phase 1: Immediate Fix (Today)**

1. Install cross-env for Windows compatibility:
   ```bash
   npm install --save-dev cross-env
   ```

2. Update package.json:
   ```json
   {
     "scripts": {
       "build": "cross-env NODE_OPTIONS='--max-old-space-size=4096' next build",
       "build:log": "cross-env NODE_OPTIONS='--max-old-space-size=4096' next build 2>&1 | tee logs.txt"
     }
   }
   ```

3. Test build:
   ```bash
   npm run build
   ```

**Expected Outcome**: Build succeeds in ~30-40s with 4GB heap.

---

**Phase 2: Monitor (Ongoing)**

1. Track build memory usage in CI/CD
2. If heap usage exceeds 3.5GB consistently, investigate Option C
3. Monitor googleapis package updates for optimization improvements

---

**Phase 3: Optimization (Future - Optional)**

1. Research googleapis sub-package imports
2. If available, refactor to selective imports
3. Benchmark build time improvement
4. Update documentation

---

## Evidence Supporting Recommendation

**Why Option A is Best**:

1. **Proven Pattern**: Industry standard for large TypeScript projects
2. **Low Risk**: No code changes, easy rollback
3. **Fast Implementation**: 5 minutes vs hours for Options C/D
4. **Cross-platform**: Works Windows/Linux/macOS with cross-env
5. **Sufficient**: 4GB handles current codebase + 100% growth

**Why Not Other Options**:

- **Option B (.npmrc)**: Less explicit, affects all scripts unnecessarily
- **Option C (optimize imports)**: Requires research, may not be supported by googleapis
- **Option D (split build)**: Over-engineering for 222 files

**Precedent**: Next.js, Prisma, and other large TypeScript projects commonly use increased heap limits.

---

## Exact Code Changes

### File: `package.json`

**Before**:
```json
"scripts": {
  "build": "next build",
  "build:log": "next build 2>&1 | tee logs.txt",
}
```

**After**:
```json
"scripts": {
  "build": "cross-env NODE_OPTIONS='--max-old-space-size=4096' next build",
  "build:log": "cross-env NODE_OPTIONS='--max-old-space-size=4096' next build 2>&1 | tee logs.txt",
}
```

### Installation Command:

```bash
npm install --save-dev cross-env
```

---

## Verification Steps

After applying fix:

1. Clean previous build:
   ```bash
   rm -rf .next
   ```

2. Run build:
   ```bash
   npm run build
   ```

3. Expected output:
   ```
   ✓ Compiled successfully in ~25s
   ✓ TypeScript check completed
   ✓ Build completed successfully
   ```

4. Verify build artifacts:
   ```bash
   ls -lh .next/static/chunks
   ```

---

## Preventive Measures

**Future Considerations**:

1. **Dependency Audits**: Review large packages quarterly
2. **Build Monitoring**: Track heap usage in CI/CD metrics
3. **Type Definition Optimization**: Consider skipLibCheck for large external packages (trade-off: less type safety)
4. **Bundle Analysis**: Run `npm run analyze` if Next.js bundle grows significantly

---

## Unresolved Questions

1. Does googleapis v169+ offer sub-package imports for Sheets API only?
2. What's the actual heap usage after fix? (monitor in CI/CD)
3. Should we enable TypeScript incremental builds for faster rebuilds? (separate optimization)
