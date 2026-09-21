# Setup Supabase for BackendSEO

Old project `alqrpjoglptmblfakoia` is **dead** (DNS gone). Create a new one.

## A) Create project (2 minutes)

1. Open https://supabase.com/dashboard → **New project**
2. Name: `backendseo`
3. Set a **Database password** (save it)
4. Region: closest to you
5. Create project → wait until ready

## B) Copy keys

**Settings → API Keys** (or Project Settings → API):

- Project URL → `SUPABASE_URL`  
  example: `https://abcdefgh.supabase.co`
- Publishable / anon key → `SUPABASE_PUBLISHABLE_KEY`
- Secret / service_role key → `SUPABASE_SECRET_KEY`

JWKS (auto):
`https://YOUR-REF.supabase.co/auth/v1/.well-known/jwks.json`

## C) Create tables

**SQL Editor → New query** → paste all of [`supabase/schema.sql`](../supabase/schema.sql) → **Run**

## D) Auto-wire env + admin user (local)

PowerShell from repo root:

```powershell
$env:SUPABASE_URL="https://YOUR-REF.supabase.co"
$env:SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
$env:SUPABASE_SECRET_KEY="sb_secret_..."
$env:SUPABASE_DB_PASSWORD="your-db-password"
$env:SUPABASE_DB_REGION="ap-south-1"
$env:ADMIN_EMAIL="admin@backendseo.com"
$env:ADMIN_PASSWORD="AdminSeo@2026!"
node scripts/setup-supabase.js
```

This writes `.env` + `admin/.env`, applies schema (if DB password works), creates login user.

## E) Production (Render + Vercel)

### Render (`backendseo` service)
1. **Resume** the service
2. Update env:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_JWKS_URL`
   - `CORS_ORIGINS=https://backendseo-admin.vercel.app`
3. Redeploy

### Vercel (`backendseo-admin`)
Update:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_URL=https://backendseo.onrender.com`

Redeploy admin.

### Supabase Auth URLs
Authentication → URL Configuration:
- Site URL: `https://backendseo-admin.vercel.app`
- Redirect: `https://backendseo-admin.vercel.app/**`

## F) Login

- Admin: https://backendseo-admin.vercel.app/login  
- Email/password from step D

---

**Paste here after creating project:**

```
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_DB_PASSWORD=
SUPABASE_DB_REGION=
```

Main phir env + schema + admin user + Vercel/Render update complete kar dunga.
