#!/usr/bin/env node
/**
 * The Sunday note: the body of the GitHub issue "This week on vyas.garden",
 * printed to stdout. .github/workflows/sync.yml opens the issue (and closes
 * last week's); GitHub emails it to him, so it is his reminder.
 *
 * It lists what the sync brought over in the last 7 days (src/data/sync.json
 * `synced`, with links), every image those imports carried, to glance at for
 * anything private (the importer blurs nothing), and asks about the rest.
 *
 * Env (set by the workflow): GITHUB_REPOSITORY for image links, SUBSTACK and
 * YOUTUBE (each step's outcome) to say when a check failed.
 *
 *   --days <n>   look back n days instead of 7
 */
import { readSync } from './lib/sync.mjs';

const args = process.argv.slice(2);
const DAYS = args.includes('--days') ? Number(args[args.indexOf('--days') + 1]) : 7;
const SITE = 'https://vyas.garden';
const REPO = process.env.GITHUB_REPOSITORY || 'abhishek5878/pb_website';

const sync = readSync();
const since = Date.now() - DAYS * 24 * 3600e3;
const week = sync.synced.filter((s) => Date.parse(s.at) > since);
const where = (s) => (s.source === 'youtube' ? 'YouTube' : s.publication === 'wasp' ? 'Substack, WASP Signal' : 'Substack');
/** A title as link text: no brackets or line breaks to break the markdown. */
const text = (s) => String(s || 'Untitled').replace(/[\[\]\n]/g, ' ').trim();

const out = [];
if (week.length) {
  out.push(`**Brought over this week** (${week.length})`, '');
  for (const s of week) out.push(`- [${text(s.title)}](${SITE}${s.href}) · ${where(s)} · [original](${s.url})`);
} else {
  out.push('Nothing new from Substack or YouTube this week.');
}

const images = week.flatMap((s) => (s.images || []).map((path) => ({ path, s })));
if (images.length) {
  out.push(
    '',
    `**Images to glance at** (${images.length})`,
    '',
    'New imports can carry private screenshots (a boarding pass, a phone number). Nothing was blurred. Tick each once you have looked; if one shows something private, replace or remove the file in the repo.',
    ''
  );
  // GitHub caps an issue at 65,536 characters; past 120 images, the posts above show the rest.
  for (const { path, s } of images.slice(0, 120)) {
    const blob = `https://github.com/${REPO}/blob/main/${path}`;
    out.push(`- [ ] [${path.split('/').pop()}](${blob}) in [${text(s.title)}](${SITE}${s.href})`, `  <img src="${blob}?raw=true" width="320" alt="">`);
  }
  if (images.length > 120) out.push(`- …and ${images.length - 120} more, in the posts above`);
}

const failed = [
  process.env.SUBSTACK === 'failure' && 'Substack',
  process.env.YOUTUBE === 'failure' && 'YouTube',
].filter(Boolean);
if (failed.length) out.push('', `Today's check of ${failed.join(' and ')} failed; the run's log says why: https://github.com/${REPO}/actions/workflows/sync.yml`);

out.push('', 'Posted on Instagram or anywhere else this week? Add it from [vyas.garden/tend](https://vyas.garden/tend/).');
console.log(out.join('\n'));
