// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

// T-019 (D80): select Wall 1, grab its corner handle, drag it, undo once — in a real browser.
//
//   pnpm --dir apps/web dev --port 5199 --strictPort --host 127.0.0.1     # in another shell
//   node tools/browser-check/corner-drag.mjs --playwright <playwright-core/index.mjs> \
//        --browser <chrome binary> [--url http://127.0.0.1:5199/]
//
// Exits 0 only when: the shared corner moves on both walls under one transactionId; one Ctrl+Z restores
// both; `changeFeed()` does not grow mid-gesture; `brokenRefs()`/`unbuildable()` stay empty throughout;
// and a fixed world point's projection stays put through the gesture while the SAME drag with nothing
// selected (the control) orbits the camera.
//
// ⚠ `orbitSuppressed` is BYTE-IDENTICAL, as T-019's done-when words it: a per-frame
// `OrbitControls.update()` once drifted the camera ~1e-12 px with no input, and a tolerance hid it.

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const playwright = arg('playwright');
const executablePath = arg('browser');
const url = arg('url', 'http://127.0.0.1:5199/');
if (playwright === undefined || executablePath === undefined) {
  console.error(
    'usage: corner-drag.mjs --playwright <playwright-core entry> --browser <chrome> [--url]',
  );
  process.exit(2);
}
const { chromium } = await import(playwright);

const consoleErrors = [];
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(`${m.text()} @ ${m.location().url}`);
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

await page.goto(url);
await page.waitForFunction(
  () => window.bunyan !== undefined && window.bunyan.query({ typeId: 'core.wall' }).length === 2,
  null,
  { timeout: 120_000 },
);
await page.waitForTimeout(1000);

// The live `Viewport`, reached through React's fiber on the canvas: `ViewportCanvas`'s second hook is
// `viewportRef`. Read-only; nothing in the app is changed to expose it.
const project = (point) =>
  page.evaluate((p) => {
    const canvas = document.querySelector('canvas.viewport-canvas');
    const key = Object.keys(canvas).find((k) => k.startsWith('__reactFiber$'));
    const viewport = canvas[key].return.memoizedState.next.memoizedState.current;
    const xy = viewport.project(p);
    const rect = canvas.getBoundingClientRect();
    return xy === null ? null : [xy[0] + rect.left, xy[1] + rect.top];
  }, point);

const state = () =>
  page.evaluate(() => {
    const walls = Object.fromEntries(
      window.bunyan.query({ typeId: 'core.wall' }).map((w) => [w.name, w.params]),
    );
    return {
      wall1: { start: walls['Wall 1'].start, end: walls['Wall 1'].end },
      wall2: { start: walls['Wall 2'].start, end: walls['Wall 2'].end },
      feed: window.bunyan.changeFeed().length,
      brokenRefs: window.bunyan.brokenRefs().length,
      unbuildable: window.bunyan.unbuildable().length,
    };
  });

const FIXED = [0, 0, 0];
const before = { ...(await state()), fixedPx: await project(FIXED) };

// Select Wall 1 by clicking its face (the Select tool is active at boot).
const face = await project([1000, 0, 500]);
await page.mouse.click(face[0], face[1]);
await page.waitForTimeout(800);

const handlePx = await project([4000, 0, 0]);
const targetPx = await project([4500, 500, 0]);
const drag = async (from, to, midGesture = async () => {}) => {
  await page.mouse.move(from[0], from[1]);
  await page.waitForTimeout(200);
  await page.mouse.down();
  const STEPS = 10;
  for (let i = 1; i <= STEPS; i++) {
    const t = i / STEPS;
    await page.mouse.move(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    await page.waitForTimeout(30);
  }
  await midGesture();
  await page.mouse.up();
};
let during;
await drag(handlePx, targetPx, async () => {
  during = { ...(await state()), fixedPx: await project(FIXED) };
});
await page.waitForFunction((n) => window.bunyan.changeFeed().length > n, before.feed, {
  timeout: 30_000,
});
await page.waitForTimeout(1500);
const dropped = { ...(await state()), fixedPx: await project(FIXED) };
const dropEdits = await page.evaluate(
  (n) =>
    window.bunyan
      .changeFeed()
      .slice(n)
      .map((e) => ({ seq: e.seq, command: e.command, transactionId: e.transactionId })),
  before.feed,
);

await page.keyboard.press('Control+z');
await page.waitForTimeout(2000);
const undone = { ...(await state()), fixedPx: await project(FIXED) };

// The control: Esc clears the selection (no handles), then the identical pointer path is an orbit.
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await drag(handlePx, targetPx);
await page.waitForTimeout(1500);
const control = { ...(await state()), fixedPx: await project(FIXED) };

const version = browser.version();
await browser.close();

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const moved = (s) => Math.hypot(s.fixedPx[0] - before.fixedPx[0], s.fixedPx[1] - before.fixedPx[1]);
const drift = { during: moved(during), dropped: moved(dropped), undone: moved(undone) };
const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 5;
const txIds = new Set(dropEdits.map((e) => e.transactionId));
const checks = {
  noFeedGrowthMidGesture: during.feed === before.feed,
  cornerUnmovedMidGesture: same(during.wall1, before.wall1) && same(during.wall2, before.wall2),
  bothWallsMoved:
    near(dropped.wall1.end, [4500, 500]) && same(dropped.wall1.end, dropped.wall2.start),
  otherEndsUntouched:
    same(dropped.wall1.start, before.wall1.start) && same(dropped.wall2.end, before.wall2.end),
  oneTransaction: dropEdits.length === 2 && txIds.size === 1 && !txIds.has(undefined),
  oneUndoRestores: same(undone.wall1, before.wall1) && same(undone.wall2, before.wall2),
  orbitSuppressed: [during, dropped, undone].every((s) => same(s.fixedPx, before.fixedPx)),
  controlOrbits: moved(control) > 10,
  controlCommitsNothing: control.feed === undone.feed,
  diagnosticsEmpty: [before, during, dropped, undone].every(
    (s) => s.brokenRefs === 0 && s.unbuildable === 0,
  ),
  noConsoleErrors: consoleErrors.length === 0,
};
const pass = Object.values(checks).every(Boolean);
console.log(
  JSON.stringify(
    {
      browser: version,
      before,
      during,
      dropped,
      dropEdits,
      undone,
      control,
      drift: { ...drift, control: moved(control) },
      consoleErrors,
      checks,
      pass,
    },
    null,
    2,
  ),
);
process.exit(pass ? 0 : 1);
