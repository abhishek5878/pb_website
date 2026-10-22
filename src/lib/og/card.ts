/**
 * The share card: one 1200×630 PNG per post, made at build (src/pages/og/[id].png.ts).
 *
 * Typeset: the room the post is read in. Its light (the post's `light` preset,
 * else La La Land, the rest light) as the ground, the lamp where the site keeps
 * it (78% 34%), the title in Switzer 700 pinned left and as large as it fits,
 * the subtitle (Newsreader italic, as in the reading room) or the first line
 * (Newsreader roman, as on /writing/) under it, and "Abhishek · vyas.garden"
 * small at the top, its dot in the accent, the date in mono beside it.
 *
 * Photo: a post with its own photos (frontmatter `images`: trips, photo rolls)
 * shows the first one full-bleed, the title over it on a scrim of the same light.
 *
 * No React: satori takes plain { type, props } nodes.
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { cardFonts } from './fonts';
import { cardLight } from './light';

export const CARD = { width: 1200, height: 630 } as const;

export type CardInput = {
  title: string;
  /** The subtitle or the first line. */
  line?: string;
  /** True for a subtitle (italic, as in the reading room); a first line stays roman. */
  italic?: boolean;
  /** Already formatted, "22 Oct 2026". */
  date?: string;
  /** A relight preset name; anything unknown falls back to the rest light. */
  light?: string;
  /** Absolute path of the post's first photo, if it has one. */
  photo?: string;
};

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown>; children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style, children, ...extra },
});

const PAD_X = 80;
const MEASURE = CARD.width - PAD_X * 2;

/**
 * Switzer Bold advances in em, tracked −0.03, by kind of letter (measured off
 * rendered cards). Close enough to wrap a title the way satori will.
 */
function advance(ch: string): number {
  if (/[il|.,:;!'’‘`]/.test(ch)) return 0.24;
  if (/[jtfrI()\-]/.test(ch)) return 0.32;
  if (/[mwMW]/.test(ch)) return 0.8;
  if (/[A-Z]/.test(ch)) return 0.64;
  if (/[0-9]/.test(ch)) return 0.56;
  return 0.52;
}

/**
 * The largest title size that sets in two lines (three only when it must), by
 * a greedy wrap on those advances, with a little slack for the estimate.
 */
function titleSize(title: string): number {
  const words = title.split(/\s+/).map((w) => [...w].reduce((s, c) => s + advance(c), 0));
  const lines = (size: number) => {
    let n = 1;
    let w = 0;
    for (const em of words) {
      const ww = em * size;
      if (w && w + 0.24 * size + ww > MEASURE * 0.94) {
        n++;
        w = ww;
      } else w += (w ? 0.24 * size : 0) + ww;
    }
    return n;
  };
  /* two calm lines beat three bigger ones */
  for (const size of [136, 124, 112, 100, 92, 84, 76]) if (lines(size) <= 2) return size;
  for (const size of [76, 68, 60]) if (lines(size) <= 3) return size;
  return 54;
}

/** A line for the card, at a word boundary, never mid-thought without an ellipsis. */
function clip(s: string, n: number): string {
  /* a dash glued to the word before it never starts a line (U+2060 word joiner) */
  const t = s.replace(/\s+/g, ' ').trim().replace(/(\S)([—–])/g, '$1\u2060$2');
  return t.length > n ? t.slice(0, n).replace(/[\s,;:—–-]+\S*$/, '') + '…' : t;
}

async function photoSrc(path: string): Promise<string | null> {
  const type = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png' }[extname(path).toLowerCase()];
  if (!type) return null; /* resvg reads JPEG and PNG; anything else gets the typeset card */
  try {
    return `data:image/${type};base64,${(await readFile(path)).toString('base64')}`;
  } catch {
    return null;
  }
}

export async function renderCard(input: CardInput): Promise<Buffer> {
  const light = cardLight(input.light);
  const photo = input.photo ? await photoSrc(input.photo) : null;
  /* over a photo the title steps down, so the photo stays the picture */
  const size = photo ? Math.min(titleSize(input.title), 72) : titleSize(input.title);
  const lineSize = 36;

  const byline = h(
    'div',
    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%', fontFamily: 'Switzer', fontWeight: 500, fontSize: 26, color: photo ? light.ink : light.muted },
    [
      h('div', { display: 'flex' }, [
        h('span', {}, 'Abhishek'),
        h('span', { color: light.accent, margin: '0 14px' }, '·'),
        h('span', {}, 'vyas.garden'),
      ]),
      input.date ? h('span', { fontFamily: 'Plex Mono', fontWeight: 400, fontSize: 22 }, input.date) : null,
    ].filter(Boolean)
  );

  const words = h('div', { display: 'flex', flexDirection: 'column', width: '100%' }, [
    h(
      'div',
      {
        display: 'block',
        fontFamily: 'Switzer',
        fontWeight: 700,
        fontSize: size,
        lineHeight: size >= 100 ? 0.98 : 1.04,
        letterSpacing: -0.03 * size,
        color: light.ink,
        maxWidth: MEASURE,
        marginLeft: -0.04 * size /* pinned left: the cap's side bearing sits on the margin */,
      },
      input.title
    ),
    input.line
      ? h(
          'div',
          {
            display: 'block',
            marginTop: size >= 100 ? 30 : 24,
            fontFamily: 'Newsreader',
            fontStyle: input.italic ? 'italic' : 'normal',
            fontWeight: 400,
            fontSize: lineSize,
            lineHeight: 1.28,
            color: photo ? light.ink : light.muted,
            maxWidth: 940,
            lineClamp: 2,
          },
          clip(input.line, 118)
        )
      : null,
  ].filter(Boolean));

  const root = photo
    ? h('div', { display: 'flex', width: '100%', height: '100%', position: 'relative', backgroundColor: light.bg }, [
        h('img', { position: 'absolute', top: 0, left: 0, width: CARD.width, height: CARD.height, objectFit: 'cover' }, undefined, {
          src: photo,
          width: CARD.width,
          height: CARD.height,
        }),
        /* the scrim: the same light, rising from the foot so the title reads on any photo */
        h('div', {
          position: 'absolute',
          top: 0,
          left: 0,
          width: CARD.width,
          height: CARD.height,
          backgroundImage: `linear-gradient(180deg, ${light.scrim(0.7)} 0%, ${light.scrim(0)} 24%, ${light.scrim(0)} 36%, ${light.scrim(0.8)} 68%, ${light.scrim(0.94)} 100%)`,
        }),
        h(
          'div',
          { position: 'absolute', top: 0, left: 0, width: CARD.width, height: CARD.height, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: `60px ${PAD_X}px 84px` },
          [byline, words]
        ),
      ])
    : h(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: `60px ${PAD_X}px 84px`,
          backgroundColor: light.bg,
          /* the lamp: the site's 110vmax circle at 78% 34%, fading out by 70% */
          backgroundImage: `radial-gradient(circle ${Math.round(CARD.width * 1.1)}px at 78% 34%, ${light.glow} 0%, ${light.glowOut} 70%)`,
        },
        [byline, words]
      );

  const svg = await satori(root as never, { ...CARD, fonts: await cardFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: CARD.width } }).render().asPng();
}
