# Admin Auth (Supabase)

## Create an editor user

1. Supabase Dashboard → **Authentication** → **Users** → **Add user**
2. Email + password (auto-confirm if needed)
3. Open admin: http://localhost:5173/login
4. Sign in with that email/password

## How it works

- Admin login uses Supabase Auth (`signInWithPassword`)
- Every `/blog/*` admin API call sends `Authorization: Bearer <access_token>`
- Nest verifies the JWT with `SUPABASE_JWKS_URL`
- `/public/*` blog API stays open (no login) for websites

## Env

Root `.env` already has:

- `SUPABASE_URL`
- `SUPABASE_JWKS_URL`
- `SUPABASE_SECRET_KEY` (server DB client)

Admin `admin/.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_URL`
