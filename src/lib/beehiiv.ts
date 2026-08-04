import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5';

interface HtmlAttribute {
  name: string;
  value: string;
}

interface HtmlNode {
  nodeName: string;
  tagName?: string;
  attrs?: HtmlAttribute[];
  childNodes?: HtmlNode[];
  value?: string;
}

export interface BeehiivBlogPost {
  id: string;
  slug: string;
  slot: string;
  cat: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  publishedAt: string;
  thumbnail: string;
  url: string;
  sourceUrl: string;
  art: string;
  contentHtml: string;
  readTime: string;
}

interface BeehiivPostResponse {
  data?: BeehiivPost[];
  total_pages?: number;
}

interface BeehiivPost {
  id?: string;
  slug?: string;
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
  content?: {
    free?: {
      web?: string;
    };
  };
}

const API_ORIGIN = 'https://api.beehiiv.com';
const POSTS_PER_PAGE = 100;
const REMOVED_ELEMENTS = new Set([
  'script',
  'style',
  'link',
  'meta',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'svg',
  'canvas',
  'noscript',
  'source',
]);
const SAFE_ATTRIBUTES = new Set([
  'href',
  'src',
  'alt',
  'title',
  'target',
  'rel',
  'width',
  'height',
  'colspan',
  'rowspan',
  'allowfullscreen',
  'loading',
  'decoding',
]);
const EMBED_HOSTS = new Set([
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
]);

let publishedPostsRequest: Promise<BeehiivBlogPost[]> | undefined;

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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
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

function findElement(node: HtmlNode, predicate: (node: HtmlNode) => boolean): HtmlNode | undefined {
  if (predicate(node)) return node;

  for (const child of node.childNodes ?? []) {
    const match = findElement(child, predicate);
    if (match) return match;
  }

  return undefined;
}

function attribute(node: HtmlNode, name: string) {
  return node.attrs?.find((item) => item.name === name)?.value;
}

