import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mediaUrl } from '../api/client';
import {
  authorsApi,
  categoriesApi,
  postsApi,
  tagsApi,
} from '../api/blog';
import type {
  Author,
  BlogPost,
  Category,
  CreatePostInput,
  PostStatus,
  Tag,
} from '../api/types';

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: PostStatus;
  publishDate: string;
  authorId: string;
  categoryIds: string[];
  tagIds: string[];
  relatedPostIds: string[];
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
};

const emptyForm: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  status: 'draft',
  publishDate: '',
  authorId: '',
  categoryIds: [],
  tagIds: [],
  relatedPostIds: [],
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

export function PostEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'featured' | 'social' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [a, c, t, p] = await Promise.all([
          authorsApi.list(),
          categoriesApi.list(),
          tagsApi.list(),
          postsApi.list({ limit: 100 }),
        ]);
        setAuthors(a);
        setCategories(c);
        setTags(t);
        setAllPosts(p.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load options');
      }
    })();
  }, []);

  useEffect(() => {
    if (isNew) return;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await postsApi.get(id!);
        setPost(data);
        setForm({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt ?? '',
          content: data.content,
          status: data.status,
          publishDate: toLocalInput(data.publishDate),
          authorId: data.authorId ?? data.author?.id ?? '',
          categoryIds: (data.categories ?? []).map((x) => x.id),
          tagIds: (data.tags ?? []).map((x) => x.id),
          relatedPostIds: (data.relatedPosts ?? []).map((x) => x.id),
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          metaKeywords: (data.metaKeywords ?? []).join(', '),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const relatedChoices = useMemo(
    () => allPosts.filter((p) => p.id !== post?.id),
    [allPosts, post?.id],
  );

  function toggleId(
    key: 'categoryIds' | 'tagIds' | 'relatedPostIds',
    value: string,
  ) {
    setForm((prev) => {
      const set = new Set(prev[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [key]: Array.from(set) };
    });
  }

  function buildPayload(): CreatePostInput {
    const keywords = form.metaKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    return {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim() || undefined,
      content: form.content,
      status: form.status,
      publishDate: fromLocalInput(form.publishDate),
      authorId: form.authorId || undefined,
      categoryIds: form.categoryIds,
      tagIds: form.tagIds,
      relatedPostIds: form.relatedPostIds,
      metaTitle: form.metaTitle.trim() || undefined,
      metaDescription: form.metaDescription.trim() || undefined,
      metaKeywords: keywords.length ? keywords : undefined,
    };
  }

  async function onSubmit(e: FormEvent, forceStatus?: PostStatus) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = buildPayload();
      if (forceStatus) payload.status = forceStatus;
      if (isNew) {
        const created = await postsApi.create(payload);
        setMessage('Post created. Scroll down to upload images.');
        navigate(`/posts/${created.id}`, { replace: true });
      } else {
        const updated = await postsApi.update(id!, payload);
        setPost(updated);
        setForm((f) => ({
          ...f,
          status: updated.status,
        }));
        setMessage(
          updated.status === 'published' ? 'Post published.' : 'Post saved.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(
    kind: 'featured' | 'social',
    file: File | undefined,
  ) {
    if (!file || isNew || !id) {
      setError('Save the post first, then upload images.');
      return;
    }
    setUploading(kind);
    setError('');
    setMessage('');
    try {
      const updated =
        kind === 'featured'
          ? await postsApi.uploadFeatured(id, file)
          : await postsApi.uploadSocial(id, file);
      setPost(updated);
      setMessage(
        kind === 'featured'
          ? 'Featured image uploaded.'
          : 'Social sharing image uploaded.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  if (loading) return <div className="empty">Loading post…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{isNew ? 'New post' : 'Edit post'}</h2>
          <p>
            {isNew
              ? 'Create a draft, then add images and publish.'
              : `Reading time ~${post?.estimatedReadingTime ?? 1} min`}
          </p>
        </div>
        <Link className="btn btn-secondary" to="/posts">
          Back to list
        </Link>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      <form
        id="post-editor-form"
        className="panel form-stack"
        onSubmit={(e) => void onSubmit(e)}
      >
        <div className="grid-2">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="slug">Slug (optional)</label>
            <input
              id="slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="excerpt">Excerpt</label>
          <textarea
            id="excerpt"
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            required
            style={{ minHeight: 260 }}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </div>

        <div className="grid-3">
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as PostStatus })
              }
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="publishDate">Publish date</label>
            <input
              id="publishDate"
              type="datetime-local"
              value={form.publishDate}
              onChange={(e) =>
                setForm({ ...form, publishDate: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="authorId">Author</label>
            <select
              id="authorId"
              value={form.authorId}
              onChange={(e) => setForm({ ...form, authorId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Categories</label>
            <div className="check-grid">
              {categories.length === 0 ? (
                <span className="muted">No categories yet</span>
              ) : (
                categories.map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={form.categoryIds.includes(c.id)}
                      onChange={() => toggleId('categoryIds', c.id)}
                    />
                    {c.name}
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="field">
            <label>Tags</label>
            <div className="check-grid">
              {tags.length === 0 ? (
                <span className="muted">No tags yet</span>
              ) : (
                tags.map((t) => (
                  <label key={t.id}>
                    <input
                      type="checkbox"
                      checked={form.tagIds.includes(t.id)}
                      onChange={() => toggleId('tagIds', t.id)}
                    />
                    {t.name}
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="field">
          <label>Related posts</label>
          <div className="check-grid">
            {relatedChoices.length === 0 ? (
              <span className="muted">No other posts yet</span>
            ) : (
              relatedChoices.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={form.relatedPostIds.includes(p.id)}
                    onChange={() => toggleId('relatedPostIds', p.id)}
                  />
                  {p.title}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="metaTitle">Meta title</label>
            <input
              id="metaTitle"
              value={form.metaTitle}
              onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="metaKeywords">Meta keywords (comma-separated)</label>
            <input
              id="metaKeywords"
              value={form.metaKeywords}
              onChange={(e) =>
                setForm({ ...form, metaKeywords: e.target.value })
              }
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="metaDescription">Meta description</label>
          <textarea
            id="metaDescription"
            value={form.metaDescription}
            onChange={(e) =>
              setForm({ ...form, metaDescription: e.target.value })
            }
          />
        </div>

        <div className="row-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving
              ? 'Saving…'
              : isNew
                ? 'Create post'
                : form.status === 'published'
                  ? 'Save & publish'
                  : 'Save changes'}
          </button>
          {!isNew ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() =>
                void onSubmit(
                  { preventDefault() {} } as FormEvent,
                  'published',
                )
              }
            >
              Publish now
            </button>
          ) : null}
        </div>
      </form>

      {!isNew && post ? (
        <div className="panel form-stack" style={{ marginTop: '1rem' }}>
          <h3 style={{ margin: 0 }}>Upload images</h3>
          <p className="muted" style={{ margin: 0 }}>
            Pick a file, then click Upload. Preview appears below after success.
          </p>
          <div className="grid-2">
            <ImageUploadField
              label="Featured image"
              currentUrl={mediaUrl(post.featuredImage)}
              busy={uploading === 'featured'}
              disabled={uploading !== null}
              onUpload={(file) => void onUpload('featured', file)}
            />
            <ImageUploadField
              label="Social sharing image"
              currentUrl={mediaUrl(post.socialSharingImage)}
              busy={uploading === 'social'}
              disabled={uploading !== null}
              onUpload={(file) => void onUpload('social', file)}
            />
          </div>
        </div>
      ) : (
        <div className="panel form-stack" style={{ marginTop: '1rem' }}>
          <p className="muted" style={{ margin: 0 }}>
            Image upload buttons appear here after you click <strong>Create post</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

function ImageUploadField({
  label,
  currentUrl,
  busy,
  disabled,
  onUpload,
}: {
  label: string;
  currentUrl: string | null;
  busy: boolean;
  disabled: boolean;
  onUpload: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div className="row-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={disabled || !file}
          onClick={() => {
            if (file) onUpload(file);
          }}
        >
          {busy ? 'Uploading…' : `Upload ${label.toLowerCase()}`}
        </button>
      </div>
      {currentUrl ? (
        <img className="image-preview" src={currentUrl} alt={label} />
      ) : null}
    </div>
  );
}
