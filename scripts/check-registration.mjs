// Local-only regression test. Mock verification and API responses; never write real members.
// Start Astro with PUBLIC_TURNSTILE_SITE_KEY=synthetic and
// PUBLIC_MEMBERSHIP_API_URL=/api/membership, then run this script.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origin = process.argv[2] || 'http://127.0.0.1:4321';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const requests = [];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `
        window.turnstile = {
          render(el, options) {
            window.verificationOptions = options;
            el.innerHTML = '<div style="width:100%;min-width:300px;height:65px;background:#eee">Verification test widget</div>';
            setTimeout(() => options.callback('token-initial'), 0);
            return 'test-widget';
          },
          reset() { setTimeout(() => window.verificationOptions.callback('token-refreshed'), 0); }
        };
      `,
      }),
    );
    await page.route('**/api/membership', async (route) => {
      requests.push(route.request().postDataJSON());
      if (requests.length === 1) await route.abort('connectionfailed');
      else await route.fulfill({ json: { ok: true }, status: 201 });
    });
    await page.goto(`${origin}/join/`);
    await page.locator('[data-jn-start]').click();
    await page.locator('[name=first_name]').fill('Synthetic');
    await page.locator('[name=last_name]').fill('Test');
    await page.locator('[name=uw]').fill('synthetic@uw.edu');
    for (const name of ['grad', 'major']) {
      await page.locator(`[data-jn-select=${name}] [data-jn-select-btn]`).click();
      await page.locator(`[data-jn-select=${name}] [data-value]`).first().click();
    }
    await page.locator('button[type=submit]').click();
    await page.locator('[name=why]').fill('Synthetic registration regression test.');
    await page.locator('button[type=submit]').click();
    await page.locator('[data-jn-coc]').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.locator('[name=coc]').check();
    await page.waitForFunction(() => !!window.verificationOptions);
    const box = await page.locator('[data-jn-turnstile]').boundingBox();
    assert.ok(box.width >= 300 && box.width <= 321, `widget native size at ${width}: ${box.width}`);
    assert.ok(box.x >= -1 && box.x + box.width <= width + 1, 'widget stays within viewport');
    await page.evaluate(() => window.verificationOptions['expired-callback']());
    await page.waitForFunction(
      () => document.querySelector('[data-jn-verification-status]').hidden,
    );
    await page.locator('button[type=submit]').click();
    await page.waitForFunction(() =>
      document.querySelector('[data-jn-status]').textContent.includes('Connection interrupted'),
    );
    // A successful fresh challenge must not erase the failed submission's message.
    await page.evaluate(() => window.verificationOptions.callback('token-retry'));
    assert.equal(await page.locator('[data-jn-status]').isVisible(), true);
    assert.match(await page.locator('[data-jn-status]').textContent(), /original answers/);
    await page.locator('button[type=submit]').click();
    await page.locator('[data-jn-welcome]').waitFor({ state: 'visible' });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].submission_id, requests[1].submission_id);
    assert.equal(requests[1].turnstile_token, 'token-retry');
    assert.equal(await page.locator('[data-jn-verification]').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${width}px: native widget, expiry, network retry, stable submission ID, success`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
