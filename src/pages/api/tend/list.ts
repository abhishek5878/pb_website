/** POST /api/tend/list/ {} → { posts: [{ id, path, kind, title, subject, by, date, draft, images }] }, newest first. */
import type { APIRoute } from 'astro';
import { guard } from '../../../lib/tend/auth';
import { fail, json, refuse } from '../../../lib/tend/http';
import { store } from '../../../lib/tend/store';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    guard(request);
    const posts = await store().list();
    return json({ posts });
  } catch (e) {
    return refuse('list', e);
  }
};

export const ALL: APIRoute = () => fail(405);
