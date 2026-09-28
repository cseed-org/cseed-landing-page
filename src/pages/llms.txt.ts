import type { APIRoute } from 'astro';
import { SITE_URL, SEO_PAGES, ORGANIZATION_DESCRIPTION } from '../data/seo';

// Optional reading guide, not an indexing requirement or crawler permission mechanism.
export const GET: APIRoute = () =>
  new Response(
    `# cseed\n\n> ${ORGANIZATION_DESCRIPTION}\n\nThe official website is ${SITE_URL}/. Membership applications support students at UW Seattle, UW Bothell, and UW Tacoma, across all majors.\n\n## Pages\n\n${Object.entries(
      SEO_PAGES,
    )
      .map(([path, page]) => `- [${page.label}](${SITE_URL}${path}): ${page.description}`)
      .join(
        '\n',
      )}\n\n## Details\n\nConsult the linked pages for current program details and membership requirements. Event locations and application schedules may change.\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
