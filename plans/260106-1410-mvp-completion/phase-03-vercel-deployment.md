# Phase 03: Deploy to Vercel Free

**Status**: pending | **Effort**: 1-2h

## Objective

Deploy app to Vercel Free tier with Supabase production database.

---

## Tasks

### 3.1 Vercel Account Setup (15m)

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub account
3. Import repository

---

### 3.2 Environment Variables (15m)

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Supabase production connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` | Min 32 chars |
| `AUTH_URL` | `https://your-app.vercel.app` | Production URL |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Same as AUTH_URL |
| `ANTHROPIC_API_KEY` | `sk-ant-xxx` | Claude API key |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `xxx@iam.gserviceaccount.com` | For Sheets sync |
| `GOOGLE_PRIVATE_KEY` | `-----BEGIN...` | Escape newlines |
| `GOOGLE_SHEET_ID` | `1abc123...` | Spreadsheet ID |

**Supabase Connection String**:
- Go to Supabase Dashboard → Settings → Database
- Copy "Connection string" (use pooler for serverless)
- Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`

---

### 3.3 Build Configuration (15m)

**vercel.json** (optional, for custom settings):

```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "regions": ["sin1"]
}
```

**next.config.ts** - Ensure output is correct:

```typescript
const nextConfig = {
  // No 'output: export' - need server for API routes
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};
```

---

### 3.4 Database Migration (15m)

**Option A: Push schema to production**

```bash
# Set production DATABASE_URL temporarily
DATABASE_URL="postgresql://..." npx prisma db push
```

**Option B: Use Prisma Migrate (recommended for production)**

```bash
npx prisma migrate deploy
```

---

### 3.5 Seed Production Data (15m)

After deployment, run seed for admin user:

```bash
# In Vercel, use "Functions" log or local with prod DB
DATABASE_URL="postgresql://..." npx prisma db seed
```

Or create admin manually via Supabase SQL Editor:

```sql
INSERT INTO users (id, email, name, role, password, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@myvivatour.com',
  'Admin',
  'ADMIN',
  '$2a$10$...', -- bcrypt hash of your password
  NOW(),
  NOW()
);
```

---

### 3.6 Deploy & Verify (15m)

1. Push to GitHub → Vercel auto-deploys
2. Check deployment logs for errors
3. Visit production URL
4. Login with admin credentials
5. Test critical paths:
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] Create request
   - [ ] View suppliers

---

## Verification Checklist

- [ ] App accessible at Vercel URL
- [ ] Login works with production credentials
- [ ] Database connected (data shows)
- [ ] API routes return data
- [ ] No console errors

## Free Tier Limits

| Resource | Vercel Free | Supabase Free |
|----------|-------------|---------------|
| Bandwidth | 100GB/month | 2GB |
| Serverless | 100GB-hours | N/A |
| Database | N/A | 500MB |
| Projects | 1 | 2 |

## Troubleshooting

### Build fails with Prisma error

```bash
# Add to build command
prisma generate && next build
```

### Database connection timeout

Use Supabase pooler URL with `?pgbouncer=true`

### AUTH_SECRET error

Ensure it's at least 32 characters

## Output

- App deployed at `https://your-app.vercel.app`
- Production database migrated
- Admin user created
