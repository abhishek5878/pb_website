#!/usr/bin/env node
/**
 * One-time import of his Letterboxd export into src/data/films-archive.json
 * (docs/design/living.md, data format 1).
 *
 *   node scripts/import-letterboxd.mjs <export.zip | export-folder> [--dry]
 *
 * Reads only diary.csv (every logged viewing), reviews.csv (his words) and
 * ratings.csv (to fill a rating a diary entry lacks), plus likes/films.csv when
 * it's there (the heart). Nothing else in the export is opened: profile.csv
 * holds his email, and watchlist, comments and lists stay private.
 *
 * - A diary row is one entry. A review joins its diary entry by link, else by
 *   film + year + watched date; a review with no diary entry is its own entry
 *   (undated if it has no watched date).
 * - Films that are only rated (never logged, never reviewed) aren't entries:
 *   they have no date. They are counted and left out.
 * - Merged with what the archive already holds (the feed's entries) by
 *   src/lib/tend/films.mjs: de-duplicated by url + watched, and across the
 *   export's boxd.it links and the feed's letterboxd.com links by title + year
 *   + watched. Nothing already there is dropped; the export fills gaps.
 *
 * The export is personal data: this script refuses a path inside the repo, and
 * never copies it anywhere. Only the archive is written. --dry writes nothing.
 * Column names are read defensively (case, spacing and order don't matter).
 */

import { readFile, writeFile, stat, readdir } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { ARCHIVE_PATH, mergeFilms, reviewText, serialize } from '../src/lib/tend/films.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE = resolve(ROOT, ARCHIVE_PATH);

/* ---------- reading the export: a .zip or the folder it unzips to ---------- */

/** A zip's files by name, read with zlib (no unzip binary, nothing written to disk). */
function zipFiles(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('the zip’s directory is damaged; unzip it and pass the folder');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    if (size === 0xffffffff || local === 0xffffffff) throw new Error('a zip64 archive; unzip it and pass the folder');
    files.set(name, () => {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      throw new Error(`${name}: compression method ${method}; unzip it and pass the folder`);
    });
  }
  return files;
}

/** The folder's files, by path relative to it (one level of subfolders: likes/films.csv). */
async function folderFiles(dir) {
  const files = new Map();
  const walk = async (d, depth) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory() && depth < 2) await walk(full, depth + 1);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.csv')) files.set(relative(dir, full).split(sep).join('/'), () => readFile(full));
    }
  };
  await walk(dir, 0);
  return files;
}

/** The file whose path ends with `name` (the zip may wrap everything in a folder), shallowest first. */
async function pick(files, name) {
  const hits = [...files.keys()].filter((k) => k.toLowerCase() === name || k.toLowerCase().endsWith('/' + name));
  hits.sort((a, b) => a.split('/').length - b.split('/').length);
  if (!hits.length) return null;
  const buf = await files.get(hits[0])();
  return Buffer.from(buf).toString('utf8');
}

/* ---------- CSV ---------- */

