/**
 * /writing/<id>/poster.jpg: the still a post's player shows before anyone
 * presses play (src/components/writing/posters.ts). Fetched once at build and
 * served from this site, so the reading room asks no third party for anything
 * until a click. Only posts whose still could be fetched get one; the page
 * asks the same memoised fetch, so it names a poster only when this file exists.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getWriting } from '../../../lib/posts';
import { embedsOf, posterFor } from '../../../components/writing/posters';

export const prerender = true;

export const getStaticPaths = (async () => {
  const local = (await getWriting()).filter((p) => p.source === 'site' && p.raw);
  const out: { params: { id: string }; props: { bytes: Uint8Array } }[] = [];
  for (const post of local) {
    const [first] = embedsOf(post.raw!.data);
    if (!first) continue;
    const bytes = await posterFor(first);
    if (bytes) out.push({ params: { id: post.id }, props: { bytes } });
  }
  return out;
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ bytes: Uint8Array }> = ({ props }) =>
  new Response(new Uint8Array(props.bytes), { headers: { 'Content-Type': 'image/jpeg' } });
