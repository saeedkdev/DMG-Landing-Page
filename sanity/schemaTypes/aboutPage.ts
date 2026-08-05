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
    defineField({ name: 'managementTitle', title: 'Management section title', type: 'string' }),
    defineField({
      name: 'managementTeam',
      title: 'Management team',
      type: 'array',
      of: [{
        type: 'object',
        name: 'teamMember',
        fields: [
          defineField({ name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required() }),
          defineField({ name: 'role', title: 'Role', type: 'string', validation: (rule) => rule.required() }),
          defineField({ name: 'linkedinUrl', title: 'LinkedIn URL', type: 'url' }),
          defineField({ name: 'photo', title: 'Photo', type: 'image', options: { hotspot: true } }),
        ],
        preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } },
      }],
    }),
    defineField({ name: 'boardTitle', title: 'Board section title', type: 'string' }),
    defineField({
      name: 'boardMembers',
      title: 'Board of directors',
      type: 'array',
      of: [{
        type: 'object',
        name: 'boardMember',
        fields: [
          defineField({ name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required() }),
          defineField({ name: 'role', title: 'Role', type: 'string', validation: (rule) => rule.required() }),
          defineField({ name: 'linkedinUrl', title: 'LinkedIn URL', type: 'url' }),
          defineField({ name: 'photo', title: 'Photo', type: 'image', options: { hotspot: true } }),
        ],
        preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } },
      }],
    }),
  ],
});
