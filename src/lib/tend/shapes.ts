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
/** The same list as LANES in src/content.config.ts: the three lanes of /writing/. */
export const LANES = ['night', 'signal', 'build'] as const;

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
    lane: z.enum(LANES).optional(),
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

const ORDER: (keyof Fields)[] = ['kind', 'date', 'title', 'subtitle', 'publication', 'lane', 'subject', 'by', 'year', 'rating', 'place', 'images', 'youtube', 'audio', 'link', 'canonical', 'tags', 'pull', 'light', 'draft'];

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

/** Frontmatter and body of an existing post or project page, for editing. Dates come back as YYYY-MM-DD strings. */
export function parseMarkdown(text: string): { fields: Record<string, unknown>; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/);
  if (!m) return { fields: {}, body: text };
  let fields: Record<string, unknown> = {};
  try {
    const parsed = yaml.load(m[1]);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) fields = parsed as Record<string, unknown>;
  } catch {}
  for (const k of ['date', 'updated']) {
    const v = fields[k];
    if (v instanceof Date) fields[k] = v.toISOString().slice(0, 10);
  }
  return { fields, body: m[2].replace(/^\n+/, '') };
}

/* ---------- a project's page: src/content/work/<slug>/index.md ---------- */

/** The same list as the `work` collection in src/content.config.ts. */
export const LINK_KINDS = ['live', 'demo', 'repo', 'paper', 'post', 'page'] as const;

/** One line of his: control characters (a pasted newline) become a space. */
const oneLine = (max: number) => z.string().max(max).transform((s) => s.replace(/[\u0000-\u001f\u007f]+/g, ' '));

/**
 * The page's frontmatter, mirroring the `work` collection (docs/design/work-pages.md).
 * Unknown keys are refused, `updated` included: the server sets it on every save.
 * An example's `src` is a file beside index.md; the commit route checks it is there.
 */
export const WorkFields = z
  .object({
    summary: oneLine(500).optional(),
    links: z
      .array(z.object({ label: oneLine(200).refine((s) => s.trim().length > 0, 'a label'), url, kind: z.enum(LINK_KINDS) }).strict())
      .max(30)
      .default([]),
    examples: z
      .array(z.object({ src: z.string().regex(/^\.\/[a-z0-9-]+\.(jpg|webp|png)$/), caption: oneLine(500), url: url.optional() }).strict())
      .max(30)
      .default([]),
    stopped: oneLine(1000).optional(),
  })
  .strict();
export type WorkFields = z.infer<typeof WorkFields>;

/** Today in Asia/Kolkata, YYYY-MM-DD: the page's `updated` on every save. */
export const todayIST = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** A string as js-yaml writes it double-quoted: every character escaped as YAML needs, always one line. */
const quoted = (s: string) => yaml.dump(s, { forceQuotes: true, quotingType: '"', lineWidth: -1 }).replace(/\n$/, '');
/** An enum value or a `./file` name: already held to [a-z0-9./-] by the schema, written plain like the files he has. */
const bare = (s: string) => (/^[a-z0-9./-]+$/.test(s) ? s : quoted(s));

/**
 * The whole page file, in the shape the 23 pages are written in, so opening
 * and saving one without changes gives the same bytes (only `updated` moves):
 *
 *   summary: "…"
 *   links:
 *     - { label: "…", url: "…", kind: live }
 *   examples:
 *     - { src: ./shot-1.png, caption: "…", url: "…" }
 *   stopped: "…"
 *   updated: 2026-10-23
 *
 * Every string of his goes through js-yaml's double-quoted dump (escaped);
 * the rest is enums, `./file` names and today's date, all checked above.
 */
