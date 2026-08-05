import type { BeehiivBlogPost } from './beehiiv';
import type { SiteSettings } from './sanity';

interface LandingTemplateOptions {
  template: string;
  assetUrls: Record<string, string>;
  posts: BeehiivBlogPost[];
  settings: SiteSettings;
  latestPresentationUrl: string;
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
  settings,
  latestPresentationUrl,
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

  const infrastructureButton = `            <a href="#contact" class="btn btn-primary blueprint" style="background:var(--color-accent-500);border-color:var(--color-accent-400);color:#ffffff;min-height:48px">Full infrastructure overview
              <i class="corner tl" style="color:rgba(242,242,243,0.55)"></i><i class="corner tr" style="color:rgba(242,242,243,0.55)"></i><i class="corner bl" style="color:rgba(242,242,243,0.55)"></i><i class="corner br" style="color:rgba(242,242,243,0.55)"></i>
            </a>`;
  markup = replaceRequired(markup, infrastructureButton, '');

  markup = replaceRequired(
    markup,
    '<a href="#spotlight" class="btn btn-secondary" style="min-height:46px;padding-inline:var(--space-6)">Explore Infrastructure <span aria-hidden="true">→</span></a>',
    '<a href="/ai-transition" class="btn btn-secondary" style="min-height:46px;padding-inline:var(--space-6)">Christina Lake AI update <span aria-hidden="true">→</span></a>',
  );

  const resourcesInsightsLink = `            <li><a href="/insights" style="color:inherit;text-decoration:none;font-size:13px" style-hover="color:#fff">Insights</a></li>`;
  markup = replaceRequired(
    markup,
    resourcesInsightsLink,
    `            <li style="margin-bottom:var(--space-3);padding:var(--space-3);border:1px solid rgba(180,191,247,0.28);background:rgba(13,23,69,0.32)">
              <span style="display:block;margin-bottom:4px;color:var(--color-accent-300);font-family:var(--font-heading);font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase">Featured resource</span>
              <a href="/ai-transition" style="color:var(--color-bg);text-decoration:none;font-family:var(--font-heading);font-size:14px;font-weight:600" style-hover="color:var(--color-accent-300)">Christina Lake AI Update <span aria-hidden="true">→</span></a>
            </li>
${resourcesInsightsLink}`,
  );

  markup = replaceRequired(
    markup,
    `            <li><a href="https://www.dmgblockchain.com/bitcoin101" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;font-size:13px" style-hover="color:#fff">Bitcoin 101</a></li>`,
    '',
  );
  markup = replaceRequired(
    markup,
    `            <li><a href="https://www.blockseer.com" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;font-size:13px" style-hover="color:#fff">Blockseer Explorer</a></li>`,
    '',
  );
  markup = replaceRequired(
    markup,
    `            <li><a href="#platforms" style="color:inherit;text-decoration:none;font-size:13px" style-hover="color:#fff">Blockseer</a></li>`,
    '',
  );

