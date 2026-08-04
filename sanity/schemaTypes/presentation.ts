import { defineField, defineType } from 'sanity';

export const presentation = defineType({
  name: 'presentation',
  title: 'Presentation',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 4 }),
    defineField({ name: 'publishedAt', title: 'Published date', type: 'date' }),
    defineField({ name: 'pdf', title: 'Presentation PDF', type: 'file', options: { accept: 'application/pdf' } }),
    defineField({ name: 'pdfUrl', title: 'External PDF URL', type: 'url' }),
    defineField({ name: 'embedUrl', title: 'Embed URL', type: 'url' }),
  ],
  preview: { select: { title: 'title', subtitle: 'publishedAt' } },
});
