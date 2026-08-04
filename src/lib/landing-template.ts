import type { BeehiivBlogPost } from './beehiiv';

interface LandingTemplateOptions {
  template: string;
  assetUrls: Record<string, string>;
  posts: BeehiivBlogPost[];
}

function replaceRequired(source: string, before: string, after: string) {
  if (!source.includes(before)) {
    throw new Error(`Unable to prepare the landing template: missing ${before.slice(0, 64)}.`);
  }

  return source.replace(before, after);
}

function serializeForInlineScript(value: unknown) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const escapes: Record<string, string> = {
      '<': '\\u003c',
      '>': '\\u003e',
      '&': '\\u0026',
      '\u2028': '\\u2028',
      '\u2029': '\\u2029',
    };

    return escapes[character];
  });
}

function injectPosts(source: string, posts: BeehiivBlogPost[]) {
  const articlesStartMarker = 'const ARTICLES = [';
  const componentMarker = '\n\nclass Component extends DCLogic {';
  const start = source.indexOf(articlesStartMarker);
  const end = source.indexOf(componentMarker, start);

  if (start === -1 || end === -1) {
    throw new Error('Unable to prepare the landing template: article data block is missing.');
  }

  const landingPosts = posts.map((post) => ({
    id: post.id,
    slot: post.slot,
    cat: post.cat,
    title: post.title,
    excerpt: post.excerpt,
    author: post.author,
    date: post.date,
    thumbnail: post.thumbnail,
    url: post.url,
    art: post.art,
  }));
  const dataBlock = [
    `const ARTICLES = ${serializeForInlineScript(landingPosts)};`,
    `const PUBLICATION_URL = ${serializeForInlineScript('/insights')};`,
  ].join('\n');

  return `${source.slice(0, start)}${dataBlock}${source.slice(end)}`;
}

