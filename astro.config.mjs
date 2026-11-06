// @ts-check
import { defineConfig } from 'astro/config';

import preact from "@astrojs/preact";

import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://sora.sky-me.workers.dev",
  vite: { server: { allowedHosts: ["terminal.local"] } },
  integrations: [preact(), sitemap()]
});