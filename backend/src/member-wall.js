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

export async function dispatchMemberWall(env) {
  if (!env.GITHUB_REBUILD_TOKEN || !/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '')) return;
  const state = await env.DB.prepare(
    'SELECT revision, dispatched_revision FROM Member_wall_sync WHERE singleton = 1',
  ).first();
  if (!state || state.revision <= state.dispatched_revision) return;
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/frontend-build.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_REBUILD_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'cseed-membership-worker',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      // No names, identifiers, or other member data in GitHub trigger payloads.
      body: JSON.stringify({ ref: 'main' }),
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
    },
  );
  if (!response.ok) throw new Error('Member wall dispatch failed');
  // A concurrent signup remains pending; an older dispatch cannot move this backwards.
  await env.DB.prepare(
    'UPDATE Member_wall_sync SET dispatched_revision = MAX(dispatched_revision, ?) WHERE singleton = 1',
  )
    .bind(state.revision)
    .run();
}
