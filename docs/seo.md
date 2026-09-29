# Search and AI discovery

Canonical origin: `https://cseed.co`. All seven public pages use trailing slashes.

## Maintenance

- `src/data/seo.ts` owns titles, descriptions, routes, organization details, and social links. Add public pages here for the sitemap and `/llms.txt`.
- Use `cseed` for the homepage title and `cseed | page name` elsewhere, including social titles. Keep descriptions unique and program links pointed at their pages.
- `src/components/core/SEO.astro` renders canonical, indexing, social, and JSON-LD metadata in initial HTML. Keep schema consistent with visible, verified content; omit unconfirmed claims and event details.
- Keep the 192px PNG favicon stable and crawlable alongside the SVG and ICO. Social previews use the community photograph.
- `/sitemap.xml` uses canonical routes and each page's `images` list. Match images to visible content. Add `lastmod` only from reliable content-change dates, never deployment or filesystem timestamps.
- `/robots.txt` allows search, AI discovery, and user-requested fetches while blocking GPTBot and ClaudeBot training crawlers. Google-Extended remains allowed because it combines Gemini training and grounding. These directives are voluntary, not access controls.
- `/llms.txt` is an optional reading guide. Neither it nor structured data guarantees indexing, citations, or sitelinks.

## Launch checklist

1. Serve `cseed.co` over HTTPS and permanently redirect HTTP and alternate hosts to it, preserving paths and query strings.
2. In Cloudflare, match the site's two hostnames when the scheme is HTTP or the host is `www.cseed.co`. Create a **301 Single Redirect** to `concat("https://cseed.co", http.request.uri.path)` with query preservation. Exclude canonical HTTPS requests to avoid loops. Workers static asset `_redirects` cannot handle domain-level sources.
3. Verify public pages and discovery files return 200, unknown paths return 404, and extensionless page URLs redirect to trailing-slash URLs. Test homepage and nested paths across HTTP/HTTPS and apex/`www`.
4. Verify ownership in Google Search Console and Bing Webmaster Tools. Submit `https://cseed.co/sitemap.xml`; inspect and request indexing for the homepage and program pages.
5. Check Cloudflare bot/WAF rules: robots.txt cannot bypass challenges. Use provider-published IP verification when adjusting crawler access.
6. Validate schema with Schema.org Validator and Google's Rich Results Test; check sharing previews. Protect preview deployments with access controls or `X-Robots-Tag: noindex`, without affecting production.
7. Add public contact details and Event schema only when confirmed and current.

## Validation

Run `npm run check` and `npm run build`; production builds require existing member-export credentials.

- Local: start `npm run dev`, then run `npm run check:seo`.
- Production: run `npm run check:seo -- https://cseed.co`.

CI checks routes, metadata, JSON-LD, crawler responses, internal links/fragments, sitemap images, favicon dimensions, the legacy bundled-page error, and missing-page 404s without production credentials. Search Console live inspection is still needed to verify actual Google crawler access.

## September 2026 audit

All seven canonical pages returned 200 with static headings and canonical metadata; discovery files were accessible and unknown paths returned 404. HTTP and `www` still returned duplicate 200 pages, requiring the redirects above. The old search snippet may reflect stale indexing; confirm crawl dates and indexed HTML in Search Console. Recrawl requests do not guarantee timing, snippets, favicons, or sitelinks.

## References

- Google: [AI search](https://developers.google.com/search/docs/appearance/ai-features), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [image sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps), [modification dates](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping), [structured data](https://developers.google.com/search/docs/appearance/structured-data/organization), [favicons](https://developers.google.com/search/docs/appearance/favicon-in-search), [sitelinks](https://developers.google.com/search/docs/appearance/sitelinks).
- Crawlers: [OpenAI](https://developers.openai.com/api/docs/bots), [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), [Perplexity](https://docs.perplexity.ai/docs/resources/perplexity-crawlers), [Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended).
- Cloudflare: [Single Redirects](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/), [static asset redirect limitations](https://developers.cloudflare.com/workers/static-assets/redirects/).
- [Open Graph](https://ogp.me/) and [llms.txt proposal](https://llmstxt.org/).
