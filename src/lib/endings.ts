/**
 * What sits at the end of a post or a project page (docs/design/living.md):
 * the thread it belongs to and that thread's next stop, the pieces that link
 * to it ("Mentioned in"), and the dates it was written and changed.
 *
 * Everything is worked out at build time from what the site already holds:
 * src/data/threads.ts, the bodies of posts and project pages, and git.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { getCollection } from 'astro:content';
import { projects } from '../data/me';
import { THREADS, type Ref, type Thread } from '../data/threads';
import { getWriting, label, type Post } from './posts';

/* ---------------------------------------------------------------- threads */

export type Stop = { kind: 'post' | 'project' | 'charter'; title: string; href: string };

/** Where a project's name points: its page (every project has one; a bare one is still a page). */
const projectPath = (slug: string) => `/work/${slug}/`;

async function resolve(ref: Ref): Promise<Stop | null> {
  if ('post' in ref) {
    const p = (await getWriting()).find((x) => x.id === ref.post);
    return p ? { kind: 'post', title: label(p), href: p.href } : null;
  }
  if ('project' in ref) {
    const p = projects.find((x) => x.slug === ref.project);
    return p ? { kind: 'project', title: p.name, href: projectPath(p.slug) } : null;
  }
  return { kind: 'charter', title: 'The charter', href: '/about/#charter-label' };
}

export type InThread = {
  thread: Thread;
  /** 1-based stop number, and how many stops the walk has. */
  at: number;
  of: number;
  /** The next stop's posts or projects; empty on the last stop. */
  next: Stop[];
};

/** The threads a post or a project walks in, with its place and what comes next. */
export async function threadsOf(target: { post: string } | { project: string }): Promise<InThread[]> {
  const hit = (r: Ref) => ('post' in target ? 'post' in r && r.post === target.post : 'project' in r && r.project === target.project);
  const out: InThread[] = [];
  for (const thread of THREADS) {
    const i = thread.stops.findIndex((s) => s.refs.some(hit));
    if (i < 0) continue;
    const after = thread.stops[i + 1];
    const next = after ? (await Promise.all(after.refs.map(resolve))).filter((s): s is Stop => !!s) : [];
    out.push({ thread, at: i + 1, of: thread.stops.length, next });
  }
  return out;
}

/**
 * The status groups a project page's newer / older walk: what is running (live,
 * in use, building) is one group, as the ledger sets it; paused, stopped and
 * shipped are each their own.
 */
export const statusGroup = (p: { status: string }) => (['live', 'in use', 'building'].includes(p.status) ? 'running' : p.status);

/* ---------------------------------------------------------------- mentioned in */

export type Mention = { title: string; href: string; date?: Date };
type Source = Mention & { id: string; text: string };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Comments are notes to himself (and the import's own source line), not links. */
const readable = (s: string) => s.replace(/<!--[\s\S]*?-->/g, ' ');

let sources: Source[] | null = null;
/** Every page whose words can link elsewhere: local posts, and project pages (their body and their links). */
async function allSources(): Promise<Source[]> {
  if (sources) return sources;
  const posts = (await getWriting()).filter((p) => p.source === 'site');
  const work = await getCollection('work');
  sources = [
    ...posts.map((p) => ({ id: `post:${p.id}`, title: label(p), href: p.href, date: p.date, text: readable([p.raw?.body ?? '', p.raw?.data.link ?? ''].join('\n')) })),
    ...work
      .filter((e) => projects.some((p) => p.slug === e.id))
      .map((e) => ({
        id: `project:${e.id}`,
        title: projects.find((p) => p.slug === e.id)!.name,
        href: projectPath(e.id),
        date: e.data.updated,
        text: readable([e.body ?? '', ...e.data.links.map((l) => l.url)].join('\n')),
      })),
  ];
  return sources;
}

/** An address as it appears in a page: on this site (relative or whole), or a post's first home. */
const END = `(?=[/#?)"'\\s>\\]]|$)`;
const SITE = `(?:https?://(?:www\\.)?vyas\\.garden)?`;

/** The pages that link to this one, newest first. Its own page never counts. */
export async function mentionsOf(target: { post: Post } | { project: string }): Promise<Mention[]> {
  let self: string;
  const patterns: RegExp[] = [];
  if ('post' in target) {
    const p = target.post;
    self = `post:${p.id}`;
    patterns.push(new RegExp(`(?:^|[\\s("'\\[<])${SITE}/writing/${esc(p.id)}${END}`, 'm'));
    const first = p.raw?.data.canonical;
    if (first) patterns.push(new RegExp(`${esc(first.replace(/^https?:\/\//, '').replace(/\/$/, ''))}${END}`));
  } else {
    self = `project:${target.project}`;
    patterns.push(new RegExp(`(?:^|[\\s("'\\[<])${SITE}/work/(?:${esc(target.project)}${END}|#${esc(target.project)}${END})`, 'm'));
  }
  return (await allSources())
    .filter((s) => s.id !== self && patterns.some((re) => re.test(s.text)))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .map(({ title, href, date }) => ({ title, href, date }));
}

/* ---------------------------------------------------------------- dates, from git */

/**
 * Git, quietly. Vercel's clone can be shallow and a build machine may have no
 * git at all: every question here answers "don't know" rather than guess, and
 * the page then leaves the date out.
 */
function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 });
  } catch {
    return null;
  }
}