function rewriteArticleUrl(value: string) {
  if (/^(?:\/|#|\.\/|\.\.\/)/.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    const postMatch = url.pathname.match(/^\/p\/([^/]+)\/?$/);

    if (host === 'dmgblockchain.com' && postMatch) {
      return `/insights/${postMatch[1]}`;
    }

    if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return url.href;
  } catch {
    return '';
  }

  return '';
}

function sanitizeAttributes(node: HtmlNode) {
  const tagName = node.tagName ?? '';
  const clean = (node.attrs ?? []).filter(({ name, value }) => {
    if (!SAFE_ATTRIBUTES.has(name)) return false;

    if (name === 'href') return Boolean(rewriteArticleUrl(value));
    if (name === 'src') {
      const source = safeHttpUrl(value);
      if (!source) return false;
      if (tagName === 'iframe') return EMBED_HOSTS.has(new URL(source).hostname);
    }

    if (name === 'target') return value === '_blank';
    return true;
  });

  for (const item of clean) {
    if (item.name === 'href') item.value = rewriteArticleUrl(item.value);
  }

  if (tagName === 'a') {
    const href = clean.find((item) => item.name === 'href')?.value ?? '';
    const isExternal = /^https?:\/\//.test(href);

    if (isExternal) {
      if (!clean.some((item) => item.name === 'target')) {
        clean.push({ name: 'target', value: '_blank' });
      }
      const rel = clean.find((item) => item.name === 'rel');
      if (rel) rel.value = 'noopener noreferrer';
      else clean.push({ name: 'rel', value: 'noopener noreferrer' });
    } else {
      const targetIndex = clean.findIndex((item) => item.name === 'target');
      if (targetIndex >= 0) clean.splice(targetIndex, 1);
    }
  }

  if (tagName === 'img') {
    if (!clean.some((item) => item.name === 'alt')) clean.push({ name: 'alt', value: '' });
    if (!clean.some((item) => item.name === 'loading')) {
      clean.push({ name: 'loading', value: 'lazy' });
    }
    if (!clean.some((item) => item.name === 'decoding')) {
      clean.push({ name: 'decoding', value: 'async' });
    }
  }

  if (tagName === 'iframe' && !clean.some((item) => item.name === 'loading')) {
    clean.push({ name: 'loading', value: 'lazy' });
  }

  node.attrs = clean;
}

function sanitizeTree(node: HtmlNode) {
  if (node.tagName) sanitizeAttributes(node);

  node.childNodes = (node.childNodes ?? []).filter((child) => {
    if (child.tagName && REMOVED_ELEMENTS.has(child.tagName)) return false;
    if (child.tagName === 'iframe') {
      const source = safeHttpUrl(attribute(child, 'src'));
      if (!source || !EMBED_HOSTS.has(new URL(source).hostname)) return false;
    }
    sanitizeTree(child);
    return true;
  });
}

function collectText(node: HtmlNode): string {
  if (node.nodeName === '#text') return node.value ?? '';
  return (node.childNodes ?? []).map(collectText).join(' ');
}

function prepareArticleContent(source: string | undefined) {
  if (!source) return { html: '', wordCount: 0 };

  const document = parse(source) as unknown as HtmlNode;
  const content = findElement(document, (node) => attribute(node, 'id') === 'content-blocks');
  if (!content) return { html: '', wordCount: 0 };

  sanitizeTree(content);
  const text = collectText(content).replace(/\s+/g, ' ').trim();
  const html = serialize(content as unknown as DefaultTreeAdapterMap['parentNode']).trim();

  return {
    html,
    wordCount: text ? text.split(/\s+/).length : 0,
  };
}

function normalizePost(post: BeehiivPost): BeehiivBlogPost | null {
  const id = post.id?.trim();
  const title = post.title?.trim();
  const sourceUrl = safeHttpUrl(post.web_url);
  const timestamp = post.displayed_date ?? post.publish_date;
  const slug = post.slug?.trim() || sourceUrl.match(/\/p\/([^/?#]+)/)?.[1] || '';

  if (!id || !title || !sourceUrl || !timestamp || !slug) return null;

  const excerpt = truncate(
    post.subtitle ||
      post.meta_default_description ||
      post.preview_text ||
      'Read the latest update from DMG Blockchain Solutions.',
  );
  const content = prepareArticleContent(post.content?.free?.web);

  return {
    id,
    slug,
    slot: `beehiiv-${id}`,
    cat: inferCategory(post),
    title,
    excerpt,
    author: post.authors?.filter(Boolean).join(', ') || 'DMG Blockchain',
    date: formatDate(timestamp),
    publishedAt: new Date(timestamp * 1000).toISOString(),
    thumbnail: safeHttpUrl(post.thumbnail_url),
    url: `/insights/${slug}`,
    sourceUrl,
    art: `DMG publication — ${title}`,
    contentHtml: content.html || `<p>${escapeHtml(excerpt)}</p>`,
    readTime: `${Math.max(1, Math.ceil(content.wordCount / 220))} min read`,
  };
}

async function fetchPostsPage(page: number) {
  const apiKey = requireServerSecret('BEEHIIV_API_KEY');
  const publicationId = requireServerSecret('BEEHIIV_PUBLICATION_ID');
  const endpoint = new URL(`/v2/publications/${publicationId}/posts`, API_ORIGIN);

  endpoint.search = new URLSearchParams({
    status: 'confirmed',
    hidden_from_feed: 'false',
    order_by: 'displayed_date',
    direction: 'desc',
    limit: String(POSTS_PER_PAGE),
    page: String(page),
  }).toString();
  endpoint.searchParams.append('expand[]', 'free_web_content');

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Beehiiv posts request failed with HTTP ${response.status} on page ${page}.`);
  }

  return (await response.json()) as BeehiivPostResponse;
}

async function fetchPublishedPosts() {
  const firstPage = await fetchPostsPage(1);
  const totalPages = Math.max(1, firstPage.total_pages ?? 1);
  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchPostsPage(index + 2)),
  );
  const now = Math.floor(Date.now() / 1000);
  const posts = [firstPage, ...remainingPages]
    .flatMap((payload) => payload.data ?? [])
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
    .filter((post): post is BeehiivBlogPost => post !== null);

  if (posts.length === 0) {
    throw new Error('Beehiiv returned no published, feed-visible posts.');
  }

  return posts;
}

export function getBeehiivArticles() {
  publishedPostsRequest ??= fetchPublishedPosts();
  return publishedPostsRequest;
}

export async function getBeehiivPosts(limit = 12) {
  const posts = await getBeehiivArticles();
  return posts.slice(0, Math.max(1, limit));
}
