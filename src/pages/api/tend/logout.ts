/** POST /api/tend/logout/ → 204, cookie cleared. */
import type { APIRoute } from 'astro';
import { clearedCookie, guard } from '../../../lib/tend/auth';
import { empty, fail, refuse } from '../../../lib/tend/http';

export const prerender = false;

export const POST: APIRoute = ({ request }) => {
  try {
    guard(request, { session: false });
    return empty({ 'Set-Cookie': clearedCookie() });
  } catch (e) {
    return refuse('logout', e);
  }
};

export const ALL: APIRoute = () => fail(405);