/** RFC 4180: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF or LF, a BOM. */
function parseCsv(text) {
  const s = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

/** Header names as keys: lower case, anything not a letter or digit is one space ("Letterboxd URI" → "letterboxd uri"). */
const norm = (h) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function records(text) {
  if (!text) return [];
  const [head, ...rest] = parseCsv(text);
  if (!head) return [];
  const keys = head.map(norm);
  return rest.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

/** The first column present and non-empty, by any of its likely names. */
const col = (rec, ...names) => {
  for (const n of names) if (rec[n]) return rec[n];
  return '';
};
const TITLE = ['name', 'title', 'film', 'film name', 'film title'];
const YEAR = ['year', 'release year', 'film year'];
const URI = ['letterboxd uri', 'uri', 'url', 'link', 'letterboxd url'];
const WATCHED = ['watched date', 'watched', 'date watched', 'watched on'];
const LOGGED = ['date', 'logged date', 'date logged'];

/** YYYY-MM-DD, also from YYYY/MM/DD; anything else is no date. */
const day = (s) => {
  const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s || '');
  if (!m) return null;
  const d = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const t = new Date(d + 'T00:00:00Z');
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d ? d : null;
};
const yes = (s) => /^(yes|true|1)$/i.test(s || '');
const fold = (s) => s.normalize('NFKC').toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
const filmKey = (title, year) => `${fold(title)}|${year || ''}`;

/* ---------- main ---------- */

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const src = args.find((a) => !a.startsWith('--'));
  if (!src) {
    console.error('Usage: node scripts/import-letterboxd.mjs <letterboxd-export.zip | folder> [--dry]');
    process.exit(1);
  }
  const path = resolve(src);
  const rel = relative(ROOT, path);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
    console.error('The export is inside the repo. Move it out (e.g. ~/Downloads) so it can never be committed, then run this again.');
    process.exit(1);
  }

  const info = await stat(path);
  const files = info.isDirectory() ? await folderFiles(path) : zipFiles(await readFile(path));

  const diary = records(await pick(files, 'diary.csv'));
  const reviews = records(await pick(files, 'reviews.csv'));
  const ratings = records(await pick(files, 'ratings.csv'));
  const likes = records(await pick(files, 'likes/films.csv'));
  if (!diary.length && !reviews.length) throw new Error('no diary.csv or reviews.csv in the export');

  const ratingOf = new Map(ratings.map((r) => [filmKey(col(r, ...TITLE), col(r, ...YEAR)), col(r, 'rating')]));
  const liked = new Set(likes.map((r) => filmKey(col(r, ...TITLE), col(r, ...YEAR))));

  /* a diary row is a viewing */
  const entries = [];
  const byUri = new Map();
  const byDay = new Map();
  for (const r of diary) {
    const title = col(r, ...TITLE);
    const year = col(r, ...YEAR);
    const e = {
      title,
      year,
      rating: col(r, 'rating') || ratingOf.get(filmKey(title, year)) || null,
      liked: liked.has(filmKey(title, year)),
      rewatch: yes(col(r, 'rewatch')),
      /* "Watched Date" is the viewing; "Date" is when it was logged, the fallback for old exports */
      watched: day(col(r, ...WATCHED)) ?? day(col(r, ...LOGGED)),
      url: col(r, ...URI),
      review: null,
    };
    entries.push(e);
    if (e.url) byUri.set(e.url, e);
    byDay.set(`${filmKey(title, year)}|${e.watched ?? ''}`, e);
  }

  /* a review joins its viewing; one with no viewing is its own entry */
  let joined = 0;
  let own = 0;
  for (const r of reviews) {
    const text = reviewText(col(r, 'review', 'review text', 'text'));
    if (!text) continue;
    const title = col(r, ...TITLE);
    const year = col(r, ...YEAR);
    const uri = col(r, ...URI);
    const watched = day(col(r, ...WATCHED));
    const hit = (uri && byUri.get(uri)) || byDay.get(`${filmKey(title, year)}|${watched ?? ''}`);
    if (hit) {
      hit.review = text;
      joined++;
      continue;
    }
    entries.push({
      title,
      year,
      rating: col(r, 'rating') || ratingOf.get(filmKey(title, year)) || null,
      liked: liked.has(filmKey(title, year)),
      rewatch: yes(col(r, 'rewatch')),
      watched,
      url: uri,
      review: text,
    });
    own++;
  }

  const logged = new Set(entries.map((e) => filmKey(e.title, e.year)));
  const ratedOnly = [...ratingOf.keys()].filter((k) => !logged.has(k)).length;

  let archive = [];
  try {
    archive = JSON.parse(await readFile(ARCHIVE, 'utf8'));
  } catch {}
  const { films, added, changed } = mergeFilms(archive, entries, { from: 'export' });
  const unusable = entries.length - entries.filter((e) => e.title && /^https:\/\/(letterboxd\.com|boxd\.it)\//.test(e.url)).length;

  console.log(`[import] diary.csv: ${diary.length} rows · reviews.csv: ${reviews.length} rows (${joined} joined a diary entry, ${own} on their own) · ratings.csv: ${ratings.length} · likes: ${likes.length}`);
  if (ratedOnly) console.log(`[import] ${ratedOnly} films are only rated, never logged: left out (no date)`);
  if (unusable) console.log(`[import] ${unusable} rows had no title or no Letterboxd link: left out`);
  console.log(`[import] archive: ${archive.length} → ${films.length} (${added} new, ${changed} filled in)`);

  if (dry) return console.log('[import] --dry: nothing written');
  await writeFile(ARCHIVE, serialize(films));
  console.log(`[import] wrote ${ARCHIVE_PATH}. Check it with: git diff --stat ${ARCHIVE_PATH}`);
  console.log('[import] Commit only that file. Keep the export itself out of the repo.');
}

main().catch((err) => {
  console.error(`[import] ${err.message}`);
  process.exit(1);
});
