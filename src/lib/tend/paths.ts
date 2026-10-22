/**
 * The path allowlist (tend-spec, Security 3). Everything a write may touch
 * matches one of these shapes; anything else, any `..`, absolute path or
 * backslash is refused. Deletes are allowed only for post paths and for the
 * images beside a project's page.
 */
const POST_MD = /^src\/content\/posts\/[a-z0-9-]+\.md$/;
const POST_INDEX = /^src\/content\/posts\/[a-z0-9-]+\/index\.md$/;
/* writes: the spec's shape, JPEG or WebP only */
const POST_IMAGE = /^src\/content\/posts\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|webp)$/;
/* deletes: png and jpeg too, so a Substack import's folder can be deleted whole (review L4) */
const POST_IMAGE_GONE = /^src\/content\/posts\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|jpeg|webp|png)$/;
const DATA = /^src\/data\/(taste|now|projects)\.json$/;
/* a project's page (docs/design/work-pages.md): its index.md, and screenshots beside it */
const WORK_INDEX = /^src\/content\/work\/[a-z0-9-]+\/index\.md$/;
/* writes: JPEG or WebP, as for posts */
const WORK_IMAGE = /^src\/content\/work\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|webp)$/;
/* deletes: png too, since the screenshots already there are PNG. Never the page itself. */
const WORK_IMAGE_GONE = /^src\/content\/work\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|webp|png)$/;

export const MAX_FILES = 40;

const sane = (p: unknown): p is string =>
  typeof p === 'string' &&
  p.length > 0 &&
  p.length <= 200 &&
  !p.includes('..') &&
  !p.includes('\\') &&
  !p.startsWith('/') &&
  !/[\0\r\n]/.test(p);

export const isPostText = (p: unknown): p is string => sane(p) && (POST_MD.test(p) || POST_INDEX.test(p));
export const isPostImage = (p: unknown): p is string => sane(p) && POST_IMAGE.test(p);
export const isData = (p: unknown): p is string => sane(p) && DATA.test(p);
export const isWorkText = (p: unknown): p is string => sane(p) && WORK_INDEX.test(p);
export const isWorkImage = (p: unknown): p is string => sane(p) && WORK_IMAGE.test(p);
export const isAllowed = (p: unknown): p is string => isPostText(p) || isPostImage(p) || isData(p) || isWorkText(p) || isWorkImage(p);
export const isDeletable = (p: unknown): p is string =>
  isPostText(p) || (sane(p) && (POST_IMAGE_GONE.test(p) || WORK_IMAGE_GONE.test(p)));

/** "src/content/posts/2026-10-22-pushkar/index.md" → "2026-10-22-pushkar" (the collection id). */
export const postId = (p: string) =>
  p
    .replace(/^src\/content\/posts\//, '')
    .replace(/\/index\.md$/, '')
    .replace(/\.md$/, '');

/** "src/content/work/rocky/index.md" or ".../rocky/shot-1.png" → "rocky" (the project's slug). */
export const workSlug = (p: string) => p.split('/')[3];

/** The public page a write changes. (Read off the path's segments: the guards above would narrow a string to never.) */
export function pageFor(path: string): string {
  const [, , kind, name] = path.split('/');
  if (kind === 'work') return `/work/${name}/`;
  if (kind === 'posts') return `/writing/${path.endsWith('.md') ? postId(path) : name}/`;
  if (path.endsWith('taste.json')) return '/taste/';
  if (path.endsWith('projects.json')) return '/work/';
  return '/';
}
