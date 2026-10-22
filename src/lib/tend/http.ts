/**
 * Small HTTP helpers for the /tend routes. Errors to the client are generic;
 * details go to the server log only (tend-spec, Security 2).
 */
export class Refused extends Error {
  constructor(
    public status: number,
    message = 'No.'
  ) {
    super(message);
  }
}

/** Never cached, never framed (review L7; src/middleware.ts sets the frame headers too). */
export const FRAME = { 'Content-Security-Policy': "frame-ancestors 'none'", 'X-Frame-Options': 'DENY' };
const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...FRAME };

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...HEADERS, ...headers } });

export const fail = (status: number, error = 'No.') => json({ error }, status);

export const empty = (headers: Record<string, string> = {}) =>
  new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', ...FRAME, ...headers } });

/** The request body as JSON, capped. Throws Refused(400) on anything else. */
export async function readJson(request: Request, limit = 6_000_000): Promise<Record<string, unknown>> {
  const len = Number(request.headers.get('content-length') ?? 0);
  if (len > limit) throw new Refused(413);
  let text: string;
  try {
    text = await request.text();
  } catch {
    throw new Refused(400);
  }
  if (text.length > limit) throw new Refused(413);
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object');
    return v as Record<string, unknown>;
  } catch {
    throw new Refused(400);
  }
}

/** Log the detail server-side; answer the client with nothing it can use. */
export function refuse(where: string, err: unknown): Response {
  if (err instanceof Refused) return fail(err.status, err.message);
  console.error(`[tend] ${where}:`, err instanceof Error ? (err.stack ?? err.message) : err);
  return fail(500, 'Didn’t work.');
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
