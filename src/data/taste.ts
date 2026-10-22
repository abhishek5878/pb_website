/**
 * The art Abhishek consumes. Every work he named in his answers, and his line
 * about it when he gave one (his words only).
 *
 * The data lives in taste.json so /tend can edit it; this module keeps the
 * types and the exports every page imports.
 *
 * `swatch` is the work's own palette, from the research in
 * ~/.flow/tasks/vyas-garden/research-taste.md. Empty when the research found none;
 * never fill one in by guessing. `light` names a relight preset in
 * src/styles/light.css; works without one keep the night palette.
 * `note` is his longer words on the work, shown under the line on /taste/.
 */
import data from './taste.json';

export type Kind = 'film' | 'show' | 'music' | 'book' | 'person';

export type Work = {
  id: string;
  title: string;
  kind: Kind;
  by?: string;
  line?: string;
  /** His longer words on the work, when he has them. */
  note?: string;
  swatch: string[];
  light?: string;
};

export const works: Work[] = data as Work[];

export const KIND_LABEL: Record<Kind, string> = {
  film: 'Films',
  show: 'Shows',
  music: 'Music',
  book: 'Books',
  person: 'People',
};
