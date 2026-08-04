import { parse } from 'parse5';
import defaults from '../src/data/default-content.json' with { type: 'json' };

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN;
const beehiivApiKey = process.env.BEEHIIV_API_KEY;
const beehiivPublicationId = process.env.BEEHIIV_PUBLICATION_ID;

if (!projectId || !token) {
  throw new Error('SANITY_PROJECT_ID and SANITY_API_TOKEN are required.');
}

function textContent(node) {
  if (node.nodeName === '#text') return node.value || '';
  return (node.childNodes || []).map(textContent).join(' ');
}

function normalizedText(node) {
  return textContent(node).replace(/\s+/g, ' ').trim();
}

function attribute(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value || '';
}

function walk(node, visitor) {
  visitor(node);
  for (const child of node.childNodes || []) walk(child, visitor);
}

function contentSection(document) {
  const sections = [];
  walk(document, (node) => {
    if (node.tagName === 'section') sections.push(node);
  });
  return sections.sort((left, right) => normalizedText(right).length - normalizedText(left).length)[0];
}

function hasTag(node, tagName) {
  if (node.tagName === tagName) return true;
  return (node.childNodes || []).some((child) => hasTag(child, tagName));
}

function keyFor(value, index) {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72)}-${index}`;
}

async function fetchDocument(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'DMG website content migration' } });
  if (!response.ok) throw new Error(`Unable to load ${url}: HTTP ${response.status}`);
  return parse(await response.text());
}

async function migrateLegalPage({ slug, title, url }) {
  const document = await fetchDocument(url);
  const section = contentSection(document);
  const paragraphs = [];

  walk(section, (node) => {
    if (node.tagName !== 'p') return;
    const text = normalizedText(node);
    if (!text || text === title || text === 'DMG Blockchain Solutions Inc. Privacy Policy') return;
    if (paragraphs.at(-1)?.text === text) return;

    const numberedHeading = /^\d+\.?\s*[A-Z][A-Z\s&/-]+$/.test(text);
    const allCapsHeading = text.length < 120 && /[A-Z]/.test(text) && text === text.toUpperCase();
    const strongHeading = text.length < 120 && hasTag(node, 'strong');
    paragraphs.push({
      _key: keyFor(slug, paragraphs.length),
      _type: 'legalBlock',
      style: numberedHeading || allCapsHeading || strongHeading ? 'heading' : 'paragraph',
      text,
    });
  });

  return {
    _id: `legal-${slug}`,
    _type: 'legalPage',
    title,
    slug: { _type: 'slug', current: slug },
    sourceUrl: url,
    blocks: paragraphs,
  };
}

function cleanLabel(value) {
  return value.replace(/\s+(download-simple|link)$/i, '').replace(/\s+/g, ' ').trim();
}

function financialCategory(label) {
  if (/\|\s*FS$/i.test(label)) return 'Financial Statements';
  if (/MD&A/i.test(label)) return 'MD&A';
  if (/Transcript/i.test(label)) return 'Transcript';
  if (/Annual Information Form/i.test(label)) return 'AIF';
  if (/Call/i.test(label)) return 'Financial Results Call';
  if (/Proxy|Information Circular|Notice|AGSM/i.test(label)) return 'AGSM';
  return 'Other';
}

async function migrateFinancialDocuments() {
  const document = await fetchDocument('https://www.dmgblockchain.com/financials');
  const items = [];
  const sections = [];
  walk(document, (node) => {
    if (node.tagName === 'section' && /^20\d{2} Financial Results/.test(normalizedText(node))) {
      sections.push(node);
    }
  });

  for (const section of sections) {
    const year = Number(normalizedText(section).match(/^(20\d{2})/)?.[1]);
    let yearSortOrder = 0;
    walk(section, (node) => {
    if (node.tagName === 'a') {
      const externalUrl = attribute(node, 'href');
      const title = cleanLabel(normalizedText(node));
      if (title && /drive\.google|seekingalpha\.com|zoom\.us/.test(externalUrl)) {
        const category = financialCategory(title);
        const id = `${year}-${category}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 94);
        items.push({
          _id: `financial-${id}`,
          _type: 'financialDocument',
          title,
          year,
          category,
          externalUrl,
          note: title === 'Q2 | 2026 | Call' ? 'Passcode: 1k2ypnc.' : title === 'Q4 | 2025 | Call' ? 'Passcode: g6v5=exp' : undefined,
          sortOrder: ++yearSortOrder,
        });
      }
    }
    });
  }
  return items;
}

async function migrateOperationalUpdates() {
  if (!beehiivApiKey || !beehiivPublicationId) return [];
  const endpoint = new URL(`https://api.beehiiv.com/v2/publications/${beehiivPublicationId}/posts`);
  endpoint.search = new URLSearchParams({ status: 'confirmed', hidden_from_feed: 'false', order_by: 'displayed_date', direction: 'desc', limit: '100', page: '1' }).toString();
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${beehiivApiKey}`, Accept: 'application/json' } });
  if (!response.ok) return [];
  const payload = await response.json();

  return (payload.data || [])
    .filter((post) => /operational|mining results|production/i.test(`${post.title || ''} ${post.subtitle || ''}`))
    .slice(0, 18)
    .map((post) => ({
      _id: `investor-update-${post.id}`,
      _type: 'investorUpdate',
      kind: 'operational',
      title: post.title,
      date: new Date(((post.displayed_date || post.publish_date) ?? 0) * 1000).toISOString(),
      summary: post.subtitle || post.preview_text || '',
      internalPath: `/insights/${post.slug}`,
    }));
}

const legalPages = await Promise.all([
  migrateLegalPage({ slug: 'privacy-policy', title: 'Privacy Policy', url: 'https://www.dmgblockchain.com/privacy-policy' }),
  migrateLegalPage({ slug: 'terms-of-service', title: 'Terms of Service', url: 'https://www.dmgblockchain.com/terms-of-service' }),
  migrateLegalPage({ slug: 'disclaimer', title: 'Disclaimer', url: 'https://www.dmgblockchain.com/disclaimer' }),
  migrateLegalPage({ slug: 'modern-slavery', title: 'Statement Regarding Modern Slavery', url: 'https://www.dmgblockchain.com/statement-regarding-modern-slavery' }),
]);

const documents = [
  { _id: 'site-settings', _type: 'siteSettings', ...defaults.siteSettings },
  { _id: 'about-page', _type: 'aboutPage', ...defaults.about },
  { _id: 'contact-page', _type: 'contactPage', ...defaults.contact },
  { _id: 'presentation-current', _type: 'presentation', ...defaults.presentation },
  ...(await migrateFinancialDocuments()),
  ...(await migrateOperationalUpdates()),
  ...legalPages,
].map((document) => Object.fromEntries(Object.entries(document).filter(([, value]) => value !== undefined)));

const endpoint = `https://${projectId}.api.sanity.io/v2026-08-04/data/mutate/${dataset}?returnIds=true`;
for (let index = 0; index < documents.length; index += 50) {
  const chunk = documents.slice(index, index + 50);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations: chunk.map((document) => ({ createOrReplace: document })) }),
  });
  if (!response.ok) throw new Error(`Sanity mutation failed: HTTP ${response.status} ${await response.text()}`);
}

console.log(`Seeded ${documents.length} DMG website documents into ${projectId}/${dataset}.`);