  markup = markup
    .replace('href="#contact" style="font-size:14px;text-decoration:none;color:var(--color-accent-700)" style-hover="color:var(--color-accent-900)">Learn more', `href="${settings.terraPoolUrl}" target="_blank" rel="noopener noreferrer" style="font-size:14px;text-decoration:none;color:var(--color-accent-700)" style-hover="color:var(--color-accent-900)">Learn more`)
    .replace('href="#contact" style="font-size:14px;text-decoration:none;color:var(--color-accent-700)" style-hover="color:var(--color-accent-900)">Learn more', `href="${settings.reactorUrl}" target="_blank" rel="noopener noreferrer" style="font-size:14px;text-decoration:none;color:var(--color-accent-700)" style-hover="color:var(--color-accent-900)">Learn more`)
    .replace('href="#contact" style="font-size:14px;text-decoration:none;color:var(--color-accent-700)" style-hover="color:var(--color-accent-900)">Contact', `href="${settings.numisUrl}" target="_blank" rel="noopener noreferrer" style="font-size:14px;text-decoration:none;color:var(--color-accent-700)" style-hover="color:var(--color-accent-900)">Visit Numis Trust`)
    .replace('href="#investors" class="btn btn-secondary" style="min-height:48px;padding-inline:var(--space-6)">Download Latest Presentation', `href="${latestPresentationUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="min-height:48px;padding-inline:var(--space-6)">Download Latest Presentation`)
    .replace('href="#investors" class="card blueprint"', 'href="/financial" class="card blueprint"')
    .replace('href="#investors" class="card blueprint"', 'href="/presentation" class="card blueprint"')
    .replace('href="#investors" class="card blueprint"', 'href="/operational-updates" class="card blueprint"')
    .replace('href="#investors" class="card blueprint"', 'href="/events" class="card blueprint"')
    .replaceAll('href="#contact" class="btn btn-secondary"', 'href="/contact" class="btn btn-secondary"')
    .replaceAll('href="#positioning" style="color:inherit;text-decoration:none;font-size:13px"', 'href="/about" style="color:inherit;text-decoration:none;font-size:13px"')
    .replaceAll('href="#contact" style="color:inherit;text-decoration:none;font-size:13px"', 'href="/contact" style="color:inherit;text-decoration:none;font-size:13px"')
    .replace('href="#investors" style="color:inherit;text-decoration:none;font-size:13px" style-hover="color:#fff">Financial Results', 'href="/financial" style="color:inherit;text-decoration:none;font-size:13px" style-hover="color:#fff">Financial Results')
    .replace('href="#investors" style="color:inherit;text-decoration:none;font-size:13px" style-hover="color:#fff">Presentations', 'href="/presentation" style="color:inherit;text-decoration:none;font-size:13px" style-hover="color:#fff">Presentations')
    .replace('href="#investors" style="color:inherit;text-decoration:none;font-size:13px" style-hover="color:#fff">News Releases', 'href="/operational-updates" style="color:inherit;text-decoration:none;font-size:13px" style-hover="color:#fff">Operational Updates')
    .replace('href="#contact" style="color:inherit;text-decoration:none" style-hover="color:#fff">Privacy', 'href="/privacy-policy" style="color:inherit;text-decoration:none" style-hover="color:#fff">Privacy')
    .replace('href="#contact" style="color:inherit;text-decoration:none" style-hover="color:#fff">Terms', 'href="/terms-of-service" style="color:inherit;text-decoration:none" style-hover="color:#fff">Terms')
    .replace('href="#contact" style="color:inherit;text-decoration:none" style-hover="color:#fff">Disclaimer', 'href="/disclaimer" style="color:inherit;text-decoration:none" style-hover="color:#fff">Disclaimer')
    .replace('href="#contact" style="color:inherit;text-decoration:none" style-hover="color:#fff">Modern Slavery Statement', 'href="/modern-slavery" style="color:inherit;text-decoration:none" style-hover="color:#fff">Modern Slavery Statement')
    .replace('href="https://www.linkedin.com"', `href="${settings.linkedinUrl}"`)
    .replace('href="https://x.com"', `href="${settings.xUrl}"`)
    .replaceAll('href="#contact" sc-camel-on-click', 'href="/contact" sc-camel-on-click')
    .replaceAll('href="#contact" style="color:rgba(242,242,243,0.66)', 'href="/contact" style="color:rgba(242,242,243,0.66)')
    .replace('href="#positioning" class="btn btn-primary blueprint"', 'href="/about" class="btn btn-primary blueprint"')
    .replace('Names, descriptions and status are CMS-controlled; some are subject to brand approval.', 'DMG’s platforms connect infrastructure, software and trusted digital-asset services across one operating stack.')
    .replace('Statements, MD&amp;A and news release. CMS document reference.', 'Statements, MD&amp;A, transcripts and annual materials.')
    .replace('Current corporate deck, PDF. CMS document reference.', 'View the current corporate deck live or download the PDF.')
    .replace('Monthly production and site progress. CMS news release.', 'Monthly production, operating results and site progress.')
    .replace('Earnings dates and conferences. CMS event entries.', 'Earnings calls, investor conferences and company events.');

  return markup;
}
