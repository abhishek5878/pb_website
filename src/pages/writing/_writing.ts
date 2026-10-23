/**
 * Writing's tabs and what belongs in Writing. docs/design/making.md, Amendment 1 C:
 * one home per kind. Photos, videos, mixes, listening and trips live in Making
 * (/making/), books in Books (/books/); everything else is Writing.
 *
 * Tabs: All · Essays · Poems · Notes · Links, each a static route
 * (/writing/, /writing/essays/…), each only when it has posts. Post ids are
 * dated slugs ("2025-11-14-…"), so a tab's route never meets /writing/[id]/.
 *
 * Fields Agent 1 adds to the schema (`lang`) are read defensively.
 */
import { homeOf, type Post } from '../../lib/posts';

export const inWriting = (p: Post) => homeOf(p).label === 'Writing';

export type WritingTab = 'essays' | 'poems' | 'notes' | 'links';
export const WRITING_TABS: { id: WritingTab; label: string; kind: Post['kind'] }[] = [
  { id: 'essays', label: 'Essays', kind: 'essay' },
  { id: 'poems', label: 'Poems', kind: 'poem' },
  { id: 'notes', label: 'Notes', kind: 'note' },
  { id: 'links', label: 'Links', kind: 'link' },
];

/** The tabs with posts in them, All first, with their counts. */
export function writingTabs(pieces: Post[]) {
  return [
    { id: 'all' as const, label: 'All', n: pieces.length, href: '/writing/' },
    ...WRITING_TABS.map((t) => ({ id: t.id, label: t.label, n: pieces.filter((p) => p.kind === t.kind).length, href: `/writing/${t.id}/` })).filter((t) => t.n > 0),
  ];
}

/** A post's `lang` (poems): 'en', 'hi' or 'mixed'. Undefined until the schema has it, or when unset. */
export function langOf(p: Post): string | undefined {
  const d = p.raw?.data as { lang?: unknown } | undefined;
  return typeof d?.lang === 'string' ? d.lang : undefined;
}
/** The HTML lang a poem's lines take: Devanagari renders in Tiro Devanagari Hindi under lang="hi". */
export const htmlLang = (p: Post) => (langOf(p) === 'hi' || langOf(p) === 'mixed' ? 'hi' : undefined);

/**
 * A poem's opening: its first lines, his line breaks kept, as rendered HTML
 * (so his italics and links survive), grouped by stanza. Three or four lines:
 * up to four, stopping at a stanza's end once there are three.
 */
export function opening(p: Post, max = 4): string[][] {
  let html = (p.raw?.rendered?.html ?? '').replace(/<!--[\s\S]*?-->/g, '');
  const verse = html.match(/<div class="verse"[^>]*>([\s\S]*?)<\/div>/);
  if (verse) html = verse[1];
  const stanzas: string[][] = [];
  let n = 0;
  for (const m of html.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const lines = m[1]
      .split(/<br\s*\/?>|\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const take = lines.slice(0, max - n);
    if (take.length) stanzas.push(take);
    n += take.length;
    if (n >= 3) break;
  }
  return stanzas;
}

/** The opening's first line as plain text (llms.txt quotes it). */
export const openingLine = (p: Post) =>
  (opening(p, 1)[0]?.[0] ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
