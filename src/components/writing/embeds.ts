/**
 * Video and music links: which ones the site accepts, and how each becomes a
 * player. One module for three readers, so they never disagree:
 *
 *   src/content.config.ts   the schema (`youtube`, `audio` host allowlists)
 *   src/lib/tend/shapes.ts  /tend's strict Fields (the same allowlists)
 *   src/scripts/tend.js     the composer (what a pasted link is, its preview)
 *   Embed.astro, posters.ts the reading room (the click-to-load facade)
 *
 * Pure: no Node, no DOM. Every URL goes through `new URL()`; only http(s),
 * no userinfo, and the host must be one of the lists below. Embed URLs are
 * built from the parsed id or path, never from the pasted string.
 */

export type Provider = 'youtube' | 'vimeo' | 'soundcloud' | 'mixcloud' | 'spotify';

export type Embed = {
  provider: Provider;
  /** "YouTube", "SoundCloud"…: the UI word for where it plays from. */
  label: string;
  /** The player, loaded only on click. */
  src: string;
  /** The page itself, for readers without JavaScript and the "Listen →" fallback. */
  href: string;
  /** Video: a 16:9 frame. Audio: a fixed-height strip. */
  shape: 'video' | 'audio';
  /** Audio players' own heights, so the facade can hold the space. */
  height?: number;
  /** YouTube's video id, for the poster. */
  id?: string;
};

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
const VIMEO_HOSTS = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'];
const SOUNDCLOUD_HOSTS = ['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com'];
const MIXCLOUD_HOSTS = ['mixcloud.com', 'www.mixcloud.com', 'm.mixcloud.com'];
const SPOTIFY_HOSTS = ['open.spotify.com', 'play.spotify.com', 'spotify.link'];

/** The hosts `audio` may point at: SoundCloud, Mixcloud, Spotify, YouTube. */
export const AUDIO_HOSTS = [...SOUNDCLOUD_HOSTS, ...MIXCLOUD_HOSTS, ...SPOTIFY_HOSTS, ...YOUTUBE_HOSTS];
export { YOUTUBE_HOSTS };

/** The room's accent (La La Land) as hex, for SoundCloud's play button. */
const ACCENT_HEX = 'e9609e';

/** A parsed http(s) URL with no userinfo, or null. */
function parse(raw: unknown): URL | null {
  if (typeof raw !== 'string' || raw.length > 500 || /\s/.test(raw.trim())) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  return u;
}
const hostIn = (u: URL | null, hosts: string[]) => !!u && hosts.includes(u.hostname.toLowerCase());
const segments = (u: URL) => u.pathname.split('/').filter(Boolean);

/** True for any http(s) URL (the `link` and `canonical` fields). */
export const isHttpUrl = (raw: unknown) => parse(raw) !== null;
/** True for a youtube.com / youtu.be link (the `youtube` field). */
export const isYouTubeUrl = (raw: unknown) => hostIn(parse(raw), YOUTUBE_HOSTS);
/** True for a SoundCloud / Mixcloud / Spotify / YouTube link (the `audio` field). */
export const isAudioUrl = (raw: unknown) => hostIn(parse(raw), AUDIO_HOSTS);
/** An audio file of the site's own, in public/ (the `audio` field's other form). */
export const isLocalAudio = (raw: unknown) => typeof raw === 'string' && /^\/[a-z0-9][a-z0-9/_-]*\.(mp3|m4a|ogg|opus|wav)$/i.test(raw) && !raw.includes('..');

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** The 11-character video id of a YouTube link, or null. */
export function youtubeId(raw: unknown): string | null {
  const u = parse(raw);
  if (!hostIn(u, YOUTUBE_HOSTS)) return null;
  const parts = segments(u!);
  let id: string | null = null;
  if (u!.hostname.toLowerCase() === 'youtu.be') id = parts[0] ?? null;
  else if (parts[0] === 'watch') id = u!.searchParams.get('v');
  else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) id = parts[1] ?? null;
  return id && YT_ID.test(id) ? id : null;
}

/** "1m30s", "90", "90s" → 90; anything else → 0. */
function seconds(t: string | null): number {
  if (!t) return 0;
  if (/^\d+s?$/.test(t)) return parseInt(t, 10);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m && t ? (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) : 0;
}

function youtube(u: URL): Embed | null {
  const id = youtubeId(u.href);
  if (!id) return null;
  const start = Math.min(seconds(u.searchParams.get('t') ?? u.searchParams.get('start')), 86_400);
  return {
    provider: 'youtube',
    label: 'YouTube',
    id,
    src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1${start ? `&start=${start}` : ''}`,
    href: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}`,
    shape: 'video',
  };
}

function vimeo(u: URL): Embed | null {
  const parts = segments(u);
  const at = parts.findIndex((p) => /^\d{1,12}$/.test(p));
  if (at < 0) return null;
  const id = parts[at];
  const after = parts[at + 1];
  const hash = u.searchParams.get('h') ?? (after && /^[0-9a-f]{6,20}$/.test(after) ? after : null);
  const h = hash && /^[0-9a-f]{6,20}$/.test(hash) ? hash : null;
  return {
    provider: 'vimeo',
    label: 'Vimeo',
    src: `https://player.vimeo.com/video/${id}?dnt=1&autoplay=1${h ? `&h=${h}` : ''}`,
    href: `https://vimeo.com/${id}${h ? `/${h}` : ''}`,
    shape: 'video',
  };
}