export function prepareLandingTemplate({
  template,
  assetUrls,
  posts,
}: LandingTemplateOptions) {
  const start = template.indexOf('<x-dc>');
  const end = template.lastIndexOf('</body>');

  if (start === -1 || end === -1) {
    throw new Error('The extracted DMG source template is incomplete.');
  }

  let markup = Object.entries(assetUrls).reduce(
    (source, [id, url]) => source.replaceAll(id, url),
    template.slice(start, end),
  );

  markup = injectPosts(markup, posts);
  markup = replaceRequired(
    markup,
    "const CATS = ['Featured', 'AI Infrastructure', 'Data Centers', 'Bitcoin and Energy', 'Digital Assets', 'Engineering', 'Company'];\n\n",
    `const CATS = ${serializeForInlineScript([
      'Featured',
      ...new Set(posts.map((post) => post.cat)),
    ])};\n\n`,
  );

  markup = markup
    // The export binds focus and click to competing menu state updates. Keeping
    // click + pointer hover preserves both keyboard and mouse navigation.
    .replaceAll(' sc-camel-on-focus="{{ openCompany }}"', '')
    .replaceAll(' sc-camel-on-focus="{{ openInfra }}"', '')
    .replaceAll(' sc-camel-on-focus="{{ openPlat }}"', '');

  markup = replaceRequired(
    markup,
    'Sample editorial content, shown to demonstrate the layout. Not DMG statements or announcements.',
    'Latest articles and company updates from DMG Blockchain.',
  );
  markup = replaceRequired(
    markup,
    '<image-slot id="dmg-art-featured" shape="rect" placeholder="EDITORIAL — Energy grid. High-voltage transmission towers or a substation bay at long lens, cold light, no people. Distinct from every other article image."></image-slot>',
    '<image-slot id="dmg-art-featured" shape="rect" src="{{ featured.thumbnail }}" placeholder="{{ featured.art }}"></image-slot>',
  );
  markup = replaceRequired(
    markup,
    '<span class="tag tag-outline">AI Infrastructure</span>',
    '<span class="tag tag-outline">{{ featured.cat }}</span>',
  );
  markup = replaceRequired(
    markup,
    '<h3 style="font-size:clamp(26px,2.6vw,38px);line-height:1.06;margin:0;text-wrap:balance">Power is becoming the defining constraint of AI infrastructure.</h3>',
    '<h3 style="font-size:clamp(26px,2.6vw,38px);line-height:1.06;margin:0;text-wrap:balance">{{ featured.title }}</h3>',
  );
  markup = replaceRequired(
    markup,
    '<p style="margin:0;font-size:16px;color:var(--color-neutral-800);text-wrap:pretty">Model demand is growing faster than interconnection queues can clear. Where energy is already secured, capacity arrives on a different timeline — and that timeline is becoming the product.</p>',
    '<p style="margin:0;font-size:16px;color:var(--color-neutral-800);text-wrap:pretty">{{ featured.excerpt }}</p>',
  );
  markup = replaceRequired(
    markup,
    '<span>DMG Editorial</span><span aria-hidden="true">/</span><span>14 May 2026</span><span aria-hidden="true">/</span><span>8 min read</span>',
    '<span>{{ featured.author }}</span><span aria-hidden="true">/</span><span>{{ featured.date }}</span>',
  );
  markup = replaceRequired(
    markup,
    '<a href="#insights" class="btn btn-primary blueprint" style="align-self:start;min-height:46px;padding-inline:var(--space-6)">Read article',
    '<a href="{{ featured.url }}" class="btn btn-primary blueprint" style="align-self:start;min-height:46px;padding-inline:var(--space-6)">Read article',
  );
  markup = replaceRequired(
    markup,
    '<a href="#insights" class="card blueprint" style="padding:0;gap:0;text-decoration:none;color:inherit;overflow:hidden" style-hover="border-color:var(--color-accent)">',
    '<a href="{{ a.url }}" class="card blueprint" style="padding:0;gap:0;text-decoration:none;color:inherit;overflow:hidden" style-hover="border-color:var(--color-accent)">',
  );
  markup = replaceRequired(
    markup,
    '<image-slot id="{{ a.slot }}" shape="rect" placeholder="{{ a.art }}"></image-slot>',
    '<image-slot id="{{ a.slot }}" shape="rect" src="{{ a.thumbnail }}" placeholder="{{ a.art }}"></image-slot>',
  );
  markup = replaceRequired(
    markup,
    '{{ a.author }} <span aria-hidden="true">/</span> {{ a.date }} <span aria-hidden="true">/</span> {{ a.read }}',
    '{{ a.author }} <span aria-hidden="true">/</span> {{ a.date }}',
  );
  markup = replaceRequired(
    markup,
    'const cards = showFeatured ? matches.slice(0, limit) : matches;',
    'const featured = ARTICLES[0];\n    const cards = showFeatured ? matches.slice(1, limit + 1) : matches;',
  );
  markup = replaceRequired(
    markup,
    'catItems, cards, showFeatured,',
    'catItems, cards, featured, showFeatured, publicationUrl: PUBLICATION_URL,',
  );
  markup = replaceRequired(
    markup,
    '<a href="#insights" class="btn btn-secondary" style="min-height:46px;padding-inline:var(--space-6)">View all insights <span aria-hidden="true">→</span></a>',
    '<a href="{{ publicationUrl }}" class="btn btn-secondary" style="min-height:46px;padding-inline:var(--space-6)">View all posts <span aria-hidden="true">→</span></a>',
  );

  const placeholderLinks = `          <div style="display:flex;flex-wrap:wrap;gap:var(--space-6);align-items:center;font-size:14px">
            <a href="#insights" style="text-decoration:none;color:var(--color-accent-700)" style-hover="color:var(--color-accent-900)">Popular this quarter</a>
            <a href="#insights" style="text-decoration:none;color:var(--color-accent-700)" style-hover="color:var(--color-accent-900)">Series: Power and compute</a>
            <a href="#insights" style="text-decoration:none;color:var(--color-accent-700)" style-hover="color:var(--color-accent-900)">RSS</a>
          </div>`;
  markup = replaceRequired(markup, placeholderLinks, '');

  return markup;
}
