// @ts-check
import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://cseed.co',
  trailingSlash: 'always',
  // Fully static build; output lands in `dist/`.
  output: 'static',
});
