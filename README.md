# DMG Blockchain landing page

A static [Astro](https://astro.build/) implementation of the DMG Blockchain
Solutions landing page. The original, self-contained design export is preserved
in `DMG Homepage.html`; its embedded logo, campus imagery, fonts, styles, copy,
and interaction runtime are unpacked into normal project assets.

## Run locally

```sh
pnpm install
cp .env.example .env
pnpm dev
```

The development server runs at `http://localhost:4321` by default.

## Production build

```sh
pnpm build
pnpm preview
```

The static site is emitted to `dist/`.

## Beehiiv posts

The insights section, archive, and article detail pages are populated from the
Beehiiv publication during Astro's server-side build. Add these values to `.env`
locally and to the environment of the deployment service:

```sh
BEEHIIV_API_KEY=your_beehiiv_api_key
BEEHIIV_PUBLICATION_ID=pub_your_publication_id
```

Neither value is exposed to browser JavaScript. Astro safely extracts the free
web article body and generates native routes at `/insights/[slug]`. Rebuild or
redeploy the site to publish newly confirmed Beehiiv posts.

## Source structure

- `src/pages/index.astro` provides document metadata and renders the landing page.
- `src/pages/insights/` contains the native archive and statically generated
  article routes.
- `src/layouts/SiteLayout.astro` and `src/styles/site.css` provide the shared DMG
  editorial chrome and responsive design system.
- `src/source/template.html` is the extracted page template used by Astro.
- `public/assets/source/` contains the embedded DMG logo, campus image, fonts,
  and self-hosted interaction dependencies.
- `scripts/extract-bundle.mjs` reproducibly extracts those files from the original
  HTML export with `pnpm extract:source`.

## Content notes

Investor documents, market data, CMS links, privacy/terms pages, and newsletter
delivery still need their production destinations or services before launch.
