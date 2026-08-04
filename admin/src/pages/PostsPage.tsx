import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { postsApi } from '../api/blog';
import type { BlogPost, PostStatus } from '../api/types';

export function PostsPage() {
  const [items, setItems] = useState<BlogPost[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PostStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await postsApi.list({
        search: search || undefined,
        status,
        limit: 50,
      });
      setItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDelete(id: string) {
    if (!confirm('Delete this post?')) return;
    try {
      await postsApi.remove(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Posts</h2>
          <p>Create and publish blog content.</p>
        </div>
        <Link className="btn btn-primary" to="/posts/new">
          New post
        </Link>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="toolbar">
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="search">Search</label>
          <input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title or excerpt"
          />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PostStatus | '')}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ alignSelf: 'end' }}
          onClick={() => void load()}
        >
          Filter
        </button>
      </div>

      <div className="panel table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">No posts yet. Create your first draft.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Author</th>
                <th>Reading</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div>{p.title}</div>
                    <div className="muted">{p.slug}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${p.status}`}>{p.status}</span>
                  </td>
                  <td className="muted">{p.author?.name || '—'}</td>
                  <td className="muted">{p.estimatedReadingTime} min</td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn btn-secondary" to={`/posts/${p.id}`}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => void onDelete(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
