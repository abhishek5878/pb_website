/**
 * The nightly cron (tend-spec, Security 6; docs/design/living.md). Vercel's
 * cron (vercel.json) calls GET /api/rebuild/ with `Authorization: Bearer
 * $CRON_SECRET`, 06:00 IST.
 *
 * 1. Fetch his Letterboxd RSS and merge it into src/data/films-archive.json
 *    (src/lib/tend/films.mjs: never shrinks, key url + watched).
 * 2. If anything is new or changed, commit that one file through the /tend
 *    store. The commit redeploys, which refreshes Substack too.
 * 3. Otherwise (or if the feed or GitHub fails), POST the deploy hook as before.
 *
 * This route writes exactly one path, ARCHIVE_PATH, and only after the merged
 * list passes the archive's strict shape (shapes.ts). Nothing from the request
 * but the bearer token is read. The archive is never created here: if it isn't
 * in the repo, nothing is committed.
 *
 * Mock (TEND_MOCK=1, `astro dev` only): the feed is read from
 * .astro/tend-mock/letterboxd.xml instead of Letterboxd, the commit goes to the
 * working tree, and the deploy hook isn't called.
 */
import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { env, isMock } from '../../lib/tend/env';
import { fail, json } from '../../lib/tend/http';
import { ARCHIVE_PATH, isArchive } from '../../lib/tend/paths';
import { Archive, validateRecord } from '../../lib/tend/shapes';
import { Missing, store } from '../../lib/tend/store';
import { fetchFeed, mergeFilms, parseRss } from '../../lib/tend/films.mjs';

export const prerender = false;

const digest = (s: string) => createHash('sha256').update(s, 'utf8').digest();

/** The feed: Letterboxd's, or in mock the file a test put there. */
async function feed(): Promise<string | null> {
  if (isMock()) {
    try {
      return await fs.readFile(join(process.cwd(), '.astro', 'tend-mock', 'letterboxd.xml'), 'utf8');
    } catch {
      return null;
    }
  }
  /* one try, short: the function still has to reach the deploy hook if Letterboxd is slow */
  return fetchFeed(undefined, { timeout: 6_000, retries: 0 });
}

/** Merge the feed into the archive and commit it if anything moved. Never throws. */
async function mergeFeed(): Promise<{ added: number; changed: number; commit?: string } | { error: string }> {
  try {
    const xml = await feed();
    if (xml === null) return { error: 'no feed' };
    const incoming = parseRss(xml);
    if (!incoming.length) return { error: 'empty feed' };
    const s = store();
    let current: unknown;
    try {
      current = JSON.parse(await s.read(ARCHIVE_PATH));
    } catch (e) {
      if (e instanceof Missing) return { error: 'no archive in the repo' };
      throw e;
    }
    const before = Archive.parse(current);
    const { films, added, changed } = mergeFilms(before, incoming, { from: 'rss' });
    if (!added && !changed) return { added, changed };
    if (films.length < before.length) throw new Error('the archive would shrink');
    const content = validateRecord(ARCHIVE_PATH, films);
    if (!isArchive(ARCHIVE_PATH)) throw new Error('not the archive');
    const what = [added && `${added} new`, changed && `${changed} changed`].filter(Boolean).join(', ');
    const { commit } = await s.commit(`films: ${what}, from Letterboxd`, [{ path: ARCHIVE_PATH, content }], []);
    return { added, changed, commit };
  } catch (e) {
    console.error('[rebuild] films:', e instanceof Error ? e.message : e);
    return { error: 'films' };
  }
}

const handle: APIRoute = async ({ request }) => {
  const secret = env('CRON_SECRET');
  const given = request.headers.get('authorization') ?? '';
  if (!secret || !timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return fail(401);
  const hook = env('DEPLOY_HOOK_URL');
  if (!hook) return fail(500, 'Didn’t work.');

  const result = await mergeFeed();
  /* a commit redeploys by itself */
  if ('commit' in result && result.commit) return json({ ok: true, films: { added: result.added, changed: result.changed }, deployed: 'commit' });

  const films = 'error' in result ? { error: result.error } : { added: 0, changed: 0 };
  if (isMock()) return json({ ok: true, mock: true, films, deployed: 'hook (mock: not called)' });
  try {
    const res = await fetch(hook, { method: 'POST' });
    if (!res.ok) console.error('[rebuild] deploy hook answered', res.status);
    return json({ ok: res.ok, films, deployed: 'hook' });
  } catch (e) {
    console.error('[rebuild] deploy hook:', e instanceof Error ? e.message : e);
    return fail(502, 'Didn’t work.');
  }
};

export const GET = handle;
export const POST = handle;
export const ALL: APIRoute = () => fail(405);
