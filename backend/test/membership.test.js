import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/index.js';
import { validateMembership } from '../src/appropriateness.js';

const origin = 'https://membership.example';
const payload = () => ({
  submission_id: crypto.randomUUID(),
  first_name: "Synthetic '); DROP TABLE People; --",
  last_name: 'Test',
  uw_email: 'synthetic-test@uw.edu',
  major: 'Testing',
  grad_year: `Spring ${new Date().getUTCFullYear() + 1}`,
  why: 'Synthetic test only',
  code_of_conduct: true,
  turnstile_token: 'synthetic-token',
});

test('cleans both stored records and excludes bot credentials', async (t) => {
  const { send, db } = setup(t);
  assert.equal(
    (
      await send({
        ...payload(),
        first_name: '  Jose\u0301  ',
        uw_email: ' Synthetic-Test@UW.EDU ',
        more: ' hi\r\n there ',
        heard_about: ['Discord', 'Discord'],
      })
    ).status,
    201,
  );
  const person = db.prepare('SELECT * FROM People').get();
  assert.equal(person.first_name, 'José');
  assert.equal(person.uw_email, 'synthetic-test@uw.edu');
  const saved = JSON.parse(
    db.prepare('SELECT payload_json FROM Membership_submissions').get().payload_json,
  );
  assert.equal(saved.first_name, 'José');
  assert.equal(saved.more, 'hi\nthere');
  assert.deepEqual(saved.heard_about, ['Discord']);
  assert.equal(saved.turnstile_token, undefined);
  assert.equal(saved.website, undefined);
});

test('invalid answers and honeypots never reach D1', async (t) => {
  const { send, batches } = setup(t);
  for (const fields of [
    { first_name: '   ' },
    { first_name: 'x'.repeat(101) },
    { why: '' },
    { why: 'x'.repeat(1001) },
    { more: {} },
    { first_name: 'a\u0000b' },
    { more: '<script>alert(1)</script>' },
    { campus: 'Other' },
    { grad_year: 'Spring 1900' },
    { grad_year: 'soon' },
    { major: '' },
    { uw_email: null },
    { major: 'Computer Science' },
    { photo_consent: 'true' },
    { heard_about: 'Discord' },
    { heard_about: ['unknown'] },
    { heard_about: ['other...'] },
    { heard_other: 'unsolicited' },
    { website: 'https://spam.example' },
    { personal_email: 'test@example.com' },
    { has_been_cseed_officer: true },
  ])
    assert.equal((await send({ ...payload(), ...fields })).status, 400, JSON.stringify(fields));
  assert.equal(batches(), 0);
});

test('verification failures, replay, wrong action/hostname and outages never write', async (t) => {
  const { send, env, batches } = setup(t);
  for (const token of [undefined, '', 123, 'x'.repeat(2049)]) {
    assert.equal((await send({ ...payload(), turnstile_token: token })).status, 403);
  }
  for (const result of [
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, hostname: 'evil.example', action: 'membership' },
    { success: true, hostname: 'membership.example', action: 'other' },
  ]) {
    globalThis.fetch.mock.mockImplementation(async () => Response.json(result));
    assert.equal((await send()).status, 403);
  }
  globalThis.fetch.mock.mockImplementation(async () => {
    throw new Error('network');
  });
  assert.equal((await send()).status, 503);
  globalThis.fetch.mock.mockImplementation(async () => new Response('bad', { status: 503 }));
  assert.equal((await send()).status, 503);
  delete env.TURNSTILE_SECRET_KEY;
  assert.equal((await send()).status, 503);
  assert.equal(batches(), 0);
});

test('a fresh verification token can retry an already saved submission', async (t) => {
  const { send, db } = setup(t);
  const used = new Set();
  globalThis.fetch.mock.mockImplementation(async (url, options) => {
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const data = JSON.parse(options.body);
    assert.equal(data.secret, 'synthetic-secret');
    assert.equal(data.remoteip, '192.0.2.1');
    const success = !used.has(data.response);
    used.add(data.response);
    return Response.json({ success, hostname: 'membership.example', action: 'membership' });
  });
  const data = payload();
  assert.equal((await send(data)).status, 201);
  assert.equal((await send(data)).status, 403);
  assert.equal((await send({ ...data, turnstile_token: 'fresh-token' })).status, 201);
  assert.equal(db.prepare('SELECT count(*) AS n FROM People').get().n, 1);
});

