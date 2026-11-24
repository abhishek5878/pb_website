import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://vyas.garden',
  trailingSlash: 'always',
  // Every page stays prerendered. The adapter serves only the routes that opt out
  // (`export const prerender = false`): /tend and /api/*, the publishing room.
  output: 'static',
  adapter: vercel(),
  // /tend is private: not in the sitemap, not linked, noindex (src/layouts/Tend.astro).
  // Removed project pages forward elsewhere (src/layouts/Forward.astro); they stay out of the sitemap.
  integrations: [
    sitemap({
      filter: (page) =>
        !/\/(tend|api)\//.test(page) &&
        !/\/work\/(voice-instrument|rocky|apexy|sizing|pitchrobin|micro-pe|market-data|devflow|warehouses|vc-scrapers|glp1|sentinel)\/$/.test(page),
    }),
  ],
  // His posts render exactly as typed: no curly-quote or "..." → "…" rewriting.
  markdown: { smartypants: false },
  devToolbar: { enabled: false },
});
