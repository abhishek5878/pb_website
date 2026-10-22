#!/usr/bin/env node
/**
 * Pulls published Substack posts into src/data/writing.json at build time.
 *
 * The point: writing that already exists elsewhere should show up here without
 * being copy-pasted. Add a feed to SOURCES and it appears on the site.
 *
 * Like the GitHub fetch, this must never fail the build — on any error it keeps
 * whatever JSON is already on disk, and only writes an empty payload if there
 * is nothing at all. That on-disk copy is committed to the repo on purpose:
 * Substack refuses some datacentre IPs, and CI has no prior copy of an ignored
 * file, so without it a single blocked request empties the page.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/data/writing.json');

const SOURCES = [
  {
    key: 'wasp',
    name: 'WASP Signal',
    note: 'Venture intelligence — who is building, and what the agents flagged.',
    feed: 'https://waspsignal.substack.com/feed',
    home: 'https://waspsignal.substack.com',
  },
  {
    key: 'personal',
    name: 'Personal',
    note: 'The unguarded one. Notebooks, hospitals, GTM, and being seen.',
    feed: 'https://abhishekvyas02032001.substack.com/feed',
    home: 'https://abhishekvyas02032001.substack.com',
  },
];

const unescape = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&amp;/g, '&');

const tag = (name, xml) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? unescape(m[1]).trim() : '';
};

const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function fetchFeed(url, attempt = 0) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } catch (err) {
    if (attempt >= 1) throw err;
    await new Promise((r) => setTimeout(r, 1500));
    return fetchFeed(url, attempt + 1);
  }
}

async function pull(source) {
  const xml = await fetchFeed(source.feed);

  return xml
    .split('<item>')
    .slice(1)
    .map((item) => {
      const title = tag('title', item);
      const date = tag('pubDate', item);
      return {
        title,
        // Substack puts the post's subtitle in <description>.
        summary: strip(tag('description', item)).slice(0, 220),
        url: tag('link', item),
        date: date ? new Date(date).toISOString() : null,
        source: source.key,
        sourceName: source.name,
      };
    })
    // Substack seeds every new publication with a placeholder post.
    .filter((p) => p.title && p.url && p.date && p.title !== 'Coming soon');
}

async function main() {
  const settled = await Promise.allSettled(SOURCES.map(pull));

  const posts = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      posts.push(...r.value);
      console.log(`[writing] ${SOURCES[i].key}: ${r.value.length} post(s)`);
    } else {
      console.warn(`[writing] ${SOURCES[i].key} failed: ${r.reason.message}`);
    }
  });

  // If every source failed, treat it as a failure so the old payload survives.
  if (posts.length === 0) throw new Error('no posts from any source');

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sources: SOURCES.map(({ key, name, note, home }) => ({ key, name, note, home })),
        posts,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`[writing] ${posts.length} post(s) total`);
}

main().catch(async (err) => {
  console.warn(`[writing] skipped: ${err.message}`);
  try {
    await readFile(OUT);
    console.warn('[writing] keeping the payload already on disk');
  } catch {
    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(
      OUT,
      JSON.stringify({ generatedAt: null, sources: [], posts: [] }, null, 2) + '\n'
    );
    console.warn('[writing] wrote an empty payload');
  }
});
