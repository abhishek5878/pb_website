/**
 * The one box that sorts itself (docs/design/making.md, Amendment 1 A), and
 * the verse format a poem is saved in. Pure: no DOM, no Node, so the composer
 * (src/scripts/tend.js) runs it live and the tests run it in Node.
 *
 * Detection runs top to bottom; the first match wins:
 *   1. photos attached: photo (trip with a place and two or more photos)
 *   2. a YouTube or Vimeo link: video
 *   3. a SoundCloud, Mixcloud or Spotify link: music (listening; one tap makes it a mix)
 *   4. a Goodreads, Open Library or Amazon book link, or a first line `book:`: book
 *   5. any other single link: link
 *   6. three or more lines, most under ~60 characters, none over ~200: poem
 *      (Devanagari sets lang hi, or mixed with Latin beside it)
 *   7. over ~350 words, or a `## heading`: essay
 *   8. anything else: note
 */
import { isAudioUrl, isYouTubeUrl, videoEmbed } from '../../components/writing/embeds';

export type Type = 'note' | 'poem' | 'essay' | 'photo' | 'trip' | 'video' | 'music' | 'book' | 'film' | 'link';
export type Lang = 'en' | 'hi' | 'mixed';

/** Every http(s) link in the text, in order, trailing punctuation left behind. */
export function urlsIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/https?:\/\/[^\s<>"'`]+/gi)) {
    let u = m[0].replace(/[.,;:!?…’”]+$/u, '');
    /* a closing bracket that has no opening one in the link belongs to the sentence */
    while (/[)\]]$/.test(u) && (u.match(/[(\[]/g)?.length ?? 0) < (u.match(/[)\]]/g)?.length ?? 0)) u = u.slice(0, -1);
    out.push(u);
  }
  return out;
}

const isVideoUrl = (u: string) => videoEmbed(u) !== null || isYouTubeUrl(u);
const isMusicUrl = (u: string) => isAudioUrl(u) && !isYouTubeUrl(u);
export function isBookUrl(u: string): boolean {
  let h: string;
  let path: string;
  try {
    const p = new URL(u);
    h = p.hostname.toLowerCase().replace(/^www\./, '');
    path = p.pathname;
  } catch {
    return false;
  }
  if (h === 'goodreads.com' || h.endsWith('.goodreads.com')) return /^\/(book|work)\//.test(path);
  if (h === 'openlibrary.org') return /^\/(works|books)\//.test(path);
  if (h === 'amzn.to' || h === 'amzn.in' || h === 'amzn.eu') return true;
  if (/^amazon\.[a-z.]{2,6}$/.test(h)) return /\/(dp|gp\/product)\//.test(path);
  return false;
}

/** `book: Title by Author` on the first line, or null. */
export function bookLine(text: string): { subject: string; by?: string } | null {
  const first = text.replace(/^\s+/, '').split('\n')[0] ?? '';
  const m = /^book:\s*(.*)$/i.exec(first.trim());
  if (!m) return null;
  const rest = m[1].trim();
  const by = /^(.*\S)\s+by\s+(\S.*)$/i.exec(rest);
  return by ? { subject: by[1].trim(), by: by[2].trim() } : { subject: rest };
}

