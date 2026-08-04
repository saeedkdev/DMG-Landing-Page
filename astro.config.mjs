import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://www.dmgblockchain.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  build: {
    assets: '_assets',
  },
});
