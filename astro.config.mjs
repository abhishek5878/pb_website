import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vyas.garden',
  trailingSlash: 'always',
  integrations: [sitemap()],
  // His posts render exactly as typed: no curly-quote or "..." → "…" rewriting.
  markdown: { smartypants: false },
  devToolbar: { enabled: false },
});
