/**
 * The records a save leaves behind (docs/design/living.md, data formats 2 and 3).
 *
 * - A Now save writes a snapshot, src/data/now-history/<today>.json (a second
 *   save the same day overwrites it), and the log line "Now updated".
 * - A project save appends a log line when a project is added or its status,
 *   line or name changes, and another when its page changed.
 *
 * Everything here is built on the server from what the commit route has
 * already validated (now.json's rows, projects.json's names and statuses, the
 * page file it generated) and from what is in the repo now. The client sends
 * no record path and no log text. Today is Asia/Kolkata's, from the server clock.
 *
 * A record never costs the save: when the repo can't be read, the log line is
 * skipped and logged, never written over (log.json is only rewritten from a
 * copy that was read and validated).
 */
import { Missing, type CommitFile, type Store } from './store';
import { HISTORY_DIR, LOG_PATH, NOW_PATH, PROJECTS_PATH, historyPath, isWorkText, workSlug } from './paths';
import { Log, Now, Snapshot, todayIST, validateRecord, type LogEntry, type ProjectRow } from './shapes';
import { z } from 'astro/zod';

export const DEFAULT_PLACE = 'Bangalore';

/** A file's text; '' when it isn't there; null when it couldn't be read (logged). */
async function readText(s: Store, path: string): Promise<string | null> {
  try {
    return await s.read(path);
  } catch (e) {
    if (e instanceof Missing) return '';
    console.error(`[tend] records: reading ${path}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** The newest snapshot in the repo, or null. */
export async function latestSnapshot(s: Store): Promise<Snapshot | null> {
  const days = (await s.siblings(HISTORY_DIR)).filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
  const last = days[days.length - 1];
  if (!last) return null;
  const text = await readText(s, `${HISTORY_DIR}/${last}`);
  if (!text) return null;
  try {
    return Snapshot.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

/** Where the last snapshot was written from; Bangalore before the first. */
export const latestPlace = async (s: Store) => (await latestSnapshot(s))?.place ?? DEFAULT_PLACE;

/** A name as a log line carries it: one line, no control characters. (Already held to 100 by the project shape.) */
const plain = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
/** A project page without its `updated:` line, which moves on every save. */
const pageBody = (text: string) => text.replace(/^updated: .*$/m, '').replace(/\s+$/, '');
const sameRows = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const Rows = z.array(Now);
const Projects = z.array(z.object({ slug: z.string(), name: z.string(), line: z.string(), status: z.string() }).passthrough());

/**
 * The record files this commit should also carry. `out` is the commit as the
 * route built it (every file already validated and generated server-side);
 * `place` is the validated place sent with now.json, if any.
 */
export async function recordsFor(s: Store, out: CommitFile[], { place }: { place?: string } = {}): Promise<CommitFile[]> {
  const today = todayIST();
  const lines: LogEntry[] = [];
  const files: CommitFile[] = [];

  /* Now: a snapshot and "Now updated", when the rows or the place changed. */
  const now = out.find((f) => f.path === NOW_PATH && f.content !== undefined);
  if (now) {
    const rows = Rows.parse(JSON.parse(now.content!));
    const prevText = await readText(s, NOW_PATH);
    const prev = await latestSnapshot(s);
    const where = place ?? prev?.place ?? DEFAULT_PLACE;
    let prevRows: unknown = undefined;
    try {
      prevRows = prevText ? JSON.parse(prevText) : undefined;
    } catch {}
    const unchanged = prevRows !== undefined && sameRows(prevRows, rows) && prev !== null && prev.place === where;
    if (!unchanged) {
      const path = historyPath(today);
      files.push({ path, content: validateRecord(path, { date: today, place: where, rows }) });
      lines.push({ date: today, kind: 'now', text: 'Now updated', href: '/now/' });
    }
  }

  /* Projects: what changed in the list, by slug. */
  const list = out.find((f) => f.path === PROJECTS_PATH && f.content !== undefined);
  const pages = out.filter((f) => isWorkText(f.path) && f.content !== undefined);
  let before: ProjectRow[] | null = null;
  let after: ProjectRow[] | null = null;
  if (list) after = Projects.parse(JSON.parse(list.content!)) as ProjectRow[];
  if (list || pages.length) {
    const text = await readText(s, PROJECTS_PATH);
    if (text !== null) {
      try {
        before = text ? (Projects.parse(JSON.parse(text)) as ProjectRow[]) : [];
      } catch {
        before = null;
      }
    }
  }
  const fresh = new Set<string>();
  if (after && before) {
    const old = new Map(before.map((p) => [p.slug, p]));
    for (const p of after) {
      const o = old.get(p.slug);
      const parts: string[] = [];
      if (!o) {
        fresh.add(p.slug);
        parts.push(`new project, ${p.status}`);
      } else {
        if (o.name !== p.name) parts.push(`renamed from ${plain(o.name)}`);
        if (o.status !== p.status) parts.push(`${o.status} → ${p.status}`);
        if (o.line !== p.line) parts.push('new line');
      }
      if (parts.length) lines.push({ date: today, kind: 'project', text: `${plain(p.name)}: ${parts.join(', ')}`, href: `/work/${p.slug}/` });
    }
  }

  /* A project's page: a line when its words, links or screenshots changed (not for a project that is new in this save). */
  for (const f of pages) {
    const slug = workSlug(f.path);
    if (fresh.has(slug)) continue;
    const name = (after ?? before ?? []).find((p) => p.slug === slug)?.name;
    if (!name) continue;
    const old = await readText(s, f.path);
    if (old === null || pageBody(old) === pageBody(f.content!)) continue;
    lines.push({ date: today, kind: 'page', text: `${plain(name)}: ${old === '' ? 'new page' : 'page updated'}`, href: `/work/${slug}/` });
  }

  /* The log: newest first; a line already there for today isn't said twice. */
  if (lines.length) {
    const text = await readText(s, LOG_PATH);
    let log: LogEntry[] | null = null;
    if (text !== null) {
      try {
        log = text ? Log.parse(JSON.parse(text)) : [];
      } catch (e) {
        console.error('[tend] records: log.json is not a log; left alone:', e instanceof Error ? e.message : e);
      }
    }
    if (log) {
      const seen = new Set(log.filter((l) => l.date === today).map((l) => `${l.kind}|${l.text}|${l.href}`));
      const add = lines.filter((l) => !seen.has(`${l.kind}|${l.text}|${l.href}`));
      if (add.length) files.push({ path: LOG_PATH, content: validateRecord(LOG_PATH, [...add, ...log]) });
    }
  }
  return files;
}
