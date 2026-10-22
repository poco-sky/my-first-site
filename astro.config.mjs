// @ts-check
import { defineConfig } from 'astro/config';

import preact from "@astrojs/preact";

// https://astro.build/config
export default defineConfig({
  site: "https://my-site-atelier-20261023.blackshore33.chatgpt.site",
  vite: { server: { allowedHosts: ["terminal.local"] } },
  integrations: [preact()]
});