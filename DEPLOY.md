# Deploy Backend + Admin

Repo: `https://github.com/starydv7/backendseo`

Recommended: **Render (API)** + **Vercel (Admin)**

---

## 1) Deploy API on Render

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**  
   OR **New Web Service** → connect `starydv7/backendseo`
2. Settings:
   - **Runtime:** Docker (uses root `Dockerfile`)
   - **Branch:** `main`
3. Add environment variables:

| Key | Value |
|-----|--------|
| `SUPABASE_URL` | your Supabase URL |
| `SUPABASE_PUBLISHABLE_KEY` | publishable key |
| `SUPABASE_SECRET_KEY` | secret key |
| `SUPABASE_JWKS_URL` | `https://PROJECT.supabase.co/auth/v1/.well-known/jwks.json` |
| `CORS_ORIGINS` | your admin URL (after Vercel deploy), e.g. `https://backendseo-admin.vercel.app` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `UPLOAD_DEST` | `./uploads` |

4. Deploy → copy the API URL, e.g. `https://backendseo-api.onrender.com`

Health check: `GET https://YOUR-API.onrender.com/health`

Public posts: `https://YOUR-API.onrender.com/public/posts`

---

## 2) Deploy Admin on Vercel

1. [https://vercel.com/new](https://vercel.com/new) → import `starydv7/backendseo`
2. **Root Directory:** `admin`
3. Framework: Vite
4. Environment variables (Build + Runtime):

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://YOUR-API.onrender.com` (no trailing slash) |
| `VITE_SUPABASE_URL` | same Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable key |

5. Deploy → open `https://YOUR-ADMIN.vercel.app/login`

6. Go back to Render and set `CORS_ORIGINS` to that admin URL, then **redeploy API**.

---

## 3) Supabase Auth (admin login)

1. Supabase → **Authentication** → **Users** → **Add user** (email + password, auto-confirm)
2. Supabase → **Authentication** → **URL Configuration**
   - **Site URL:** your Vercel admin URL
   - **Redirect URLs:** `https://YOUR-ADMIN.vercel.app/**`
3. Login at `/login`

---

## 4) Optional: Netlify for Admin

- Base directory: `admin`
- Build: `npm run build`
- Publish: `dist`
- Same `VITE_*` env vars as above

---

## Notes

- `/public/*` stays open for SEO websites.
- `/blog/*` needs Supabase JWT (admin login).
- Uploaded images on Render’s free disk are **ephemeral** (can reset on redeploy). For production images, move to Supabase Storage later.
- Free Render services sleep after idle; first request may be slow.

---

## Local vs Production URLs

| App | Local | Production |
|-----|-------|------------|
| API | `http://localhost:3000` | `https://….onrender.com` |
| Admin | `http://localhost:5173` | `https://….vercel.app` |
| Public JSON | `/public/posts` | same path on API host |
