#!/usr/bin/env node
/**
 * Substack → vyas.garden: brings over any post on his two Substacks that isn't
 * on the site yet, in its original form and date. The daily sync runs it
 * (.github/workflows/sync.yml); by hand: `node scripts/import-substack.mjs --dry`.
 *
 * What counts as "already here", so it is never imported twice:
 * - a post whose `canonical` is the Substack URL, or whose id ends in the
 *   slug (src/content/posts/<date>-<slug>);
 * - a URL the sync brought over before (src/data/sync.json `synced`): if that
 *   post is gone from the tree, it was deleted on purpose;
 * - a URL in sync.json `before` (on the site before the sync began: the first
 *   15 imports and the hospital story; deleting one, say from /tend, keeps it
 *   deleted instead of bringing back the unblurred original);
 * - a URL in sync.json `ignore`.
 * "coming-soon" (Substack's placeholder) and paid-only posts are skipped.
 *
 * The conversion is the one that brought the first 15 posts over (commit
 * 921a958): Substack's own post HTML → markdown with turndown; headings,
 * bold/italic (a break or space at the edge moved outside the markers), lists
 * (continuation lines indented to the item), quotes, his line breaks; images
 * in place with captions; native videos played inline; a tweet as a quote or
 * a link; buttons to real pages kept as links; subscribe boxes, share and
 * comment buttons dropped; links to his own Substack posts pointed at the same
 * post here. Text is left as typed (the site renders with smartypants off).
 * The date is the one Substack shows (post_date in UTC).
 *
 * Privacy: every image is re-encoded with sharp (JPEGs fetched as JPEG through
 * substackcdn, which also turns iPhone HEIC into JPEG) and every video with
 * ffmpeg, so EXIF/GPS never reach the repo. What an image shows is another
 * matter (a boarding pass, a phone number): the script can't judge that and
 * blurs nothing. Each import's images are listed in sync.json `synced`, and
 * the Sunday issue (scripts/sync-weekly.mjs) asks him to glance at them.
 *
 * Without ffmpeg (FFMPEG=/path overrides), a video becomes a link to the post
 * on Substack and the run says so. A post is written only once all its media
 * came through, so a failure never leaves half a post; it is retried next run.
 *
 *   --dry          list what would come over; write nothing, fetch no media
 *   --only <slug>  just that post
 *
 * Exit 1 if a publication or a post failed; the posts that worked are written.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { POSTS, ROOT, frontmatter, get, normUrl, output, readSync, sitePosts, warn, writeSync } from './lib/sync.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const MEDIA = join(ROOT, 'public/media/posts');

const PUBS = {
  abhishekvyas02032001: { key: 'personal', name: 'Personal', home: 'https://abhishekvyas02032001.substack.com' },
  waspsignal: { key: 'wasp', name: 'WASP Signal', home: 'https://waspsignal.substack.com', lane: 'signal' },
};
const SKIP = new Set(['coming-soon']);

/** The date Substack shows on the post (it renders post_date in UTC), so it matches what readers saw. */
const shownDate = (iso) => new Date(iso).toISOString().slice(0, 10);
const dirName = (p) => `${shownDate(p.post_date)}-${p.slug}`;
const today = () => new Date().toISOString();

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const hasFfmpeg = (() => {
  try {
    execFileSync(FFMPEG, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const attrs = (node) => {
  try {
    return JSON.parse(node.getAttribute('data-attrs') || '{}');
  } catch {
    return {};
  }
};

/** Substack's post HTML → { body, media, notes }. `relink` maps a URL to a page here, if there is one. */
function convert(p, relink) {
  const canonical = `${PUBS[p.pub].home}/p/${p.slug}`;
  const media = []; // { kind, url, file, ext }
  const notes = [];
  let img = 0;
  let vid = 0;

  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '*', br: '  ' });
  td.use(gfm);

  // Substack furniture: subscribe boxes, DM box, share/subscribe buttons, image-expand icons, forms.
  td.addRule('drop-furniture', {
    filter: (n) =>
      n.nodeName === 'FORM' ||
      n.nodeName === 'BUTTON' ||
      n.nodeName === 'SVG' ||
      n.nodeName === 'INPUT' ||
      ['SubscribeWidgetToDOM', 'DirectMessageToDOM'].includes(n.getAttribute?.('data-component-name')) ||
      /\b(subscription-widget-wrap|subscription-widget|image-link-expand|restack-image|view-image|icon-container)\b/.test(n.getAttribute?.('class') || ''),
    replacement: () => '',
  });

  // Buttons Substack inserts (Subscribe / Share / Leave a comment) are dropped; a button to a real page becomes a plain link.
  td.addRule('buttons', {
    filter: (n) => /\bbutton-wrapper\b/.test(n.getAttribute?.('class') || '') || n.getAttribute?.('data-component-name') === 'ButtonCreateButton',
    replacement: (_c, n) => {
      const a = n.querySelector('a');
      const href = a?.getAttribute('href') || '';
      const text = (a?.textContent || '').trim();
      if (!href || /subscribe|\/share|action=share|\/comments|substack\.com\/(app|refer)/i.test(href) || /^(subscribe|share|leave a comment)/i.test(text)) {
        notes.push(`dropped button "${text}"`);
        return '';
      }
      notes.push(`kept button as link "${text}" → ${href}`);
      return `\n\n[${text}](${relink(href)})\n\n`;
    },
  });

  // Images, in place, with their captions.
  td.addRule('figure', {
    __name: 'figure',
    filter: 'figure',
    replacement: (_c, n) => {
      const im = n.querySelector('img');
      if (!im) return '';
      const a = attrs(im);
      const url = a.src || im.getAttribute('src');
      if (!url) return '';
      const ext = /\.png($|\?)/i.test(url) || a.type === 'image/png' ? 'png' : /\.gif($|\?)/i.test(url) || a.type === 'image/gif' ? 'gif' : 'jpg';
      img += 1;
      const file = `image-${String(img).padStart(2, '0')}.${ext}`;
      media.push({ kind: 'image', url, file, ext });
      const cap = n.querySelector('figcaption')?.textContent.trim() || '';
      const alt = (im.getAttribute('alt') || a.alt || cap || '').replace(/[\[\]\n]/g, ' ').trim();
      return `\n\n![${alt}](./${file})${cap ? `\n<p class="caption">${td.escape(cap)}</p>` : ''}\n\n`;
    },
  });

  // Native Substack video → downloaded, played inline (or, without ffmpeg, a link to it on Substack).
  td.addRule('video', {
    __name: 'video',
    filter: (n) => n.getAttribute?.('data-component-name') === 'VideoPlaceholder' || /\bnative-video-embed\b/.test(n.getAttribute?.('class') || ''),
    replacement: (_c, n) => {
      const id = attrs(n).mediaUploadId;
      if (!id) return '';
      if (!hasFfmpeg) {
        notes.push('video → link (no ffmpeg)');
        return `\n\n[Watch the video on Substack](${canonical})\n\n`;
      }
      vid += 1;
      const file = `video-${String(vid).padStart(2, '0')}.mp4`;
      media.push({ kind: 'video', url: `https://${p.pub}.substack.com/api/v1/video/upload/${id}/src`, file });
      return `\n\n<video src="/media/posts/${p.slug}/${file}" controls playsinline preload="metadata"></video>\n\n`;
    },
  });

  // Embedded tweet → a quote with the author and a link to the original (a link-only tweet → just the link).
  td.addRule('tweet', {
    __name: 'tweet',
    filter: (n) => n.getAttribute?.('data-component-name') === 'Twitter2ToDOM' || /\btwitter-embed\b/.test(n.getAttribute?.('class') || ''),
    replacement: (_c, n) => {
      const a = attrs(n);
      const text = (a.full_text || n.textContent || '').trim();
      const who = a.name ? `${a.name}${a.username ? ` (@${a.username})` : ''}` : a.username ? `@${a.username}` : '';
      const url = a.url || n.querySelector('a')?.getAttribute('href') || '';
      if (/^https?:\/\/\S+$/.test(text) && url) {
        notes.push('tweet (link only) → link');
        return `\n\n> [${who} on X](${url})\n\n`;
      }
      notes.push('tweet → quote');
      const body = text.split('\n').map((l) => `> ${l}`).join('\n');
      return `\n\n${body}\n>\n> — ${who}${url ? `, [on X](${url})` : ''}\n\n`;
    },
  });

  // Pull quotes → blockquotes.
  td.addRule('pullquote', {
    filter: (n) => n.nodeName === 'DIV' && /\bpullquote\b/.test(n.getAttribute('class') || ''),
    replacement: (c) => `\n\n${c.trim().split('\n').map((l) => `> ${l}`).join('\n')}\n\n`,
  });

  // List items: indent continuation lines to the item's own content column, so an
  // image under "10." stays inside the item instead of turning into a code block.
  td.addRule('listItem', {
    filter: 'li',
    replacement: (content, node, options) => {
      const parent = node.parentNode;
      let prefix = `${options.bulletListMarker} `;
      if (parent.nodeName === 'OL') {
        const start = Number(parent.getAttribute('start') || 1);
        prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
      }
      const body = content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/gm, `\n${' '.repeat(prefix.length)}`);
      return prefix + body + (node.nextSibling && !/\n$/.test(body) ? '\n' : '');
    },
  });

  // Bold/italic with a line break or space at its edge (Substack writes
  // <strong><br>CLOSING ARGUMENT</strong>) can't render in markdown: move the
  // break or space outside the markers.
  for (const [name, tags, mark] of [['strong', ['strong', 'b'], '**'], ['em', ['em', 'i'], '*']]) {
    td.addRule(name, {
      filter: tags,
      replacement: (content) => {
        if (!content.trim()) return content;
        const lead = content.match(/^\s*/)[0];
        const trail = content.match(/\s*$/)[0];
        return `${lead}${mark}${content.trim()}${mark}${trail}`;
      },
    });
  }

  td.keep(['sup', 'sub']);

  // Turndown swaps "blank" nodes (no text) for whitespace before any rule runs;
  // video, tweet and image placeholders are blank, so send them to their rules here.
  const blank = td.options.blankReplacement;
  td.rules.blankRule.replacement = (content, node) => {
    for (const key of ['video', 'tweet', 'figure']) {
      const rule = td.rules.array.find((r) => r.__name === key);
      if (rule && (typeof rule.filter === 'function' ? rule.filter(node, td.options) : node.nodeName.toLowerCase() === rule.filter)) return rule.replacement(content, node, td.options);
    }
    return blank(content, node);
  };

  td.addRule('links', {
    filter: (n) => n.nodeName === 'A' && n.getAttribute('href'),
    replacement: (c, n) => {
      const href = relink(n.getAttribute('href'));
      const text = c.trim();
      if (!text) return '';
      return `[${text}](${href})`;
    },
  });

  const body = td
    .turndown(p.body_html || '')
    // bold punctuation alone can't render in markdown; a bold full stop looks the same plain
    .replace(/\*\*([.,;:!?])\*\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t]+$/gm, '')
    .trim();
  return { body, media, notes };
}

