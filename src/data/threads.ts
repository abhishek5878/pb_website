/**
 * The threads: the same ideas, met again in another format. Each stop is a post
 * (with one of his lines from it, verbatim), a project, or a line of the charter.
 * Read by /threads/ (which lays the stops out as a walk) and /start/ (which shows one).
 * The build checks every post quote against the post text (src/pages/threads/index.astro).
 */
export type Ref =
  | { post: string; quote: string }
  | { project: string }
  | { charter: number };
export type Stop = {
  refs: Ref[];
  /** Left edge and width, % of the path, on a wide screen and on a phone. */
  at: [number, number];
  phone: [number, number];
  /** A longer walk to the next stop. */
  far?: boolean;
};
export type Thread = { id: string; title: string; stops: Stop[] };

export const THREADS: Thread[] = [
  {
    id: 'seen',
    title: 'Being seen without performing',
    stops: [
      { refs: [{ post: '2025-09-26-the-desire-to-be-seen', quote: '…we all just want to be SEEN.' }], at: [0, 42], phone: [0, 90] },
      { refs: [{ post: '2026-03-09-perform-this-is-gtm-dude', quote: 'But I’m done performing.' }], at: [34, 42], phone: [10, 90] },
      { refs: [{ post: '2026-10-22-seven-minutes', quote: 'Who in my brain is editing this?' }], at: [8, 42], phone: [0, 90] },
      { refs: [{ project: 'rocky' }, { project: 'signal-spark' }], at: [42, 42], phone: [10, 90] },
      { refs: [{ charter: 0 }], at: [16, 42], phone: [0, 90] },
    ],
  },
  {
    id: 'credit',
    title: 'Credit',
    stops: [
      {
        refs: [
          { post: '2024-03-14-a-piece-of-plastic', quote: '…with just 3% of people possessing a formal credit card.' },
          { post: '2024-03-18-curious-case-of-cred', quote: '…the user needs to have a CIBIL score greater than 750…' },
        ],
        at: [0, 42],
        phone: [0, 90],
        far: true,
      },
      { refs: [{ project: 'credit' }], at: [42, 42], phone: [10, 90] },
    ],
  },
  {
    id: 'founders',
    title: 'Hunting founders',
    stops: [
      { refs: [{ post: '2025-07-22-mandrake-venture-intelligence', quote: '…shouldn’t there be some order in this chaos?' }], at: [0, 42], phone: [0, 90] },
      { refs: [{ post: '2025-09-27-what-reddit-tells-us-about-the-future', quote: 'Every pitch deck says VCs are in the business of backing founders.' }], at: [34, 42], phone: [10, 90] },
      {
        refs: [
          { post: '2026-01-26-builders-shaping-indias-ai-execution', quote: 'Most breakout companies are obvious in hindsight.' },
          { post: '2026-02-02-the-rise-of-the-vertical-operator', quote: 'We don’t guess. We log the traces.' },
        ],
        at: [8, 42],
        phone: [0, 90],
      },
      { refs: [{ project: 'kairos' }], at: [42, 42], phone: [10, 90] },
    ],
  },
];
