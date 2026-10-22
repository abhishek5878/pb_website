#!/usr/bin/env node
/**
 * Pulls the Letterboxd diary at build time:
 * - src/data/films.json: the RSS window (about the last 50 entries), as before;
 * - src/data/films-archive.json: every film he has logged, kept forever. The
 *   window is merged in (src/lib/tend/films.mjs), so the pages built now hold
 *   tonight's films even before the nightly cron commits them. The archive is
 *   only rewritten when something in it moved.
 *
 * Same contract as the other fetchers: never fail the build, and fall back to
 * the copies already on disk (which are committed) if Letterboxd refuses.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHIVE_PATH, USER as DEFAULT_USER, feedUrl, fetchFeed, mergeFilms, parseRss, serialize } from '../src/lib/tend/films.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/data/films.json');
const ARCHIVE = resolve(ROOT, ARCHIVE_PATH);
const USER = process.env.LETTERBOXD_USER || DEFAULT_USER;

/** films.json keeps its old shape: the review on one line. */
const flat = (f) => ({ ...f, review: f.review ? f.review.replace(/\s+/g, ' ').trim() : null });

async function archive(films) {
  let text;
  try {
    text = await readFile(ARCHIVE, 'utf8');
  } catch {
    console.warn('[films] no archive on disk; leaving it to the importer and the cron');
    return;
  }
  const { films: merged, added, changed } = mergeFilms(JSON.parse(text), films, { from: 'rss' });
  const next = serialize(merged);
  if (next === text) return console.log(`[films] archive: ${merged.length}, nothing new`);
  await writeFile(ARCHIVE, next);
  console.log(`[films] archive: ${merged.length} (${added} new, ${changed} changed)`);
}

async function main() {
  const xml = await fetchFeed(feedUrl(USER));
  const films = parseRss(xml);
  if (films.length === 0) throw new Error('no films in feed');
  films.sort((a, b) => (b.watched ?? '').localeCompare(a.watched ?? ''));

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      { user: USER, profile: `https://letterboxd.com/${USER}/`, generatedAt: new Date().toISOString(), films: films.map(flat) },
      null,
      2
    ) + '\n'
  );
  console.log(`[films] ${films.length} logged`);

  try {
    await archive(films);
  } catch (err) {
    console.warn(`[films] archive skipped: ${err.message}`);
  }
}

main().catch(async (err) => {
  console.warn(`[films] skipped: ${err.message}`);
  try {
    await readFile(OUT);
    console.warn('[films] keeping the payload already on disk');
  } catch {
    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(
      OUT,
      JSON.stringify(
        { user: USER, profile: `https://letterboxd.com/${USER}/`, generatedAt: null, films: [] },
        null,
        2
      ) + '\n'
    );
    console.warn('[films] wrote an empty payload');
  }
});
