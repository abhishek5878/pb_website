/**
 * Shared by /work/, /work/[slug]/, /threads/ and the homepage Work band.
 * (The underscore keeps this file out of routing.)
 *
 * - the order of the ledger (newest first, by `when`);
 * - which projects have a page worth linking to (a `work` entry exists);
 * - the five filter groups, mapped from the tags in projects.json, which the
 *   writer owns: we read the tags, never rewrite them.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { projects, type Project, type Status } from '../../data/me';

export type WorkEntry = CollectionEntry<'work'>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Oct 2026" → months since year 0; a bare "2026" counts as the start of that year. */
export function whenKey(when: string): number {
  const m = when.match(/^([A-Z][a-z]{2}) (\d{4})$/);
  if (m) return Number(m[2]) * 12 + MONTHS.indexOf(m[1]);
  const y = when.match(/^(\d{4})$/);
  return y ? Number(y[1]) * 12 : 0;
}

/** "Oct 2026" → "2026-10" for <time datetime>. */
export function whenISO(when: string): string {
  const m = when.match(/^([A-Z][a-z]{2}) (\d{4})$/);
  if (m) return `${m[2]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0')}`;
  return when;
}

export const RUNNING: Status[] = ['live', 'in use', 'building'];
export const isRunning = (p: Project) => RUNNING.includes(p.status);

/** The ledger's order: newest first; ties keep projects.json order. */
export const sortedProjects = (): Project[] => [...projects].sort((a, b) => whenKey(b.when) - whenKey(a.when));

let cache: Map<string, WorkEntry> | null = null;
/** slug → work entry, for the projects that have one. Entries without a project are ignored. */
export async function workEntries(): Promise<Map<string, WorkEntry>> {
  if (cache) return cache;
  const slugs = new Set(projects.map((p) => p.slug));
  const all = await getCollection('work');
  cache = new Map(all.filter((e) => slugs.has(e.id)).map((e) => [e.id, e]));
  return cache;
}

/** The project's own page. Only link to it when an entry exists. */
export const pagePath = (slug: string) => `/work/${slug}/`;

/**
 * Where a project's name points from elsewhere on the site: its page when it
 * has an entry, else its row on /work/.
 */
export const projectHref = (p: Project, entries: Map<string, WorkEntry>) =>
  entries.has(p.slug) ? pagePath(p.slug) : `/work/#${p.slug}`;

/**
 * Five groups instead of thirteen tags (external review, 22 Oct 2026).
 * A project can sit in more than one; tags not listed here (product, research,
 * tooling, voice, founders) only show under All.
 */
export const GROUPS: { id: string; label: string; tags: string[] }[] = [
  { id: 'agents', label: 'agents', tags: ['agents'] },
  { id: 'vc', label: 'vc', tags: ['vc'] },
  { id: 'finance', label: 'finance', tags: ['finance', 'lending', 'credit'] },
  { id: 'health', label: 'health', tags: ['health', 'mental health'] },
  { id: 'personal', label: 'personal', tags: ['personal'] },
];

export const groupsOf = (p: Project): string[] =>
  GROUPS.filter((g) => p.tags.some((t) => g.tags.includes(t))).map((g) => g.id);
