import { useEffect, useState } from 'react';
import { commentsApi, postsApi } from '../api/blog';
import type { BlogPost, Comment } from '../api/types';

export function CommentsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postId, setPostId] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await postsApi.list({ limit: 100 });
        setPosts(res.data);
        if (res.data[0]) setPostId(res.data[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load posts');
      }
    })();
  }, []);

  useEffect(() => {
    if (!postId) {
      setComments([]);
      return;
    }
    void (async () => {
      setLoading(true);
      setError('');
      try {
        setComments(await commentsApi.listByPost(postId));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load comments');
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  async function approve(id: string) {
    try {
      await commentsApi.approve(id);
      setComments(await commentsApi.listByPost(postId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this comment?')) return;
    try {
      await commentsApi.remove(id);
      setComments(await commentsApi.listByPost(postId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Comments</h2>
          <p>Comments go live on websites immediately. Delete spam if needed.</p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="toolbar">
        <div className="field" style={{ minWidth: 280 }}>
          <label htmlFor="post">Post</label>
          <select
            id="post"
            value={postId}
            onChange={(e) => setPostId(e.target.value)}
          >
            {posts.length === 0 ? (
              <option value="">No posts</option>
            ) : (
              posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="panel table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !postId ? (
          <div className="empty">Create a post first.</div>
        ) : comments.length === 0 ? (
          <div className="empty">No comments on this post.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Author</th>
                <th>Content</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div>{c.authorName}</div>
                    <div className="muted">{c.authorEmail}</div>
                  </td>
                  <td>{c.content}</td>
                  <td>
                    <span
                      className={`badge ${c.isApproved ? 'badge-published' : 'badge-draft'}`}
                    >
                      {c.isApproved ? 'approved' : 'pending'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {!c.isApproved ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => void approve(c.id)}
                        >
                          Approve
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => void remove(c.id)}
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
