// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The named-save responsiveness check (`save-check.html`, T-058, T-060): opens `/save-check.bnn` into a
 * `DocumentContext` whose cache source is that file, and exposes `window.__saveCheck(mode)`, which runs one
 * named save and reports the longest main-thread task. `worker` is the app's save (`namedSaveOptions`, so
 * `doc.geometryCacheFiles()`, then `saveDocument` + the zip worker, into IndexedDB); `main` is `saveBnn`
 * of the same options on the main thread, the control that shows the observer sees the deflate and the
 * HMAC. Driven by `tools/browser-check/named-save.mjs`, whose file is signed with the fixture's secret.
 */

import {
  DocumentContext,
  assembleUnsignedBnnEntries,
  createRegistries,
  loadBnn,
  saveBnn,
  serializeRecords,
  type CacheEnvelope,
  type GeometryGateway,
} from '@bunyan/document';

import {
  createStore,
  namedSaveOptions,
  openCacheIndexInWorker,
  saveDocument,
  spawnBnnZipper,
} from './documentStorage';

export interface SaveCheckResult {
  readonly mode: 'worker' | 'main';
  readonly ms: number;
  readonly longestTaskMs: number;
  readonly longTasks: number;
  /** The widest gap between two runs of a 0 ms timer chain: the longest the main thread was held. */
  readonly maxGapMs: number;
  readonly bytes: number;
  /** `doc.geometryCacheFiles()` alone, after the save: every root's key recomputed and carried (T-060). */
  readonly cacheFilesMs: number;
  /** `serializeRecords` of the records, what the zipper does before it posts them as one buffer (T-064). */
  readonly serializeRecordsMs: number;
  /** `assembleUnsignedBnnEntries` alone: the manifest, `scene.json` and the entry map (T-064). */
  readonly assembleMs: number;
  /** `structuredClone` of the entries, which `postMessage` copies: they are the doc's own buffers (T-064). */
  readonly cloneEntriesMs: number;
}

declare global {
  interface Window {
    __saveCheckReady?:
      | { cacheEntries: number; fileBytes: number; roots: number; openMs: number }
      | { error: string };
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
  const index = reader.readMany(['index.json']).get('index.json')!;
  const { envelope } = JSON.parse(new TextDecoder().decode(index)) as { envelope: CacheEnvelope };
  const doc = new DocumentContext({
    registries: createRegistries(),
    geometry: {} as GeometryGateway, // a save calls no kernel op (design §5)
    scene: pkg.scene,
    // The T-060 test's fixture secret: the file was signed with it, so every record verifies and carries.
    // Opened on the app's cache-open worker, as `bootstrap` does (T-061, T-063).
    geometryCache: {
      files: reader,
      current: envelope,
      installSecret: new Uint8Array(32).fill(7),
      openIndex: openCacheIndexInWorker,
    },
  });
  // The open and the first `geometryCacheFiles()` (every root keyed and parsed); later saves reuse both.
  const opened = performance.now();
  await doc.openGeometryCache();
  const roots = Object.keys(doc.geometryCacheFiles()?.records ?? {}).length;
  const openMs = performance.now() - opened;
  const kernelBuildId = pkg.manifest.kernelBuildId;
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
      const options = namedSaveOptions(doc, kernelBuildId);
      const key = await saveDocument(store, 'save-check', doc.scene, options, zipper);
      bytes = (await store.read(key))!.length;
    } else {
      bytes = saveBnn(doc.scene, namedSaveOptions(doc, kernelBuildId)).length;
    }
    const ms = performance.now() - start;
    await frame();
    await frame();
    beating = false;
    for (const entry of observer.takeRecords()) tasks.push(entry.duration);
    observer.disconnect();
    // The two main-thread costs the worker save still pays, timed alone after it.
    const filesAt = performance.now();
    const options = namedSaveOptions(doc, kernelBuildId);
    const cacheFilesMs = performance.now() - filesAt;
    const assembleAt = performance.now();
    const { entries, signing } = assembleUnsignedBnnEntries(doc.scene, options);
    const assembleMs = performance.now() - assembleAt;
    const cloneAt = performance.now();
    structuredClone(entries);
    const cloneEntriesMs = performance.now() - cloneAt;
    const serializeAt = performance.now();
    if (signing !== undefined) serializeRecords(signing.records);
    const serializeRecordsMs = performance.now() - serializeAt;
    const result = {
      mode,
      ms,
      longestTaskMs: Math.max(0, ...tasks),
      longTasks: tasks.length,
      maxGapMs,
      bytes,
      cacheFilesMs,
      serializeRecordsMs,
      assembleMs,
      cloneEntriesMs,
    };
    log(JSON.stringify(result));
    return result;
  };
  window.__saveCheckReady = {
    cacheEntries: reader.names.length,
    fileBytes: file.length,
    roots,
    openMs,
  };
  log(JSON.stringify(window.__saveCheckReady));
}

main().catch((error: unknown) => {
  window.__saveCheckReady = { error: String(error) };
  log(`error: ${String(error)}`);
});
