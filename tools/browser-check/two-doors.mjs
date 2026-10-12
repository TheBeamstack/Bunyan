// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

// T-010 (Q18, D84): two doors clicked onto ONE wall with the Opening tool, in a real browser.
//
//   pnpm --dir apps/web dev --port 5199 --strictPort --host 127.0.0.1     # in another shell
//   node tools/browser-check/two-doors.mjs --playwright <playwright-core/index.mjs> \
//        --browser <chrome binary> [--url http://127.0.0.1:5199/]
//
// Playwright is not a repo dependency: pass any installed `playwright-core` entry point. Exits 0 only
// when the boot logs no console error and both clicks come back `valid` with parts [leaf, frame].

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const playwright = arg('playwright');
const executablePath = arg('browser');
const url = arg('url', 'http://127.0.0.1:5199/');
if (playwright === undefined || executablePath === undefined) {
  console.error(
    'usage: two-doors.mjs --playwright <playwright-core entry> --browser <chrome> [--url]',
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
const bootErrors = [...consoleErrors];

// World → pixel through the Viewport's boot camera (`Viewport.ts`: position, target, +Z up, fov 50).
const C = [6000, 5000, 8000];
const T = [2000, 500, 1400];
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a) => a.map((v) => v / Math.hypot(...a));
const zc = unit(sub(C, T));
const xc = unit(cross([0, 0, 1], zc));
const yc = cross(zc, xc);
const box = await page.locator('canvas').first().boundingBox();
const toPx = (p) => {
  const d = sub(p, C);
  const v = [dot(xc, d), dot(yc, d), dot(zc, d)];
  const t = Math.tan((50 * Math.PI) / 360);
  const nx = v[0] / -v[2] / (t * (box.width / box.height));
  const ny = v[1] / -v[2] / t;
  return [box.x + ((nx + 1) / 2) * box.width, box.y + ((1 - ny) / 2) * box.height];
};

await page.getByRole('button', { name: 'Opening', exact: true }).click();

// Both points are on the seed's Wall 1 ((0,0)→(4000,0)) and low enough to seat each door on the floor
// (offsetV −350) — the Entry 80 gesture whose second click came back `broken-ref`. x = 3000 would
// land on Wall 2, which occludes Wall 1's far end from this camera.
const clicks = [];
for (const x of [1000, 2300]) {
  const [px, py] = toPx([x, 0, 500]);
  await page.mouse.move(px, py);
  await page.waitForTimeout(500);
  const hover = await page.locator('.tool-hover').textContent();
  await page.mouse.click(px, py);
  await page
    .waitForFunction(
      (n) => window.bunyan.query({ typeId: 'core.opening' }).length >= n,
      clicks.length + 1,
      { timeout: 30_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    openings: window.bunyan.query({ typeId: 'core.opening' }).map((e) => ({
      id: e.id,
      hostId: e.hostId,
      state: e.state,
      parts: e.parts.map((p) => p.name),
    })),
    brokenRefs: window.bunyan.brokenRefs(),
  }));
  clicks.push({ x, hover, ...after });
}
const version = browser.version();
await browser.close();

const last = clicks.at(-1);
const hostIds = new Set(last.openings.map((o) => o.hostId));
const pass =
  bootErrors.length === 0 &&
  last.openings.length === 2 &&
  hostIds.size === 1 &&
  last.brokenRefs.length === 0 &&
  last.openings.every((o) => o.state === 'valid' && o.parts.join(',') === 'leaf,frame');
console.log(JSON.stringify({ browser: version, bootErrors, consoleErrors, clicks, pass }, null, 2));
process.exit(pass ? 0 : 1);
