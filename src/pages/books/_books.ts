/**
 * Books: what he's reading, what he's read, and the books on his Taste shelf.
 * docs/design/making.md, Amendment 1 B.
 *
 * A book post is `kind: book`: `subject` (the title), `by` (the author),
 * optional `rating`, `status` ('reading' | 'read' | 'stopped'), `highlights`
 * (the author's lines) and the body as his notes. `status` and `highlights` are
 * read defensively: a book post without a status is one he has read.
 *
 * The shelf books come from src/data/taste.json (kind book) as they stand
 * there: title, author, his line when he gave one. Nothing is written here.
 */
import { getPosts, firstLine, type Post } from '../../lib/posts';
import { works, type Work } from '../../data/taste';

/**
 * Q11, his answer on what he does creatively, verbatim (about-me.md):
 * "The next thing would be reading. I owe myself a library. I kind of try to read daily. That's the game."
 */
export const LINE = { library: 'I owe myself a library.', daily: 'I kind of try to read daily. That’s the game.' } as const;

export type Status = 'reading' | 'read' | 'stopped';

export type Book = {
  title: string;
  by?: string;
  rating?: number;
  /** a logged book's status; a shelf book has none (the shelf doesn't say) */
  status?: Status;
  date?: Date;
  /** the first line of his notes, verbatim */
  note?: string;
  /** his reading page, when there's something to read on it (notes or highlights) */
  href?: string;
  /** the shelf entry, for a book on the Taste shelf */
  work?: Work;
};

const STATUSES: readonly string[] = ['reading', 'read', 'stopped'];
const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

function fromPost(p: Post): Book {
  const d = (p.raw?.data ?? {}) as { status?: unknown; highlights?: unknown };
  const status = typeof d.status === 'string' && STATUSES.includes(d.status) ? (d.status as Status) : 'read';
  const highlights = Array.isArray(d.highlights) ? d.highlights.filter((h): h is string => typeof h === 'string' && h.trim() !== '') : [];
  const body = (p.raw?.body ?? '').replace(/<!--[\s\S]*?-->/g, '').trim();
  return {
    title: p.subject ?? p.title ?? 'Untitled',
    by: p.by,
    rating: p.rating,
    status,
    date: p.date,
    note: body ? firstLine(p) || undefined : undefined,
    href: body || highlights.length ? p.href : undefined,
  };
}

export type Books = {
  reading: Book[];
  /** read and stopped, by year of the post's date, newest first */
  years: { year: number; items: Book[] }[];
  shelf: Book[];
  /** every book on the page, once */
  count: number;
};

let cache: Books | null = null;

export async function getBooks(): Promise<Books> {
  if (cache) return cache;
  const posts = (await getPosts()).filter((p) => p.source === 'site' && p.kind === 'book');
  const logged = posts.map(fromPost);
  const reading = logged.filter((b) => b.status === 'reading');
  const done = logged.filter((b) => b.status !== 'reading');

  const years: Books['years'] = [];
  for (const b of done) {
    const y = b.date!.getUTCFullYear();
    const last = years[years.length - 1];
    if (last && last.year === y) last.items.push(b);
    else years.push({ year: y, items: [b] });
  }

  /* the shelf, as it stands on /taste/; a shelf book he has logged opens his page for it */
  const shelf = works
    .filter((w) => w.kind === 'book')
    .map((w): Book => {
      const post = logged.find((b) => norm(b.title) === norm(w.title));
      return { title: w.title, by: w.by, note: w.line, href: post?.href, work: w };
    });
  const onShelfOnly = shelf.filter((s) => !logged.some((b) => norm(b.title) === norm(s.title))).length;

  cache = { reading, years, shelf, count: logged.length + onShelfOnly };
  return cache;
}
