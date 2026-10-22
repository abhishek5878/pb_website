import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Posts. One markdown file per post, anywhere under src/content/posts/.
 * A post with photos is a folder: put index.md next to the images.
 * Folders and files starting with _ are ignored (see _examples/).
 */
export const KINDS = [
  'note', // a thought, a paragraph
  'essay', // long form
  'poem', // also shows up as an interlude, and after 2am
  'link', // something worth reading, with a line on why
  'book', // a book review
  'film', // a film or series review
  'listening', // an album or track
  'mix', // a DJ mix
  'photo', // photographs
  'video', // a video, usually YouTube
  'trip', // a travel dispatch
  'build', // a project update
] as const;

const examples = process.env.SITE_EXAMPLES === '1';

const posts = defineCollection({
  loader: glob({
    pattern: examples ? ['**/*.md'] : ['**/*.md', '!**/_*/**', '!**/_*.md'],
    base: './src/content/posts',
    // "2026/2026-10-22-slug.md" and "2026/2026-10-22-slug/index.md" both
    // become "2026-10-22-slug".
    generateId: ({ entry }) =>
      entry
        .replace(/\.md$/, '')
        .replace(/\/index$/, '')
        .split('/')
        .pop()!,
  }),
  schema: ({ image }) =>
    z.object({
      kind: z.enum(KINDS),
      date: z.coerce.date(),
      title: z.string().optional(),
      /** The line under the title (Substack's subtitle). */
      subtitle: z.string().optional(),
      /** For posts brought over from Substack: which one. WASP Signal posts take the venture-notes voice. */
      publication: z.enum(['personal', 'wasp']).optional(),
      /** The thing being reviewed or listened to, and who made it. */
      subject: z.string().optional(),
      by: z.string().optional(),
      year: z.number().optional(),
      /** Out of 5, halves allowed. */
      rating: z.number().min(0).max(5).optional(),
      images: z.array(z.object({ src: image(), alt: z.string().default('') })).default([]),
      youtube: z.string().url().optional(),
      /** An audio file in public/ or a SoundCloud / Mixcloud URL. */
      audio: z.string().optional(),
      link: z.string().url().optional(),
      /** Where it was first published, if somewhere else (Substack). */
      canonical: z.string().url().optional(),
      place: z.string().optional(),
      tags: z.array(z.string()).default([]),
      /** Lines lifted out as a full-screen interlude. Must be his exact words from the post. */
      pull: z.array(z.string()).default([]),
      /** Poems only: the relight preset the interlude is lit by (src/styles/light.css). */
      light: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

/**
 * Work. One folder per project, src/content/work/<slug>/index.md, images beside
 * it; <slug> is the project's slug in src/data/projects.json. The contract is
 * docs/design/work-pages.md. Folders starting with _ are ignored (fixtures).
 * The folder may not exist yet: the loader then yields no entries and every
 * project page still renders from projects.json.
 */
const work = defineCollection({
  loader: glob({
    pattern: examples ? ['**/index.md'] : ['**/index.md', '!**/_*/**'],
    base: './src/content/work',
    // "rocky/index.md" (or "_fixture/rocky/index.md") becomes "rocky".
    generateId: ({ entry }) =>
      entry
        .replace(/\/index\.md$/, '')
        .split('/')
        .pop()!,
  }),
  schema: ({ image }) =>
    z.object({
      /** One line, his voice. Overrides projects.json `line` on the project page only. */
      summary: z.string().optional(),
      /** Every one curl-checked 200, public. */
      links: z
        .array(
          z.object({
            label: z.string(),
            url: z.string().url(),
            kind: z.enum(['live', 'demo', 'repo', 'paper', 'post', 'page']),
          })
        )
        .default([]),
      /** Screenshots of public pages, or figures from his public repos and papers. */
      examples: z
        .array(
          z.object({
            src: image(),
            caption: z.string(),
            url: z.string().url().optional(),
          })
        )
        .default([]),
      /** One line on why it stopped or paused, from the evidence. Omitted if running or unknown. */
      stopped: z.string().optional(),
      updated: z.coerce.date().optional(),
    }),
});

export const collections = { posts, work };
