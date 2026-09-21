require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const featuredImage =
  'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=1600&q=80';
const socialImage =
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80';

const content = `SEO is no longer just about stuffing keywords into a page. In 2026, search engines reward clarity, expertise, and pages that genuinely help people take the next step.

## Why this matters for your business

If your website ranks but does not convert, you are paying for traffic that leaves empty-handed. A strong blog post should do three things:

1. Answer the searcher's question in the first screen
2. Prove you know the topic with specifics, not fluff
3. Guide the reader to a clear next action

## What Google looks for now

- **Topical depth** — cover the subject fully, not in shallow paragraphs
- **E-E-A-T signals** — experience, expertise, authority, and trust
- **Clean structure** — headings, short sections, scannable lists
- **Fast pages** — images optimized, no layout shift, mobile-first layout
- **Internal links** — connect related guides so users (and crawlers) stay in your ecosystem

## A simple publishing checklist

Before you hit publish, check:

- One primary keyword in the title and H1
- A meta description under 160 characters that earns the click
- A featured image with real context (not a random stock photo dump)
- Author name and a short bio for trust
- Categories and tags that match how your audience browses
- A related-post link so readers continue on-site

## Bottom line

Great SEO content is useful content with a searchable wrapper. Write for humans first, structure for crawlers second, and measure what actually brings leads — not vanity rankings alone.

If you are building multiple SEO websites from one backend, keep your posts published, structured, and ready to fetch from a public API so every site stays updated from a single source of truth.
`;

async function ensureAuthor() {
  const existing = await s
    .from('authors')
    .select('*')
    .eq('email', 'editor@backendseo.com')
    .maybeSingle();
  if (existing.data) return existing.data;
  const created = await s
    .from('authors')
    .insert({
      name: 'BackendSEO Editorial',
      email: 'editor@backendseo.com',
      bio: 'Practical SEO and content systems for multi-site publishers.',
      avatarUrl:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    })
    .select()
    .single();
  if (created.error) throw created.error;
  return created.data;
}

async function ensureCategory() {
  const existing = await s
    .from('categories')
    .select('*')
    .eq('slug', 'seo-strategy')
    .maybeSingle();
  if (existing.data) return existing.data;
  const created = await s
    .from('categories')
    .insert({
      name: 'SEO Strategy',
      slug: 'seo-strategy',
      description: 'Rankings, content systems, and search growth.',
    })
    .select()
    .single();
  if (created.error) throw created.error;
  return created.data;
}

async function ensureTags() {
  const tagDefs = [
    { name: 'SEO', slug: 'seo' },
    { name: 'Content Marketing', slug: 'content-marketing' },
    { name: 'Technical SEO', slug: 'technical-seo' },
  ];
  const ids = [];
  for (const t of tagDefs) {
    const existing = await s.from('tags').select('id').eq('slug', t.slug).maybeSingle();
    if (existing.data) ids.push(existing.data.id);
    else {
      const created = await s.from('tags').insert(t).select('id').single();
      if (created.error) throw created.error;
      ids.push(created.data.id);
    }
  }
  return ids;
}

async function main() {
  const author = await ensureAuthor();
  const category = await ensureCategory();
  const tagIds = await ensureTags();

  const slug = 'seo-content-that-ranks-and-converts-2026';
  const payload = {
    title: 'SEO Content That Ranks and Converts in 2026',
    slug,
    excerpt:
      'A practical playbook for writing blog posts that win search traffic and turn readers into leads — structure, E-E-A-T, and a publish checklist.',
    content,
    status: 'published',
    publishDate: new Date().toISOString(),
    featuredImage,
    socialSharingImage: socialImage,
    estimatedReadingTime: 4,
    metaTitle: 'SEO Content That Ranks and Converts in 2026 | BackendSEO',
    metaDescription:
      'Learn how to create SEO blog posts that rank in 2026: structure, E-E-A-T, on-page checklist, and conversion-focused writing.',
    metaKeywords: [
      'seo content',
      'blog seo',
      'content that converts',
      'eeat',
      'on-page seo',
    ],
    authorId: author.id,
  };

  const existingPost = await s.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
  let post;
  if (existingPost.data) {
    const updated = await s
      .from('blog_posts')
      .update({ ...payload, updatedAt: new Date().toISOString() })
      .eq('id', existingPost.data.id)
      .select()
      .single();
    if (updated.error) throw updated.error;
    post = updated.data;
  } else {
    const created = await s.from('blog_posts').insert(payload).select().single();
    if (created.error) throw created.error;
    post = created.data;
  }

  await s.from('blog_post_categories').delete().eq('postId', post.id);
  await s.from('blog_post_categories').insert({
    postId: post.id,
    categoryId: category.id,
  });

  await s.from('blog_post_tags').delete().eq('postId', post.id);
  if (tagIds.length) {
    await s
      .from('blog_post_tags')
      .insert(tagIds.map((tagId) => ({ postId: post.id, tagId })));
  }

  const welcome = await s
    .from('blog_posts')
    .select('id')
    .eq('slug', 'welcome-to-backendseo-blog')
    .maybeSingle();
  if (welcome.data) {
    await s.from('blog_post_related').delete().eq('postId', post.id);
    await s.from('blog_post_related').insert({
      postId: post.id,
      relatedPostId: welcome.data.id,
    });
  }

  const full = await s
    .from('blog_posts')
    .select(
      `
      id, title, slug, excerpt, status, publishDate, featuredImage, socialSharingImage,
      estimatedReadingTime, metaTitle, metaDescription, metaKeywords, content,
      author:authors(name, email, bio, avatarUrl),
      categories:blog_post_categories(category:categories(name, slug)),
      tags:blog_post_tags(tag:tags(name, slug))
    `,
    )
    .eq('id', post.id)
    .single();

  if (full.error) throw full.error;
  console.log(JSON.stringify(full.data, null, 2));
}

main().catch((e) => {
  console.error('FAIL', e.message || e);
  process.exit(1);
});
