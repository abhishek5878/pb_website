#!/usr/bin/env node
/**
 * YouTube → vyas.garden: one video post per upload that isn't on the site yet.
 * The daily sync runs it (.github/workflows/sync.yml).
 *
 * The channel is src/data/sync.json → youtube.channelId (a "UC…" id). Empty
 * means no channel yet, and this does nothing. Optional youtube.since
 * (YYYY-MM-DD) skips uploads before that day.
 *
 * It reads the channel's public feed (youtube.com/feeds/videos.xml, the latest
 * 15 uploads, Shorts included) and writes src/content/posts/<date>-<slug>.md:
 * kind video, the title, the date (as he saw it, in India), the `youtube` URL,
 * `source: youtube`, and the description's first paragraph as the body, his
 * words as typed (escaped only so markdown shows them as typed).
 *
 * Already here, so never written twice: a post whose `youtube` or `link` is
 * that video, a video the sync brought over before (sync.json `synced`; gone
 * from the tree means deleted on purpose), or one in sync.json `before` or
 * `ignore`.
 *
 *   --dry                   list what would be written; write nothing
 *   --channel <UC…>         use this channel instead of sync.json's (testing)
 *   --set <channel URL>     find the channel id behind a youtube.com/@handle,
 *                           /channel/UC… or video URL, save it to sync.json
 *
 * Exit 1 if the feed couldn't be read.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { POSTS, frontmatter, get, output, readSync, sitePosts, warn, writeSync, youtubeId } from './lib/sync.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const CHANNEL_RE = /^UC[\w-]{22}$/;

const decode = (s) =>
  String(s ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
};

/** The feed's uploads, newest first: { id, title, published, description }. */
function parseFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, e]) => ({
      id: tag(e, 'yt:videoId').trim(),
      title: tag(e, 'title').trim(),
      published: tag(e, 'published').trim(),
      description: tag(e, 'media:description'),
    }))
    .filter((v) => /^[\w-]{11}$/.test(v.id) && v.published);
}

/** The day it went up, in India (his time). */
const indiaDate = (iso) => new Date(new Date(iso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);

/** Markdown that shows his text exactly as typed: URLs untouched, markdown and HTML characters escaped, his line breaks kept. */
function asTyped(text) {
  const esc = (s) =>
    s
      .replace(/\\/g, '\\\\')
      .replace(/([*_`\[\]~|])/g, '\\$1')
      .replace(/</g, '&lt;')
      .replace(/^(\s*)([#>+=-])/gm, '$1\\$2')
      .replace(/^(\s*\d+)([.)])(?=\s|$)/gm, '$1\\$2');
  return text
    .split(/(https?:\/\/[^\s<>"]+)/g)
    .map((part, i) => (i % 2 ? part : esc(part)))
    .join('')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('  \n');
}

/** The description's first paragraph: up to the first blank line. */
const firstParagraph = (d) =>
  String(d ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .find(Boolean) || '';

const slugify = (title) => {
  const s = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/#\w+/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length <= 60) return s;
  const cut = s.slice(0, 61);
  return cut.slice(0, cut.lastIndexOf('-') > 20 ? cut.lastIndexOf('-') : 60);
};

/** The UC… id behind a channel URL, @handle or video URL. */
async function resolveChannel(input) {
  const direct = String(input).match(/\b(UC[\w-]{22})\b/);
  if (direct) return direct[1];
  const url = /^@/.test(input) ? `https://www.youtube.com/${input}` : /^https?:\/\//.test(input) ? input : `https://www.youtube.com/@${input}`;
  const html = await (await get(url, { headers: { 'Accept-Language': 'en', Cookie: 'CONSENT=YES+1; SOCS=CAI' } })).text();
  const m =
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ||
    html.match(/<meta itemprop="(?:channelId|identifier)" content="(UC[\w-]{22})"/) ||
    html.match(/"externalId":"(UC[\w-]{22})"/) ||
    html.match(/"channelId":"(UC[\w-]{22})"/);
  if (!m) throw new Error(`no channel id found at ${url}`);
  return m[1];
}

async function main() {
  const sync = readSync();

  const toSet = flag('--set');
  if (toSet) {
    const id = await resolveChannel(toSet);
    await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`); // the feed must answer
    console.log(`YouTube channel: ${id}`);
    if (!DRY) {
      sync.youtube.channelId = id;
      writeSync(sync);
      console.log('saved to src/data/sync.json');
    }
    return;
  }

  const channel = (flag('--channel') || sync.youtube.channelId || '').trim();
  if (!channel) {
    console.log('YouTube: no channel set (src/data/sync.json → youtube.channelId); nothing to do');
    output('new', 0);
    return;
  }
  if (!CHANNEL_RE.test(channel)) {
    warn(`YouTube: "${channel}" isn't a channel id (UC…); run: node scripts/sync-youtube.mjs --set <channel URL>`);
    process.exitCode = 1;
    output('new', 0);
    return;
  }

  let videos;
  try {
    videos = parseFeed(await (await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`)).text());
  } catch (e) {
    warn(`YouTube ${channel}: couldn't read the feed (${e.message})`);
    process.exitCode = 1;
    output('new', 0);
    return;
  }

  const site = sitePosts();
  const known = new Set([
    ...site.flatMap((s) => [youtubeId(s.fields.youtube), youtubeId(s.fields.link)]).filter(Boolean),
    ...sync.synced.map((s) => youtubeId(s.url)).filter(Boolean),
    ...[...sync.before, ...sync.ignore].map(youtubeId).filter(Boolean),
  ]);
  const ids = new Set(site.map((s) => s.id));
  const since = /^\d{4}-\d{2}-\d{2}$/.test(sync.youtube.since || '') ? sync.youtube.since : '';

  let added = 0;
  for (const v of [...videos].reverse()) {
    if (known.has(v.id)) continue;
    const date = indiaDate(v.published);
    if (since && date < since) continue;
    const url = `https://www.youtube.com/watch?v=${v.id}`;
    const base = `${date}-${slugify(v.title) || `video-${v.id.toLowerCase()}`}`;
    let id = base;
    for (let n = 2; ids.has(id) || existsSync(join(POSTS, `${id}.md`)) || existsSync(join(POSTS, id)); n++) id = `${base}-${n}`;
    const body = asTyped(firstParagraph(v.description));
    const md = frontmatter({ kind: 'video', date, title: v.title, youtube: url, source: 'youtube' }) + (body ? `\n${body}\n` : '');
    console.log(`${DRY ? 'would write' : 'write'} ${id}.md: "${v.title}" (${url})`);
    added += 1;
    ids.add(id);
    if (DRY) continue;
    writeFileSync(join(POSTS, `${id}.md`), md);
    sync.synced.push({ at: new Date().toISOString(), source: 'youtube', url, title: v.title, id, href: `/writing/${id}/`, images: [], videos: [] });
    writeSync(sync);
  }
  console.log(`YouTube: ${videos.length} in the feed, ${added} ${DRY ? 'to write' : 'new'}`);
  output('new', DRY ? 0 : added);
}

await main();
