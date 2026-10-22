/**
 * Server-only env for /tend (docs/design/tend-spec.md, "Infra").
 *
 * Read through astro:env's getSecret(): in dev that is the loaded .env (and the
 * shell); in a build it is process.env at request time, so no value is ever
 * inlined into the server bundle (security review H2). Never write a bare
 * `import.meta.env` in a server module: Astro's dev plugin would inline every
 * private value named in that file. Never import this from client code.
 */
import { getSecret } from 'astro:env/server';

export type EnvName = 'GITHUB_TOKEN' | 'GITHUB_REPO' | 'GITHUB_BRANCH' | 'TEND_PASSPHRASE' | 'TEND_SECRET' | 'DEPLOY_HOOK_URL' | 'CRON_SECRET' | 'TEND_MOCK';

export function env(name: EnvName): string | undefined {
  const v = getSecret(name);
  if (v === undefined || v === null || v === '') return undefined;
  return typeof v === 'string' ? v : String(v);
}

/** Local only: writes go to the working tree instead of GitHub. Dead code outside `astro dev`. */
export const isMock = () => import.meta.env.DEV && env('TEND_MOCK') === '1';
export const repo = () => env('GITHUB_REPO') ?? 'abhishek5878/pb_website';
export const branch = () => env('GITHUB_BRANCH') ?? 'main';
