/**
 * POST /api/tend/read/ { path } →
 *   a post as { path, fields, body, files },
 *   a project's page as { path, fields, body, files, missing }, or
 *   a data file as { path, data }.
 * Only allowlisted text paths (tend-spec, Security 3); never images.
 * A project page that isn't written yet comes back empty with `missing: true`.
 */
import type { APIRoute } from 'astro';
import { guard } from '../../../lib/tend/auth';
import { Refused, fail, json, readJson, refuse } from '../../../lib/tend/http';
import { isData, isPostText, isWorkText } from '../../../lib/tend/paths';
import { parseMarkdown } from '../../../lib/tend/shapes';
import { Missing, store } from '../../../lib/tend/store';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    guard(request);
    const { path } = await readJson(request, 10_000);
    if (isPostText(path)) {
      const s = store();
      const text = await s.read(path);
      const { fields, body } = parseMarkdown(text);
      // a folder post: the files beside index.md, so a delete can take them too
      const files = path.endsWith('/index.md') ? (await s.siblings(path.replace(/\/index\.md$/, ''))).filter((n) => n !== 'index.md') : [];
      return json({ path, fields, body, files });
    }
    if (isWorkText(path)) {
      const s = store();
      const dir = path.replace(/\/index\.md$/, '');
      let text: string;
      try {
        text = await s.read(path);
      } catch (e) {
        if (e instanceof Missing) return json({ path, fields: {}, body: '', files: [], missing: true });
        throw e;
      }
      const { fields, body } = parseMarkdown(text);
      // the screenshots beside it, so a new one never takes a name that's already there
      const files = (await s.siblings(dir)).filter((n) => n !== 'index.md');
      return json({ path, fields, body, files, missing: false });
    }
    if (isData(path)) {
      const text = await store().read(path);
      return json({ path, data: JSON.parse(text) });
    }
    throw new Refused(400);
  } catch (e) {
    return refuse('read', e);
  }
};

export const ALL: APIRoute = () => fail(405);