function setup(t) {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ success: true, hostname: 'membership.example', action: 'membership' }),
  );
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec('PRAGMA foreign_keys = ON');
  const migrations = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(migrations)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    db.exec(readFileSync(new URL(name, migrations), 'utf8'));
  }
  let batches = 0;
  const env = {
    ALLOWED_ORIGINS: origin,
    SUBMISSIONS_ENABLED: 'true',
    TURNSTILE_SECRET_KEY: 'synthetic-secret',
    SUBMISSION_LIMITER: { limit: async () => ({ success: true }) },
    TOTAL_LIMITER: { limit: async () => ({ success: true }) },
    DB: {
      prepare(sql) {
        return { bind: (...args) => ({ sql, args }) };
      },
      async batch(statements) {
        batches++;
        db.exec('BEGIN');
        try {
          const results = statements.map(({ sql, args }) => {
            db.prepare(sql).run(...args);
            return { success: true };
          });
          db.exec('COMMIT');
          return results;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      },
    },
  };
  const send = (body = payload(), options = {}) =>
    worker.fetch(
      new Request('https://api.example/api/membership', {
        method: 'POST',
        ...options,
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.0.2.1',
          ...options.headers,
        },
        body:
          options.method === 'OPTIONS' || options.method === 'GET'
            ? undefined
            : typeof body === 'string'
              ? body
              : JSON.stringify(body),
      }),
      env,
    );
  return { db, env, send, batches: () => batches };
}

test('persists requested columns and cleaned JSON atomically; retries do not duplicate', async (t) => {
  const { db, send } = setup(t);
  const data = {
    ...payload(),
    cs_email: null,
    major: 'Testing',
    campus: 'Seattle',
    pronouns: 'they/them',
    demographics: 'Unmodified answer',
    preferred_name: 'Synthetic',
  };
  const response = await send(data);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const person = db.prepare('SELECT * FROM People').get();
  for (const key of [
    'first_name',
    'last_name',
    'uw_email',
    'cs_email',
    'major',
    'campus',
    'pronouns',
    'demographics',
    'preferred_name',
    'grad_year',
  ]) {
    assert.equal(person[key], data[key]);
  }
  assert.equal(person.person_id, data.submission_id);
  assert.equal(person.agreed_to_membership_agreement, 1);
  assert.equal(person.has_been_cseed_officer, 0);
  assert.ok(Number.isFinite(Date.parse(person.join_date)));
  assert.deepEqual(
    JSON.parse(db.prepare('SELECT payload_json FROM Membership_submissions').get().payload_json),
    validateMembership(data),
  );
  assert.equal((await send(data)).status, 201);
  assert.equal(db.prepare('SELECT count(*) AS n FROM People').get().n, 1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM Membership_submissions').get().n, 1);
});

test('email domains and agreement are enforced; public intake cannot set officer history', async (t) => {
  const { send, db, batches } = setup(t);
  for (const fields of [
    { uw_email: 'person@example.com' },
    { uw_email: 'person@uw.edu.evil.example' },
    { uw_email: '@uw.edu' },
    { uw_email: 'person@@uw.edu' },
    { cs_email: 'person@uw.edu' },
    { cs_email: 'person@cs.washington.edu.evil.example' },
    { code_of_conduct: false },
    { code_of_conduct: 'true' },
    { code_of_conduct: undefined },
  ]) {
    assert.equal((await send({ ...payload(), ...fields })).status, 400);
  }
  assert.equal(batches(), 0);
  assert.equal(
    (
      await send({
        ...payload(),
        uw_email: null,
        cs_email: 'synthetic-test@CS.WASHINGTON.EDU',
        major: 'Computer Science',
      })
    ).status,
    201,
  );
  assert.equal(
    db.prepare('SELECT has_been_cseed_officer FROM People').get().has_been_cseed_officer,
    0,
  );
  for (const sql of [
    "UPDATE People SET uw_email = 'person@wrong.example'",
    "UPDATE People SET cs_email = 'person@uw.edu'",
    "UPDATE People SET uw_email = 'person@@uw.edu'",
    "UPDATE People SET uw_email = ' person@uw.edu'",
    'UPDATE People SET agreed_to_membership_agreement = 2',
    'UPDATE People SET has_been_cseed_officer = -1',
    "INSERT INTO People (person_id, first_name, last_name, join_date, uw_email) VALUES ('bad', 'Test', 'Only', '2026-01-01', 'person@wrong.example')",
  ])
    assert.throws(() => db.exec(sql));
});

test('initial migration creates membership defaults and graduation history', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(new URL('../migrations/0001_membership.sql', import.meta.url), 'utf8'));
    db.prepare(
      'INSERT INTO People (person_id, first_name, last_name, join_date) VALUES (?, ?, ?, ?)',
    ).run('a', 'Test', 'Only', '2026-01-01');
    const person = db.prepare('SELECT * FROM People').get();
    assert.equal(person.agreed_to_membership_agreement, 0);
    assert.equal(person.has_been_cseed_officer, 0);
    assert.equal(person.personal_email, null);
    assert.equal(db.prepare('SELECT count(*) AS n FROM Membership_submissions').get().n, 0);
    assert.equal(db.prepare('SELECT count(*) AS n FROM Graduation_email_submissions').get().n, 0);
  } finally {
    db.close();
  }
});

