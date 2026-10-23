/**
 * Making: photos, videos, music and trips. docs/design/making.md, Amendment 1 C
 * (poems left Making: their one home is Writing → Poems).
 *
 * Read-only over the posts collection (src/lib/posts.ts). Every tab exists only
 * when it has something in it; the section, its nav link and the homepage door
 * exist only when one tab does. Local posts only: a Substack or Letterboxd entry
 * is never a photo or a mix.
 */
import type { ImageMetadata } from 'astro';
import { getPosts, label, type Post } from '../../lib/posts';
import { youtubeId } from '../../lib/media';
import { embedsOf, posterFor, posterPath } from '../../components/writing/posters';

/**
 * Q35, "Any other making: drums, French, design, code toys, something else?",
 * the start of his answer, verbatim (about-me.md), split at his comma.
 */
export const LINE = { plan: 'everything is on the plan,', done: 'everything will be done.' } as const;

export type TabId = 'photos' | 'videos' | 'music' | 'trips';
export const TAB_LABEL: Record<TabId, string> = { photos: 'Photos', videos: 'Videos', music: 'Music', trips: 'Trips' };
const ORDER: TabId[] = ['photos', 'videos', 'music', 'trips'];

type Local = { src: ImageMetadata; alt: string };
const isLocal = (i: Post['images'][number]): i is Local => typeof i.src !== 'string';

/** A frame on the contact sheet: one photograph, and the post it came from. */
export type Frame = { src: ImageMetadata; alt: string; post: Post; i: number };

/** Where a link lives, by its address: a fact about the URL, not a line of his. */
export function host(url?: string): string | undefined {
  if (!url) return undefined;
  let h: string;
  try {
    h = new URL(url).hostname.replace(/^www\.|^m\.|^open\./, '');
  } catch {
    return undefined;
  }
  const known: Record<string, string> = {
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'youtube-nocookie.com': 'YouTube',
    'music.youtube.com': 'YouTube',
    'vimeo.com': 'Vimeo',
    'soundcloud.com': 'SoundCloud',
    'mixcloud.com': 'Mixcloud',
    'spotify.com': 'Spotify',
    'music.apple.com': 'Apple Music',
    'bandcamp.com': 'Bandcamp',
    'instagram.com': 'Instagram',
  };
  return known[h] ?? Object.entries(known).find(([k]) => h.endsWith('.' + k))?.[1];
}

/**
 * A video: its own photograph if the post has one (made at build by astro:assets), else the
 * player's still that the reading room serves from this site (/writing/<id>/poster.jpg,
 * src/components/writing/posters.ts; only when it could be fetched), else neither: a typeset card.
 */
export type Video = { post: Post; still?: Local; poster?: string; host?: string; yt: string | null };
export type Track = { post: Post; title: string; by?: string; kind: 'Mix' | 'Listening'; host?: string };
export type Trip = { post: Post; first?: Local; place?: string };

export type Making = {
  frames: Frame[];
  /** photo and trip posts that have at least one local photograph, newest first */
  rolls: Post[];
  videos: Video[];
  music: Track[];
  trips: Trip[];
  /** the tabs that have something in them, in order, with their counts */
  tabs: { id: TabId; label: string; n: number; href: string }[];
  /** how many posts Making shows (a trip with photos counts once) */
  count: number;
};

let cache: Making | null = null;

export async function getMaking(): Promise<Making> {
  if (cache) return cache;
  const local = (await getPosts()).filter((p) => p.source === 'site');

  const rolls = local.filter((p) => (p.kind === 'photo' || p.kind === 'trip') && p.images.some(isLocal));
  const frames = rolls.flatMap((post) => post.images.filter(isLocal).map((img, i) => ({ src: img.src, alt: img.alt, post, i })));
  const videos: Video[] = [];
  for (const post of local.filter((p) => p.kind === 'video')) {
    const still = post.images.find(isLocal);
    const [player] = still || !post.raw ? [] : embedsOf(post.raw.data);
    const poster = player && (await posterFor(player)) ? posterPath(post.id) : undefined;
    videos.push({ post, still, poster, host: host(post.youtube ?? post.link), yt: youtubeId(post.youtube) });
  }
  const music = local
    .filter((p) => p.kind === 'mix' || p.kind === 'listening')
    .map((post): Track => ({
      post,
      title: post.title ?? post.subject ?? label(post),
      /* a listening post names the record's maker; a title-less one already carries it in its label */
      by: post.title || post.subject ? post.by : undefined,
      kind: post.kind === 'mix' ? 'Mix' : 'Listening',
      host: host(post.audio),
    }));
  const trips = local.filter((p) => p.kind === 'trip').map((post) => ({ post, first: post.images.find(isLocal), place: post.place }));

  const n: Record<TabId, number> = { photos: frames.length, videos: videos.length, music: music.length, trips: trips.length };
  const tabs = ORDER.filter((id) => n[id] > 0).map((id) => ({ id, label: TAB_LABEL[id], n: n[id], href: `/making/${id}/` }));
  const shown = new Set<Post>([...rolls, ...videos.map((v) => v.post), ...music.map((m) => m.post), ...trips.map((t) => t.post)]);

  cache = { frames, rolls, videos, music, trips, tabs, count: shown.size };
  return cache;
}
