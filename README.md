# DMG Blockchain website

An [Astro](https://astro.build/) implementation of the DMG Blockchain Solutions
website. It includes the landing page, native Beehiiv insights, Sanity-managed
corporate and investor pages, legal content, a secure newsletter endpoint, and a
custom 404 page.

## Run locally

```sh
pnpm install
cp .env.example .env
pnpm dev
```

The development server runs at `http://localhost:4321` by default.

## Environment

Copy `.env.example` to `.env` and supply the Beehiiv and Sanity values. Secrets
are consumed only by the Astro server and migration script and must also be set
in the production host.

## Production build and server

```sh
pnpm build
node dist/server/entry.mjs
```

The site uses Astro's standalone Node adapter because newsletter subscriptions
must be proxied through a server-side endpoint. Deploy it to a Node-compatible
host, or change the adapter to the target host's Astro adapter.

## Beehiiv posts

The insights section, archive, and article detail pages are populated from the
Beehiiv publication during Astro's server-side build. Newsletter signups use
the same publication credentials through `POST /api/subscribe`.

```sh
BEEHIIV_API_KEY=your_beehiiv_api_key
BEEHIIV_PUBLICATION_ID=pub_your_publication_id
```

Neither value is exposed to browser JavaScript. Astro safely extracts the free
web article body and generates native routes at `/insights/[slug]`. Rebuild or
redeploy the site to publish newly confirmed Beehiiv posts.

## Sanity Studio and content

Run the local Studio with:

```sh
pnpm sanity
```

The Studio manages site settings and social links, About, Contact, the current
presentation, financial documents, operational updates, events, and all four
legal pages. To repeat the idempotent migration from DMG's current public site:

```sh
pnpm sanity:seed
```

The website includes bundled fallback content so public pages remain usable if
Sanity is temporarily unavailable during a build.

## Source structure

- `src/pages/index.astro` provides document metadata and renders the landing page.
- `src/pages/insights/` contains the native archive and statically generated
  article routes.
- `src/pages/api/subscribe.ts` securely proxies newsletter signups to Beehiiv.
- `src/lib/sanity.ts` provides typed Sanity queries and bundled fallbacks.
- `sanity/schemaTypes/` contains the Studio content model.
- `src/layouts/SiteLayout.astro` and `src/styles/site.css` provide the shared DMG
  editorial chrome and responsive design system.
- `src/source/template.html` is the extracted page template used by Astro.
- `public/assets/source/` contains the embedded DMG logo, campus image, fonts,
  and self-hosted interaction dependencies.
- `scripts/extract-bundle.mjs` reproducibly extracts those files from the original
  HTML export with `pnpm extract:source`.
- `scripts/seed-sanity.mjs` imports current public DMG investor and legal content.
