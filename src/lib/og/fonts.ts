/**
 * Fonts for the share cards. Satori reads TTF, OTF and WOFF, never WOFF2, and the
 * site ships only WOFF2, so the cards take static files:
 *
 *   Switzer 500 and 700: static TTFs from Fontshare's CSS API, fetched at build
 *     the way scripts/fetch-fonts.mjs fetches the web fonts, cached in
 *     node_modules/.cache/vyas-og/ and never committed (the ITF Free Font
 *     License forbids redistributing the files; a rendered PNG is fine).
 *   Newsreader 400, roman and italic: @fontsource/newsreader's WOFF files.
 *   IBM Plex Mono 400 for the date: @fontsource/ibm-plex-mono's WOFF.
 *   Tiro Devanagari Hindi 400, roman and italic, for a poem in Hindi (from /tend):
 *     under its own name, so satori falls back to it for Devanagari glyphs only.
 *     (A second face under the same name as Newsreader is never consulted.)
 *
 * Never fails the build: if Fontshare can't be reached, Mukta (already a
 * dependency) stands in for Switzer and the build says so.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

type Weight = 400 | 500 | 700;
export type CardFont = { name: string; data: Buffer; weight: Weight; style: 'normal' | 'italic' };

const ROOT = process.cwd();
const CACHE = resolve(ROOT, 'node_modules/.cache/vyas-og');
const CSS = 'https://api.fontshare.com/v2/css?f[]=switzer@500,700&display=swap';
const require = createRequire(join(ROOT, 'package.json'));

/** A file inside an installed @fontsource package. */
const pkgFile = (pkg: string, file: string) => readFile(join(dirname(require.resolve(`${pkg}/package.json`)), 'files', file));

async function switzer(): Promise<CardFont[] | null> {
  const weights = [500, 700] as const;
  const path = (w: number) => resolve(CACHE, `Switzer-${w}.ttf`);
  try {
    return await Promise.all(weights.map(async (w) => ({ name: 'Switzer', data: await readFile(path(w)), weight: w, style: 'normal' as const })));
  } catch {
    /* not cached yet: fetch below */
  }
  try {
    const css = await (await fetch(CSS)).text();
    const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => ({
      weight: Number(/font-weight:\s*(\d+)/.exec(body)?.[1]),
      style: /font-style:\s*(\w+)/.exec(body)?.[1],
      url: /url\('([^']+\.ttf)'\)/.exec(body)?.[1],
    }));
    await mkdir(CACHE, { recursive: true });
    for (const w of weights) {
      const face = faces.find((f) => f.weight === w && f.style === 'normal' && f.url);
      if (!face?.url) throw new Error(`no ${w} TTF in Fontshare CSS`);
      const res = await fetch(face.url.startsWith('//') ? `https:${face.url}` : face.url);
      if (!res.ok) throw new Error(`${res.status} for Switzer ${w}`);
      await writeFile(path(w), Buffer.from(await res.arrayBuffer()));
    }
    return await Promise.all(weights.map(async (w) => ({ name: 'Switzer', data: await readFile(path(w)), weight: w, style: 'normal' as const })));
  } catch (e) {
    console.warn(`og: could not fetch Switzer TTFs (${(e as Error).message}); share cards fall back to Mukta`);
    return null;
  }
}

let fonts: Promise<CardFont[]> | null = null;

/** Every face a card uses, loaded once per build. */
export function cardFonts(): Promise<CardFont[]> {
  fonts ??= (async () => {
    const sans = (await switzer()) ?? [
      { name: 'Switzer', data: await pkgFile('@fontsource/mukta', 'mukta-latin-500-normal.woff'), weight: 500, style: 'normal' },
      { name: 'Switzer', data: await pkgFile('@fontsource/mukta', 'mukta-latin-700-normal.woff'), weight: 700, style: 'normal' },
    ];
    const serif: CardFont[] = [];
    for (const subset of ['latin', 'latin-ext']) {
      for (const style of ['normal', 'italic'] as const) {
        serif.push({ name: 'Newsreader', data: await pkgFile('@fontsource/newsreader', `newsreader-${subset}-400-${style}.woff`), weight: 400, style });
      }
    }
    const mono: CardFont = { name: 'Plex Mono', data: await pkgFile('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff'), weight: 400, style: 'normal' };
    const hindi: CardFont[] = [];
    for (const style of ['normal', 'italic'] as const) {
      hindi.push({ name: 'Tiro Devanagari Hindi', data: await pkgFile('@fontsource/tiro-devanagari-hindi', `tiro-devanagari-hindi-devanagari-400-${style}.woff`), weight: 400, style });
    }
    return [...sans, ...serif, mono, ...hindi];
  })();
  return fonts;
}
