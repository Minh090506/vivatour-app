# MyVivaTour Platform - Setup Guide

## Overview

This guide will walk you through setting up the complete MyVivaTour platform:

1. **Database Setup** - PostgreSQL with Supabase (free)
2. **Module Development** - Request, Operator, Revenue modules
3. **Google Sheets Integration** - Sync with existing spreadsheets
4. **AI Integration** - Claude AI + Gmail API

---

## STEP 1: Database Setup (Supabase)

### 1.1 Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Create a new organization (e.g., "MyVivaTour")

### 1.2 Create New Project

1. Click "New Project"
2. Fill in details:
   - **Name**: `vivatour-db`
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Singapore (closest to Vietnam)
3. Click "Create new project"
4. Wait 2-3 minutes for setup

### 1.3 Get Connection String

1. Go to **Settings** (gear icon) → **Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual password

### 1.4 Configure Environment

1. Open the `.env` file in your project
2. Update the `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

### 1.5 Run Database Migration

Open terminal in project folder and run:

```bash
cd C:\Users\Admin\Projects\company-workflow-app\vivatour-app
npx prisma db push
```

This will create all tables in Supabase.

### 1.6 Generate Prisma Client

```bash
npx prisma generate
```

### 1.7 Verify Setup

```bash
npx prisma studio
```

This opens a web interface to view your database.

---

## STEP 2: Develop Modules

### 2.1 Request Module

Files to create:
- `src/app/(dashboard)/requests/page.tsx` - Main list page
- `src/app/api/requests/route.ts` - API endpoints
- `src/components/requests/RequestForm.tsx` - Form component
- `src/components/requests/RequestTable.tsx` - Table component

### 2.2 Operator Module

Files to create:
- `src/app/(dashboard)/operator/page.tsx` - Main page
- `src/app/api/operator/route.ts` - API endpoints
- `src/components/operator/OperatorForm.tsx` - Form component
- `src/components/operator/ServiceList.tsx` - Service list

### 2.3 Revenue Module

Files to create:
- `src/app/(dashboard)/revenue/page.tsx` - Main page
- `src/app/api/revenue/route.ts` - API endpoints
- `src/components/revenue/RevenueForm.tsx` - Form component
- `src/components/revenue/RevenueList.tsx` - Revenue list

---

## STEP 3: Google Sheets Integration

### 3.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name: `vivatour-sheets`
4. Click "Create"

### 3.2 Enable Google Sheets API

1. Go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click "Enable"

### 3.3 Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Name: `vivatour-sync`
4. Click "Create and Continue"
5. Role: Select "Editor"
6. Click "Done"

### 3.4 Get Credentials JSON

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON"
5. Download the file
6. Rename to `google-credentials.json`
7. Place in project root (but DO NOT commit to git!)

### 3.5 Share Google Sheets

1. Open each Google Sheet (Request, Operator, Revenue)
2. Click "Share"
3. Add the service account email (from credentials JSON)
4. Give "Editor" permission

### 3.6 Configure Environment

Add to `.env`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@vivatour-sheets.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Sheet IDs (from URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit)
SHEET_ID_REQUEST="your-request-sheet-id"
SHEET_ID_OPERATOR="your-operator-sheet-id"
SHEET_ID_REVENUE="your-revenue-sheet-id"
```

---

## STEP 4: AI Integration

### 4.1 Get Anthropic API Key

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to "API Keys"
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)

### 4.2 Gmail API Setup

1. In Google Cloud Console, enable "Gmail API"
2. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Add redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Download credentials

### 4.3 Configure Environment

Add to `.env`:

```env
# Anthropic (Claude AI)
ANTHROPIC_API_KEY="sk-ant-your-api-key"

# Gmail OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# NextAuth
NEXTAUTH_SECRET="generate-a-random-string-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 4.4 Generate NextAuth Secret

Run in terminal:
```bash
openssl rand -base64 32
```
Use the output as `NEXTAUTH_SECRET`.

---

## Quick Reference - All Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres"

# Google Sheets
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

# NextAuth
NEXTAUTH_SECRET="xxx"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Troubleshooting

### Database Connection Error
- Check if Supabase project is active
- Verify password in connection string
- Ensure IP is not blocked (Supabase Settings → Database → Network)

### Google Sheets Access Denied
- Verify service account email is shared on the sheet
- Check if API is enabled in Google Cloud Console

### AI Not Responding
- Verify API key is correct
- Check usage limits on Anthropic console

---

## Next Steps After Setup

1. Run `npm run dev` to start the app
2. Open `http://localhost:3000`
3. Test each module
4. Deploy to production (Vercel recommended)
