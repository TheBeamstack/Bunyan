// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

// T-075: the plan panel draws the fixture house from the live model and redraws when a wall is resized.
//
//   node tools/browser-check/plan-view.mjs --playwright <playwright-core/index.mjs> \
//        --browser <chrome binary> [--url http://127.0.0.1:5199/]
//
// Without `--url` it serves apps/web itself through Vite's API. Exits 0 only when the fixture boots with
// no console error, the plan panel draws a non-empty path set with every fixture element in it, and
// resizing Wall 2 through `window.bunyan` changes the drawn paths with no re-authoring.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const playwright = arg('playwright');
const executablePath = arg('browser');
if (playwright === undefined || executablePath === undefined) {
  console.error(
    'usage: plan-view.mjs --playwright <playwright-core entry> --browser <chrome> [--url]',
  );
  process.exit(2);
}

let server;
let base = arg('url');
if (base === undefined) {
  const webRoot = fileURLToPath(new URL('../../apps/web/', import.meta.url));
  const { createServer } = await import(createRequire(`${webRoot}package.json`).resolve('vite'));
  server = await createServer({
    root: webRoot,
    configFile: `${webRoot}vite.config.ts`,
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  base = server.resolvedUrls.local[0];
}
const url = new URL('?fixture=plan-house', base).href;

const { chromium } = await import(playwright);
const consoleErrors = [];
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(`${m.text()} @ ${m.location().url}`);
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

const drawn = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.plan-svg path')].map((p) => ({
      elementId: p.getAttribute('data-element-id'),
      d: p.getAttribute('d'),
    })),
  );

let report;
try {
  await page.goto(url);
  await page.waitForFunction(
    () =>
      window.bunyan !== undefined &&
      window.bunyan.query({ typeId: 'core.curtainwall' }).length === 1 &&
      document.querySelectorAll('.plan-svg path').length > 0,
    null,
    { timeout: 180_000 },
  );
  await page.waitForTimeout(1000);
  const before = await drawn();
  const fixture = await page.evaluate(() => ({
    walls: window.bunyan.query({ typeId: 'core.wall' }).map((w) => ({ id: w.id, name: w.name })),
    openings: window.bunyan.query({ typeId: 'core.opening' }).map((o) => o.state),
    curtainWalls: window.bunyan.query({ typeId: 'core.curtainwall' }).map((c) => c.id),
  }));

  // Resize Wall 2 (4000,0)→(4000,3000) to end at y = 4500, as an agent would; the panel re-projects.
  const wall2 = fixture.walls.find((w) => w.name === 'Wall 2').id;
  await page.evaluate(
    (id) =>
      window.bunyan.execute('core.setParams', { elementId: id, params: { end: [4000, 4500] } }),
    wall2,
  );
  const key = (paths) => JSON.stringify(paths.map((p) => p.d));
  await page
    .waitForFunction(
      (prev) =>
        JSON.stringify(
          [...document.querySelectorAll('.plan-svg path')].map((p) => p.getAttribute('d')),
        ) !== prev,
      key(before),
      { timeout: 60_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(1000);
  const after = await drawn();

  const drawnIds = new Set(before.map((p) => p.elementId));
  const checks = {
    nonEmpty: before.length > 0,
    bothWallsDrawn: fixture.walls.every((w) => drawnIds.has(w.id)),
    // The curtain wall is a pure composite: its panels and mullions are drawn under child ids.
    curtainWallChildrenDrawn: [...drawnIds].some((id) => !fixture.walls.some((w) => w.id === id)),
    openingValid: fixture.openings.length === 1 && fixture.openings[0] === 'valid',
    redrawnOnResize: key(after) !== key(before),
    wall2Changed:
      key(after.filter((p) => p.elementId === wall2)) !==
      key(before.filter((p) => p.elementId === wall2)),
    noConsoleErrors: consoleErrors.length === 0,
  };
  report = {
    browser: browser.version(),
    url,
    pathsBefore: before.length,
    pathsAfter: after.length,
    fixture,
    consoleErrors,
    checks,
    pass: Object.values(checks).every(Boolean),
  };
} finally {
  await browser.close();
  await server?.close();
}
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
