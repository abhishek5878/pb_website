/**
 * What a post's share card and link preview say, from the post itself.
 * Used by src/pages/og/[id].png.ts (the card) and src/pages/writing/[id].astro
 * (the description and the card's alt text).
 */
import type { ImageMetadata } from 'astro';
import { firstLine, label, fmtDate, type Post } from '../posts';
import type { CardInput } from './card';

/** WASP Signal issues all open on the same template sentence; their subtitle is the line that differs. */
export const isWasp = (p: Post) => p.raw?.data.publication === 'wasp';

/** The line under the title: the subtitle, else his first line. */
export function shareLine(p: Post): { text: string; italic: boolean } | undefined {
  if (p.subtitle) return { text: p.subtitle, italic: true };
  const first = firstLine(p);
  return first ? { text: first, italic: false } : undefined;
}

/** The meta description: his first line, except a WASP issue, which gets its subtitle. */
export const shareDescription = (p: Post): string | undefined => (isWasp(p) && p.subtitle ? p.subtitle : firstLine(p)) || undefined;

/** The card's path on the site. */
export const cardPath = (p: Post) => `/og/${p.id}.png`;

export function cardInput(p: Post): CardInput {
  /* an untitled note is named by its own first words: the line would repeat them */
  const line = p.title || p.subject ? shareLine(p) : undefined;
  /* Astro keeps a content image's file path on the (non-enumerable) fsPath */
  const first = p.images.find((i) => typeof i.src !== 'string')?.src as (ImageMetadata & { fsPath?: string }) | undefined;
  return {
    title: label(p),
    line: line?.text,
    italic: line?.italic,
    date: fmtDate(p.date),
    light: p.light,
    photo: first?.fsPath,
  };
}

/** Alt text for the card: what it says. */
export const cardAlt = (p: Post) => {
  const { title, line } = cardInput(p);
  return [title, line].filter(Boolean).join(' — ');
};
