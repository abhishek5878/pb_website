#!/usr/bin/env node
/**
 * Downloads Switzer (Indian Type Foundry, via Fontshare) into public/fonts/switzer/.
 *
 * Why not commit the files: the ITF Free Font License allows self-hosting on
 * your own site but forbids redistributing the files, and a public repo counts.
 * So each build fetches the official WOFF2 files, unmodified, and git ignores them.
 *
 * Never fails the build: on any error it keeps what's on disk, and the
 * @font-face in src/styles/fonts.css falls back to Fontshare's own CDN.
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/fonts/switzer');
const CSS = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';
const FILES = { normal: 'Switzer-Variable.woff2', italic: 'Switzer-VariableItalic.woff2' };

const exists = (p) => access(p).then(() => true, () => false);

async function main() {
  if ((await exists(resolve(OUT, FILES.normal))) && (await exists(resolve(OUT, FILES.italic)))) {
    console.log('fonts: Switzer already on disk');
    return;
  }
  const css = await (await fetch(CSS)).text();
  // Each @font-face block: pull its style and its woff2 URL.
  const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => ({
    style: /font-style:\s*(\w+)/.exec(body)?.[1],
    url: /url\('([^']+\.woff2)'\)/.exec(body)?.[1],
  }));
  await mkdir(OUT, { recursive: true });
  for (const style of ['normal', 'italic']) {
    const face = faces.find((f) => f.style === style && f.url);
    if (!face) throw new Error(`no ${style} face in Fontshare CSS`);
    const res = await fetch(face.url.startsWith('//') ? `https:${face.url}` : face.url);
    if (!res.ok) throw new Error(`${res.status} for ${style}`);
    await writeFile(resolve(OUT, FILES[style]), Buffer.from(await res.arrayBuffer()));
  }
  console.log('fonts: Switzer downloaded');
}

main().catch((e) => console.warn(`fonts: could not fetch Switzer (${e.message}); falling back to Fontshare CDN`));
