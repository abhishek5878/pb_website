/**
 * Shared by the daily sync (.github/workflows/sync.yml, docs/design/making.md):
 * what's already on the site, the sync's own record (src/data/sync.json), and
 * a post's frontmatter written the way /tend writes it (js-yaml, the same
 * field order as src/lib/tend/shapes.ts).
 */
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const POSTS = join(ROOT, 'src/content/posts');
export const SYNC = join(ROOT, 'src/data/sync.json');

/** A URL reduced to what identifies it: https, lower-case host, no query, hash or trailing slash. */
export function normUrl(u) {
  try {
    const x = new URL(String(u).trim());
    return `https://${x.host.toLowerCase().replace(/^www\./, '')}${x.pathname.replace(/\/+$/, '')}`;
  } catch {
    return String(u ?? '').trim();
  }
}

/** The YouTube video id in any youtube.com / youtu.be URL, or null. */
export function youtubeId(u) {
  const m = String(u ?? '').match(/(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})(?![\w-])/);
  return m ? m[1] : null;
}

/**
 * Every post the build would see: { id, file, fields }. Same rules as the
 * posts collection (src/content.config.ts): any .md under src/content/posts,
 * names starting with _ ignored, ".../slug/index.md" and ".../slug.md" both
 * have the id "slug".
 */
export function sitePosts(dir = POSTS) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) {
        const rel = p.slice(dir.length + 1).replace(/\\/g, '/');
        const id = rel.replace(/\.md$/, '').replace(/\/index$/, '').split('/').pop();
        out.push({ id, file: p, fields: frontmatterOf(readFileSync(p, 'utf8')) });
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

function frontmatterOf(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  try {
    const f = yaml.load(m[1]);
    return f && typeof f === 'object' && !Array.isArray(f) ? f : {};
  } catch {
    return {};
  }
}

/** src/data/sync.json, with every key present. */
export function readSync() {
  let d = {};
  try {
    d = JSON.parse(readFileSync(SYNC, 'utf8'));
  } catch {}
  return {
    ...d,
    youtube: { channelId: '', since: '', ...(d.youtube || {}) },
    ignore: Array.isArray(d.ignore) ? d.ignore : [],
    before: Array.isArray(d.before) ? d.before : [],
    synced: Array.isArray(d.synced) ? d.synced : [],
  };
}

export function writeSync(d) {
  writeFileSync(SYNC, JSON.stringify(d, null, 2) + '\n');
}

/** /tend's field order (src/lib/tend/shapes.ts ORDER), so a save from /tend leaves a synced post's frontmatter as it was. */
const ORDER = ['kind', 'date', 'title', 'subtitle', 'publication', 'source', 'lane', 'lang', 'subject', 'by', 'year', 'rating', 'status', 'place', 'images', 'youtube', 'audio', 'link', 'canonical', 'highlights', 'tags', 'pull', 'light', 'draft'];

/**
 * The frontmatter block, byte for byte what /tend writes (shapes.ts
 * markdown()): js-yaml, the library Astro and /tend parse with, so a title
 * like "yes" or "2026" stays a string, and a save from /tend changes nothing.
 */
export function frontmatter(fields) {
  const fm = {};
  for (const k of [...ORDER, ...Object.keys(fields).filter((k) => !ORDER.includes(k))]) {
    const v = fields[k];
    if (v === undefined || v === null || v === '') continue;
    fm[k] = v;
  }
  return `---\n${yaml.dump(fm, { lineWidth: -1, noRefs: true })}---\n`;
}

/** fetch with a timeout and a few retries on network errors, 429 and 5xx. Throws on anything not ok. */
export async function get(url, { timeout = 60_000, tries = 3, headers = {} } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', ...headers }, redirect: 'follow', signal: AbortSignal.timeout(timeout) });
      if (res.ok) return res;
      last = new Error(`HTTP ${res.status} for ${url.split('?')[0]}`);
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  throw last;
}

/** A step output for the workflow (GITHUB_OUTPUT); a no-op outside Actions. */
export function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

/** A warning the Actions run summary shows; a plain line elsewhere. */
export function warn(msg) {
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `warning: ${msg}`);
}