const SAFE_SEG = /^[A-Za-z0-9_.-]{1,120}$/;

function soundcloud(u: URL): Embed | null {
  if (u.hostname.toLowerCase() === 'on.soundcloud.com') return null; // a short link: the widget can't resolve it
  const parts = segments(u);
  if (parts.length < 2 || parts.length > 4 || !parts.every((p) => SAFE_SEG.test(p))) return null;
  const page = `https://soundcloud.com/${parts.join('/')}`;
  const q = `url=${encodeURIComponent(page)}&color=%23${ACCENT_HEX}&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
  return { provider: 'soundcloud', label: 'SoundCloud', src: `https://w.soundcloud.com/player/?${q}`, href: page, shape: 'audio', height: 166 };
}

function mixcloud(u: URL): Embed | null {
  const parts = segments(u);
  if (parts.length !== 2 || !parts.every((p) => SAFE_SEG.test(p))) return null;
  const feed = `/${parts.join('/')}/`;
  return {
    provider: 'mixcloud',
    label: 'Mixcloud',
    src: `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&autoplay=1&feed=${encodeURIComponent(feed)}`,
    href: `https://www.mixcloud.com${feed}`,
    shape: 'audio',
    height: 120,
  };
}

const SPOTIFY_KINDS = ['track', 'album', 'playlist', 'episode', 'show', 'artist'];

function spotify(u: URL): Embed | null {
  if (u.hostname.toLowerCase() === 'spotify.link') return null; // a short link
  let parts = segments(u);
  if (parts[0] && /^intl-[a-z]{2}(-[a-z]{2})?$/i.test(parts[0])) parts = parts.slice(1);
  if (parts[0] === 'embed') parts = parts.slice(1);
  const [kind, id] = parts;
  if (!SPOTIFY_KINDS.includes(kind) || !/^[A-Za-z0-9]{22}$/.test(id ?? '')) return null;
  return {
    provider: 'spotify',
    label: 'Spotify',
    src: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
    href: `https://open.spotify.com/${kind}/${id}`,
    shape: 'audio',
    height: kind === 'track' || kind === 'episode' ? 152 : 352,
  };
}

/** A video link as a player: YouTube or Vimeo. Anything else: null (it stays a link). */
export function videoEmbed(raw: unknown): Embed | null {
  const u = parse(raw);
  if (hostIn(u, YOUTUBE_HOSTS)) return youtube(u!);
  if (hostIn(u, VIMEO_HOSTS)) return vimeo(u!);
  return null;
}

/** A music link as a player: SoundCloud, Mixcloud, Spotify or YouTube. A short link or a profile page: null. */
export function audioEmbed(raw: unknown): Embed | null {
  const u = parse(raw);
  if (!u) return null;
  if (hostIn(u, SOUNDCLOUD_HOSTS)) return soundcloud(u);
  if (hostIn(u, MIXCLOUD_HOSTS)) return mixcloud(u);
  if (hostIn(u, SPOTIFY_HOSTS)) return spotify(u);
  if (hostIn(u, YOUTUBE_HOSTS)) return youtube(u);
  return null;
}

/** Where a link is from, in UI words ("SoundCloud"), or its host. */
export function hostLabel(raw: unknown): string {
  const u = parse(raw);
  if (!u) return '';
  if (hostIn(u, YOUTUBE_HOSTS)) return 'YouTube';
  if (hostIn(u, VIMEO_HOSTS)) return 'Vimeo';
  if (hostIn(u, SOUNDCLOUD_HOSTS)) return 'SoundCloud';
  if (hostIn(u, MIXCLOUD_HOSTS)) return 'Mixcloud';
  if (hostIn(u, SPOTIFY_HOSTS)) return 'Spotify';
  return u.hostname.replace(/^www\./, '');
}

/**
 * The provider's oEmbed endpoint for a link, for its artwork at build time
 * (posters.ts). YouTube needs none: its thumbnails sit at a fixed address.
 */
export function oembedUrl(e: Embed): string | null {
  const q = encodeURIComponent(e.href);
  switch (e.provider) {
    case 'vimeo':
      return `https://vimeo.com/api/oembed.json?url=${q}&width=1280`;
    case 'soundcloud':
      return `https://soundcloud.com/oembed?format=json&url=${q}`;
    case 'mixcloud':
      return `https://app.mixcloud.com/oembed/?format=json&url=${q}`;
    case 'spotify':
      return `https://open.spotify.com/oembed?url=${q}`;
    default:
      return null;
  }
}

/** The image hosts an oEmbed answer may point at; any other is ignored. */
export const ART_HOSTS = /^(i\.ytimg\.com|img\.youtube\.com|i\.vimeocdn\.com|i[0-9]?\.sndcdn\.com|thumbnailer\.mixcloud\.com|i\.scdn\.co|image-cdn-[a-z]{2}\.spotifycdn\.com|[a-z0-9-]+\.scdn\.co)$/;
