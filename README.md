# BackendSEO — Blog API + Content Admin

NestJS blog API (Supabase) + React admin CMS for content editors.

## 1. API setup

1. Copy env keys in root `.env` (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, …).
2. Create tables once: Supabase **SQL Editor** → run [`supabase/schema.sql`](supabase/schema.sql).
3. Start API:

```bash
npm run start:dev
```

API: `http://localhost:3000`

## 2. Admin CMS (content upload UI)

Give editors this app to manage posts, authors, categories, tags, images, and comments.

```bash
cd admin
npm install
npm run dev
```

Admin: `http://localhost:5173`  
API URL is set in [`admin/.env`](admin/.env) as `VITE_API_URL=http://localhost:3000`.

**Note:** v1 has no login. Anyone who can open the admin URL can write to the API. Add auth before production.

### What editors can do

- Create / edit / delete posts (draft, scheduled, published)
- Assign author, categories, tags, related posts
- Upload featured + social-sharing images
- Manage authors, categories, tags
- Approve / delete comments

## Deploy

See **[DEPLOY.md](DEPLOY.md)** — Render (API) + Vercel (Admin).


| What | Link |
|------|------|
| Published posts JSON | http://localhost:3000/public/posts |
| One post by slug | http://localhost:3000/public/posts/slug/pawan |
| Sample JSON file | [`docs/sample-published-posts.json`](docs/sample-published-posts.json) |
| Full API docs | [`docs/public-api.md`](docs/public-api.md) |
| Pasteable blog page | [`website/`](website/) → open with `npx serve website -p 5174` |

Admin CMS (upload): http://localhost:5173 (login required — see [`docs/admin-auth.md`](docs/admin-auth.md))  
Public blog (read): http://localhost:5174

