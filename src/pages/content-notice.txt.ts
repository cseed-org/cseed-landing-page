import type { APIRoute } from 'astro';
import notice from '../../CONTENT-NOTICE.md?raw';

export const GET: APIRoute = () =>
  new Response(notice, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
