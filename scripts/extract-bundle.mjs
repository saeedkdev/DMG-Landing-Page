import { gunzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const sourcePath = new URL('../DMG Homepage.html', import.meta.url);
const outputRoot = new URL('../src/source/', import.meta.url);
const publicRoot = new URL('../public/assets/source/', import.meta.url);

const source = await readFile(sourcePath, 'utf8');

function readBundleJson(type) {
  const marker = `<script type="${type}">`;
  const start = source.indexOf(marker);
  const end = source.indexOf('</script>', start);

  if (start === -1 || end === -1) {
    throw new Error(`Missing ${type} data in ${sourcePath.pathname}`);
  }

  return JSON.parse(source.slice(start + marker.length, end).trim());
}

const extensionByMime = {
  'application/javascript': '.js',
  'application/json': '.json',
  'font/woff2': '.woff2',
  'image/png': '.png',
  'image/webp': '.webp',
  'text/javascript': '.js',
};

const manifest = readBundleJson('__bundler/manifest');
const template = readBundleJson('__bundler/template');

await mkdir(outputRoot, { recursive: true });
await mkdir(publicRoot, { recursive: true });
await writeFile(new URL('template.html', outputRoot), template);

const assetIndex = {};

for (const [id, resource] of Object.entries(manifest)) {
  const encoded = Buffer.from(resource.data, 'base64');
  const contents = resource.compressed ? gunzipSync(encoded) : encoded;
  const extension = extensionByMime[resource.mime] ?? extname(id) ?? '.bin';
  const filename = `${id}${extension}`;

  await writeFile(join(publicRoot.pathname, filename), contents);
  assetIndex[id] = {
    filename,
    mime: resource.mime,
    bytes: contents.byteLength,
  };
}

await writeFile(
  new URL('asset-index.json', outputRoot),
  `${JSON.stringify(assetIndex, null, 2)}\n`,
);

console.log(`Extracted ${Object.keys(assetIndex).length} assets and the source template.`);
