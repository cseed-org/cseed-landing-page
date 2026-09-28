import type { APIRoute } from 'astro';
import { SITE_URL, SEO_PAGES } from '../data/seo';

export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(
      SEO_PAGES,
    )
      .map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`)
      .join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