let boundary: Set<string> | null = null;
/** The commits a shallow clone stops at: their parents are missing, so what they "changed" is unknowable. */
function shallowBoundary(): Set<string> {
  if (boundary) return boundary;
  boundary = new Set();
  const path = git(['rev-parse', '--git-path', 'shallow'])?.trim();
  if (path && existsSync(path)) for (const h of readFileSync(path, 'utf8').split('\n')) if (h.trim()) boundary.add(h.trim());
  return boundary;
}

/** The day a commit happened, in Bangalore (where he writes), as a UTC-midnight Date like every other date on the site. */
const BLR = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
const dayOf = (isoTime: string) => new Date(BLR.format(new Date(isoTime)));

/** What a reader reads: the file without its frontmatter and comments, whitespace collapsed. */
const words = (file: string) =>
  file
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const changedCache = new Map<string, Date | undefined>();
/**
 * The last day the words of a file changed, on a later day than it landed here.
 * A commit that only touched the frontmatter (a lane, a tag) isn't a change to
 * the piece; nor is the commit that added (or moved) it, nor the fixes made the
 * day it arrived (an import's typos and alt text are part of bringing it over).
 */
export function changedOn(filePath: string | undefined): Date | undefined {
  if (!filePath) return undefined;
  if (changedCache.has(filePath)) return changedCache.get(filePath);
  let found: Date | undefined;
  const rel = `./${filePath.replace(/^\.\//, '')}`;
  const log = git(['log', '--format=%H %cI', '--', rel]);
  for (const line of (log ?? '').split('\n').filter(Boolean)) {
    const [hash, when] = line.split(' ');
    if (shallowBoundary().has(hash)) break;
    const now = git(['show', `${hash}:${rel}`]);
    const before = git(['show', `${hash}^:${rel}`]);
    if (now == null || before == null) break;
    if (words(now) !== words(before)) {
      found = dayOf(when);
      break;
    }
  }
  const landed = addedOn(filePath);
  if (found && landed && !after(found, landed)) found = undefined;
  changedCache.set(filePath, found);
  return found;
}

const addedCache = new Map<string, Date | undefined>();
/** The day a file first landed here; unknown in a shallow clone that doesn't reach back that far. */
export function addedOn(filePath: string | undefined): Date | undefined {
  if (!filePath) return undefined;
  if (addedCache.has(filePath)) return addedCache.get(filePath);
  const rel = `./${filePath.replace(/^\.\//, '')}`;
  const line = (git(['log', '--diff-filter=A', '--format=%H %cI', '--', rel]) ?? '').split('\n').filter(Boolean).pop();
  const [hash, when] = line ? line.split(' ') : [];
  const found = hash && when && !shallowBoundary().has(hash) ? dayOf(when) : undefined;
  addedCache.set(filePath, found);
  return found;
}

/** Later by at least a day. */
export const after = (a: Date | undefined, b: Date | undefined) => !!a && !!b && a.toISOString().slice(0, 10) > b.toISOString().slice(0, 10);
