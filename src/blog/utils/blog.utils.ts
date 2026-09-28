export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function absoluteMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = (
    process.env.PUBLIC_API_URL || 'https://backendseo-1-8ldp.onrender.com'
  ).replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

/** Image URLs placed inside the post body (Markdown or HTML). */
export function extractContentImages(content: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/gi,
    /<img[^>]*\ssrc=["'](https?:\/\/[^"']+)["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) found.add(match[1]);
    }
  }
  return Array.from(found);
}

/** Rough estimate: ~200 words per minute. */
export function estimateReadingTime(content: string): number {
  const words = content
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
