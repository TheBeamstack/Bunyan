// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-056 — a save's zip step can run in a worker and write the bytes `saveBnn` writes
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §5; spec §6.5, T-047). The entries cross a
 * `structuredClone`, as a `postMessage` to a worker would carry them. The cached case is R4's 20-solid
 * fixture (`fixtures/d29-cache-fixture.ts`) on real OCCT.
 *
 * REVERT-VERIFY: in `bnnzip.ts` `zipBnnEntries`, level 5 turns the cached case red and a 1980-01-02 mtime both
 * cases, against the independent `zipSync` reference (the cache-less entries deflate alike at 5 and 6).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { assembleBnnEntries, emptyScene, saveBnn, zipBnnEntries } from '@bunyan/document';
import type { GeometryCacheFiles, SaveOptions, Scene } from '@bunyan/document';
import { KERNEL_BUILD_ID, buildD29CacheFixture } from './fixtures/d29-cache-fixture.js';

/** The worker path, and an independent reference: `zipSync` at level 6 with the 1980 local-time mtime. */
const expectWorkerBytesEqualSave = (scene: Scene, options: SaveOptions): void => {
  const entries = structuredClone(assembleBnnEntries(scene, options));
  const fromWorker = zipBnnEntries(entries);
  const saved = Buffer.from(saveBnn(scene, options));
  expect(Buffer.from(fromWorker).equals(saved), 'worker bytes equal saveBnn').toBe(true);
  const reference = zipSync(entries, { level: 6, mtime: new Date(1980, 0, 1) });
  expect(Buffer.from(reference).equals(saved), 'saveBnn equals the reference zip').toBe(true);
};

describe('T-056 — the zip step a worker runs writes saveBnn bytes', () => {
  let scene: Scene;
  let cache: GeometryCacheFiles;

  beforeAll(async () => {
    ({ scene, cache } = await buildD29CacheFixture());
  }, 180_000);

  it('the 20-solid fixture with its cache', () => {
    const solids = Object.keys(cache).filter((name) => name.endsWith('.brep'));
    expect(solids).toHaveLength(20);
    expectWorkerBytesEqualSave(scene, { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache });
  });

  it('a scene without a cache', () => {
    expectWorkerBytesEqualSave(emptyScene(), { kernelBuildId: KERNEL_BUILD_ID, journal: [] });
  });
});