/** Fetch and re-encode every image and video of a post. Returns [{ dest, buf | tmp }] to write. */
async function fetchMedia(p, dir, media, tmp) {
  const sharp = (await import('sharp')).default;
  const files = [];
  for (const m of media) {
    if (m.kind === 'image') {
      // JPEG-bound images go through Substack's own image service as JPEG: some
      // originals are iPhone HEIC, which sharp can't decode.
      const src =
        m.ext === 'jpg' && !/^https:\/\/substackcdn\.com\/image\/fetch\//.test(m.url)
          ? `https://substackcdn.com/image/fetch/w_2400,c_limit,f_jpg,q_92/${encodeURIComponent(m.url)}`
          : m.url;
      const buf = Buffer.from(await (await get(src)).arrayBuffer());
      let pipe = sharp(buf, { animated: m.ext === 'gif' }).rotate(); // bake orientation; output drops all metadata
      const meta = await sharp(buf).metadata();
      if ((meta.width || 0) > 2400) pipe = pipe.resize({ width: 2400, withoutEnlargement: true });
      const out =
        m.ext === 'png' ? await pipe.png({ compressionLevel: 9 }).toBuffer()
        : m.ext === 'gif' ? await pipe.gif().toBuffer()
        : await pipe.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
      files.push({ dest: join(POSTS, dir, m.file), buf: out, rel: `src/content/posts/${dir}/${m.file}` });
    } else {
      const raw = join(tmp, `${p.slug}-raw-${m.file}`);
      const enc = join(tmp, `${p.slug}-${m.file}`);
      writeFileSync(raw, Buffer.from(await (await get(m.url, { timeout: 600_000 })).arrayBuffer()));
      execFileSync(FFMPEG, ['-v', 'error', '-y', '-i', raw, '-map_metadata', '-1', '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', enc]);
      files.push({ dest: join(MEDIA, p.slug, m.file), tmp: enc, rel: `public/media/posts/${p.slug}/${m.file}` });
    }
  }
  return files;
}

