// Renders every page on phones (portrait and landscape), tablets, and desktops in all three
// browser engines -- WebKit (every iOS browser), Chromium (Android Chrome, Samsung Internet,
// in-app browsers), and Firefox -- and checks that each layout holds: phones and tablets get the stacked
// canvas, scaled to the screen before the first paint, with no text clipped, overlapping, or
// scrolling sideways.
//
//   npm run check:mobile [-- <origin>] [--quick | --tablet | --desktop] [--only <text>] [--shots] [--concurrency <n>]
//
// Failures are re-run one at a time before they count, since a busy machine can starve the
// reveal-on-scroll animations. Screenshots of failures are saved to .mobile-check/.
import { chromium, firefox, webkit } from 'playwright';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const takesValue = new Set(['--only', '--concurrency']);
const valueOf = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const origin =
  args.find((arg, i) => !arg.startsWith('--') && !takesValue.has(args[i - 1])) ??
  'http://localhost:4321';
const quick = args.includes('--quick');
const tablet = args.includes('--tablet');
const desktop = args.includes('--desktop');
const keepAllShots = args.includes('--shots');
const only = valueOf('--only') ?? '';
const concurrency = Number(valueOf('--concurrency') ?? 4);
// Keep previous diagnostics; each run writes to its own directory.
const out = new URL(`../.mobile-check/run-${Date.now()}/`, import.meta.url);
mkdirSync(new URL('shots/', out), { recursive: true });

const routes = readdirSync(new URL('../src/pages/', import.meta.url))
  .filter((file) => file.endsWith('.astro'))
  .map((file) => (file === 'index.astro' ? '/' : `/${file.replace('.astro', '')}/`));

// CSS viewport sizes of real devices. Every phone and tablet, either way up, must get the stacked canvas.
const device = (name, width, height, kind = 'phone') => ({ name, width, height, kind });
const PORTRAIT = [
  device('iphone-se-1', 320, 568),
  device('galaxy-fold-cover', 344, 882),
  device('galaxy-s', 360, 780),
  device('iphone-se', 375, 667),
  device('iphone-mini', 375, 812),
  device('iphone-14', 390, 844),
  device('iphone-15', 393, 852),
  device('iphone-16-pro', 402, 874),
  device('galaxy-ultra', 412, 915),
  device('iphone-pro-max', 430, 932),
  device('iphone-16-pro-max', 440, 956),
];
const LANDSCAPE = PORTRAIT.filter((d) =>
  [
    'galaxy-fold-cover',
    'iphone-se',
    'iphone-14',
    'galaxy-ultra',
    'iphone-pro-max',
    'iphone-16-pro-max',
  ].includes(d.name),
).map((d) => device(`${d.name}-landscape`, d.height, d.width));
const TABLETS = [
  device('ipad-mini', 768, 1024, 'tablet'),
  device('ipad-air', 820, 1180, 'tablet'),
  device('ipad-pro', 1024, 1366, 'tablet'),
  device('ipad-pro-13', 1032, 1376, 'tablet'),
  device('ipad-pro-landscape', 1366, 1024, 'tablet'),
  device('ipad-pro-13-landscape', 1376, 1032, 'tablet'),
  device('ipad-landscape', 1180, 820, 'tablet'),
];
const DESKTOPS = [
  device('narrow-desktop', 1024, 1366, 'desktop'),
  device('desktop-1100', 1100, 800, 'desktop'),
  device('compact-laptop', 1280, 800, 'desktop'),
  device('laptop-1366', 1366, 768, 'desktop'),
  device('laptop', 1440, 900, 'desktop'),
  device('desktop', 1920, 1080, 'desktop'),
];
const pick = (...names) =>
  [...PORTRAIT, ...LANDSCAPE, ...TABLETS, ...DESKTOPS].filter((d) => names.includes(d.name));

