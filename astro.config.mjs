import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.dmgblockchain.com',
  output: 'static',
  build: {
    assets: '_assets',
  },
});
