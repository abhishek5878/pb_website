/**
 * Where saves go (tend-spec, "GitHub writes"). One interface, two stores:
 *
 * - github: the Git Data API. A save is one commit on `main`: blobs for images,
 *   a tree on the base tree, a commit, a fast-forward ref update (retried once
 *   from the new head on 422).
 * - mock (TEND_MOCK=1, local only): the same paths in the working tree, so the
 *   result shows in `astro dev`. Blobs wait in .astro/tend-mock/blobs/<sha>.
 *
 * Paths are already checked by the routes (paths.ts); the stores trust them.
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { branch, env, isMock, repo } from './env';
import { parseMarkdown } from './shapes';
import { postId } from './paths';

export type CommitFile = { path: string; content?: string; sha?: string };

export type PostMeta = {
  id: string;
  path: string;
  kind?: string;
  title?: string;
  subject?: string;
  by?: string;
  date?: string;
  draft: boolean;
  images: number;
};

/** A read of a file that isn't there (a project whose page isn't written yet). */
export class Missing extends Error {}

export interface Store {
  /** Throws Missing when the file isn't there. */
  read(path: string): Promise<string>;
  /** The files beside a folder post's index.md (names only), so a delete can take the whole folder. */
  siblings(dir: string): Promise<string[]>;
  list(): Promise<PostMeta[]>;
  /** The slugs that have a page: folders under src/content/work/ holding an index.md. */
  pages(): Promise<string[]>;
  blob(bytes: Buffer): Promise<{ sha: string }>;
  commit(message: string, files: CommitFile[], deletes: string[]): Promise<{ commit: string }>;
}

export const store = (): Store => (isMock() ? mock() : github());

const POSTS = 'src/content/posts/';
const WORK = 'src/content/work/';
const PAGE = /^src\/content\/work\/([a-z0-9-]+)\/index\.md$/;

function meta(path: string, text: string): PostMeta {
  const { fields } = parseMarkdown(text);
  const s = (v: unknown) => (typeof v === 'string' ? v : undefined);
  return {
    id: postId(path),
    path,
    kind: s(fields.kind),
    title: s(fields.title),
    subject: s(fields.subject),
    by: s(fields.by),
    date: s(fields.date),
    draft: fields.draft === true,
    images: Array.isArray(fields.images) ? fields.images.length : 0,
  };
}

/** A post is a .md under posts/ with no `_` segment, at most one folder deep. */
const isPostPath = (p: string) => /^src\/content\/posts\/[a-z0-9-]+(\/index)?\.md$/.test(p);

const newestFirst = (a: PostMeta, b: PostMeta) => (b.date ?? '').localeCompare(a.date ?? '') || b.id.localeCompare(a.id);

/* ---------- mock: the working tree ---------- */