// Variants: `text130` renders every font 30% larger, as Android's font size setting or
// Firefox's automatic font sizing can; `dark` is Chromium forcing dark mode on the page, as
// Samsung Internet does; `slow` is a repeat visit on a slow connection, where styles come from
// the cache while the HTML is still arriving, so the browser paints as it parses.
const TABLET_PLAN = [
  ['webkit', 'base', TABLETS],
  ['chromium', 'base', TABLETS],
  ['webkit', 'text130', pick('ipad-pro', 'ipad-pro-landscape')],
  ['chromium', 'text130', pick('ipad-pro', 'ipad-pro-landscape')],
  ['webkit', 'rotate', pick('ipad-pro')],
  ['chromium', 'rotate', pick('ipad-pro')],
];
const DESKTOP_PLAN = [
  ['webkit', 'base', DESKTOPS],
  ['chromium', 'base', DESKTOPS],
  ['firefox', 'base', pick('narrow-desktop', 'laptop-1366', 'desktop')],
  ['webkit', 'rotate', pick('narrow-desktop')],
  ['chromium', 'rotate', pick('narrow-desktop')],
];
const plan = desktop
  ? DESKTOP_PLAN
  : tablet
    ? TABLET_PLAN
    : quick
      ? [
          [
            'webkit',
            'base',
            pick(
              'iphone-se-1',
              'iphone-14',
              'iphone-pro-max-landscape',
              'ipad-pro',
              'ipad-pro-landscape',
              'narrow-desktop',
              'laptop-1366',
            ),
          ],
          [
            'chromium',
            'base',
            pick(
              'galaxy-s',
              'galaxy-ultra-landscape',
              'ipad-pro',
              'ipad-pro-landscape',
              'narrow-desktop',
              'laptop-1366',
              'laptop',
            ),
          ],
          ['firefox', 'base', pick('iphone-14')],
          ['chromium', 'text130', pick('galaxy-s')],
          ['chromium', 'dark', pick('iphone-14')],
          ['chromium', 'slow', pick('galaxy-s')],
        ]
      : [
          ['chromium', 'base', [...PORTRAIT, ...LANDSCAPE, ...TABLETS, ...DESKTOPS]],
          ['webkit', 'base', [...PORTRAIT, ...LANDSCAPE, ...TABLETS, ...DESKTOPS]],
          // Playwright can't emulate a phone in Firefox, so there it covers phone widths.
          ['firefox', 'base', [...PORTRAIT, ...DESKTOPS]],
          ...TABLET_PLAN.filter(([, variant]) => variant !== 'base'),
          ...DESKTOP_PLAN.filter(([, variant]) => variant !== 'base'),
          [
            'chromium',
            'text130',
            pick('galaxy-s', 'iphone-14', 'galaxy-ultra', 'iphone-pro-max-landscape'),
          ],
          ['firefox', 'text130', pick('galaxy-s', 'iphone-14', 'galaxy-ultra')],
          ['chromium', 'dark', pick('iphone-14')],
          ['chromium', 'slow', pick('galaxy-s')],
        ];
const runs = plan
  .flatMap(([engine, variant, devices]) =>
    devices.flatMap((d) =>
      routes.map((route) => ({
        engine,
        variant,
        device: d,
        route,
        id: `${engine} ${variant} ${d.name} ${route}`,
      })),
    ),
  )
  .filter((run) => run.id.includes(only));

let browsers;
try {
  browsers = {
    chromium: await chromium.launch(),
    webkit: await webkit.launch(),
    firefox: await firefox.launch(),
    // Blink's own forced dark mode, the closest stand-in for Samsung Internet's.
    dark: await chromium.launch({ args: ['--blink-settings=forceDarkModeEnabled=true'] }),
  };
} catch (error) {
  console.error(error.message.split('\n')[0]);
  console.error('Install the browsers once with: npx playwright install chromium webkit firefox');
  process.exit(1);
}
const sampler = await browsers.chromium.newPage();

