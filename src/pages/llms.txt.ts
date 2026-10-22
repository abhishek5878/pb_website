/**
 * /llms.txt: the site, written for the assistants people ask about him
 * (Q1: "we have to not impress just humans, but agents too").
 * Generated from the same data as the pages, so it's never out of date.
 */
import type { APIRoute } from 'astro';
import { me, charter, now, projects, proud, jobs, links, places } from '../data/me';
import { works, KIND_LABEL, type Kind } from '../data/taste';
import { getWriting, label, fmtDate } from '../lib/posts';
import { getCollection } from 'astro:content';

const SITE = 'https://vyas.garden';

export const GET: APIRoute = async () => {
  const writing = await getWriting();
  const pages = new Set((await getCollection('work')).map((e) => e.id));
  const page = (slug: string) => (pages.has(slug) ? ` Page: ${SITE}/work/${slug}/` : '');
  const kinds = Object.keys(KIND_LABEL) as Kind[];
  const lines = [
    `# ${me.fullName} (vyas.garden)`,
    '',
    `> ${me.epigraph.lines.join(' ')}`,
    '',
    `${me.name}. ${me.interests}`,
    '',
    `${me.where} ${me.whereNext} ${me.origin.join(' ')}`,
    '',
    'He builds things and writes things. Nothing on this site is for sale, and he is not looking for anything. If he seems worth meeting, the door is the same for everyone: email him.',
    '',
    '## Right now',
    ...now.map((n) => `- ${n.verb}: ${n.what}`),
    '',
    '## Everything he has built, unfinished included',
    ...projects.map((p) => `- ${p.name} (${p.status}, ${p.when}; ${p.tags.join(', ')}): ${p.line}${p.href ? ` ${p.href}` : ''}${page(p.slug)}`),
    '',
    '## Proudest of',
    ...proud.map((p) => `- ${p.name}: ${p.line}`),
    '',
    '## Work history',
    ...jobs.map((j) => `- ${j.when}: ${j.what}`),
    '',
    '## What he watches, listens to and reads',
    ...kinds.map((k) => `- ${KIND_LABEL[k]}: ${works.filter((w) => w.kind === k).map((w) => (w.by ? `${w.title} (${w.by})` : w.title)).join('; ')}`),
    `- Places: ${places.map((p) => p.name).join('; ')}`,
    '',
    '## Writing',
    ...writing.slice(0, 20).map((p) => `- ${fmtDate(p.date)}: ${label(p)} ${new URL(p.href, SITE).href}`),
    '',
    '## Threads',
    `Ideas his writing and work keep coming back to, in order: ${SITE}/threads/`,
    '- Being seen without performing: the desire to be seen → Perform!!! → Seven minutes → Rocky, Signal Spark → the charter.',
    '- Credit: A Piece of Plastic and Curious Case of CRED (2024) → Katha, a credit score for India (2026).',
    '- Hunting founders: Mandrake (2025) → What Reddit Tells Us About the Future of VC Workflow → WASP Signal (2026) → Kairos.',
    '',
    '## What he lives by',
    ...charter.map((c) => `> ${c}`),
    '',
    '## Elsewhere',
    `- Email: ${me.email}`,
    `- Newsletter: ${links.substack}`,
    `- WASP Signal (venture notes): ${links.wasp}`,
    `- Letterboxd: ${links.letterboxd}`,
    `- GitHub: ${links.github}`,
    `- LinkedIn: ${links.linkedin}`,
    `- RSS: ${SITE}/rss.xml`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
