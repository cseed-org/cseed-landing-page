// This route deliberately has no CORS support: only the build server consumes it.
export async function exportMemberNames(request, env) {
  const reply = (status, body) =>
    Response.json(body, {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  if (request.method !== 'GET') return reply(405, { error: 'Use GET.' });
  if (!env.MEMBER_NAMES_EXPORT_TOKEN) return reply(503, { error: 'Export unavailable.' });
  const supplied = request.headers.get('Authorization') || '';
  const digest = async (value) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [actual, expected] = await Promise.all([
    digest(supplied),
    digest(`Bearer ${env.MEMBER_NAMES_EXPORT_TOKEN}`),
  ]);
  let different = 0;
  for (let i = 0; i < actual.length; i++) different |= actual[i] ^ expected[i];
  if (different) return reply(401, { error: 'Unauthorized.' });
  try {
    // Project only the display name in SQL. Never read whole membership records.
    const result = await env.DB.prepare(
      `SELECT
      COALESCE(NULLIF(TRIM(preferred_name), ''), TRIM(first_name)) || ' ' || TRIM(last_name) AS name
      FROM People`,
    ).all();
    if (!result.success) throw new Error('Export failed');
    const names = [
      ...new Set(
        result.results
          .map(({ name }) => name.normalize('NFC').replace(/\s+/gu, ' ').trim())
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, 'en'));
    return reply(200, { names });
  } catch {
    return reply(503, { error: 'Export unavailable.' });
  }
}

const DEPLOY_HOOK_PREFIX = 'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/';

export async function dispatchMemberWall(env) {
  if (!env.SITE_DEPLOY_HOOK_URL?.startsWith(DEPLOY_HOOK_PREFIX)) {
    throw new Error(
      'Member wall: configure SITE_DEPLOY_HOOK_URL with a Workers Builds deploy hook.',
    );
  }
  // Empty request: no names, identifiers, or other member data in the rebuild trigger.
  let response;
  try {
    response = await fetch(env.SITE_DEPLOY_HOOK_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      // Workers rejects redirect: 'error' before sending the request. Return
      // redirects unchanged so the !response.ok check below rejects them.
      redirect: 'manual',
    });
  } catch {
    // Fetch errors can contain the secret hook URL. Never propagate the original error.
    throw new Error('Member wall: deploy hook request failed or timed out.');
  }
  if (!response.ok) {
    throw new Error('Member wall: deploy hook returned HTTP ' + response.status + '.');
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Member wall: invalid deploy hook response.');
  }
  if (result?.success !== true || !result.result?.build_uuid) {
    throw new Error('Member wall: deploy hook did not confirm a build.');
  }
  // Acceptance is not deployment success. Always try again at the next daily refresh.
  console.info('member_wall_build_accepted: check cseed-site build history for deployment status');
}
