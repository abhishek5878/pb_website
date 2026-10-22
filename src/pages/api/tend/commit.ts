/**
 * POST /api/tend/commit/ { message, files, deletes } → { commit, url }.
 *
 *   files: [{ path, post: { fields, body } }]   a markdown post: frontmatter is built here
 *          [{ path, text }]                      a data file: validated against its shape
 *          [{ path, sha }]                       an image already uploaded as a blob
 *   deletes: [path]                              post paths only
 *
 * Every path is checked against the allowlist, at most 40 per commit
 * (tend-spec, Security 3–4). One commit on main; `url` is the page that changed.
 */
import type { APIRoute } from 'astro';
import { guard } from '../../../lib/tend/auth';
import { Refused, fail, json, readJson, refuse } from '../../../lib/tend/http';
import { MAX_FILES, isData, isDeletable, isPostImage, isPostText, pageFor } from '../../../lib/tend/paths';
import { Fields, compact, markdown, validateData } from '../../../lib/tend/shapes';
import { store, type CommitFile } from '../../../lib/tend/store';

export const prerender = false;

const BODY_MAX = 200_000;

export const POST: APIRoute = async ({ request }) => {
  try {
    guard(request);
    const body = await readJson(request, 2_000_000);

    const rawMessage = typeof body.message === 'string' ? body.message : '';
    const message = rawMessage.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 120) || 'save';

    const files = Array.isArray(body.files) ? body.files : [];
    const deletes = Array.isArray(body.deletes) ? body.deletes : [];
    if (files.length + deletes.length === 0 || files.length + deletes.length > MAX_FILES) throw new Refused(400);

    const seen = new Set<string>();
    const out: CommitFile[] = [];
    for (const f of files) {
      if (!f || typeof f !== 'object') throw new Refused(400);
      const { path } = f as Record<string, unknown>;
      if (typeof path !== 'string' || seen.has(path)) throw new Refused(400);
      seen.add(path);
      if (isPostText(path)) {
        const post = (f as Record<string, unknown>).post as Record<string, unknown> | undefined;
        if (!post || typeof post !== 'object' || typeof post.body !== 'string' || post.body.length > BODY_MAX) throw new Refused(400);
        const fields = Fields.parse(compact((post.fields ?? {}) as Record<string, unknown>));
        out.push({ path, content: markdown(fields, post.body) });
      } else if (isData(path)) {
        const text = (f as Record<string, unknown>).text;
        if (typeof text !== 'string' || text.length > 1_000_000) throw new Refused(400);
        out.push({ path, content: validateData(path, text) });
      } else if (isPostImage(path)) {
        const sha = (f as Record<string, unknown>).sha;
        if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) throw new Refused(400);
        out.push({ path, sha });
      } else {
        throw new Refused(400);
      }
    }
    const gone: string[] = [];
    for (const p of deletes) {
      if (!isDeletable(p) || seen.has(p)) throw new Refused(400);
      seen.add(p);
      gone.push(p);
    }

    const { commit } = await store().commit(`tend: ${message}`, out, gone);
    const url = out.length ? pageFor(out[0].path) : '/writing/';
    return json({ commit, url });
  } catch (e) {
    // a zod or JSON error is the client's fault; log it, answer generically
    if (e && typeof e === 'object' && ('issues' in e || e instanceof SyntaxError)) {
      console.error('[tend] commit refused:', e instanceof Error ? e.message : e);
      return fail(400, 'Didn’t work.');
    }
    return refuse('commit', e);
  }
};

export const ALL: APIRoute = () => fail(405);