function mock(): Store {
  const root = resolve(process.cwd());
  const blobs = join(root, '.astro', 'tend-mock', 'blobs');
  /** Resolve inside the project, never outside it. */
  const at = (p: string) => {
    const full = resolve(root, p);
    if (!full.startsWith(root + sep)) throw new Error('outside root');
    return full;
  };
  const gitSha = (bytes: Buffer) =>
    createHash('sha1')
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest('hex');

  return {
    async read(p) {
      try {
        return await fs.readFile(at(p), 'utf8');
      } catch (e) {
        if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') throw new Missing(p);
        throw e;
      }
    },
    async siblings(dir) {
      try {
        return (await fs.readdir(at(dir), { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);
      } catch {
        return [];
      }
    },
    async list() {
      const dir = at(POSTS);
      const out: PostMeta[] = [];
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        if (e.name.startsWith('_')) continue;
        const rel = POSTS + e.name + (e.isDirectory() ? '/index.md' : '');
        if (!isPostPath(rel)) continue;
        try {
          out.push(meta(rel, await fs.readFile(at(rel), 'utf8')));
        } catch {}
      }
      return out.sort(newestFirst);
    },
    async pages() {
      let entries;
      try {
        entries = await fs.readdir(at(WORK), { withFileTypes: true });
      } catch {
        return [];
      }
      const out: string[] = [];
      for (const e of entries) {
        const rel = `${WORK}${e.name}/index.md`;
        if (!e.isDirectory() || !PAGE.test(rel)) continue;
        try {
          await fs.access(at(rel));
          out.push(e.name);
        } catch {}
      }
      return out.sort();
    },
    async blob(bytes) {
      const sha = gitSha(bytes);
      await fs.mkdir(blobs, { recursive: true });
      await fs.writeFile(join(blobs, sha), bytes);
      return { sha };
    },
    async commit(message, files, deletes) {
      for (const f of files) {
        const full = at(f.path);
        await fs.mkdir(dirname(full), { recursive: true });
        if (f.content !== undefined) await fs.writeFile(full, f.content, 'utf8');
        else if (f.sha) await fs.copyFile(join(blobs, f.sha), full);
      }
      for (const p of deletes) {
        await fs.rm(at(p), { force: true });
        const d = dirname(at(p));
        if (d !== at(POSTS).replace(/\/$/, '') && d !== at(WORK).replace(/\/$/, '')) {
          try {
            if ((await fs.readdir(d)).length === 0) await fs.rmdir(d);
          } catch {}
        }
      }
      console.log(`[tend mock] ${message}: ${files.length} written, ${deletes.length} deleted`);
      return { commit: 'mock-' + Date.now().toString(36) };
    },
  };
}

/* ---------- github: the Git Data API ---------- */

class GitHubError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function github(): Store {
  const token = env('GITHUB_TOKEN');
  const base = `https://api.github.com/repos/${repo()}`;
  const ref = branch();

  async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    if (!token) throw new Error('GITHUB_TOKEN missing');
    const res = await fetch(base + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'vyas.garden tend',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new GitHubError(res.status, `${init.method ?? 'GET'} ${path} → ${res.status}`);
    return res.json() as Promise<T>;
  }

  const fromBase64 = (s: string) => Buffer.from(s.replace(/\n/g, ''), 'base64').toString('utf8');

  async function readAt(path: string): Promise<string> {
    let file: { content?: string; encoding?: string };
    try {
      file = await api(`/contents/${path}?ref=${encodeURIComponent(ref)}`);
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) throw new Missing(path);
      throw e;
    }
    if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new Error('unexpected contents payload');
    return fromBase64(file.content);
  }

  return {
    read: readAt,
    async siblings(dir) {
      try {
        const entries = await api<{ name: string; type: string }[]>(`/contents/${dir}?ref=${encodeURIComponent(ref)}`);
        return Array.isArray(entries) ? entries.filter((e) => e.type === 'file').map((e) => e.name) : [];
      } catch {
        return [];
      }
    },
    async list() {
      const tree = await api<{ tree: { path: string; type: string; sha: string }[]; truncated: boolean }>(
        `/git/trees/${encodeURIComponent(ref)}?recursive=1`
      );
      const posts = tree.tree.filter((t) => t.type === 'blob' && isPostPath(t.path)).slice(0, 300);
      const out: PostMeta[] = [];
      // ten at a time: each post is one blob fetch
      for (let i = 0; i < posts.length; i += 10) {
        const batch = posts.slice(i, i + 10);
        const texts = await Promise.all(
          batch.map((t) => api<{ content: string }>(`/git/blobs/${t.sha}`).then((b) => fromBase64(b.content)).catch(() => null))
        );
        batch.forEach((t, j) => {
          if (texts[j] !== null) out.push(meta(t.path, texts[j]!));
        });
      }
      return out.sort(newestFirst);
    },
    async pages() {
      const tree = await api<{ tree: { path: string; type: string }[] }>(`/git/trees/${encodeURIComponent(ref)}?recursive=1`);
      const out: string[] = [];
      for (const t of tree.tree) {
        const m = t.type === 'blob' ? PAGE.exec(t.path) : null;
        if (m) out.push(m[1]);
      }
      return out.sort();
    },
    async blob(bytes) {
      const { sha } = await api<{ sha: string }>('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({ content: bytes.toString('base64'), encoding: 'base64' }),
      });
      return { sha };
    },
    async commit(message, files, deletes) {
      const attempt = async () => {
        const head = await api<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(ref)}`);
        const parent = head.object.sha;
        const baseCommit = await api<{ tree: { sha: string } }>(`/git/commits/${parent}`);
        const tree = [
          ...files.map((f) =>
            f.content !== undefined
              ? { path: f.path, mode: '100644', type: 'blob', content: f.content }
              : { path: f.path, mode: '100644', type: 'blob', sha: f.sha }
          ),
          ...deletes.map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null })),
        ];
        const newTree = await api<{ sha: string }>('/git/trees', {
          method: 'POST',
          body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
        });
        const commit = await api<{ sha: string }>('/git/commits', {
          method: 'POST',
          body: JSON.stringify({ message, tree: newTree.sha, parents: [parent] }),
        });
        await api(`/git/refs/heads/${encodeURIComponent(ref)}`, {
          method: 'PATCH',
          body: JSON.stringify({ sha: commit.sha, force: false }),
        });
        return { commit: commit.sha };
      };
      try {
        return await attempt();
      } catch (e) {
        // someone else moved main meanwhile: once more from the new head
        if (e instanceof GitHubError && e.status === 422) return attempt();
        throw e;
      }
    },
  };
}
