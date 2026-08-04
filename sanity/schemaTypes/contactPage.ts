import { defineField, defineType } from 'sanity';

export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact page',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'intro', title: 'Introduction', type: 'text', rows: 3 }),
    defineField({ name: 'companyName', title: 'Company name', type: 'string' }),
    defineField({ name: 'address', title: 'Mailing address', type: 'text', rows: 3 }),
    defineField({ name: 'generalEmail', title: 'General email', type: 'string' }),
    defineField({ name: 'privacyEmail', title: 'Privacy email', type: 'string' }),
    defineField({ name: 'consentText', title: 'Email consent text', type: 'text', rows: 3 }),
  ],
});
