import { defineField, defineType } from 'sanity';

export const investorUpdate = defineType({
  name: 'investorUpdate',
  title: 'Investor update or event',
  type: 'document',
  fields: [
    defineField({ name: 'kind', title: 'Content type', type: 'string', options: { list: [{ title: 'Operational update', value: 'operational' }, { title: 'Event', value: 'event' }], layout: 'radio' } }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'date', title: 'Date', type: 'datetime' }),
    defineField({ name: 'endDate', title: 'End date', type: 'datetime' }),
    defineField({ name: 'summary', title: 'Summary', type: 'text', rows: 4 }),
    defineField({ name: 'location', title: 'Location', type: 'string' }),
    defineField({ name: 'url', title: 'Related URL', type: 'url' }),
    defineField({ name: 'internalPath', title: 'Internal path', type: 'string', description: 'Use for a page on this website, for example /insights/example.' }),
  ],
  preview: { select: { title: 'title', subtitle: 'date' } },
});
