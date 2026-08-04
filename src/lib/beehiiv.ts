export interface BeehiivBlogPost {
  id: string;
  slot: string;
  cat: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  thumbnail: string;
  url: string;
  art: string;
}

interface BeehiivPostResponse {
  data?: BeehiivPost[];
}

interface BeehiivPost {
  id?: string;
  title?: string;
  subtitle?: string;
  authors?: string[];
  status?: string;
  publish_date?: number | null;
  displayed_date?: number | null;
  thumbnail_url?: string | null;
  web_url?: string | null;
  content_tags?: string[];
  preview_text?: string | null;
  meta_default_description?: string | null;
  hidden_from_feed?: boolean;
}

const API_ORIGIN = 'https://api.beehiiv.com';

function requireServerSecret(name: 'BEEHIIV_API_KEY' | 'BEEHIIV_PUBLICATION_ID') {
  const value = import.meta.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to load the DMG publication.`);
  }

  return value;
}

function safeHttpUrl(value: string | null | undefined) {
  if (!value) return '';

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

function truncate(value: string, maximum = 190) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maximum) return normalized;

  const shortened = normalized.slice(0, maximum + 1);
  const wordBoundary = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, wordBoundary > maximum * 0.7 ? wordBoundary : maximum).trim()}…`;
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function inferCategory(post: BeehiivPost) {
  const tag = post.content_tags?.find(Boolean);
  if (tag) return titleCase(tag);

  const text = `${post.title ?? ''} ${post.subtitle ?? ''}`.toLowerCase();

  if (/\b(ai|scif|hpc)\b|data cent(?:er|re)|colocation|sovereign compute/.test(text)) {
    return 'AI Infrastructure';
  }

  if (/bitcoin|mining|hashrate|energy|power|utility|hydro|operational results/.test(text)) {
    return 'Bitcoin and Energy';
  }

  if (/digital asset|custody|settlement|blockseer|terra pool|crypto/.test(text)) {
    return 'Digital Assets';
  }

  return 'Company';
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp * 1000));
}

function normalizePost(post: BeehiivPost): BeehiivBlogPost | null {
  const id = post.id?.trim();
  const title = post.title?.trim();
  const url = safeHttpUrl(post.web_url);
  const timestamp = post.displayed_date ?? post.publish_date;

  if (!id || !title || !url || !timestamp) return null;

  const excerpt = truncate(
    post.subtitle ||
      post.meta_default_description ||
      post.preview_text ||
      'Read the latest update from DMG Blockchain Solutions.',
  );

  return {
    id,
    slot: `beehiiv-${id}`,
    cat: inferCategory(post),
    title,
    excerpt,
    author: post.authors?.filter(Boolean).join(', ') || 'DMG Blockchain',
    date: formatDate(timestamp),
    thumbnail: safeHttpUrl(post.thumbnail_url),
    url,
    art: `DMG publication — ${title}`,
  };
}

export async function getBeehiivPosts(limit = 12) {
  const apiKey = requireServerSecret('BEEHIIV_API_KEY');
  const publicationId = requireServerSecret('BEEHIIV_PUBLICATION_ID');
  const endpoint = new URL(`/v2/publications/${publicationId}/posts`, API_ORIGIN);

  endpoint.search = new URLSearchParams({
    status: 'confirmed',
    hidden_from_feed: 'false',
    order_by: 'displayed_date',
    direction: 'desc',
    limit: String(Math.max(limit, 20)),
  }).toString();

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Beehiiv posts request failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as BeehiivPostResponse;
  const now = Math.floor(Date.now() / 1000);
  const posts = (payload.data ?? [])
    .filter((post) => {
      const publishedAt = post.displayed_date ?? post.publish_date;
      return (
        post.status === 'confirmed' &&
        post.hidden_from_feed !== true &&
        typeof publishedAt === 'number' &&
        publishedAt <= now
      );
    })
    .map(normalizePost)
    .filter((post): post is BeehiivBlogPost => post !== null)
    .slice(0, limit);

  if (posts.length === 0) {
    throw new Error('Beehiiv returned no published, feed-visible posts.');
  }

  return posts;
}
