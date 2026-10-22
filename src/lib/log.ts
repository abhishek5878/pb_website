/**
 * The log: one dated stream of everything that changed on the site.
 * docs/design/living.md is the contract.
 *
 * Four sources, merged newest first:
 * - his writing (getWriting: local posts and both Substacks), by date;
 * - the film diary (src/data/films-archive.json, else films.json), by the day he watched;
 * - /now's snapshots (src/data/now-history/YYYY-MM-DD.json): "Now updated";
 * - src/data/log.json: what /tend changed that isn't a post or a film.
 *
 * Agent A's three data files are read through import.meta.glob, so a file that
 * doesn't exist yet is simply empty: the page builds, and a source with nothing
 * in it adds nothing. The words are titles, names and statuses; the rest is UI.
 */
import filmsJson from '../data/films.json';
import { getWriting, LANE_LABEL, type Lane } from './posts';

/* ---- Agent A's files, read defensively ---- */
const archiveFile = import.meta.glob('../data/films-archive.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const logFile = import.meta.glob('../data/log.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const nowFiles = import.meta.glob('../data/now-history/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v && typeof v === 'object' && Array.isArray((v as { films?: unknown }).films) ? (v as { films: unknown[] }).films : []);

export type Film = { title: string; year?: string; rating?: number | null; liked?: boolean; rewatch?: boolean; watched: string; url: string; review?: string };

/** Every film he logged: the archive when it exists and holds anything, else the RSS window in films.json. Newest first, one per url + day. */
export function films(): Film[] {
  const archive = asArray(Object.values(archiveFile)[0]);
  const source = archive.length ? archive : asArray(filmsJson);
  const seen = new Set<string>();
  const out: Film[] = [];
  for (const f of source as Partial<Film>[]) {
    if (!f || typeof f.title !== 'string' || typeof f.url !== 'string' || typeof f.watched !== 'string' || !DAY.test(f.watched)) continue;
    const key = `${f.url}|${f.watched}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f as Film);
  }
  return out.sort((a, b) => b.watched.localeCompare(a.watched));
}

export type NowRow = { verb: string; short?: string; what: string };
export type NowSnapshot = { date: string; place?: string; rows: NowRow[] };

/** /now's dated layers, newest first. A file that isn't a snapshot is skipped. */
export function nowSnapshots(): NowSnapshot[] {
  return Object.entries(nowFiles)
    .map(([path, v]) => {
      const s = v as Partial<NowSnapshot> | null;
      const date = s?.date ?? path.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1];
      if (!s || !date || !DAY.test(date) || !Array.isArray(s.rows)) return null;
      return { date, place: typeof s.place === 'string' ? s.place : undefined, rows: s.rows } as NowSnapshot;
    })
    .filter((s): s is NowSnapshot => !!s)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export type LogKind = 'project' | 'now' | 'page';
export type LogEntry = { date: string; kind: LogKind; text: string; href?: string };

/** log.json, as /tend appends it. A line without a date, a kind or text is skipped. */
export function logEntries(): LogEntry[] {
  return asArray(Object.values(logFile)[0])
    .filter((e): e is LogEntry => {
      const x = e as Partial<LogEntry> | null;
      return !!x && typeof x.date === 'string' && DAY.test(x.date) && (x.kind === 'project' || x.kind === 'now' || x.kind === 'page') && typeof x.text === 'string' && x.text.trim() !== '';
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ---- the stream ---- */

/** The four kinds a line can be, as the page names them (UI words). */
export type LineKind = 'writing' | 'film' | 'now' | 'work';
export const KIND_LABEL: Record<LineKind, string> = { writing: 'Writing', film: 'Film', now: 'Now', work: 'Work' };
export const KINDS: LineKind[] = ['writing', 'work', 'now', 'film'];

export type Line = {
  /** YYYY-MM-DD, the day it happened. */
  day: string;
  date: Date;
  kind: LineKind;
  text: string;
  href?: string;
  external?: boolean;
  /** Writing: its lane. */
  lane?: string;
  /** Films: the film's year, his rating out of 5, and a rewatch. */
  year?: string;
  rating?: number;
  rewatch?: boolean;
};

const dayOf = (d: Date) => d.toISOString().slice(0, 10);
/** Same day: writing, then work, then now, then films. */
const ORDER: Record<LineKind, number> = { writing: 0, work: 1, now: 2, film: 3 };

let cache: Line[] | null = null;

/** Everything, newest first. */
export async function getLog(): Promise<Line[]> {
  if (cache) return cache;
  const lines: Line[] = [];

  for (const p of await getWriting()) {
    lines.push({
      day: dayOf(p.date),
      date: p.date,
      kind: 'writing',
      text: p.title ?? p.subject ?? p.id,
      href: p.href,
      external: p.external,
      lane: p.lane ? LANE_LABEL[p.lane as Lane] : undefined,
    });
  }

  for (const f of films()) {
    lines.push({
      day: f.watched,
      date: new Date(f.watched),
      kind: 'film',
      text: f.title,
      year: f.year || undefined,
      href: f.url,
      external: true,
      rating: typeof f.rating === 'number' ? f.rating : undefined,
      rewatch: !!f.rewatch,
    });
  }

  /* A Now save writes a snapshot and a log line on the same day: one line says it. */
  const nowDays = new Set<string>();
  for (const s of nowSnapshots()) {
    if (nowDays.has(s.date)) continue;
    nowDays.add(s.date);
    /* the kind already says Now: the line says what /now says of itself, "Updated, from Bangalore" */
    lines.push({ day: s.date, date: new Date(s.date), kind: 'now', text: s.place ? `Updated, from ${s.place}` : 'Updated', href: '/now/' });
  }

  for (const e of logEntries()) {
    if (e.kind === 'now') {
      if (nowDays.has(e.date)) continue;
      nowDays.add(e.date);
    }
    /* "Now updated" under the kind Now reads twice: drop the repeated word */
    const text = e.kind === 'now' ? e.text.replace(/^Now\s+(\S)/, (_, c: string) => c.toUpperCase()) : e.text;
    lines.push({ day: e.date, date: new Date(e.date), kind: e.kind === 'now' ? 'now' : 'work', text, href: e.href });
  }

  cache = lines.sort((a, b) => b.day.localeCompare(a.day) || ORDER[a.kind] - ORDER[b.kind]);
  return cache;
}

/** "4.5/5": a rating as the site writes it (/taste/ does the same). */
export const ratingText = (r: number) => `${Number.isInteger(r) ? r : r.toFixed(1)}/5`;
