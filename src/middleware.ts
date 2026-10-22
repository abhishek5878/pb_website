/**
 * Two guards for the on-demand routes (security review):
 *
 * - GHSA-mr6q (@astrojs/vercel 9.0.5): a request carrying an `x-astro-path`
 *   header or an `x_astro_path` query param is how the adapter's edge rewrite
 *   addresses the Node function; nobody else may use it. 400.
 * - /tend and /api/tend never render in a frame.
 *
 * Prerendered pages pass through untouched at build time.
 */
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // Prerendered pages are built ahead of time; there is no request to inspect.
  if (context.isPrerendered) return next();
  const { request, url } = context;
  if (request.headers.has('x-astro-path') || url.searchParams.has('x_astro_path')) {
    return new Response('No.', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const response = await next();
  if (url.pathname === '/tend/' || url.pathname.startsWith('/api/tend/')) {
    try {
      response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
      response.headers.set('X-Frame-Options', 'DENY');
    } catch {
      /* an immutable response (a redirect from the platform); the routes set the headers themselves too */
    }
  }
  return response;
});
