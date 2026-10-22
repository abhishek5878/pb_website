/**
 * The daily rebuild (tend-spec, Security 6). Vercel's cron (vercel.json) calls
 * GET /api/rebuild/ with `Authorization: Bearer $CRON_SECRET`; this POSTs to the
 * deploy hook so the feeds (Letterboxd, Substack) refresh. 06:00 IST.
 */
import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { env, isMock } from '../../lib/tend/env';
import { fail, json } from '../../lib/tend/http';

export const prerender = false;

const digest = (s: string) => createHash('sha256').update(s, 'utf8').digest();

const handle: APIRoute = async ({ request }) => {
  const secret = env('CRON_SECRET');
  const given = request.headers.get('authorization') ?? '';
  if (!secret || !timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return fail(401);
  const hook = env('DEPLOY_HOOK_URL');
  if (!hook) return fail(500, 'Didn’t work.');
  if (isMock()) return json({ ok: true, mock: true });
  try {
    const res = await fetch(hook, { method: 'POST' });
    if (!res.ok) console.error('[tend] deploy hook answered', res.status);
    return json({ ok: res.ok });
  } catch (e) {
    console.error('[tend] deploy hook:', e instanceof Error ? e.message : e);
    return fail(502, 'Didn’t work.');
  }
};

export const GET = handle;
export const POST = handle;
export const ALL: APIRoute = () => fail(405);
