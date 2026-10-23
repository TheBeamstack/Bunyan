// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The named-save responsiveness check (`save-check.html`, T-058): opens `/save-check.bnn` and exposes
 * `window.__saveCheck(mode)`, which runs one named save of it and reports the longest main-thread task.
 * `worker` is the app's save (`saveDocument` + the zip worker, into IndexedDB); `main` is `saveBnn` on the
 * main thread, the control that shows the observer sees the deflate. Driven by
 * `tools/browser-check/named-save.mjs`.
 */

import { loadBnn, saveBnn, type SaveOptions } from '@bunyan/document';

import { createStore, saveDocument, spawnBnnZipper } from './documentStorage';

export interface SaveCheckResult {
  readonly mode: 'worker' | 'main';
  readonly ms: number;
  readonly longestTaskMs: number;
  readonly longTasks: number;
  /** The widest gap between two runs of a 0 ms timer chain: the longest the main thread was held. */
  readonly maxGapMs: number;
  readonly bytes: number;
}

declare global {
  interface Window {
    __saveCheckReady?: { cacheEntries: number; fileBytes: number } | { error: string };
    __saveCheck?: (mode: 'worker' | 'main') => Promise<SaveCheckResult>;
  }
}

const log = (line: string): void => {
  document.getElementById('log')!.textContent += `${line}\n`;
};

const frame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });

async function main(): Promise<void> {
  const file = new Uint8Array(await (await fetch('/save-check.bnn')).arrayBuffer());
  const pkg = loadBnn(file);
  const reader = pkg.cache;
  if (reader === undefined) throw new Error('save-check.bnn carries no geometry cache');
  const cache = Object.fromEntries(reader.readMany(reader.names));
  const options: SaveOptions = { kernelBuildId: pkg.manifest.kernelBuildId, journal: [], cache };
  const store = createStore();
  const zipper = spawnBnnZipper();

  window.__saveCheck = async (mode) => {
    // Two independent views of a stall: Long Tasks entries, and the widest gap a 0 ms timer chain sees.
    const tasks: number[] = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) tasks.push(entry.duration);
    });
    observer.observe({ type: 'longtask' });
    let beating = true;
    let last = performance.now();
    let maxGapMs = 0;
    const beat = (): void => {
      const now = performance.now();
      maxGapMs = Math.max(maxGapMs, now - last);
      last = now;
      if (beating) setTimeout(beat, 0);
    };
    setTimeout(beat, 0);
    await frame();
    const start = performance.now();
    let bytes: number;
    if (mode === 'worker') {
      const key = await saveDocument(store, 'save-check', pkg.scene, options, zipper);
      bytes = (await store.read(key))!.length;
    } else {
      bytes = saveBnn(pkg.scene, options).length;
    }
    const ms = performance.now() - start;
    await frame();
    await frame();
    beating = false;
    for (const entry of observer.takeRecords()) tasks.push(entry.duration);
    observer.disconnect();
    const result = {
      mode,
      ms,
      longestTaskMs: Math.max(0, ...tasks),
      longTasks: tasks.length,
      maxGapMs,
      bytes,
    };
    log(JSON.stringify(result));
    return result;
  };
  window.__saveCheckReady = { cacheEntries: reader.names.length, fileBytes: file.length };
  log(JSON.stringify(window.__saveCheckReady));
}

main().catch((error: unknown) => {
  window.__saveCheckReady = { error: String(error) };
  log(`error: ${String(error)}`);
});
