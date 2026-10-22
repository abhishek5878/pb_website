/**
 * Content checks (tend-spec, Security 4): the data files' shapes, a post's
 * frontmatter fields, and the only way a markdown file is written: the server
 * builds the frontmatter from validated fields with the yaml library (escaped),
 * and the body is his markdown as-is.
 */
import { z } from 'astro/zod';
import yaml from 'js-yaml';

/** The same list as src/content.config.ts. Kept in step by hand; the build enforces it. */
export const KINDS = ['note', 'essay', 'poem', 'link', 'book', 'film', 'listening', 'mix', 'photo', 'video', 'trip', 'build'] as const;

const line = (max: number) => z.string().max(max);
/* http(s) only (review L2): no javascript:, data:, file: */
const url = z
  .string()
  .url()
  .max(500)
  .refine((u) => /^https?:\/\//i.test(u), 'http(s) only');
const slug = z.string().regex(/^[a-z0-9-]+$/).max(80);
const light = z.string().regex(/^[a-z0-9-]{1,40}$/);

const validDate = (s: string) => {
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** Frontmatter fields, exactly as content.config.ts allows them. Unknown keys are refused. */
export const Fields = z
  .object({
    kind: z.enum(KINDS),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(validDate, 'not a date'),
    title: line(200).optional(),
    /** The line under the title (Substack's subtitle); `publication` says which Substack. Imported posts carry both. */
    subtitle: line(500).optional(),
    publication: z.enum(['personal', 'wasp']).optional(),
    subject: line(200).optional(),
    by: line(200).optional(),
    year: z.number().int().min(1800).max(2100).optional(),
    rating: z
      .number()
      .min(0)
      .max(5)
      .refine((r) => Number.isInteger(r * 2), 'halves only')
      .optional(),
    /* a sibling file in the post's folder (a reference, not a write: new files go through the path allowlist) */
    images: z
      .array(z.object({ src: z.string().regex(/^\.\/[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*\.(jpe?g|webp|png|gif|avif)$/), alt: line(500).default('') }).strict())
      .max(40)
      .default([]),
    youtube: url.optional(),
    audio: line(500).optional(),
    link: url.optional(),
    canonical: url.optional(),
    place: line(200).optional(),
    tags: z.array(line(40)).max(20).default([]),
    pull: z.array(line(500)).max(10).default([]),
    light: light.optional(),
    draft: z.boolean().default(false),
  })
  .strict();
export type Fields = z.infer<typeof Fields>;

/** Drop empty strings and nulls so an untouched optional field means "absent". */
export function compact<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === '' || v === null || v === undefined) continue;
    out[k] = v;
  }
  return out as T;
}

const ORDER: (keyof Fields)[] = ['kind', 'date', 'title', 'subtitle', 'publication', 'subject', 'by', 'year', 'rating', 'place', 'images', 'youtube', 'audio', 'link', 'canonical', 'tags', 'pull', 'light', 'draft'];

/**
 * The whole file: generated frontmatter, then his body, one trailing newline.
 * js-yaml's dump (the same library Astro parses frontmatter with) quotes any
 * string that would otherwise read as a date, number, boolean or null, so a
 * title like `2026-10-22` or `0b101` comes back a string (review L1).
 */
export function markdown(fields: Fields, body: string): string {
  const fm: Record<string, unknown> = {};
  for (const k of ORDER) {
    const v = fields[k];
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (k === 'draft' && v === false) continue;
    fm[k] = v;
  }
  const front = yaml.dump(fm, { lineWidth: -1, noRefs: true });
  const text = body.replace(/\r\n?/g, '\n').replace(/\s+$/, '');
  return `---\n${front}---\n${text ? '\n' + text + '\n' : ''}`;
}

/** Frontmatter and body of an existing post, for editing. Dates come back as YYYY-MM-DD strings. */
export function parseMarkdown(text: string): { fields: Record<string, unknown>; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/);
  if (!m) return { fields: {}, body: text };
  let fields: Record<string, unknown> = {};
  try {
    const parsed = yaml.load(m[1]);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) fields = parsed as Record<string, unknown>;
  } catch {}
  if (fields.date instanceof Date) fields.date = fields.date.toISOString().slice(0, 10);
  return { fields, body: m[2].replace(/^\n+/, '') };
}

/* The data files. */
const Work = z
  .object({
    id: slug,
    title: line(200),
    kind: z.enum(['film', 'show', 'music', 'book', 'person']),
    by: line(200).optional(),
    line: line(1000).optional(),
    note: line(4000).optional(),
    swatch: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(6),
    light: light.optional(),
  })
  .strict();

const Now = z.object({ verb: line(60), short: line(200), what: line(500) }).strict();

const Project = z
  .object({
    slug,
    name: line(100),
    line: line(500),
    why: line(500).optional(),
    status: z.enum(['live', 'in use', 'building', 'paused', 'stopped', 'shipped']),
    when: line(40),
    tags: z.array(line(40)).max(10),
    href: url.optional(),
  })
  .strict();

const unique = (key: string) => (items: Record<string, unknown>[]) => new Set(items.map((i) => i[key])).size === items.length;

export const SHAPES = {
  'src/data/taste.json': z.array(Work).max(300).refine(unique('id'), 'ids repeat'),
  'src/data/now.json': z.array(Now).max(12),
  'src/data/projects.json': z.array(Project).max(200).refine(unique('slug'), 'slugs repeat'),
} as const;

/** Parse, validate against the file's shape, and re-serialise canonically. Throws on anything off. */
export function validateData(path: string, text: string): string {
  const shape = SHAPES[path as keyof typeof SHAPES];
  if (!shape) throw new Error('no shape for ' + path);
  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error('not a list');
  const data = shape.parse(raw.map((item) => (item && typeof item === 'object' ? compact(item) : item)));
  return JSON.stringify(data, null, 2) + '\n';
}
