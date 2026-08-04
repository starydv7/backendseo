import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { authorsApi } from '../api/blog';
import type { Author, CreateAuthorInput } from '../api/types';

const empty: CreateAuthorInput = {
  name: '',
  email: '',
  bio: '',
  avatarUrl: '',
};

export function AuthorsPage() {
  const [items, setItems] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Author | null>(null);
  const [form, setForm] = useState<CreateAuthorInput>(empty);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setItems(await authorsApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load authors');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(author: Author) {
    setEditing(author);
    setForm({
      name: author.name,
      email: author.email,
      bio: author.bio ?? '',
      avatarUrl: author.avatarUrl ?? '',
    });
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        bio: form.bio?.trim() || undefined,
        avatarUrl: form.avatarUrl?.trim() || undefined,
      };
      if (editing) await authorsApi.update(editing.id, body);
      else await authorsApi.create(body);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this author?')) return;
    try {
      await authorsApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Authors</h2>
          <p>People who write and own blog posts.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          New author
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="panel table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">No authors yet. Create one to assign on posts.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Bio</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="muted">{a.email}</td>
                  <td className="muted">{a.bio || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openEdit(a)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => void onDelete(a.id)}
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

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3>{editing ? 'Edit author' : 'New author'}</h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </header>
            <form className="form-stack" onSubmit={(e) => void onSubmit(e)}>
              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="avatarUrl">Avatar URL</label>
                <input
                  id="avatarUrl"
                  value={form.avatarUrl}
                  onChange={(e) =>
                    setForm({ ...form, avatarUrl: e.target.value })
                  }
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
