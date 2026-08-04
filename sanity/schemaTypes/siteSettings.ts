import { defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({ name: 'linkedinUrl', title: 'LinkedIn URL', type: 'url' }),
    defineField({ name: 'xUrl', title: 'X URL', type: 'url' }),
    defineField({ name: 'terraPoolUrl', title: 'Terra Pool URL', type: 'url' }),
    defineField({ name: 'reactorUrl', title: 'Reactor URL', type: 'url' }),
    defineField({ name: 'numisUrl', title: 'Numis Trust URL', type: 'url' }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});
