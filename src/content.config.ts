import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Import zod directly. Astro still re-exports `z` from 'astro:content', but that
// re-export is deprecated and goes away in Astro 8.
import { z } from 'zod';

/**
 * Content collections turn the Markdown files in `src/content/` into typed data
 * you can query with `getCollection()`. The schema below is the contract: if a
 * Markdown file is missing a field or has the wrong type, the build fails with a
 * pointed error instead of shipping a broken page.
 *
 * Docs: https://docs.astro.build/en/guides/content-collections/
 */
const eventGraphics = defineCollection({
  // `base` is the folder to read; `pattern` picks the files inside it.
  // The entry `id` comes from the filename, so `fall-kickoff-mixer.md`
  // is served at /events/fall-kickoff-mixer.
  loader: glob({ base: './src/content/event-graphics', pattern: '**/*.md' }),

  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Written as `2026-10-02T17:30:00-07:00` in frontmatter; parsed to a Date here. */
      date: z.coerce.date(),
      location: z.string(),
      /** One or two sentences. Used on cards and as the page meta description. */
      summary: z.string().max(300),

      /**
       * `image()` resolves a path *relative to this Markdown file* into an
       * imported image, so Astro can optimize and hash it at build time.
       * That is why graphics live in `src/assets/` and not `public/`.
       */
      graphic: image(),
      /** Describe the graphic for screen readers. Empty string if purely decorative. */
      graphicAlt: z.string(),

      tags: z.array(z.string()).default([]),
      /** Featured events are pulled onto the home page. */
      featured: z.boolean().default(false),
      rsvpUrl: z.url().optional(),
      /** Draft entries are kept out of production builds. */
      draft: z.boolean().default(false),
    }),
});

export const collections = { 'event-graphics': eventGraphics };
