/**
 * POST /api/tend/login/ { passphrase } → 204 + the session cookie, or 401 after ~1s.
 * tend-spec, Security 1.
 */
import type { APIRoute } from 'astro';
import { guard, passphraseMatches, sessionCookie } from '../../../lib/tend/auth';
import { empty, fail, readJson, refuse, sleep } from '../../../lib/tend/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    guard(request, { session: false });
    const body = await readJson(request, 10_000);
    // trim: a pasted passphrase often brings a space or newline with it
    const given = typeof body.passphrase === 'string' ? body.passphrase.trim() : '';
    if (given.length === 0 || given.length > 1000 || !passphraseMatches(given)) {
      await sleep(1000);
      return fail(401);
    }
    return empty({ 'Set-Cookie': sessionCookie() });
  } catch (e) {
    return refuse('login', e);
  }
};

export const ALL: APIRoute = () => fail(405);
