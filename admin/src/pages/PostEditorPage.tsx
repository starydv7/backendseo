import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mediaUrl } from '../api/client';
import {
  authorsApi,
  categoriesApi,
  commentsApi,
  postsApi,
  tagsApi,
} from '../api/blog';
import type {
  Author,
  BlogPost,
  Category,
  Comment,
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
  featuredImage: string;
  socialSharingImage: string;
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
  featuredImage: '',
  socialSharingImage: '',
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function estimateReadingTime(content: string): number {
  const words = content
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
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
  const pendingImages = useRef<{ featured: File | null; social: File | null }>({
    featured: null,
    social: null,
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const readingMinutes = estimateReadingTime(form.content);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [insertingImage, setInsertingImage] = useState(false);

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
        setComments(await commentsApi.listByPost(data.id));
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
          featuredImage: data.featuredImage ?? '',
          socialSharingImage: data.socialSharingImage ?? '',
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
      slug: slugify(form.slug) || undefined,
      excerpt: form.excerpt.trim() || undefined,
      content: form.content,
      status: form.status,
      publishDate: fromLocalInput(form.publishDate),
      authorId: form.authorId || undefined,
      categoryIds: form.categoryIds,
      tagIds: form.tagIds,
      relatedPostIds: form.relatedPostIds,
      featuredImage: form.featuredImage.trim(),
      socialSharingImage: form.socialSharingImage.trim(),
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
      if (payload.status === 'published' && !payload.publishDate) {
        payload.publishDate = new Date().toISOString();
      }
      if (payload.status === 'scheduled') {
        if (!payload.publishDate) {
          throw new Error('Scheduled posts need a future publish date.');
        }
        if (new Date(payload.publishDate).getTime() <= Date.now()) {
          throw new Error('Publish date must be in the future for scheduled posts.');
        }
      }
      if (pendingImages.current.featured) {
        setUploading('featured');
        const uploaded = await postsApi.uploadImage(pendingImages.current.featured);
        payload.featuredImage = uploaded.url;
        pendingImages.current.featured = null;
        setForm((f) => ({ ...f, featuredImage: uploaded.url }));
      }
      if (pendingImages.current.social) {
        setUploading('social');
        const uploaded = await postsApi.uploadImage(pendingImages.current.social);
        payload.socialSharingImage = uploaded.url;
        pendingImages.current.social = null;
        setForm((f) => ({ ...f, socialSharingImage: uploaded.url }));
      }
      if (isNew) {
        const created = await postsApi.create(payload);
        setMessage('Post created.');
        navigate(`/posts/${created.id}`, { replace: true });
      } else {
        const updated = await postsApi.update(id!, payload);
        setPost(updated);
        setComments(await commentsApi.listByPost(updated.id));
        setForm((f) => ({
          ...f,
          status: updated.status,
          publishDate: toLocalInput(updated.publishDate),
          featuredImage: updated.featuredImage ?? '',
          socialSharingImage: updated.socialSharingImage ?? '',
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

  async function onUpload(kind: 'featured' | 'social', file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    setError('');
    setMessage('');
    try {
      let url = '';
      if (!isNew && id) {
        const updated =
          kind === 'featured'
            ? await postsApi.uploadFeatured(id, file)
            : await postsApi.uploadSocial(id, file);
        setPost(updated);
        url =
          (kind === 'featured'
            ? updated.featuredImage
            : updated.socialSharingImage) ?? '';
      } else {
        const uploaded = await postsApi.uploadImage(file);
        url = uploaded.url;
      }
      pendingImages.current[kind] = null;
      setForm((f) =>
        kind === 'featured'
          ? { ...f, featuredImage: url }
          : { ...f, socialSharingImage: url },
      );
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

  async function insertContentImage(file: File | undefined) {
    if (!file) return;
    setInsertingImage(true);
    setError('');
    setMessage('');
    try {
      const uploaded = await postsApi.uploadImage(file);
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      const snippet = `\n\n![${alt}](${uploaded.url})\n\n`;
      const el = contentRef.current;
      const start = el?.selectionStart ?? form.content.length;
      const end = el?.selectionEnd ?? start;
      const next =
        form.content.slice(0, start) + snippet + form.content.slice(end);
      setForm((f) => ({ ...f, content: next }));
      setMessage('Image inserted into the content. Save or publish to keep it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not insert image');
    } finally {
      setInsertingImage(false);
    }
  }

  async function onDeleteComment(commentId: string) {
    if (!id || !confirm('Delete this comment?')) return;
    setError('');
    try {
      await commentsApi.remove(commentId);
      setComments(await commentsApi.listByPost(id));
      setMessage('Comment deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading) return <div className="empty">Loading post…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{isNew ? 'New post' : 'Edit post'}</h2>
          <p>
            Estimated reading time: {readingMinutes} min
            {isNew ? ' · save as draft, schedule, or publish' : ''}
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
            <label htmlFor="slug">Slug (optional, saved as lowercase)</label>
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
          <div className="row-actions">
            <label className={`btn btn-secondary ${insertingImage ? 'disabled' : ''}`}>
              {insertingImage ? 'Uploading image…' : 'Insert image in content'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={insertingImage || saving}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void insertContentImage(file);
                }}
              />
            </label>
          </div>
          <span className="muted">
            Click in the text where the image should appear, then insert it.
            The image is saved as a public link inside the content.
          </span>
          <textarea
            id="content"
            ref={contentRef}
            required
            style={{ minHeight: 260 }}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <ContentImages content={form.content} />
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
            <span className="muted">
              {form.status === 'scheduled'
                ? 'Needs a future publish date. It goes live automatically at that time.'
                : form.status === 'published'
                  ? 'Visible on websites immediately.'
                  : 'Hidden from websites until you publish or schedule it.'}
            </span>
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
            <label htmlFor="metaTitle">Meta title ({form.metaTitle.length}/60)</label>
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

        <div className="grid-2">
          <ImageField
            id="featuredImage"
            label="Featured image"
            value={form.featuredImage}
            busy={uploading === 'featured'}
            disabled={uploading !== null || saving}
            onChange={(value) => setForm({ ...form, featuredImage: value })}
            onFile={(file) => {
              pendingImages.current.featured = file;
            }}
            onUpload={(file) => void onUpload('featured', file)}
          />
          <ImageField
            id="socialSharingImage"
            label="Social sharing image"
            value={form.socialSharingImage}
            busy={uploading === 'social'}
            disabled={uploading !== null || saving}
            onChange={(value) =>
              setForm({ ...form, socialSharingImage: value })
            }
            onFile={(file) => {
              pendingImages.current.social = file;
            }}
            onUpload={(file) => void onUpload('social', file)}
          />
        </div>

        <div className="field">
          <label htmlFor="metaDescription">
            Meta description ({form.metaDescription.length}/160)
          </label>
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
          <h3 style={{ margin: 0 }}>Comments</h3>
          <p className="muted" style={{ margin: 0 }}>
            Visitor comments on this post. They appear on websites as soon as they are posted.
          </p>
          {comments.length === 0 ? (
            <div className="empty">No comments yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Author</th>
                    <th>Comment</th>
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
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => void onDeleteComment(c.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ContentImages({ content }: { content: string }) {
  const urls = Array.from(
    content.matchAll(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g),
    (match) => match[1],
  );
  if (urls.length === 0) return null;
  return (
    <div className="content-images">
      <span className="muted">
        {urls.length} image{urls.length === 1 ? '' : 's'} inside this post
      </span>
      <div className="content-image-row">
        {urls.map((url) => (
          <img key={url} src={url} alt="" />
        ))}
      </div>
    </div>
  );
}

function ImageField({
  id,
  label,
  value,
  busy,
  disabled,
  onChange,
  onFile,
  onUpload,
}: {
  id: string;
  label: string;
  value: string;
  busy: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onFile: (file: File | null) => void;
  onUpload: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const preview =
    localPreview || (value.trim() ? mediaUrl(value.trim()) || value : null);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        placeholder="https://..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.files?.[0] ?? null;
          setFile(next);
          onFile(next);
          setLocalPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return next ? URL.createObjectURL(next) : null;
          });
          if (next) onUpload(next);
        }}
      />
      <div className="row-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled || !file}
          onClick={() => {
            if (file) onUpload(file);
          }}
        >
          {busy ? 'Uploading…' : 'Upload image'}
        </button>
      </div>
      <span className="muted">
        {value.startsWith('/uploads/')
          ? 'This file is only on the API server, so other websites cannot show it. Choose the image again.'
          : file
            ? busy
              ? `Uploading ${file.name}…`
              : value.startsWith('http')
                ? 'Uploaded. Save or publish so the website uses this link.'
                : `${file.name} is selected.`
            : 'Paste an https link, or choose a file. Uploads become a public image link.'}
      </span>
      {preview ? <img className="image-preview" src={preview} alt={label} /> : null}
    </div>
  );
}
