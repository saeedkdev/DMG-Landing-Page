import { defineArrayMember, defineField, defineType } from 'sanity';

export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal page',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: (rule) => rule.required() }),
    defineField({ name: 'sourceUrl', title: 'Original source URL', type: 'url' }),
    defineField({
      name: 'blocks',
      title: 'Content',
      type: 'array',
      of: [defineArrayMember({
        name: 'legalBlock',
        title: 'Text block',
        type: 'object',
        fields: [
          defineField({ name: 'style', title: 'Style', type: 'string', options: { list: [{ title: 'Heading', value: 'heading' }, { title: 'Paragraph', value: 'paragraph' }] } }),
          defineField({ name: 'text', title: 'Text', type: 'text', rows: 5 }),
        ],
        preview: { select: { title: 'text', subtitle: 'style' } },
      })],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
});
