// Imported only by Astro page frontmatter. Credentials never enter client scripts.
export async function loadMemberNames({ url, token, development = false }) {
  if (!url && !token && development) return [];
  if (!url || !token)
    throw new Error('Configure MEMBER_NAMES_EXPORT_URL and MEMBER_NAMES_EXPORT_TOKEN.');
  if (new URL(url).protocol !== 'https:') throw new Error('Member name export requires HTTPS.');
  let data;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error();
    data = await response.json();
  } catch {
    // Do not include remote responses, URLs, or credentials in CI logs.
    throw new Error('Member name export failed; retaining the previously deployed site.');
  }
  // Fail closed if the API accidentally adds private fields in a future change.
  if (
    !data ||
    Object.keys(data).length !== 1 ||
    !Array.isArray(data.names) ||
    data.names.some(
      (name) => typeof name !== 'string' || name.length > 201 || /[<>\u0000-\u001f]/u.test(name),
    )
  ) {
    throw new Error('Invalid names-only export.');
  }
  return [
    ...new Set(
      data.names.map((name) => name.normalize('NFC').replace(/\s+/gu, ' ').trim()).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'en'));
}
