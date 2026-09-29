import type { APIRoute } from 'astro';
import { SITE_URL, SEO_PAGES } from '../data/seo';

// XML escaping is separate from URL encoding (for example, & in image URLs).
const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${Object.entries(
      SEO_PAGES,
    )
      .map(([path, page]) =>
        [
          '  <url>',
          `    <loc>${escapeXml(new URL(path, SITE_URL).href)}</loc>`,
          ...[...new Set(page.images ?? [])].map(
            (image) =>
              `    <image:image><image:loc>${escapeXml(new URL(image, SITE_URL).href)}</image:loc></image:image>`,
          ),
          '  </url>',
        ].join('\n'),
      )
      .join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
