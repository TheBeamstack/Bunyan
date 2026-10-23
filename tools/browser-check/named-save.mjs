// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

// T-058: a named save of a 16k-solid cached scene, in a real browser, keeps the main thread responsive.
//
//   node tools/browser-check/named-save.mjs --playwright <playwright-core/index.mjs> --browser <chrome>
//
// One foreground run: writes the 16k `.bnn` (the T-058 test under BUNYAN_T058_BNN_OUT), serves
// `apps/web` with Vite's dev server, opens `save-check.html` and saves three times through the app's
// worker path, then once with `saveBnn` on the main thread (the control: the observer must see that
// deflate). Exits 0 only when every worker save holds the main thread under 200 ms (the longer of the
// longest Long Tasks entry and the widest 0 ms timer gap), the control holds it longer, and every save is the same size. Playwright is not a repo dependency: pass any installed
// `playwright-core` entry point.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const playwright = arg('playwright');
const executablePath = arg('browser');
if (playwright === undefined || executablePath === undefined) {
  console.error('usage: named-save.mjs --playwright <playwright-core entry> --browser <chrome>');
  process.exit(2);
}
const repo = fileURLToPath(new URL('../../', import.meta.url));
const web = join(repo, 'apps/web');

const bnn = join(mkdtempSync(join(tmpdir(), 't058-')), 'save-check.bnn');
const gen = spawnSync(
  'npx',
  ['vitest', 'run', 'tests/app-named-save-zip-worker-t058.test.ts', '-t', '16k'],
  { cwd: repo, env: { ...process.env, BUNYAN_T058_BNN_OUT: bnn }, encoding: 'utf8' },
);
if (gen.status !== 0 || !existsSync(bnn)) {
  console.error(gen.stdout, gen.stderr);
  process.exit(1);
}
const body = readFileSync(bnn);
console.log(`[T-058] wrote the 16k-solid .bnn, ${String(body.length)} B`);

const vitePath = createRequire(join(web, 'package.json')).resolve('vite');
const { createServer } = await import(pathToFileURL(vitePath).href);
const server = await createServer({
  root: web,
  configFile: join(web, 'vite.config.ts'),
  server: { port: 5199, strictPort: true, host: '127.0.0.1' },
  logLevel: 'error',
});
await server.listen();

const { chromium } = await import(playwright);
const browser = await chromium.launch({ executablePath, headless: true });
const results = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error(`pageerror: ${e.message}`));
  await page.route('**/save-check.bnn', (route) =>
    route.fulfill({ body, contentType: 'application/octet-stream' }),
  );
  await page.goto('http://127.0.0.1:5199/save-check.html');
  await page.waitForFunction(() => window.__saveCheckReady !== undefined, null, {
    timeout: 300_000,
  });
  const ready = await page.evaluate(() => window.__saveCheckReady);
  console.log(`[T-058] Chromium ${browser.version()} opened ${JSON.stringify(ready)}`);
  if ('error' in ready) throw new Error(ready.error);
  for (const mode of ['worker', 'worker', 'worker', 'main']) {
    await page.waitForTimeout(1000);
    const result = await page.evaluate((m) => window.__saveCheck(m), mode);
    console.log(`[T-058] ${JSON.stringify(result)}`);
    results.push(result);
  }
} finally {
  await browser.close();
  await server.close();
}

const worker = results.filter((r) => r.mode === 'worker');
const control = results.find((r) => r.mode === 'main');
const sameBytes = worker.every((r) => r.bytes === control.bytes);
const held = (r) => Math.max(r.longestTaskMs, r.maxGapMs);
const ok = worker.every((r) => held(r) < 200) && held(control) >= 200 && sameBytes;
console.log(
  `[T-058] ${ok ? 'PASS' : 'FAIL'} (every save the size saveBnn writes: ${String(sameBytes)})`,
);
process.exit(ok ? 0 : 1);
