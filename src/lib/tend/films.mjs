/**
 * The film diary (docs/design/living.md, data format 1): every film he has
 * logged on Letterboxd, kept forever, newest first, in
 * src/data/films-archive.json.
 *
 * One module for the three places that touch it, so they parse and merge the
 * same way and write the same bytes:
 * - the build (scripts/fetch-films.mjs) merges the RSS window in before pages render;
 * - the nightly cron (src/pages/api/rebuild.ts) merges it and commits the file;
 * - the one-time importer (scripts/import-letterboxd.mjs) merges his export.
 * Plain JS with JSDoc, so Node runs it without a build step.
 *
 * An entry: { title, year, rating, liked, rewatch, watched, url, review }.
 * The key is url + watched. His export names entries by short link
 * (boxd.it/…) where the feed says letterboxd.com/…, so across those two hosts
 * an entry also matches on title + year + watched. The archive never shrinks.
 */

/** @typedef {{ title: string, year: string|null, rating: number|null, liked: boolean, rewatch: boolean, watched: string|null, url: string, review: string|null }} Entry */

export const USER = 'abhishek5878';
export const ARCHIVE_PATH = 'src/data/films-archive.json';
export const feedUrl = (user = USER) => `https://letterboxd.com/${user}/rss/`;

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** The feed. Throws when Letterboxd refuses (after `retries` more tries, 1.5s apart). */
export async function fetchFeed(url = feedUrl(), { timeout = 15_000, retries = 1 } = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml' },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, 1500));
    return fetchFeed(url, { timeout, retries: retries - 1 });
  }
}

/** HTML entities as Letterboxd writes them. */
export const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(Number(d)))
    .replace(/&amp;/g, '&');
const safeChar = (n) => (n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '');

const unCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

const tag = (name, xml) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(unCdata(m[1])).trim() : '';
};

/**
 * His review as text: his line breaks kept (<br>, paragraphs), every other tag
 * dropped, spaces tidied. Shared by the feed and the export.
 */
