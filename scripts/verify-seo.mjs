import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const origin = process.argv[2] ?? 'http://localhost:4321';
const routes = readdirSync(new URL('../src/pages/', import.meta.url))
  .filter((file) => file.endsWith('.astro'))
  .map((file) => (file === 'index.astro' ? '/' : `/${file.replace('.astro', '')}/`));
const titles = new Set();
const descriptions = new Set();
const pages = new Map();
const fetchPage = (url, options = {}) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200);
assert.match(sitemapResponse.headers.get('content-type') ?? '', /(?:application|text)\/xml/);
const sitemap = await sitemapResponse.text();
assert.ok(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
assert.ok(sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'));
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual(
  [...sitemapUrls].sort(),
  routes.map((route) => `https://cseed.co${route}`).sort(),
  'sitemap must contain exactly the public canonical pages, without duplicates',
);
const guideResponse = await fetch(`${origin}/llms.txt`);
assert.equal(guideResponse.status, 200);
const guide = await guideResponse.text();

for (const route of routes) {
  const response = await fetch(`${origin}${route}?utm_source=seo-check`);
  assert.equal(response.status, 200, route);
  assert.ok(
    !/noindex/i.test(response.headers.get('x-robots-tag') ?? ''),
    `${route}: indexable headers`,
  );
  const html = await response.text();
  pages.set(route, html);
  assert.ok(
    !/Bundled Page|missing bundle data|__bundler\/manifest|This page requires JavaScript to display/i.test(
      html,
    ),
    `${route}: no bundled-page fallback`,
  );
  assert.equal(
    (html.match(/<h1\b/g) ?? []).length,
    1,
    `${route}: one server-rendered main heading`,
  );
  assert.match(html, /<html\b[^>]*\blang="en"/);
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/)?.[1];
  assert.ok(head, `${route}: head`);
  const title = head.match(/<title>(.*?)<\/title>/)?.[1];
  const description = head.match(/name="description" content="([^"]+)"/)?.[1];
  assert.ok(title && description, `${route}: title and description`);
  const pageName = route.slice(1, -1).replaceAll('-', ' ');
  assert.equal(title, route === '/' ? 'cseed' : `cseed | ${pageName}`, `${route}: tab title`);
  assert.match(head, /rel="icon" href="\/icon-192\.png" type="image\/png" sizes="192x192"/);
  assert.ok(!titles.has(title) && !descriptions.has(description), `${route}: unique metadata`);
  titles.add(title);
  descriptions.add(description);
  assert.equal((head.match(/<title>/g) ?? []).length, 1);
  assert.equal((head.match(/name="description"/g) ?? []).length, 1);
  assert.ok(head.includes(`rel="canonical" href="https://cseed.co${route}"`));
  assert.ok(head.includes('max-image-preview:large'));
  assert.ok(
    !/name="(?:robots|googlebot|bingbot)"[^>]*content="[^"]*(?:noindex|nofollow|nosnippet|none)/i.test(
      head,
    ),
    `${route}: no restrictive search directives`,
  );
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
  if (route === '/') {
    for (const target of routes.filter((path) => path !== '/')) {
      assert.ok(html.includes(`href="${target}"`), `${target}: linked from homepage`);
    }
    assert.match(html, /href="\/buildher\/"[^>]*>\s*buildher\s*<\/a>/);
  }
  for (const userAgent of ['Googlebot', 'bingbot']) {
    const crawler = await fetchPage(`${origin}${route}`, { headers: { 'User-Agent': userAgent } });
    assert.equal(crawler.status, 200, `${route}: ${userAgent}`);
    const crawlerHtml = await crawler.text();
    assert.equal(crawlerHtml.match(/<title>(.*?)<\/title>/)?.[1], title, `${route}: crawler title`);
    assert.ok(
      !/missing bundle data|__bundler\/manifest|Bundled Page/.test(crawlerHtml),
      `${route}: crawler content`,
    );
    assert.match(crawlerHtml, /<h1\b/);
  }
}
// Text notices are valid link destinations, but are not HTML pages or sitemap entries.
const textDocuments = new Map([
  ['/license.txt', '../LICENSE'],
  ['/content-notice.txt', '../CONTENT-NOTICE.md'],
]);
for (const [path, source] of textDocuments) {
  const response = await fetchPage(`${origin}${path}`);
  assert.equal(response.status, 200, `${path}: text document available`);
  assert.match(response.headers.get('content-type') ?? '', /^text\/plain\b/i);
  assert.equal(
    await response.text(),
    readFileSync(new URL(source, import.meta.url), 'utf8'),
    `${path}: serves the current repository notice`,
  );
}
// Check actual anchor destinations, including section fragments, without crawling external sites.
for (const [route, html] of pages) {
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const target = new URL(match[1].replaceAll('&amp;', '&'), `https://cseed.co${route}`);
    if (target.origin !== 'https://cseed.co') continue;
    if (textDocuments.has(target.pathname)) {
      assert.equal(target.hash, '', `${route}: text document link has no HTML anchor`);
      continue;
    }
    const targetHtml = pages.get(target.pathname);
    assert.ok(targetHtml, `${route}: internal link targets a known page: ${target.href}`);
    if (target.hash) {
      assert.ok(
        targetHtml.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`),
        `${route}: missing anchor ${target.href}`,
      );
    }
  }
}
const sitemapImages = [...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(
  (match) => match[1],
);
assert.ok(sitemapImages.length > 0, 'image discovery entries');
for (const image of new Set(sitemapImages)) {
  const url = new URL(image);
  assert.equal(url.origin, 'https://cseed.co');
  const response = await fetchPage(`${origin}${url.pathname}`);
  assert.equal(response.status, 200, `${image}: sitemap image available`);
  assert.match(response.headers.get('content-type') ?? '', /^image\//);
  await response.arrayBuffer();
}
const missing = await fetchPage(`${origin}/seo-audit-page-that-does-not-exist/`);
assert.equal(missing.status, 404, 'missing pages must not return a soft 404');
const iconResponse = await fetch(`${origin}/icon-192.png`);
assert.equal(iconResponse.status, 200, 'PNG favicon available');
assert.match(iconResponse.headers.get('content-type') ?? '', /image\/png/);
const icon = Buffer.from(await iconResponse.arrayBuffer());
assert.equal(icon.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'valid PNG');
assert.equal(icon.readUInt32BE(16), 192, 'favicon width');
assert.equal(icon.readUInt32BE(20), 192, 'favicon height');
assert.equal((sitemap.match(/<loc>/g) ?? []).length, routes.length);
const robotsResponse = await fetch(`${origin}/robots.txt`);
assert.equal(robotsResponse.status, 200);
const robots = await robotsResponse.text();
assert.ok(robots.includes('Sitemap: https://cseed.co/sitemap.xml'));
for (const bot of ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot']) {
  assert.ok(robots.includes(`User-agent: ${bot}`));
}
assert.match(robots, /User-agent: GPTBot\s+User-agent: ClaudeBot\s+Disallow: \//);
// Production only: Cloudflare must permanently redirect HTTP and www to the canonical origin,
// and public/_redirects must send old site URLs to current pages (astro dev ignores it).
if (origin === 'https://cseed.co') {
  for (const source of ['http://cseed.co', 'http://www.cseed.co', 'https://www.cseed.co']) {
    for (const path of ['/', '/buildher/?utm_source=seo-check']) {
      const response = await fetchPage(`${source}${path}`, { redirect: 'manual' });
      assert.equal(response.status, 301, `${source}${path}: permanent redirect`);
      assert.equal(response.headers.get('location'), `https://cseed.co${path}`, `${source}${path}`);
    }
  }
  const legacyRedirects = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.trim().split(/\s+/));
  for (const [from, to, status] of legacyRedirects) {
    assert.ok(routes.includes(to), `${from}: redirects to a public page`);
    const response = await fetchPage(`${origin}${from}`, { redirect: 'manual' });
    assert.equal(response.status, Number(status), `${from}: legacy redirect status`);
    assert.equal(new URL(response.headers.get('location'), origin).href, `${origin}${to}`, from);
  }
}
console.log(
  `SEO verification passed for ${routes.length} pages, Googlebot/Bingbot responses, internal links, ${textDocuments.size} text notices, ${sitemapImages.length} sitemap images, favicon, 404, AI guide, and robots.txt.`,
);
