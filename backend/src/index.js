import { validateMembership, ValidationError } from './appropriateness.js';
import { verifyTurnstile } from './turnstile.js';
import { exportMemberNames, dispatchMemberWall } from './member-wall.js';

const MAX_BYTES = 16 * 1024;
const PERSON_FIELDS = [
  'uw_email',
  'first_name',
  'last_name',
  'preferred_name',
  'major',
  'grad_year',
  'pronouns',
  'demographics',
  'cs_email',
  'campus',
];

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Bound the actual streamed body, including requests without Content-Length.
async function readPayload(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, 'A JSON body is required.');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new RequestError(413, 'The submission is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new RequestError(400, 'The body must be valid JSON.');
  }
}

export default {
  async scheduled(_event, env) {
    await dispatchMemberWall(env);
  },
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/internal/member-names') {
      return exportMemberNames(request, env);
    }
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
    const headers = {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
    };
    const reply = (status, body, extra = {}) =>
      new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });

    if (new URL(request.url).pathname !== '/api/membership') {
      return reply(404, { error: 'Not found.' });
    }
    if (!origin || !allowed.includes(origin)) {
      return reply(403, { error: 'Origin not allowed.' });
    }
    headers['Access-Control-Allow-Origin'] = origin;
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '600',
        },
      });
    }
    if (request.method !== 'POST') {
      return reply(405, { error: 'Use POST.' }, { Allow: 'POST, OPTIONS' });
    }
    if (env.SUBMISSIONS_ENABLED !== 'true') {
      return reply(503, { error: 'Submissions are temporarily unavailable.' });
    }

    try {
      // Missing security bindings fail closed; no bypass for development.
      const ip = request.headers.get('CF-Connecting-IP');
      if (!ip) return reply(403, { error: 'Unable to accept this request.' });
      const perIp = await env.SUBMISSION_LIMITER.limit({ key: ip });
      if (!perIp.success) {
        return reply(
          429,
          { error: 'Please wait a minute before trying again.' },
          { 'Retry-After': '60' },
        );
      }
      const total = await env.TOTAL_LIMITER.limit({ key: 'membership' });
      if (!total.success) {
        return reply(
          429,
          { error: 'Please wait a minute before trying again.' },
          { 'Retry-After': '60' },
        );
      }
      if (
        request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !==
        'application/json'
      ) {
        return reply(415, { error: 'Send application/json.' });
      }
      const raw = await readPayload(request);
      const payload = validateMembership(raw);
      if (!(await verifyTurnstile(raw.turnstile_token, ip, origin, env))) {
        return reply(403, { error: 'Please complete a fresh bot verification and try again.' });
      }

      // The UUID is retained by the browser for retries. Both inserts are atomic
      // and repeated requests with the same ID cannot create additional members.
      const id = payload.submission_id;
      const now = new Date().toISOString();
      const results = await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO People (
          person_id, uw_email, first_name, last_name, preferred_name, major,
          grad_year, pronouns, demographics, cs_email, campus, join_date,
          agreed_to_membership_agreement, has_been_cseed_officer
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
        ON CONFLICT(person_id) DO NOTHING`,
        ).bind(id, ...PERSON_FIELDS.map((key) => payload[key] ?? null), now),
        env.DB.prepare(
          `INSERT INTO Membership_submissions
          (submission_id, person_id, payload_json, received_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(submission_id) DO NOTHING`,
        ).bind(id, id, JSON.stringify(payload), now),
      ]);
      if (results.some((result) => !result.success)) throw new Error('Write failed');
      // The database trigger records pending changes atomically with the signup.
      // Cron retries failures; dispatch failures must not undo a saved membership.
      const notification = dispatchMemberWall(env).catch(() => {});
      if (ctx) ctx.waitUntil(notification);
      else await notification;
      return reply(201, { ok: true });
    } catch (error) {
      if (error instanceof ValidationError) return reply(400, { error: error.message });
      if (error instanceof RequestError) return reply(error.status, { error: error.message });
      // Do not log payloads, emails, IPs, or database exceptions.
      return reply(503, { error: 'Unable to save your submission. Please try again.' });
    }
  },
};
