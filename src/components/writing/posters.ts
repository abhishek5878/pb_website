/**
 * A post's player, and the still the facade shows before anyone presses play.
 *
 * The still is fetched once, at build (or on first view in `astro dev`), and
 * served from this site as /writing/<id>/poster.jpg
 * (src/pages/writing/[id]/poster.jpg.ts), so a reader's browser asks no third
 * party for anything until they click. YouTube's thumbnail sits at a fixed
 * address; Vimeo, SoundCloud, Mixcloud and Spotify say where their artwork is
 * through oEmbed. Only JPEG, at most 2MB, only from the image hosts in
 * embeds.ts, and every metadata segment is dropped before it is served.
 * A fetch that fails just means no still: the facade shows without one.
 */
import { ART_HOSTS, audioEmbed, oembedUrl, videoEmbed, type Embed } from './embeds';

type Media = { kind: string; youtube?: string; audio?: string; link?: string };

/** The post's players, video first: `youtube`; a video post's Vimeo `link`; `audio`. */
export function embedsOf(d: Media): Embed[] {
  const out: Embed[] = [];
  const v = d.youtube ? videoEmbed(d.youtube) : d.kind === 'video' && d.link ? videoEmbed(d.link) : null;
  if (v) out.push(v);
  const a = d.audio ? audioEmbed(d.audio) : null;
  if (a && !(v && a.src === v.src)) out.push(a);
  return out;
}

export const posterPath = (id: string) => `/writing/${id}/poster.jpg`;

const TIMEOUT = 8000;
const MAX = 2_000_000;
const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

async function get(url: string, accept: string): Promise<Response | null> {
  try {
    const res = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'vyas.garden build' }, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/**
 * The JPEG with only what drawing it needs: SOI, the tables, the frame and the
 * scan. APP1–APP13 and APP15 (EXIF, XMP, ICC, IPTC…) and comments are dropped;
 * APP0 (JFIF) and APP14 (Adobe colour transform) stay.
 */
export function stripJpeg(b: Uint8Array): Uint8Array | null {
  if (!isJpeg(b)) return null;
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0xda) {
      keep.push(b.subarray(i)); // start of scan: the image data, to the end
      break;
    }
    if (marker === 0xd9) return null;
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) return null;
    const app = marker >= 0xe1 && marker <= 0xef && marker !== 0xee;
    if (!app && marker !== 0xfe) keep.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  const out = new Uint8Array(keep.reduce((n, k) => n + k.length, 0));
  let at = 0;
  for (const k of keep) {
    out.set(k, at);
    at += k.length;
  }
  return out;
}

async function jpeg(url: string): Promise<Uint8Array | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || !ART_HOSTS.test(u.hostname)) return null;
  const res = await get(u.href, 'image/jpeg');
  if (!res) return null;
  /* a redirect must land on an image host too */
  try {
    if (res.url && !ART_HOSTS.test(new URL(res.url).hostname)) return null;
  } catch {
    return null;
  }
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > MAX) return null;
  const b = new Uint8Array(await res.arrayBuffer());
  if (b.length > MAX || b.length < 2000) return null; // YouTube's grey placeholder is ~1KB
  return stripJpeg(b);
}

async function art(e: Embed): Promise<Uint8Array | null> {
  if (e.provider === 'youtube' && e.id) {
    for (const name of ['maxresdefault', 'sddefault', 'hqdefault']) {
      const b = await jpeg(`https://i.ytimg.com/vi/${e.id}/${name}.jpg`);
      if (b) return b;
    }
    return null;
  }
  const endpoint = oembedUrl(e);
  if (!endpoint) return null;
  const res = await get(endpoint, 'application/json');
  if (!res) return null;
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
  const url = typeof data.thumbnail_url === 'string' ? data.thumbnail_url : typeof data.image === 'string' ? data.image : null;
  return url ? jpeg(url) : null;
}

const memo = new Map<string, Promise<Uint8Array | null>>();

/** The still for a player, fetched once per build. */
export function posterFor(e: Embed): Promise<Uint8Array | null> {
  let p = memo.get(e.src);
  if (!p) {
    p = art(e).catch(() => null);
    memo.set(e.src, p);
  }
  return p;
}
