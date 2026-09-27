export async function verifyTurnstile(token, ip, origin, env) {
  if (!env.TURNSTILE_SECRET_KEY) throw new Error('Missing verification configuration');
  if (typeof token !== 'string' || !token.length || token.length > 2048) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Verification unavailable');
  const result = await response.json();
  return (
    result.success === true &&
    result.action === 'membership' &&
    result.hostname === new URL(origin).hostname
  );
}