// Before any page script: count frames painted before the page scale was set, and hide the
// Astro dev toolbar so it can't cover anything.
function beforePageScripts() {
  const frames = { painted: 0, unscaled: 0 };
  /** @type {any} */ (window).__frames = frames;
  const tick = () => {
    frames.painted++;
    if (!document.documentElement.style.getPropertyValue('--page-zoom')) frames.unscaled++;
    if (document.readyState !== 'complete') requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = 'astro-dev-toolbar { display: none !important; }';
    document.head.append(style);
  });
}

// In the page: every font a given factor larger.
function enlargeText(scale) {
  const elements = [...document.querySelectorAll('body *')];
  const sizes = elements.map((el) => parseFloat(getComputedStyle(el).fontSize));
  elements.forEach(
    (el, i) => sizes[i] && el.style.setProperty('font-size', `${sizes[i] * scale}px`, 'important'),
  );
}

// In the page: scroll to the bottom and back, so every reveal-on-scroll block triggers.
async function scrollThrough() {
  const step = Math.max(200, innerHeight * 0.7);
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
    scrollTo(0, y);
    await new Promise((resolve) => setTimeout(resolve, 90));
  }
  scrollTo(0, document.documentElement.scrollHeight);
  await new Promise((resolve) => setTimeout(resolve, 150));
  scrollTo(0, 0);
}

// In the page: the canvas geometry, and where every line of visible text landed.
function measure() {
  const root = document.documentElement;
  const width = root.clientWidth;
  const style = getComputedStyle(root);
  const canvas = document.querySelector('.canvas')?.getBoundingClientRect();
  scrollTo(5000, 0);
  const panned = scrollX;
  scrollTo(0, 0);

  const lines = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const el = node.parentElement;
    if (!node.data.trim() || !el) continue;
    if (el.closest('astro-dev-toolbar, script, style, noscript, [hidden], [aria-hidden="true"]'))
      continue;
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (r.width < 1 || r.height < 1) continue;
      // Glyphs fill about the middle half of a line box; display type has very tall ones.
      const inset = r.height / 4;
      lines.push({
        el,
        text: node.data.trim().replace(/\s+/g, ' ').slice(0, 40),
        left: r.left,
        right: r.right,
        top: r.top + inset,
        bottom: r.bottom - inset,
      });
    }
  }

  const clipped = [];
  for (const line of lines) {
    let left = 0;
    let right = width;
    for (let a = line.el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (getComputedStyle(a).overflowX === 'visible') continue;
      const box = a.getBoundingClientRect();
      left = Math.max(left, box.left);
      right = Math.min(right, box.right);
    }
    const over = Math.max(left - line.left, line.right - right);
    if (over > 2) clipped.push(`"${line.text}" by ${Math.round(over)}px`);
  }

  const overlaps = new Set();
  const area = (l) => (l.right - l.left) * (l.bottom - l.top);
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const [a, b] = [lines[i], lines[j]];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 0 && h > 0 && (w * h) / Math.min(area(a), area(b)) > 0.3)
        overlaps.add(`"${a.text}" and "${b.text}"`);
    }
  }

  const nav = [];
  const logo = [...document.querySelectorAll('.nav-bar-logo')].find(
    (img) => getComputedStyle(img).display !== 'none',
  );
  if (logo) {
    const mark = logo.getBoundingClientRect();
    const links = [...document.querySelectorAll('.nav-bar-link')].map((a) => ({
      text: a.textContent.trim(),
      box: a.getBoundingClientRect(),
    }));
    links.forEach((link, i) => {
      if (link.box.left < mark.right) nav.push(`"${link.text}" runs into the logo`);
      if (link.box.right > width + 1) nav.push(`"${link.text}" runs off the screen`);
      if (i && link.box.left < links[i - 1].box.right)
        nav.push(`"${links[i - 1].text}" and "${link.text}" overlap`);
    });
  }

  return {
    width,
    canvasWidth: parseFloat(style.getPropertyValue('--canvas-width')),
    canvasRendered: canvas?.width,
    programCopyPosition: document.querySelector('.program-copy')
      ? getComputedStyle(document.querySelector('.program-copy')).position
      : null,
    scrollWidth: document.scrollingElement.scrollWidth,
    panned,
    clipped,
    overlaps: [...overlaps],
    nav,
    unrevealed: [...document.querySelectorAll('[data-reveal]:not(.is-shown)')].filter(
      (el) => !el.closest('[hidden]'),
    ).length,
    frames: /** @type {any} */ (window).__frames,
  };
}

