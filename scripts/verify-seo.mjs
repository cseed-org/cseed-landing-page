import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';

const origin = process.argv[2] ?? 'http://localhost:4321';
const routes = readdirSync(new URL('../src/pages/', import.meta.url))
  .filter((file) => file.endsWith('.astro'))
  .map((file) => (file === 'index.astro' ? '/' : `/${file.replace('.astro', '')}/`));
const titles = new Set();
const descriptions = new Set();
const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200);
const sitemap = await sitemapResponse.text();
const guideResponse = await fetch(`${origin}/llms.txt`);
assert.equal(guideResponse.status, 200);
const guide = await guideResponse.text();

for (const route of routes) {
  const response = await fetch(`${origin}${route}?utm_source=seo-check`);
  assert.equal(response.status, 200, route);
  const html = await response.text();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/)?.[1];
  assert.ok(head, `${route}: head`);
  const title = head.match(/<title>(.*?)<\/title>/)?.[1];
  const description = head.match(/name="description" content="([^"]+)"/)?.[1];
  assert.ok(title && description, `${route}: title and description`);
  assert.ok(!titles.has(title) && !descriptions.has(description), `${route}: unique metadata`);
  titles.add(title);
  descriptions.add(description);
  assert.equal((head.match(/<title>/g) ?? []).length, 1);
  assert.equal((head.match(/name="description"/g) ?? []).length, 1);
  assert.ok(head.includes(`rel="canonical" href="https://cseed.co${route}"`));
  assert.ok(head.includes('max-image-preview:large'));
  assert.ok(head.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(head.includes(`property="og:url" content="https://cseed.co${route}"`));
  const image = head.match(/property="og:image" content="([^"]+)"/)?.[1];
  assert.ok(image?.startsWith('https://cseed.co/'));
  assert.ok(existsSync(new URL(`../public${new URL(image).pathname}`, import.meta.url)));
  const json = head.match(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
  )?.[1];
  const graph = JSON.parse(json)['@graph'];
  assert.ok(graph.some((node) => node['@type'] === 'Organization' && node.sameAs.length === 3));
  assert.ok(graph.some((node) => node['@type'] === 'WebSite'));
  assert.ok(graph.some((node) => node['@id'] === `https://cseed.co${route}#webpage`));
  if (route !== '/') assert.ok(graph.some((node) => node['@type'] === 'BreadcrumbList'));
  assert.ok(sitemap.includes(`<loc>https://cseed.co${route}</loc>`), `${route}: sitemap inclusion`);
  assert.ok(guide.includes(`https://cseed.co${route}`), `${route}: guide inclusion`);
}
assert.equal((sitemap.match(/<loc>/g) ?? []).length, routes.length);
const robotsResponse = await fetch(`${origin}/robots.txt`);
assert.equal(robotsResponse.status, 200);
const robots = await robotsResponse.text();
assert.ok(robots.includes('Sitemap: https://cseed.co/sitemap.xml'));
for (const bot of ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot']) {
  assert.ok(robots.includes(`User-agent: ${bot}`));
}
assert.match(robots, /User-agent: GPTBot\s+User-agent: ClaudeBot\s+Disallow: \//);
console.log(
  `SEO verification passed for ${routes.length} pages, sitemap, AI guide, and robots.txt.`,
);
