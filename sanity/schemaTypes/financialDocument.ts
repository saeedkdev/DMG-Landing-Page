import { defineField, defineType } from 'sanity';

export const financialDocument = defineType({
  name: 'financialDocument',
  title: 'Financial document',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'year', title: 'Year', type: 'number', validation: (rule) => rule.required().min(2000).max(2100) }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: ['Financial Statements', 'MD&A', 'Transcript', 'AIF', 'AGSM', 'Financial Results Call', 'Other'],
      },
    }),
    defineField({ name: 'file', title: 'PDF file', type: 'file', options: { accept: 'application/pdf' } }),
    defineField({ name: 'externalUrl', title: 'External document URL', type: 'url' }),
    defineField({ name: 'note', title: 'Note or passcode', type: 'string' }),
    defineField({ name: 'sortOrder', title: 'Sort order', type: 'number', initialValue: 100 }),
  ],
  orderings: [{ title: 'Newest first', name: 'newest', by: [{ field: 'year', direction: 'desc' }, { field: 'sortOrder', direction: 'asc' }] }],
  preview: { select: { title: 'title', category: 'category', year: 'year' }, prepare: ({ title, category, year }) => ({ title, subtitle: `${year} · ${category}` }) },
});
