# Search and AI discovery

Canonical origin: `https://cseed.co`. All seven public pages use trailing slashes.

## Maintenance

- `src/data/seo.ts` owns page titles, descriptions, canonical route inventory, organization summary, and social profile URLs. Add new public pages here so they appear in the sitemap and AI reading guide.
- `src/components/core/SEO.astro` renders metadata in the initial HTML: canonical links, indexing and snippet controls, Open Graph and Twitter cards, and Organization, WebSite, WebPage/AboutPage, and BreadcrumbList JSON-LD.
- `/sitemap.xml` is generated from the same inventory. No invented modification dates or priorities are emitted.
- `/llms.txt` is an optional reading guide derived from the same descriptions. It is not required for Google AI search and does not guarantee citations or indexing.
- `/robots.txt` permits ordinary search, AI discovery, and user-requested fetches, while opting out of GPTBot and ClaudeBot training crawlers. These voluntary directives are not access controls. Google-Extended remains allowed because its control combines Gemini training and grounding; review this separately if the policy changes.
- Social previews use the existing community photograph. Contact details, event schema, member counts, and the unverified “largest” claim are intentionally omitted from structured data.

## Launch tasks requiring the public domain or account access

1. Connect `cseed.co` to the host with HTTPS. Configure permanent host-level redirects from HTTP and any alternate domains (including `www` if used) to `https://cseed.co`, preserving paths and query strings.
2. Verify the domain in Google Search Console and Bing Webmaster Tools using their actual verification records. Submit `https://cseed.co/sitemap.xml`; inspect the homepage and program pages.
3. Confirm the deployed pages and discovery files return 200, missing paths return 404, and extensionless page URLs redirect to their trailing-slash canonical URLs. Avoid SPA fallback behavior for missing pages.
4. Review Cloudflare bot/WAF settings: robots.txt permission does not override a blocked crawler or challenge. Use provider-published IP verification before changing access rules.
5. Validate structured data with Schema.org Validator and Google's Rich Results Test, and inspect sharing previews. Google may choose a different title or snippet from the supplied metadata.
6. Keep preview deployments out of search with host-level `X-Robots-Tag: noindex` or access protection, without applying that header to the production domain.
7. Add confirmed public contact details when ready. Keep any future schema consistent with visible page content and refresh event details before introducing Event markup.

## Research sources

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): normal SEO fundamentals apply; no special AI files or schema are required.
- [Google: descriptions and snippets](https://developers.google.com/search/docs/appearance/snippet): unique, relevant descriptions can inform search snippets.
- [Google: sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): list canonical URLs; submission is a hint rather than an indexing guarantee.
- [Google: organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization) and [site names](https://developers.google.com/search/docs/appearance/site-names).
- [Open Graph protocol](https://ogp.me/): sharing metadata and image descriptions.
- [OpenAI crawlers](https://developers.openai.com/api/docs/bots): separate OAI-SearchBot discovery from GPTBot training preferences.
- [Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler): Claude-SearchBot and Claude-User differ from ClaudeBot.
- [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers).
- [Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended): combines Gemini training and grounding controls; does not control Google Search.
- [llms.txt proposal](https://llmstxt.org/): supplementary machine-readable navigation, not a universal search standard.

## Validation

Run `npm run check` and `npm run build` (production requires the existing member-export credentials). With `npm run dev` running, execute `node scripts/verify-seo.mjs` to inspect all public pages and discovery endpoints. Pass another origin as its first argument to inspect a preview or deployment.
