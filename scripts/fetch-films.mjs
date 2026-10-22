#!/usr/bin/env node
/**
 * Pulls the Letterboxd diary into src/data/films.json at build time.
 *
 * Same contract as the other fetchers: never fail the build, and fall back to
 * the copy already on disk (which is committed) if Letterboxd refuses.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/data/films.json');
const USER = process.env.LETTERBOXD_USER || 'abhishek5878';
const FEED = `https://letterboxd.com/${USER}/rss/`;

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const unescape = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&amp;/g, '&');

const tag = (name, xml) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? unescape(m[1]).trim() : '';
};

async function fetchFeed(attempt = 0) {
  try {
    const res = await fetch(FEED, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } catch (err) {
    if (attempt >= 1) throw err;
    await new Promise((r) => setTimeout(r, 1500));
    return fetchFeed(attempt + 1);
  }
}

async function main() {
  const xml = await fetchFeed();

  const films = xml
    .split('<item>')
    .slice(1)
    .map((item) => {
      const description = tag('description', item);
      // The first <img> is the poster; everything after it is the review.
      const poster = (description.match(/<img[^>]+src="([^"]+)"/) || [])[1] ?? null;
      const review = description
        .replace(/<img[^>]*>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

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
        spoilers: /This review may contain spoilers/i.test(review),
        // When there is no review, Letterboxd fills the description with
        // "Watched on <date>." — that is not a review, so drop it.
        review:
          review
            .replace(/^This review may contain spoilers\.?\s*/i, '')
            .replace(/^Watched on \w+ \w+ \d{1,2}, \d{4}\.?\s*/i, '')
            .trim() || null,
      };
    })
    .filter((f) => f.title && f.url);

  if (films.length === 0) throw new Error('no films in feed');

  films.sort((a, b) => (b.watched ?? '').localeCompare(a.watched ?? ''));

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      { user: USER, profile: `https://letterboxd.com/${USER}/`, generatedAt: new Date().toISOString(), films },
      null,
      2
    ) + '\n'
  );
  console.log(`[films] ${films.length} logged`);
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
