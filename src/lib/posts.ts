/**
 * Every post, from every source, as one list.
 *
 * Local posts come from src/content/posts/. Substack and Letterboxd are pulled
 * in at build time (scripts/fetch-*.mjs) and link out to the original. A local
 * post with `canonical` set replaces its Substack copy.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import writing from '../data/writing.json';
import films from '../data/films.json';
import { LANES } from '../content.config';

export type Kind = CollectionEntry<'posts'>['data']['kind'];
export type Lane = (typeof LANES)[number];

/** The three lanes of /writing/, in the order the filter shows them. */
export const LANE_LABEL: Record<Lane, string> = { night: 'Night', signal: 'Signal', build: 'Build' };
export { LANES };

export type Post = {
  id: string;
  kind: Kind;
  date: Date;
  title?: string;
  subtitle?: string;
  subject?: string;
  by?: string;
  year?: number;
  rating?: number;
  liked?: boolean;
  excerpt?: string;
  images: { src: ImageMetadata | string; alt: string }[];
  youtube?: string;
  audio?: string;
  link?: string;
  place?: string;
  tags: string[];
  pull: string[];
  /** Poems: the relight preset an interlude uses (src/styles/light.css). */
  light?: string;
  /** The lane on /writing/. A WASP Signal issue without one counts as signal. */
  lane?: Lane;
  source: 'site' | 'substack' | 'letterboxd';
  sourceName?: string;
  href: string;
  external: boolean;
  /** Local posts only: the collection entry, for render(). */
  raw?: CollectionEntry<'posts'>;
};

const plain = (md: string) =>
  md
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const excerpt = (s: string, n = 220) => {
  const t = plain(s);
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
};

let cache: Post[] | null = null;

export async function getPosts(): Promise<Post[]> {
  if (cache) return cache;

  const entries = await getCollection('posts', (e) => !e.data.draft);
  const local = entries.map((e): Post => {
    const d = e.data;
    return {
      id: e.id,
      kind: d.kind,
      date: d.date,
      title: d.title,
      subtitle: d.subtitle,
      subject: d.subject,
      by: d.by,
      year: d.year,
      rating: d.rating,
      excerpt: e.body ? excerpt(e.body) : undefined,
      images: d.images,
      youtube: d.youtube,
      audio: d.audio,
      link: d.link,
      place: d.place,
      tags: d.tags,
      pull: d.pull,
      light: d.light,
      lane: d.lane ?? (d.publication === 'wasp' ? 'signal' : undefined),
      source: 'site',
      sourceName: d.publication === 'wasp' ? 'WASP Signal' : undefined,
      href: `/writing/${e.id}/`,
      external: false,
      raw: e,
    };
  });
  const mirrored = new Set(entries.map((e) => e.data.canonical).filter(Boolean));

  const substack = (writing.posts ?? [])
    .filter((p: any) => !mirrored.has(p.url))
    .map(
      (p: any): Post => ({
        id: `substack-${p.url.split('/').pop()}`,
        kind: 'essay',
        date: new Date(p.date),
        title: p.title,
        excerpt: p.summary || undefined,
        images: [],
        tags: [],
        pull: [],
        lane: p.sourceName === 'WASP Signal' ? 'signal' : undefined,
        source: 'substack',
        sourceName: p.sourceName,
        href: p.url,
        external: true,
      })
    );

  const letterboxd = (films.films ?? [])
    .filter((f: any) => f.watched)
    .map(
      (f: any): Post => ({
        id: `letterboxd-${f.url.split('/').filter(Boolean).pop()}-${f.watched}`,
        kind: 'film',
        date: new Date(f.watched),
        subject: f.title,
        year: f.year ? Number(f.year) : undefined,
        rating: f.rating ?? undefined,
        liked: f.liked,
        excerpt: f.review ? excerpt(f.review, 400) : undefined,
        images: f.poster ? [{ src: f.poster, alt: `Poster for ${f.title}` }] : [],
        tags: [],
        pull: [],
        source: 'letterboxd',
        sourceName: 'Letterboxd',
        href: f.url,
        external: true,
      })
    );

  cache = [...local, ...substack, ...letterboxd].sort((x, y) => y.date.getTime() - x.date.getTime());
  return cache;
}

/** Things he wrote: local posts plus both Substacks, no film logs. */
export const getWriting = async () => (await getPosts()).filter((p) => p.source !== 'letterboxd');
export const getFilms = async () => (await getPosts()).filter((p) => p.source === 'letterboxd');

/**
 * The first sentence of a local post, verbatim; for a Substack post, its
 * subtitle (the line under the title there). "Mr." and friends don't end it.
 */
export function firstLine(p: Post): string {
  const body = p.raw?.body;
  if (!body) return p.excerpt ?? '';
  const t = plain(body);
  const re = /[.?!]["”’)]*(?=\s+[A-Z“"‘(])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const before = t.slice(0, m.index);
    if (/\b(Mr|Mrs|Ms|Dr|St|vs|etc|e\.g|i\.e)$/.test(before)) continue;
    return t.slice(0, m.index + m[0].length);
  }
  return t;
}

/** Text as it reads: markdown emphasis and escapes gone, whitespace collapsed. */
const flat = (s: string) => s.replace(/[*_\\]/g, '').replace(/\s+/g, ' ').trim();
/**
 * True when `line` is in the post word for word (its title, subtitle, body or pull
 * lines; a leading or trailing "…" marks a trim). Pages that quote a post check
 * this at build time and fall back to the post's own first line if he edits it.
 */
export function inPost(p: Post, line: string): boolean {
  const source = flat([p.title, p.subtitle, p.raw?.body ?? '', ...p.pull].filter(Boolean).join('\n'));
  return source.includes(flat(line.replace(/^…|…$/g, '')));
}

/** What a post is called when it has no title. */
export function label(p: Post): string {
  if (p.title) return p.title;
  if (p.subject) return p.by ? `${p.subject}, ${p.by}` : p.subject;
  if (p.excerpt) return p.excerpt.length > 60 ? p.excerpt.slice(0, 60).replace(/\s+\S*$/, '') + '…' : p.excerpt;
  return p.kind;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export const fmtMonth = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
/** "22 Oct": a date under a year heading. */
export const fmtDay = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
export const iso = (d: Date) => d.toISOString().slice(0, 10);
