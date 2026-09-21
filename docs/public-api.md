# Public Blog API — links for SEO websites

Base URL (local): `http://localhost:3000`  
Replace with your live API domain in production.

## Links to use on websites

| Purpose | Method | URL |
|--------|--------|-----|
| **All published posts (blog list)** | GET | `http://localhost:3000/public/posts` |
| **Full post (everything + comments)** | GET | `http://localhost:3000/public/posts/{slugOrId}` |
| **One post by slug** | GET | `http://localhost:3000/public/posts/slug/{slug}` |
| **Comments only (nested)** | GET | `http://localhost:3000/public/posts/{slugOrId}/comments` |
| **Submit a comment (pending moderation)** | POST | `http://localhost:3000/public/posts/{slugOrId}/comments` |
| Featured/social image file | GET | `http://localhost:3000/uploads/{filename}` |

Full post response includes: content, author, categories, tags, relatedPosts, nested approved comments, `commentCount`, and `shareUrl`.

Examples with your current data:

- List: http://localhost:3000/public/posts
- Detail: http://localhost:3000/public/posts/slug/pawan
- Image: http://localhost:3000/uploads/186af40a-ad79-4617-ad6c-ba233dbfae68.jpg

Query params on list:

- `?page=1&limit=20`
- `?search=keyword`
- `?categoryId={uuid}`
- `?tagId={uuid}`

## Sample JSON

See [`sample-published-posts.json`](sample-published-posts.json) — same shape the API returns after you upload/publish from the admin.

## Ready blog page (paste on any SEO site)

Copy [`website/`](../website/) files onto your site, set `API_URL` in `config.js`, open `index.html`.

Or open local preview:

```bash
# API must be running on :3000
npx --yes serve website -p 5174
```

Then open: http://localhost:5174

## Fetch example (any website)

```js
const API = 'http://localhost:3000';

// Blog listing
const list = await fetch(`${API}/public/posts`).then(r => r.json());
console.log(list.data); // array of posts

// Single post page
const post = await fetch(`${API}/public/posts/slug/pawan`).then(r => r.json());
document.title = post.metaTitle || post.title;
```

## Admin vs Public

| App | URL | Who |
|-----|-----|-----|
| Admin CMS (upload content) | http://localhost:5173 | Editors |
| Public blog page | http://localhost:5174 | Visitors / SEO sites |
| JSON API | http://localhost:3000/public/posts | Any website |