export function workMarkdown(fields: WorkFields, body: string, updated = todayIST()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated) || !validDate(updated)) throw new Error('bad date');
  const out: string[] = [];
  if (fields.summary !== undefined && fields.summary.trim() !== '') out.push(`summary: ${quoted(fields.summary)}`);
  if (fields.links.length) {
    out.push('links:');
    for (const l of fields.links) out.push(`  - { label: ${quoted(l.label)}, url: ${quoted(l.url)}, kind: ${bare(l.kind)} }`);
  }
  if (fields.examples.length) {
    out.push('examples:');
    for (const e of fields.examples)
      out.push(`  - { src: ${bare(e.src)}, caption: ${quoted(e.caption)}${e.url !== undefined ? `, url: ${quoted(e.url)}` : ''} }`);
  }
  if (fields.stopped !== undefined && fields.stopped.trim() !== '') out.push(`stopped: ${quoted(fields.stopped)}`);
  out.push(`updated: ${updated}`);
  const text = body.replace(/\r\n?/g, '\n').replace(/\s+$/, '');
  return `---\n${out.join('\n')}\n---\n${text ? '\n' + text + '\n' : ''}`;
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

export const Now = z.object({ verb: line(60), short: line(200), what: line(500) }).strict();

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

export type ProjectRow = z.infer<typeof Project>;

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

/* ---------- the records (docs/design/living.md): written by the server, never sent by the client ---------- */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(validDate, 'not a date');

/** Where /now is written from: a city, one line. Control characters and runs of space collapse. */
export const Place = z
  .string()
  .max(200)
  .transform((s) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(1).max(60));

/** src/data/now-history/YYYY-MM-DD.json: /now on the day it changed. */
export const Snapshot = z.object({ date: isoDate, place: Place, rows: z.array(Now).max(12) }).strict();
export type Snapshot = z.infer<typeof Snapshot>;

export const LOG_KINDS = ['project', 'now', 'page'] as const;
/**
 * One line of src/data/log.json. The text is built by the server from names
 * and statuses (records.ts); the shape holds it to one plain line, and the
 * link to /now/, /work/ or a project's page.
 */
export const LogEntry = z
  .object({
    date: isoDate,
    kind: z.enum(LOG_KINDS),
    text: z.string().min(1).max(300).regex(/^[^\u0000-\u001f\u007f]+$/),
    href: z.string().regex(/^\/(now\/|work\/([a-z0-9-]+\/)?)$/),
  })
  .strict();
export type LogEntry = z.infer<typeof LogEntry>;
export const Log = z.array(LogEntry).max(5000);

/**
 * One film in src/data/films-archive.json, in the key order films.mjs writes.
 * Its link must be Letterboxd's own (the feed is outside input).
 */
const ArchiveFilm = z
  .object({
    title: z.string().min(1).max(300).regex(/^[^\u0000-\u001f\u007f]+$/),
    year: z.string().regex(/^\d{4}$/).nullable(),
    rating: z
      .number()
      .min(0.5)
      .max(5)
      .refine((r) => Number.isInteger(r * 2), 'halves only')
      .nullable(),
    liked: z.boolean(),
    rewatch: z.boolean(),
    watched: isoDate.nullable(),
    url: z
      .string()
      .max(500)
      .regex(/^https:\/\/(letterboxd\.com|boxd\.it)\/[^\s"'<>\\]*$/),
    review: z.string().max(20_000).nullable(),
  })
  .strict();
const filmKey = (f: { url: string; watched: string | null }) => `${f.url.replace(/\/+$/, '').toLowerCase()}|${f.watched ?? ''}`;
export const Archive = z
  .array(ArchiveFilm)
  .max(20_000)
  .refine((films) => new Set(films.map(filmKey)).size === films.length, 'entries repeat');

const HISTORY_FILE = /^src\/data\/now-history\/(\d{4}-\d{2}-\d{2})\.json$/;

/**
 * A record file's canonical bytes, after its strict shape: a snapshot (whose
 * date must be its file name's), the log, or the film archive. Throws on anything off.
 */
export function validateRecord(path: string, data: unknown): string {
  let out: unknown;
  const day = HISTORY_FILE.exec(path)?.[1];
  if (day) {
    const snap = Snapshot.parse(data);
    if (snap.date !== day) throw new Error('snapshot date is not its file name');
    out = snap;
  } else if (path === 'src/data/log.json') out = Log.parse(data);
  else if (path === 'src/data/films-archive.json') out = Archive.parse(data);
  else throw new Error('no record shape for ' + path);
  return JSON.stringify(out, null, 2) + '\n';
}