export function reviewText(html) {
  if (!html) return '';
  return decode(
    html
      .replace(/\r\n?/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * The feed's items. Each keeps the poster and spoiler flag films.json carries;
 * `review` keeps his line breaks (films.json flattens them, as it always has).
 */
export function parseRss(xml) {
  return xml
    .split('<item>')
    .slice(1)
    .map((item) => {
      const raw = unCdata((item.match(/<description[^>]*>([\s\S]*?)<\/description>/) || [])[1] || '');
      // The first <img> is the poster; everything after it is the review.
      const poster = (raw.match(/<img[^>]+src="([^"]+)"/) || [])[1] ?? null;
      const text = reviewText(raw.replace(/<img[^>]*>/g, ''));
      const rating = parseFloat(tag('letterboxd:memberRating', item));
      return {
        title: tag('letterboxd:filmTitle', item),
        year: tag('letterboxd:filmYear', item) || null,
        rating: Number.isFinite(rating) ? rating : null,
        liked: tag('letterboxd:memberLike', item) === 'Yes',
        rewatch: tag('letterboxd:rewatch', item) === 'Yes',
        watched: tag('letterboxd:watchedDate', item) || null,
        url: tag('link', item),
        poster,
        // Letterboxd prefixes spoiler reviews with this sentence.
        spoilers: /This review may contain spoilers/i.test(text),
        // With no review, Letterboxd fills the description with "Watched on <date>.": not a review, so drop it.
        review:
          text
            .replace(/^This review may contain spoilers\.?\s*/i, '')
            .replace(/^Watched on \w+ \w+ \d{1,2}, \d{4}\.?\s*/i, '')
            .trim() || null,
      };
    })
    .filter((f) => f.title && f.url);
}

/* ---------- the archive ---------- */

const isDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
/** Only Letterboxd's own addresses become links on the site. */
export const isLetterboxdUrl = (u) => typeof u === 'string' && u.length <= 500 && /^https:\/\/(letterboxd\.com|boxd\.it)\/[^\s"'<>\\]*$/.test(u);
const host = (u) => (u.startsWith('https://boxd.it/') ? 'boxd.it' : 'letterboxd.com');
const oneLine = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
const halves = (r) => {
  const n = typeof r === 'number' ? r : parseFloat(String(r ?? ''));
  return Number.isFinite(n) && n >= 0.5 && n <= 5 && Number.isInteger(n * 2) ? n : null;
};

/** One entry in the archive's exact shape and key order, or null when it can't be one. */
export function toEntry(f) {
  if (!f || typeof f !== 'object') return null;
  const title = oneLine(f.title).slice(0, 300);
  const url = String(f.url ?? '').trim();
  if (!title || !isLetterboxdUrl(url)) return null;
  const year = String(f.year ?? '').trim();
  const review = typeof f.review === 'string' ? f.review.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, 20_000) : '';
  return {
    title,
    year: /^\d{4}$/.test(year) ? year : null,
    rating: halves(f.rating),
    liked: f.liked === true,
    rewatch: f.rewatch === true,
    watched: isDate(f.watched) ? f.watched : null,
    url,
    review: review || null,
  };
}

const fold = (s) => s.normalize('NFKC').toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
const exactKey = (f) => `${f.url.replace(/\/+$/, '').toLowerCase()}|${f.watched ?? ''}`;
const looseKey = (f) => `${fold(f.title)}|${f.year ?? ''}|${f.watched ?? ''}`;
/** A review compared by its words, so the export's line breaks and the feed's flattened copy are the same review. */
const words = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
/** Newest first; undated last. Array.prototype.sort is stable, so same-day entries keep their order. */
const newestFirst = (a, b) => (b.watched ?? '').localeCompare(a.watched ?? '');

/** The archive's identity for an entry: what the page anchors and the schema's uniqueness check use. */
export const keyOf = exactKey;

/**
 * Fold what `f` knows into `old`. From the feed: his diary as it is today, so a
 * changed rating, like or review replaces the old one (a review with the same
 * words keeps the old text and its line breaks). From the export: it fills gaps.
 */
function update(old, f, from) {
  const before = JSON.stringify(old);
  if (host(old.url) === 'boxd.it' && host(f.url) === 'letterboxd.com') old.url = f.url; // the full address wins
  if (old.year == null && f.year != null) old.year = f.year;
  if (from === 'rss') {
    if (f.rating != null) old.rating = f.rating;
    old.liked = f.liked;
    old.rewatch = f.rewatch;
    if (f.review != null && words(f.review) !== words(old.review)) old.review = f.review;
    else if (f.review != null && old.review != null && !old.review.includes('\n') && f.review.includes('\n')) old.review = f.review;
  } else {
    if (old.rating == null) old.rating = f.rating;
    old.liked = old.liked || f.liked;
    old.rewatch = old.rewatch || f.rewatch;
    if (f.review != null && (old.review == null || words(old.review) === words(f.review))) old.review = f.review;
  }
  return JSON.stringify(old) !== before;
}

/**
 * Merge `incoming` into `archive`. Nothing is ever dropped. Returns the new
 * list (newest first) and how many entries were added and changed.
 * @param {Entry[]} archive
 * @param {unknown[]} incoming
 * @param {{ from?: 'rss' | 'export' }} [opts]
 */
export function mergeFilms(archive, incoming, { from = 'rss' } = {}) {
  /** @type {Entry[]} */
  const films = [];
  for (const f of archive) {
    const e = toEntry(f);
    if (!e) throw new Error('the archive holds an entry that is not an entry: ' + JSON.stringify(f).slice(0, 200));
    films.push(e);
  }
  const exact = new Map();
  const loose = new Map();
  const index = (f) => {
    exact.set(exactKey(f), f);
    const k = looseKey(f);
    if (!loose.has(k)) loose.set(k, []);
    loose.get(k).push(f);
  };
  films.forEach(index);

  /** @type {Entry[]} */
  const added = [];
  let changed = 0;
  for (const raw of incoming) {
    const f = toEntry(raw);
    if (!f) continue;
    const hit = exact.get(exactKey(f)) ?? (loose.get(looseKey(f)) ?? []).find((g) => host(g.url) !== host(f.url));
    if (hit) {
      if (update(hit, f, from)) changed++;
      continue;
    }
    added.push(f);
    index(f);
  }
  const out = [...added, ...films].sort(newestFirst);
  if (out.length < archive.length) throw new Error('the archive would shrink');
  return { films: out, added: added.length, changed };
}

/** The file's bytes: two-space JSON, one trailing newline (the same as /tend's data files). */
export const serialize = (films) => JSON.stringify(films.map(toEntry), null, 2) + '\n';