function expectations({ device: d }, m) {
  const failures = [];
  const expectedCanvas = d.kind === 'desktop' && m.width > 900 ? 2083 : 780;
  if (m.canvasWidth !== expectedCanvas)
    failures.push(`canvas: ${d.kind} expected ${expectedCanvas}px, got ${m.canvasWidth}px`);
  const expectedPosition = expectedCanvas === 2083 ? 'absolute' : 'relative';
  if (m.programCopyPosition && m.programCopyPosition !== expectedPosition)
    failures.push(`programs: expected ${expectedPosition} placement, got ${m.programCopyPosition}`);
  if (m.canvasRendered !== undefined && Math.abs(m.canvasRendered - m.width) > 1)
    failures.push(
      `fit: the canvas renders ${Math.round(m.canvasRendered)}px wide on a ${m.width}px screen`,
    );
  if (m.panned > 0 || m.scrollWidth > m.width + 1)
    failures.push(`sideways scroll: the page is ${m.scrollWidth}px wide on a ${m.width}px screen`);
  if (m.frames.unscaled)
    failures.push(
      `first paint: ${m.frames.unscaled} of ${m.frames.painted} frames painted unscaled`,
    );
  if (m.clipped.length) failures.push(`clipped text: ${m.clipped.slice(0, 6).join('; ')}`);
  if (m.overlaps.length) failures.push(`overlapping text: ${m.overlaps.slice(0, 6).join('; ')}`);
  if (m.nav.length) failures.push(`nav: ${m.nav.join('; ')}`);
  if (m.unrevealed) failures.push(`reveal: ${m.unrevealed} blocks never appeared on scrolling`);
  return failures;
}

// Forced dark mode changes only what's painted, not computed styles, so sample a screenshot
// of the footer's yellow ground (its bottom-right padding) and require it to stay light.
async function footerBrightness(page) {
  await page.evaluate(() =>
    document.querySelector('.site-footer').scrollIntoView({ block: 'end' }),
  );
  const box = await page.locator('.site-footer').boundingBox();
  const shot = await page.screenshot({
    clip: { x: box.x + box.width - 16, y: box.y + box.height - 14, width: 12, height: 10 },
  });
  return sampler.evaluate(
    async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = new OffscreenCanvas(img.width, img.height);
      const context = canvas.getContext('2d');
      context.drawImage(img, 0, 0);
      const data = context.getImageData(0, 0, img.width, img.height).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      return Math.round(sum / (data.length / 4));
    },
    `data:image/png;base64,${shot.toString('base64')}`,
  );
}

async function firstPaintOnSlowRepeatVisit(context, page, route) {
  await page.goto(origin + route, { waitUntil: 'load', timeout: 90000 });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 20 * 1024,
    uploadThroughput: 20 * 1024,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(origin + route, { waitUntil: 'commit', timeout: 90000 });
  await page.waitForFunction(() => document.readyState !== 'loading', null, { timeout: 90000 });
  const frames = await page.evaluate(() => /** @type {any} */ (window).__frames);
  return frames.unscaled
    ? [`first paint: ${frames.unscaled} of ${frames.painted} frames painted unscaled`]
    : [];
}

