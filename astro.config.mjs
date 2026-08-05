import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.dmgblockchain.com',
  output: 'server',
  adapter: vercel(),
  build: {
    assets: '_assets',
  },
});
