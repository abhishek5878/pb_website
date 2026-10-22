/**
 * /og/<id>.png: each local post's share card, 1200×630, rendered once at build
 * (satori → resvg) and served as a static file. The homepage and the section
 * pages keep Michael Scott (Base.astro's default image).
 * The card itself: src/lib/og/card.ts.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getWriting, type Post } from '../../lib/posts';
import { renderCard } from '../../lib/og/card';
import { cardInput } from '../../lib/og/post';

export const prerender = true;

export const getStaticPaths = (async () => {
  const local = (await getWriting()).filter((p) => p.source === 'site');
  return local.map((post) => ({ params: { id: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: Post }> = async ({ props }) => {
  const png = await renderCard(cardInput(props.post));
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
