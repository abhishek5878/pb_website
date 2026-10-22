/**
 * /llms.txt: the site, written for the assistants people ask about him
 * (Q1: "we have to not impress just humans, but agents too").
 * Generated from the same data as the pages, so it's never out of date.
 */
import type { APIRoute } from 'astro';
import { me, charter, now, projects, proud, jobs, links, places } from '../data/me';
import { works, KIND_LABEL, type Kind } from '../data/taste';
import { getWriting, label, fmtDate, firstLine, inPost, LANE_LABEL, type Post } from '../lib/posts';
import { getCollection } from 'astro:content';
import { THREADS } from '../data/threads';
import start from '../data/start.json';

const SITE = 'https://vyas.garden';

export const GET: APIRoute = async () => {
  const writing = await getWriting();
  const pages = new Set((await getCollection('work')).map((e) => e.id));
  const page = (slug: string) => (pages.has(slug) ? ` Page: ${SITE}/work/${slug}/` : '');
  const kinds = Object.keys(KIND_LABEL) as Kind[];
  /* /start/'s picks, with the same line the page shows */
  const startPosts = (start.posts as (string | { id: string; line?: string })[])
    .map((pick) => {
      const id = typeof pick === 'string' ? pick : pick.id;
      const p = writing.find((x) => x.id === id);
      if (!p) return null;
      const chosen = typeof pick === 'string' ? undefined : pick.line;
      const line = chosen && inPost(p, chosen) ? chosen : (p.pull[0] ?? firstLine(p));
      return `- Post: ${label(p)} (${fmtDate(p.date)}): “${line}” ${new URL(p.href, SITE).href}`;
    })
    .filter(Boolean) as string[];
  const startProjects = start.projects
    .map((slug) => projects.find((p) => p.slug === slug))
    .filter(Boolean)
    .map((p) => `- Project: ${p!.name} (${p!.status}): ${p!.line}${page(p!.slug)}`);
  const startThread = THREADS.find((t) => t.id === start.thread);
  const lane = (p: Post) => (p.lane ? ` (${LANE_LABEL[p.lane]})` : '');
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
    `Start here: ${SITE}/start/ (${startPosts.length} posts, ${startProjects.length} projects and ${startThread ? 1 : 0} thread, for someone new). ${me.home.hello} ${me.home.line}`,
    '',
    '## Start here',
    ...startPosts,
    ...startProjects,
    ...(startThread ? [`- Thread: ${startThread.title} ${SITE}/threads/#${startThread.id}`] : []),
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
    `Every post by year, filterable by lane: ${SITE}/writing/ (lanes: Night, personal and poems; Signal, venture notes; Build, things he built).`,
    ...writing.slice(0, 20).map((p) => `- ${fmtDate(p.date)}: ${label(p)}${lane(p)} ${new URL(p.href, SITE).href}`),
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