/** Every post in a publication's archive (Substack's API, 50 a page). */
async function archive(pub) {
  const all = [];
  for (let off = 0; ; off += 50) {
    const page = await (await get(`${PUBS[pub].home}/api/v1/archive?sort=new&offset=${off}&limit=50`)).json();
    if (!Array.isArray(page)) throw new Error(`${pub}: archive is not a list`);
    all.push(...page.map((x) => ({ ...x, pub })));
    if (page.length < 50) break;
  }
  return all;
}

async function main() {
  const sync = readSync();
  const site = sitePosts();
  const known = new Set([
    ...site.map((s) => normUrl(s.fields.canonical)).filter(Boolean),
    ...sync.synced.map((s) => normUrl(s.url)),
    ...sync.before.map(normUrl),
    ...sync.ignore.map(normUrl),
  ]);
  const siteSlugs = new Set(site.map((s) => s.id.replace(/^\d{4}-\d{2}-\d{2}-/, '')));
  let failed = false;

  // 1. What's on Substack that isn't here.
  const fresh = [];
  for (const pub of Object.keys(PUBS)) {
    let list;
    try {
      list = await archive(pub);
    } catch (e) {
      warn(`Substack ${pub}: couldn't list posts (${e.message})`);
      failed = true;
      continue;
    }
    let here = 0;
    for (const p of list) {
      const url = `${PUBS[pub].home}/p/${p.slug}`;
      if (SKIP.has(p.slug)) continue;
      if (ONLY && p.slug !== ONLY) continue;
      if (known.has(normUrl(url)) || siteSlugs.has(p.slug)) {
        here += 1;
        continue;
      }
      if (p.audience && p.audience !== 'everyone') {
        console.log(`skip ${url}: ${p.audience} (paid), not brought over`);
        continue;
      }
      fresh.push(p);
    }
    console.log(`Substack ${pub}: ${list.length} listed, ${here} already here, ${fresh.filter((p) => p.pub === pub).length} new`);
  }

  // 2. Links to his own Substack posts point at the same post here, new ones included.
  const localUrl = new Map();
  for (const s of site) if (s.fields.canonical) localUrl.set(normUrl(s.fields.canonical), `/writing/${s.id}/`);
  for (const p of fresh) localUrl.set(normUrl(`${PUBS[p.pub].home}/p/${p.slug}`), `/writing/${dirName(p)}/`);
  const relink = (href) => {
    if (!href || !/^https?:\/\/[^/]*substack\.com\/p\//i.test(href)) return href;
    return localUrl.get(normUrl(href)) ?? href;
  };

  if (!hasFfmpeg && fresh.length) warn(`no ffmpeg (${FFMPEG}): a Substack video becomes a link to the post instead of playing here`);

  // 3. Bring each over.
  const tmp = mkdtempSync(join(tmpdir(), 'vyas-substack-'));
  let added = 0;
  try {
    for (const stub of fresh) {
      const canonical = `${PUBS[stub.pub].home}/p/${stub.slug}`;
      try {
        const p = { pub: stub.pub, ...(await (await get(`${PUBS[stub.pub].home}/api/v1/posts/${stub.slug}`)).json()) };
        const dir = dirName(p);
        if (existsSync(join(POSTS, dir))) throw new Error(`src/content/posts/${dir} exists but isn't a post; left alone`);
        const { body, media, notes } = convert(p, relink);
        const pub = PUBS[p.pub];
        const md =
          frontmatter({
            kind: 'essay',
            date: shownDate(p.post_date),
            title: String(p.title ?? '').trim(),
            subtitle: String(p.subtitle ?? '').trim(),
            publication: pub.key,
            lane: pub.lane,
            canonical,
            source: 'substack',
          }) +
          `\n<!-- Imported verbatim from Substack (${canonical}), first published ${p.post_date}. -->\n` +
          body +
          '\n';
        const imgs = media.filter((m) => m.kind === 'image').length;
        const vids = media.length - imgs;
        console.log(`${DRY ? 'would import' : 'import'} ${dir}: "${String(p.title).trim()}" · ${pub.name} · ${imgs} images, ${vids} videos${notes.length ? ` · ${notes.join('; ')}` : ''}`);
        if (DRY) {
          added += 1;
          continue;
        }

        const files = await fetchMedia(p, dir, media, tmp);
        mkdirSync(join(POSTS, dir), { recursive: true });
        for (const f of files) {
          mkdirSync(join(f.dest, '..'), { recursive: true });
          if (f.buf) writeFileSync(f.dest, f.buf);
          else copyFileSync(f.tmp, f.dest);
        }
        writeFileSync(join(POSTS, dir, 'index.md'), md);
        sync.synced.push({
          at: today(),
          source: 'substack',
          url: canonical,
          title: String(p.title ?? '').trim(),
          publication: pub.key,
          id: dir,
          href: `/writing/${dir}/`,
          images: files.filter((f) => f.buf).map((f) => f.rel),
          videos: files.filter((f) => f.tmp).map((f) => f.rel),
        });
        writeSync(sync);
        added += 1;
      } catch (e) {
        warn(`Substack ${canonical}: not brought over this run (${e.message})`);
        failed = true;
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`Substack: ${added} ${DRY ? 'to bring over' : 'brought over'}`);
  output('new', DRY ? 0 : added);
  if (failed) process.exitCode = 1;
}

await main();
