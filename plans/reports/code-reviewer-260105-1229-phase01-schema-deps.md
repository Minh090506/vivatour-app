# Code Review: Phase 01 - Schema + Dependencies

## Scope
- Files reviewed: 2 (prisma/schema.prisma, package.json)
- Changes: Schema modifications (OPERATOR role, password field), dependency upgrades
- Review focus: Phase 01 implementation - security, architecture, YAGNI/KISS
- Updated plans: None (pending Phase 01 completion)

## Overall Assessment
**Status**: Phase 01 changes are INCOMPLETE - blocking critical issue found.

Changes align with plan requirements but **migration NOT executed**. Schema changes in code without DB sync creates type/runtime mismatch risk.

## Critical Issues

### C1: Migration Not Executed
**Severity**: CRITICAL - Blocks all subsequent phases
**Issue**: Schema changes committed without running migration
- DB still has 3-role enum (ADMIN, SELLER, ACCOUNTANT)
- Prisma client generated from new schema expects 4 roles
- Runtime mismatch will cause errors when querying User.role

**Evidence**:
```
npx prisma migrate status
→ No migration found in prisma/migrations
→ The current database is not managed by Prisma Migrate
```

**Required Actions**:
1. Run `npx prisma migrate dev --name add-operator-role-password`
2. Or `npx prisma db push` (if using prototype db without migration history)
3. Verify with `npx prisma migrate status`
4. Update Phase 01 success criteria checklist

### C2: Default Role Removed Without Seed Data
**Severity**: HIGH - Data integrity risk
**Issue**: Removed `@default(SELLER)` per validation decision BUT no seed script exists yet
- Existing users may have NULL role if migrated incorrectly
- New user creation will fail without explicit role assignment
- Phase 01 plan doesn't include seed script (deferred to Phase 02)

**Risk**: If migration runs before seed exists, existing rows without role will violate NOT NULL constraint.

**Mitigation Options**:
1. Add `@default(SELLER)` back temporarily until seed script ready (Phase 02)
2. Or verify existing users all have roles before migration
3. Document in Phase 02 handoff

**Recommendation**: Keep `@default(SELLER)` until Phase 02 seed ready, THEN remove in Phase 02 migration.

## High Priority Findings

### H1: NextAuth v5 Beta Stability
**Issue**: Using beta version (5.0.0-beta.30) in production-adjacent environment
**Risk**: Breaking changes between beta releases without semver protection

**Current**: `"next-auth": "^5.0.0-beta.30"` (caret allows beta.31, beta.32...)
**Recommendation**: Pin exact version without caret
```json
"next-auth": "5.0.0-beta.30"
```

**Rationale**: Beta releases don't follow semver - ^5.0.0-beta.30 could install beta.40 with breaking changes.

### H2: Password Field Security - Type Confusion
**Issue**: password nullable (String?) without enforcement at creation
**Risk**: User records created without password will fail auth silently

**Missing Validation**: No constraint ensures password exists when user logs in with credentials
**Future Risk**: If OAuth added later, password=null is valid, but credential login will break

**Recommendation**: Add to Phase 02 validation:
```typescript
// In Credentials provider authorize()
if (!user.password) {
  throw new Error('User account not configured for password login')
}
```

## Medium Priority Improvements

### M1: Dependencies - Unused Package Installed Early
**Issue**: react-resizable-panels installed in Phase 01 but not used until Phase 06
**YAGNI Violation**: Installing dependencies before needed

**Current**: All 4 packages installed together
**Better**: Install auth packages now, defer react-resizable-panels to Phase 06

**Impact**: Low - adds ~100KB to node_modules early, minimal build overhead
**Recommendation**: Document in Phase 06 as dependency or move install command there

### M2: Enum Order - Inconsistent Pattern
**Issue**: OPERATOR added at end, not alphabetical
**Current**: ADMIN, SELLER, ACCOUNTANT, OPERATOR
**Alphabetical**: ACCOUNTANT, ADMIN, OPERATOR, SELLER

**Justification in Plan**: "avoid migration issues"
**Analysis**: Valid - enum value order affects DB storage in some systems
**Recommendation**: Add comment in schema explaining non-alphabetical order
```prisma
enum Role {
  ADMIN
  SELLER
  ACCOUNTANT
  OPERATOR  // Added at end to avoid enum reordering migration issues
}
```

## Low Priority Suggestions

### L1: TypeScript Build Success - No Type Errors
**Positive**: Build passed cleanly despite schema changes
**Observation**: No existing code references Role enum values directly in type assertions
**Recommendation**: None - good isolation

### L2: bcryptjs vs bcrypt Choice
**Decision**: Used bcryptjs (pure JS) instead of bcrypt (native)
**Rationale**: Avoid native compilation issues
**Trade-off**: ~30% slower hashing, but negligible at 10 rounds
**Recommendation**: Document in security standards if not already present

## Positive Observations

1. **Schema Design**: Clean separation - password nullable supports future OAuth
2. **Dependency Versions**: Specific versions chosen (not `latest`)
3. **Build Hygiene**: TypeScript strict mode passes, no type errors introduced
4. **Documentation**: Phase plan clearly documents rationale for choices (bcryptjs, role order)
5. **Validation Applied**: Correctly removed `@default(SELLER)` per user validation decision

## Recommended Actions

**Immediate (before Phase 02)**:
1. ⚠️ **Run migration**: `npx prisma migrate dev --name add-operator-role-password`
2. ⚠️ **Verify migration**: Check `prisma/migrations/` folder created
3. Consider: Restore `@default(SELLER)` temporarily until Phase 02 seed ready
4. Pin NextAuth version: Remove caret from package.json (`5.0.0-beta.30`)
5. Update Phase 01 checklist - mark migration steps complete

**Phase 02 Handoff**:
1. Add password validation in Credentials provider authorize()
2. Create seed script for admin user with password
3. If deferring default removal, migrate `@default(SELLER)` removal to Phase 02

**Phase 06 Handoff**:
1. Verify react-resizable-panels installed (or install then if removed now)

## Metrics
- Type Coverage: 100% (TypeScript strict mode enabled, build passes)
- Linting Issues: 0 (schema files not linted)
- Migration Status: ❌ NOT RUN (critical blocker)
- Test Coverage: N/A (no code changes, schema only)

## Task Completeness: Phase 01 Status

**Per phase-01-schema-dependencies.md TODO list**:

- [x] Update Role enum in schema.prisma (add OPERATOR)
- [x] Add password field to User model
- [x] Run npm install for new packages
- [ ] ❌ **Run prisma migrate dev** - NOT DONE
- [ ] ❌ **Verify prisma generate succeeds** - Generated but without migration
- [x] Verify npm run build passes

**Completion**: 4/6 tasks (67%)

**Blocking Issues**: Migration not executed

---

## Unresolved Questions

1. Is database currently managed by Prisma Migrate or using `db push` workflow?
2. Do existing User records all have non-null role values? (Check before migration)
3. Should `@default(SELLER)` be restored until seed script exists in Phase 02?
4. Is react-resizable-panels needed in Phase 01 or can install be deferred to Phase 06?
