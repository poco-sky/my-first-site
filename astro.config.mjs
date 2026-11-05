// @ts-check
import { defineConfig } from 'astro/config';

import preact from "@astrojs/preact";

export default defineConfig({
  site: "https://sora.sky-me.workers.dev",
  vite: { server: { allowedHosts: ["terminal.local"] } },
  integrations: [preact()]
});