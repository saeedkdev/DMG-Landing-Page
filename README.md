# DMG Blockchain landing page

A static [Astro](https://astro.build/) implementation of the DMG Blockchain
Solutions landing page. The original, self-contained design export is preserved
in `DMG Homepage.html`; its embedded logo, campus imagery, fonts, styles, copy,
and interaction runtime are unpacked into normal project assets.

## Run locally

```sh
pnpm install
pnpm dev
```

The development server runs at `http://localhost:4321` by default.

## Production build

```sh
pnpm build
pnpm preview
```

The static site is emitted to `dist/`.

## Source structure

- `src/pages/index.astro` provides document metadata and renders the landing page.
- `src/source/template.html` is the extracted page template used by Astro.
- `public/assets/source/` contains the embedded DMG logo, campus image, fonts,
  and self-hosted interaction dependencies.
- `scripts/extract-bundle.mjs` reproducibly extracts those files from the original
  HTML export with `pnpm extract:source`.

## Content notes

The insights area includes sample editorial content and deliberate artwork
placeholders exactly as supplied in the source design. Investor documents,
market data, CMS links, privacy/terms pages, and newsletter delivery still need
their production destinations or services before launch.
