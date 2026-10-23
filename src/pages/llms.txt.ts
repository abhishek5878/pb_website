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
import { getLog, films, nowSnapshots, ratingText, KIND_LABEL as LOG_KIND } from '../lib/log';
import { getMaking, LINE } from './making/_making';
import { getBooks, LINE as BOOKS_LINE } from './books/_books';
import { inWriting, writingTabs, openingLine } from './writing/_writing';

const SITE = 'https://vyas.garden';

/** His line in quotes, unless it already opens with one of his own. */
const quoted = (s: string) => (/^[“"‘']/.test(s) ? s : `“${s}”`);

/* /making/: photos, videos, music and trips, one tab each; only the tabs with something in them */
function makingLines(m: Awaited<ReturnType<typeof getMaking>>): string[] {
  if (m.count === 0) return [];
  const url = (href: string) => new URL(href, SITE).href;
  const tab = (id: string) => m.tabs.find((t) => t.id === id);
  const out = [
    '## Making',
    `Photos, videos, music and trips, one tab each (${m.tabs.map((t) => `${t.label}, ${t.n}`).join('; ')}): ${SITE}/making/. His line for it: “${LINE.plan} ${LINE.done}”`,
  ];
  if (tab('photos')) {
    out.push(`- Photos (${SITE}/making/photos/): ${m.frames.length} photographs from ${m.rolls.length} ${m.rolls.length === 1 ? 'post' : 'posts'}, newest first:`);
    for (const r of m.rolls) {
      const n = m.frames.filter((f) => f.post === r).length;
      out.push(`  - ${label(r)}${r.place ? `, ${r.place}` : ''} (${fmtDate(r.date)}, ${n} ${n === 1 ? 'photo' : 'photos'}) ${url(r.href)}`);
    }
  }
  if (tab('videos')) {
    out.push(`- Videos (${SITE}/making/videos/):`);
    for (const v of m.videos) out.push(`  - ${label(v.post)}${v.post.place ? `, ${v.post.place}` : ''} (${fmtDate(v.post.date)}${v.host ? `, on ${v.host}` : ''}) ${url(v.post.href)}${v.post.youtube ?? v.post.link ? ` ${v.post.youtube ?? v.post.link}` : ''}`);
  }
  if (tab('music')) {
    out.push(`- Music (${SITE}/making/music/): mixes and listening posts:`);
    for (const t of m.music) out.push(`  - ${t.kind}: ${t.title}${t.by ? `, ${t.by}` : ''} (${fmtDate(t.post.date)}) ${url(t.post.href)}`);
  }
  if (tab('trips')) {
    out.push(`- Trips (${SITE}/making/trips/):`);
    for (const t of m.trips) out.push(`  - ${label(t.post)}${t.place ? `, ${t.place}` : ''} (${fmtDate(t.post.date)}) ${url(t.post.href)}`);
  }
  out.push('');
  return out;
}

/* /books/: reading now, read by year, and the books on his Taste shelf */
function booksLines(b: Awaited<ReturnType<typeof getBooks>>): string[] {
  if (b.count === 0) return [];
  const url = (href: string) => new URL(href, SITE).href;
  const row = (x: { title: string; by?: string; rating?: number; status?: string; note?: string; href?: string }, when?: Date) =>
    `  - ${x.title}${x.by ? `, ${x.by}` : ''}${when ? ` (${fmtDate(when)})` : ''}${x.status === 'stopped' ? ', stopped' : x.rating != null ? `, ${ratingText(x.rating)}` : ''}${x.note ? `: ${quoted(x.note)}` : ''}${x.href ? ` ${url(x.href)}` : ''}`;
  const out = ['## Books', `Reading now, read by year (his rating and the first line of his notes), and the books on his Taste shelf: ${SITE}/books/. His line: “${BOOKS_LINE.library} ${BOOKS_LINE.daily}”`];
  if (b.reading.length) out.push('- Reading now:', ...b.reading.map((x) => row(x, x.date)));
  if (b.years.length) out.push('- Read, newest first:', ...b.years.flatMap((y) => y.items.map((x) => row(x, x.date))));
  if (b.shelf.length) out.push('- On his Taste shelf:', ...b.shelf.map((x) => row(x)));
  out.push('');
  return out;
}

export const GET: APIRoute = async () => {
  /* Writing lists what the /writing/ index lists: photos, videos and music are Making's, books are Books' */
  const writing = (await getWriting()).filter(inWriting);
  const wTabs = writingTabs(writing).filter((t) => t.id !== 'all');
  const making = await getMaking();
  const books = await getBooks();
  const poems = writing.filter((p) => p.kind === 'poem');
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
  /* /now with its history, /log, /taste/log: the living record (docs/design/living.md) */
  const log = await getLog();
  const diary = films();
  const latestNow = nowSnapshots()[0];
  const day = (s: string) => fmtDate(new Date(s));
  const abs = (href: string) => new URL(href, SITE).href;
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
    latestNow
      ? `Updated ${day(latestNow.date)}${latestNow.place ? `, from ${latestNow.place}` : ''}. ${SITE}/now/ (earlier versions are kept on the page, newest first).`
      : `${SITE}/now/`,
    '',
    '## Log',
    `Everything that changed on the site, newest first, by month (posts, films he watched, /now updates, project changes): ${SITE}/log/`,
    ...log.slice(0, 10).map((l) => `- ${day(l.day)}, ${LOG_KIND[l.kind]}: ${l.text}${l.year || l.rating != null ? ` (${[l.year, l.rating != null ? ratingText(l.rating) : ''].filter(Boolean).join(', ')})` : ''}${l.href ? ` ${abs(l.href)}` : ''}`),
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
    ...(diary.length
      ? [
          `- Film diary: every film he has logged on Letterboxd (${diary.length} so far), by year, with his rating and his review: ${SITE}/taste/log/. Latest: ${diary
            .slice(0, 5)
            .map((f) => `${f.title}${f.year ? ` (${f.year})` : ''}, ${day(f.watched)}${typeof f.rating === 'number' ? `, ${ratingText(f.rating)}` : ''}`)
            .join('; ')}.`,
        ]
      : []),
    '',
    '## Writing',
    `Every post by year, filterable by lane: ${SITE}/writing/ (lanes: Night, personal and poems; Signal, venture notes; Build, things he built). One tab per kind: ${wTabs.map((t) => `${t.label} (${t.n}) ${SITE}${t.href}`).join(', ')}.`,
    ...writing.slice(0, 20).map((p) => `- ${fmtDate(p.date)}: ${label(p)}${lane(p)} ${new URL(p.href, SITE).href}`),
    ...(poems.length ? ['', `Poems (${SITE}/writing/poems/), with each one's first line:`, ...poems.map((p) => `- ${label(p)} (${fmtDate(p.date)}): ${quoted(openingLine(p))} ${new URL(p.href, SITE).href}`)] : []),
    '',
    ...booksLines(books),
    ...makingLines(making),
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
