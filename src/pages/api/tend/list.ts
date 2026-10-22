/**
 * POST /api/tend/list/ {} → { posts: [{ id, path, kind, title, subject, by, date, draft, images }] }, newest first.
 * POST /api/tend/list/ { of: 'pages' } → { pages: [slug] }: the projects whose page folder holds an index.md.
 */
import type { APIRoute } from 'astro';
import { guard } from '../../../lib/tend/auth';
import { fail, json, readJson, refuse } from '../../../lib/tend/http';
import { store } from '../../../lib/tend/store';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    guard(request);
    const { of } = await readJson(request, 10_000);
    if (of === 'pages') return json({ pages: await store().pages() });
    const posts = await store().list();
    return json({ posts });
  } catch (e) {
    return refuse('list', e);
  }
};

export const ALL: APIRoute = () => fail(405);
