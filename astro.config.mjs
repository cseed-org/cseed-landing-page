// @ts-check
import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // Used to generate absolute URLs (sitemap, canonical tags, og:image).
  // Change this to the real domain before going to production.
  site: 'https://cseed.example.edu',

  // Static build. Output lands in `dist/`, which the Cloudflare Worker
  // serves through its ASSETS binding — see docs/deploy-pipeline.md.
  output: 'static',

  image: {
    // Every <Image /> without an explicit layout gets a responsive srcset
    // that scales down to its container. Override per-image with layout="full-width".
    layout: 'constrained',
  },

  devToolbar: {
    enabled: false,
  },
});