test('personal email stays outside membership intake; graduation responses link to people', async (t) => {
  const { send, db } = setup(t);
  assert.equal(
    (await send({ ...payload(), personal_email: 'synthetic@example.invalid' })).status,
    400,
  );
  assert.equal((await send({ ...payload(), has_been_cseed_officer: true })).status, 400);
  const data = payload();
  assert.equal((await send(data)).status, 201);
  assert.equal(db.prepare('SELECT personal_email FROM People').get().personal_email, null);
  assert.equal(db.prepare('SELECT count(*) AS n FROM Graduation_email_submissions').get().n, 0);
  const insert = db.prepare(
    'INSERT INTO Graduation_email_submissions (submission_id, person_id, personal_email) VALUES (?, ?, ?)',
  );
  assert.throws(() => insert.run('orphan', 'missing-person', 'synthetic@example.invalid'));
  insert.run('follow-up-1', data.submission_id, 'synthetic@example.invalid');
  insert.run('follow-up-2', data.submission_id, 'updated@example.invalid');
  const rows = db
    .prepare('SELECT * FROM Graduation_email_submissions ORDER BY submission_id')
    .all();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].person_id, data.submission_id);
  assert.equal(rows[0].personal_email, 'synthetic@example.invalid');
  assert.ok(Number.isFinite(Date.parse(rows[0].submitted_at)));
});

test('failed second insert rolls back person and hides database details', async (t) => {
  const { db, send } = setup(t);
  db.exec('DROP TABLE Membership_submissions');
  const response = await send();
  assert.equal(response.status, 503);
  assert.equal(db.prepare('SELECT count(*) AS n FROM People').get().n, 0);
  assert.doesNotMatch(await response.text(), /SQL|table|synthetic/i);
});

test('rejects invalid transport and oversized streamed JSON before database writes', async (t) => {
  const { send, batches } = setup(t);
  for (const [body, options, status] of [
    [payload(), { headers: { Origin: 'https://attacker.example' } }, 403],
    [payload(), { method: 'GET' }, 405],
    [payload(), { headers: { 'Content-Type': 'text/plain' } }, 415],
    ['{broken', {}, 400],
    [[], {}, 400],
    [{ ...payload(), first_name: {} }, {}, 400],
    [{ ...payload(), submission_id: 'bad' }, {}, 400],
    [{ ...payload(), more: 'x'.repeat(16384) }, {}, 413],
  ]) {
    assert.equal((await send(body, options)).status, status);
  }
  assert.equal(batches(), 0);
});

test('preflight, rate limits, kill switch and missing bindings never write', async (t) => {
  const { send, env, batches } = setup(t);
  assert.equal((await send(undefined, { method: 'OPTIONS' })).status, 204);
  env.SUBMISSION_LIMITER.limit = async () => ({ success: false });
  let response = await send();
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  env.SUBMISSION_LIMITER.limit = async () => ({ success: true });
  env.TOTAL_LIMITER.limit = async () => ({ success: false });
  assert.equal((await send()).status, 429);
  env.SUBMISSIONS_ENABLED = 'false';
  assert.equal((await send()).status, 503);
  env.SUBMISSIONS_ENABLED = 'true';
  delete env.SUBMISSION_LIMITER;
  assert.equal((await send()).status, 503);
  assert.equal(batches(), 0);
});