/** A first guess at a book's title from its Goodreads or Open Library address. */
export function titleFromBookUrl(u: string): string {
  try {
    const p = new URL(u);
    const last = decodeURIComponent(p.pathname.split('/').filter(Boolean).pop() ?? '');
    const slug = /goodreads/.test(p.hostname) ? last.replace(/^\d+[.-]?/, '') : /openlibrary/.test(p.hostname) ? last : '';
    return slug.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

const DEVANAGARI = /[ऀ-ॿ]/;
const LATIN = /[A-Za-z]/;

/** hi for Devanagari alone, mixed with Latin letters beside it, else en. Links don't count. */
export function langOf(text: string): Lang {
  const t = text.replace(/https?:\/\/\S+/g, ' ');
  if (!DEVANAGARI.test(t)) return 'en';
  return LATIN.test(t) ? 'mixed' : 'hi';
}

const wordCount = (t: string) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Rule 6: three or more lines, most under ~60 characters, no line (a paragraph, in a textarea) over ~200. */
export function looksLikePoem(text: string): boolean {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 3) return false;
  if (lines.some((l) => [...l].length > 200)) return false;
  const short = lines.filter((l) => [...l].length <= 60).length;
  return short > lines.length / 2;
}

export type Detected = { type: Type; lang?: Lang; url?: string };

/** What the box looks like. `photos`: how many are attached; `place`: the place typed, if any. */
export function detect(text: string, { photos = 0, place = '' }: { photos?: number; place?: string } = {}): Detected | null {
  const t = text.replace(/\r\n?/g, '\n');
  if (photos > 0) return { type: photos >= 2 && place.trim() ? 'trip' : 'photo' };
  if (!t.trim()) return null;
  const urls = urlsIn(t);
  const video = urls.find(isVideoUrl);
  if (video) return { type: 'video', url: video };
  const music = urls.find(isMusicUrl);
  if (music) return { type: 'music', url: music };
  const book = urls.find(isBookUrl);
  if (book) return { type: 'book', url: book };
  if (bookLine(t)) return { type: 'book' };
  if (urls.length === 1) return { type: 'link', url: urls[0] };
  if (looksLikePoem(t)) return { type: 'poem', lang: langOf(t) };
  if (wordCount(t) > 350 || /^#{2,3}\s+\S/m.test(t)) return { type: 'essay' };
  return { type: 'note' };
}

/** The box without the link a post carries in a field: the line it sat on goes if nothing else was on it. */
export function without(text: string, url: string | undefined): string {
  if (!url) return text;
  const i = text.indexOf(url);
  if (i < 0) return text;
  const out = text.slice(0, i) + text.slice(i + url.length);
  return out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The box without its `book:` first line. */
export const withoutBookLine = (text: string) => (bookLine(text) ? text.replace(/^\s*[^\n]*\n?/, '').trim() : text);

/** The lane a kind runs in by default (Amendment 1, "the lane by kind"); WASP issues count as signal on the site. */
export const laneFor = (kind: string): string => (['poem', 'photo', 'video', 'mix', 'trip'].includes(kind) ? 'night' : '');

/* ---------- verse: a poem's body as the hospital poem is written ---------- */

/*
 * <div class="verse">
 *
 * line one··
 * line two
 *
 * stanza two··
 * …
 *
 * </div>
 *
 * His line breaks become markdown hard breaks (two spaces), a blank line keeps
 * a stanza, a leading indent becomes <span class="indent"></span> (one per two
 * spaces or a tab, at most four), and a line that markdown would read as
 * something else (a heading, a list, a quote, a rule, raw HTML) is escaped so
 * it stays a line. unwrapVerse() is the way back, for editing.
 */
const OPEN = '<div class="verse">';
const CLOSE = '</div>';
const INDENT = '<span class="indent"></span>';

function escapeLine(l: string): string {
  if (/^#{1,6}(\s|$)/.test(l) || /^[>+<]/.test(l) || /^[-*](\s|$)/.test(l)) return '\\' + l;
  if (/^(-{3,}|\*{3,}|_{3,}|={2,})\s*$/.test(l) || /^(-\s*){3,}$/.test(l) || /^(\*\s*){3,}$/.test(l)) return '\\' + l;
  const n = /^(\d{1,9})([.)])(\s|$)/.exec(l);
  if (n) return n[1] + '\\' + l.slice(n[1].length);
  return l;
}
function unescapeLine(l: string): string {
  if (/^\\[#>+<\-*_=]/.test(l)) return l.slice(1);
  const n = /^(\d{1,9})\\([.)])/.exec(l);
  if (n) return n[1] + l.slice(n[1].length + 1);
  return l;
}

/** His poem, as typed, in the verse format. */
export function wrapVerse(text: string): string {
  const stanzas = text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n+/)
    .map((st) =>
      st
        .split('\n')
        .map((raw) => raw.replace(/\s+$/, ''))
        .filter((raw) => raw.trim() !== '')
        .map((raw) => {
          const lead = /^[ \t]*/.exec(raw)![0];
          const tabs = (lead.match(/\t/g) ?? []).length;
          const spaces = lead.length - tabs;
          const levels = Math.min(4, tabs + Math.floor(spaces / 2));
          return INDENT.repeat(levels) + escapeLine(raw.slice(lead.length));
        })
        .join('  \n')
    )
    .filter(Boolean);
  if (!stanzas.length) return '';
  return `${OPEN}\n\n${stanzas.join('\n\n')}\n\n${CLOSE}`;
}

/** The poem as he typed it, if the body is exactly the verse format; null otherwise (edit it as markdown). */
export function unwrapVerse(body: string): string | null {
  const b = body.replace(/\r\n?/g, '\n').trim();
  if (!b.startsWith(OPEN + '\n') || !b.endsWith('\n' + CLOSE)) return null;
  const inner = b.slice(OPEN.length, b.length - CLOSE.length).trim();
  if (inner.includes(OPEN) || inner.includes(CLOSE)) return null;
  const text = inner
    .split(/\n{2,}/)
    .map((st) =>
      st
        .split('\n')
        .map((l) => {
          let line = l.replace(/ {2}$/, '');
          let lead = '';
          while (line.startsWith(INDENT)) {
            lead += '  ';
            line = line.slice(INDENT.length);
          }
          return lead + unescapeLine(line);
        })
        .join('\n')
    )
    .join('\n\n');
  /* only a body this composer wrote comes back as a plain poem: anything else stays markdown */
  return wrapVerse(text) === b ? text : null;
}
