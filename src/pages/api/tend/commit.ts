/**
 * POST /api/tend/commit/ { message, files, deletes } → { commit, url }.
 *
 *   files: [{ path, post: { fields, body } }]   a markdown post: frontmatter is built here, held to its kind (kindProblem)
 *          [{ path, work: { fields, body } }]   a project's page: the same, `updated` set to today
 *          [{ path, text }]                      a data file: validated against its shape
 *          [{ path, sha }]                       an image already uploaded as a blob
 *   deletes: [path]                              post paths, and images beside a project's page
 *
 *   now.json's entry may carry `place` (a city, one line; default: the last snapshot's, else Bangalore).
 *
 * Every path is checked against the allowlist, at most 40 per commit
 * (tend-spec, Security 3–4). A project page may only name screenshots that
 * are beside it after this commit. One commit on main; `url` is the page that changed.
 *
 * The records ride in the same commit (records.ts, docs/design/living.md): a
 * Now save adds today's snapshot and a log line; a project save adds log lines.
 * The client never names a record path (they aren't in its allowlist) and never
 * sends log text: the server builds both from the validated files above.
 */
import type { APIRoute } from 'astro';
import { guard } from '../../../lib/tend/auth';
import { Refused, fail, json, readJson, refuse } from '../../../lib/tend/http';
import { MAX_FILES, NOW_PATH, isAllowed, isData, isDeletable, isPostImage, isPostText, isRecord, isWorkImage, isWorkText, pageFor, workSlug } from '../../../lib/tend/paths';
import { Fields, Place, WorkFields, compact, kindProblem, markdown, validateData, workMarkdown } from '../../../lib/tend/shapes';
import { recordsFor } from '../../../lib/tend/records';
import { store, type CommitFile } from '../../../lib/tend/store';

export const prerender = false;

const BODY_MAX = 200_000;

type Page = { dir: string; srcs: string[] };

/** { fields, body } from the client, or Refused(400). */
function markdownPart(f: Record<string, unknown>, key: 'post' | 'work') {
  const part = f[key] as Record<string, unknown> | undefined;
  if (!part || typeof part !== 'object' || typeof part.body !== 'string' || part.body.length > BODY_MAX) throw new Refused(400);
  const fields = part.fields ?? {};
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Refused(400);
  return { fields: fields as Record<string, unknown>, body: part.body };
}

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
    const pages: Page[] = [];
    let place: string | undefined;
    for (const f of files) {
      if (!f || typeof f !== 'object') throw new Refused(400);
      const { path } = f as Record<string, unknown>;
      if (typeof path !== 'string' || seen.has(path)) throw new Refused(400);
      seen.add(path);
      /* `place` belongs to now.json alone, and is held to one short line */
      const rawPlace = (f as Record<string, unknown>).place;
      if (rawPlace !== undefined) {
        if (path !== NOW_PATH) throw new Refused(400);
        place = Place.parse(rawPlace);
      }
      if (isPostText(path)) {
        const post = markdownPart(f as Record<string, unknown>, 'post');
        const fields = Fields.parse(compact(post.fields));
        /* what the kind must carry, and what belongs to one kind only (Amendment 1) */
        const problem = kindProblem(fields, post.body);
        if (problem) {
          console.error('[tend] commit refused:', problem);
          throw new Refused(400, 'Didn’t work.');
        }
        out.push({ path, content: markdown(fields, post.body) });
      } else if (isWorkText(path)) {
        const page = markdownPart(f as Record<string, unknown>, 'work');
        const fields = WorkFields.parse(compact(page.fields));
        out.push({ path, content: workMarkdown(fields, page.body) });
        pages.push({ dir: `src/content/work/${workSlug(path)}/`, srcs: fields.examples.map((e) => e.src.slice(2)) });
      } else if (isData(path)) {
        const text = (f as Record<string, unknown>).text;
        if (typeof text !== 'string' || text.length > 1_000_000) throw new Refused(400);
        out.push({ path, content: validateData(path, text) });
      } else if (isPostImage(path) || isWorkImage(path)) {
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

    /* A page that names a screenshot which won't be there would break the build: refuse it here. */
    const s = store();
    for (const page of pages) {
      if (!page.srcs.length) continue;
      const there = new Set((await s.siblings(page.dir.replace(/\/$/, ''))).map((n) => page.dir + n));
      for (const f of out) if (f.sha) there.add(f.path);
      for (const g of gone) there.delete(g);
      if (page.srcs.some((n) => !there.has(page.dir + n))) throw new Refused(400);
    }

    /* the records: built here from the validated files, then held to the same allowlist and cap */
    const records = await recordsFor(s, out, { place });
    const all = [...out, ...records];
    if (all.length + gone.length > MAX_FILES) throw new Refused(400);
    for (const f of all) if (!isAllowed(f.path) && !isRecord(f.path)) throw new Refused(400);
    for (const f of records) if (!isRecord(f.path) || f.content === undefined) throw new Refused(400);

    const { commit } = await s.commit(`tend: ${message}`, all, gone);
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
