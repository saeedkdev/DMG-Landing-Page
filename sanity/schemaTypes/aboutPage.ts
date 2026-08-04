import { defineField, defineType } from 'sanity';

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'intro', title: 'Introduction', type: 'text', rows: 4 }),
    defineField({ name: 'coreTitle', title: 'Core title', type: 'string' }),
    defineField({ name: 'coreDescription', title: 'Core description', type: 'text', rows: 3 }),
    defineField({ name: 'coreImage', title: 'Core image', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'corePlusTitle', title: 'Core+ title', type: 'string' }),
    defineField({ name: 'corePlusDescription', title: 'Core+ description', type: 'text', rows: 3 }),
    defineField({ name: 'corePlusImage', title: 'Core+ image', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'milestonesTitle', title: 'Milestones title', type: 'string' }),
    defineField({ name: 'milestonesImage', title: 'Milestones image', type: 'image', options: { hotspot: true } }),
  ],
});