async function check(run, screenshot) {
  const { engine, variant, device: d, route } = run;
  const emulated = d.kind !== 'desktop' && engine !== 'firefox';
  const context = await browsers[variant === 'dark' ? 'dark' : engine].newContext({
    viewport: { width: d.width, height: d.height },
    deviceScaleFactor: d.kind === 'desktop' ? 1 : 2,
    isMobile: emulated,
    hasTouch: emulated,
  });
  try {
    await context.addInitScript(beforePageScripts);
    const page = await context.newPage();
    if (variant === 'slow') return await firstPaintOnSlowRepeatVisit(context, page, route);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message.split('\n')[0]));
    const response = await page.goto(origin + route, { waitUntil: 'load', timeout: 90000 });
    if (response?.status() !== 200) return [`status ${response?.status()}`];
    await page.evaluate(() => document.fonts.ready);
    if (variant === 'text130') await page.evaluate(enlargeText, 1.3);
    await page.evaluate(scrollThrough);
    await page.waitForTimeout(1400); // reveal transitions
    const failures = expectations(run, await page.evaluate(measure));
    if (variant === 'rotate') {
      // Rotate the same document both ways to catch stale scale and hero dimensions.
      for (const viewport of [
        { width: d.height, height: d.width },
        { width: d.width, height: d.height },
      ]) {
        await page.setViewportSize(viewport);
        await page.evaluate(scrollThrough);
        await page.waitForTimeout(1400);
        failures.push(
          ...expectations(run, await page.evaluate(measure)).map(
            (failure) => `${viewport.width}x${viewport.height} after rotation: ${failure}`,
          ),
        );
      }
    }
    if (errors.length) failures.push(`script error: ${errors.join(' | ')}`);
    if (variant === 'dark') {
      const brightness = await footerBrightness(page);
      if (brightness < 130)
        failures.push(`dark: the page was recolored (brightness ${brightness})`);
      await page.evaluate(() => scrollTo(0, 0));
    }
    if (screenshot || keepAllShots) {
      const name = run.id.replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '');
      await page.screenshot({
        path: fileURLToPath(new URL(`shots/${name}.jpg`, out)),
        type: 'jpeg',
        quality: 60,
        scale: 'css',
      });
    }
    return failures;
  } catch (error) {
    return [`error: ${error.message.split('\n')[0]}`];
  } finally {
    await context.close();
  }
}

async function checkAll(list, workers, screenshot) {
  const queue = [...list];
  const failed = new Map();
  let done = 0;
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (queue.length) {
        const run = queue.shift();
        const failures = await check(run, screenshot);
        if (failures.length) failed.set(run, failures);
        if (++done % 50 === 0) console.error(`checked ${done}/${list.length}`);
      }
    }),
  );
  return failed;
}

console.error(`Checking ${runs.length} page views at ${origin}...`);
console.error(`Diagnostics: ${fileURLToPath(out)}`);
const firstPass = await checkAll(runs, concurrency, false);
const failed = firstPass.size ? await checkAll([...firstPass.keys()], 1, true) : new Map();
for (const browser of Object.values(browsers)) await browser.close();

const report = [...failed].map(([run, failures]) => `${run.id}\n  ${failures.join('\n  ')}`);
writeFileSync(
  new URL('report.md', out),
  `# Mobile check: ${runs.length} page views, ${failed.size} failed\n\n${report.join('\n\n')}\n`,
);
if (failed.size) {
  console.error(`\n${report.join('\n\n')}\n`);
  console.error(
    `Mobile check failed for ${failed.size} of ${runs.length} page views. Screenshots are in ${fileURLToPath(new URL('shots/', out))}.`,
  );
  process.exit(1);
}
const count = (key) => new Set(runs.map(key)).size;
console.log(
  `Mobile check passed for ${runs.length} page views: ${count((r) => r.route)} pages, ${count((r) => r.device.name)} screen sizes, ${count((r) => r.engine)} browser engines, ${count((r) => r.variant)} variants.`,
);
