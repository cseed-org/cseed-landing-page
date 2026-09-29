import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import site from '../../src/site-worker.js';
import api from '../src/index.js';

test('www redirects before serving the form, retaining path and query', async () => {
  const response = await site.fetch(new Request('https://www.cseed.co/join/?from=club'), {});
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('Location'), 'https://cseed.co/join/?from=club');
});

test('membership forwards the original request and preserves API errors', async () => {
  const request = new Request('https://cseed.co/api/membership', {
    method: 'POST',
    headers: {
      Origin: 'https://cseed.co',
      'CF-Connecting-IP': '192.0.2.1',
      'Content-Type': 'application/json',
    },
    body: '{"submission_id":"synthetic"}',
  });
  const response = await site.fetch(request, {
    MEMBERSHIP_API: {
      async fetch(forwarded) {
        assert.equal(forwarded, request);
        assert.equal(await forwarded.text(), '{"submission_id":"synthetic"}');
        return Response.json({ error: 'Please wait.' }, { status: 429 });
      },
    },
  });
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: 'Please wait.' });
});

test('unavailable API returns readable, non-cacheable JSON', async () => {
  const response = await site.fetch(new Request('https://cseed.co/api/membership'), {
    MEMBERSHIP_API: {
      fetch() {
        throw new Error('offline');
      },
    },
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match((await response.json()).error, /temporarily unavailable/);
});

test('other requests use assets, never expose internal API routes', async () => {
  for (const path of ['/join/', '/internal/member-names']) {
    const request = new Request(`https://cseed.co${path}`);
    const response = await site.fetch(request, {
      ASSETS: {
        fetch: async (forwarded) => {
          assert.equal(forwarded, request);
          return new Response('asset');
        },
      },
    });
    assert.equal(await response.text(), 'asset');
  }
});

test('production CORS permits both site hosts but rejects unrelated origins', async () => {
  const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const allowed = config.match(/"ALLOWED_ORIGINS":\s*"([^"]+)"/)[1];
  for (const origin of ['https://cseed.co', 'https://www.cseed.co', 'https://untrusted.example']) {
    const response = await api.fetch(
      new Request('https://api.example/api/membership', {
        method: 'OPTIONS',
        headers: { Origin: origin },
      }),
      { ALLOWED_ORIGINS: allowed },
    );
    const trusted = origin !== 'https://untrusted.example';
    assert.equal(response.status, trusted ? 204 : 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), trusted ? origin : null);
  }
});
