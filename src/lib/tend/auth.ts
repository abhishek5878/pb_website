/**
 * The door to /tend (tend-spec, Security 1–2; security review M1, L3, cookie name).
 *
 * Login compares SHA-256 digests with timingSafeEqual. A session is a cookie
 * `__Host-tend=<base64url({exp})>.<base64url(HMAC-SHA256(key, payload))>`,
 * HttpOnly, Secure, SameSite=Strict, Path=/, no Domain, 14 days. The key is
 * derived from both secrets, HMAC(TEND_SECRET, 'tend-v1:' + TEND_PASSPHRASE),
 * so changing the passphrase logs every session out. Every write route goes
 * through guard(): POST, JSON, an Origin that is this site, and a live session.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env';
import { Refused } from './http';

const COOKIE = '__Host-tend';
const MAX_AGE = 1209600; // 14 days
const ATTRS = 'HttpOnly; Secure; SameSite=Strict; Path=/';
const SITE = 'https://vyas.garden';
const MIN_SECRET_BYTES = 32;

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest();

/** Both secrets, present and long enough, or the room refuses to work (500, logged). */
function secrets(): { secret: string; passphrase: string } {
  const secret = env('TEND_SECRET');
  const passphrase = env('TEND_PASSPHRASE');
  if (!secret || Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES || !passphrase) {
    console.error('[tend] TEND_SECRET must be at least 32 bytes and TEND_PASSPHRASE set');
    throw new Refused(500, 'Didn’t work.');
  }
  return { secret, passphrase };
}

/** The signing key: HMAC(TEND_SECRET, 'tend-v1:' + TEND_PASSPHRASE). */
const signingKey = () => {
  const { secret, passphrase } = secrets();
  return createHmac('sha256', secret).update('tend-v1:' + passphrase, 'utf8').digest();
};
const sign = (payload: string) => createHmac('sha256', signingKey()).update(payload, 'utf8').digest();

/** True only when the passphrase is his. Constant time. Throws Refused(500) if the room isn't configured. */
export function passphraseMatches(given: string): boolean {
  const { passphrase } = secrets();
  return timingSafeEqual(sha256(given), sha256(passphrase));
}

export function sessionCookie(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE * 1000 }), 'utf8').toString('base64url');
  const sig = sign(payload).toString('base64url');
  return `${COOKIE}=${payload}.${sig}; ${ATTRS}; Max-Age=${MAX_AGE}`;
}

export const clearedCookie = () => `${COOKIE}=; ${ATTRS}; Max-Age=0`;

function cookieValue(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE) return rest.join('=');
  }
  return null;
}

/** Signature checked in constant time, then `exp` must be in the future. False (never a throw) when unconfigured. */
export function hasSession(request: Request): boolean {
  const v = cookieValue(request);
  if (!v || v.length > 400) return false;
  const dot = v.indexOf('.');
  if (dot < 1) return false;
  const payload = v.slice(0, dot);
  const given = Buffer.from(v.slice(dot + 1), 'base64url');
  let want: Buffer;
  try {
    want = sign(payload);
  } catch {
    return false;
  }
  if (given.length !== want.length || !timingSafeEqual(given, want)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

/** The Origin header must be the site itself; in `astro dev` only, a loopback origin too. Host headers are not consulted. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  if (origin === SITE) return true;
  if (import.meta.env.DEV) {
    try {
      const u = new URL(origin);
      return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * The gate for every /api/tend route. Throws Refused: 405 for the wrong method,
 * 403 for a missing/foreign Origin or a non-JSON body, 401 for no session.
 */
export function guard(request: Request, { session = true }: { session?: boolean } = {}): void {
  if (request.method !== 'POST') throw new Refused(405);
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) throw new Refused(403);
  if (!sameOrigin(request)) throw new Refused(403);
  if (session && !hasSession(request)) throw new Refused(401);
}
