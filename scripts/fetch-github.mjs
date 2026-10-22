#!/usr/bin/env node
/**
 * Pulls public GitHub activity at build time into src/data/github.json.
 *
 * Runs before `astro build`. It must never fail the build: GitHub rate-limits
 * unauthenticated requests hard, and a personal site going down because an
 * API was grumpy is a bad trade. On any error we keep whatever JSON is already
 * on disk, and fall back to an empty payload only if there is nothing at all.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/data/github.json');
const USER = process.env.GITHUB_PROFILE || 'abhishek5878';

/**
 * Never publish these. Client, employer, and partner names must not reach the
 * site through live GitHub data — this is the single choke point, so anything
 * whose repo name or description matches is dropped before it is written.
 */
const REDACTED = [/finbud/i, /\bzap\b/i, /ambition/i, /alyve/i, /credmo/i];

const isRedacted = (...fields) =>
  fields.some((f) => f && REDACTED.some((re) => re.test(f)));

/** GITHUB_TOKEN lifts the rate limit from 60/hr to 5000/hr in CI. */
const headers = {
  'User-Agent': `${USER}-site-build`,
  Accept: 'application/vnd.github+json',
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

/** Collapse the raw event firehose into "repos I touched, most recent first". */
function summarise(events) {
  const seen = new Map();

  for (const event of events) {
    if (!event.repo?.name) continue;
    // Fork/watch events say nothing about what someone is building.
    if (event.type === 'WatchEvent' || event.type === 'ForkEvent') continue;
    if (isRedacted(event.repo.name)) continue;

    const name = event.repo.name;
    const existing = seen.get(name);
    const commits =
      event.type === 'PushEvent' ? (event.payload?.commits?.length ?? 0) : 0;

    if (existing) {
      existing.commits += commits;
      existing.events += 1;
      continue;
    }

    seen.set(name, {
      name,
      short: name.split('/')[1] ?? name,
      url: `https://github.com/${name}`,
      at: event.created_at,
      commits,
      events: 1,
    });
  }

  return [...seen.values()].slice(0, 6);
}

async function main() {
  const [events, repos] = await Promise.all([
    api(`/users/${USER}/events/public?per_page=100`),
    api(`/users/${USER}/repos?sort=pushed&per_page=12`),
  ]);

  const payload = {
    user: USER,
    generatedAt: new Date().toISOString(),
    active: summarise(events),
    repos: repos
      .filter(
        (r) =>
          !r.fork &&
          !r.archived &&
          r.name !== `${USER}.github.io` &&
          !isRedacted(r.name, r.description)
      )
      .slice(0, 5)
      .map((r) => ({
        name: r.name,
        url: r.html_url,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        pushedAt: r.pushed_at,
      })),
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(
    `[github] ${payload.active.length} active repo(s), ${payload.repos.length} listed`
  );
}

main().catch(async (err) => {
  console.warn(`[github] skipped: ${err.message}`);
  try {
    await readFile(OUT);
    console.warn('[github] keeping the payload already on disk');
  } catch {
    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(
      OUT,
      JSON.stringify(
        { user: USER, generatedAt: null, active: [], repos: [] },
        null,
        2
      ) + '\n'
    );
    console.warn('[github] wrote an empty payload');
  }
});
