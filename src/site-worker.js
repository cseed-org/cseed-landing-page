// Keep the browser on the site's origin; the API remains a separate Worker.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.cseed.co') {
      url.hostname = 'cseed.co';
      url.protocol = 'https:';
      return Response.redirect(url.href, 308);
    }
    if (url.pathname === '/api/membership') {
      try {
        // Preserve Origin and CF-Connecting-IP for the API's existing security checks.
        return await env.MEMBERSHIP_API.fetch(request);
      } catch {
        return Response.json(
          { error: 'Membership submissions are temporarily unavailable. Please try again.' },
          { status: 503, headers: { 'Cache-Control': 'no-store' } },
        );
      }
    }
    return env.ASSETS.fetch(request);
  },
};
