// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R7 — autosave omits the geometry cache (`D-20261012-07`, default `omit` applied 2026-10-20; design
 * `P5_step9_D29_bnn_cache_design.md` §5, spec §7, T-045). Headless; no kernel.
 *
 * REVERT-VERIFY: pass `options` to `saveBnn` unchanged in `Autosave.snapshotScene` and both tests go red
 * (recorded in the T-045 handoff).
 */

import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { Autosave, MemoryStore, emptyScene, loadBnn } from '@bunyan/document';
import type { Element, GeometryCacheFiles, Scene } from '@bunyan/document';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
const encoder = new TextEncoder();

function fixture(): Scene {
  const wall: Element = {
    id: 'W1',
    typeId: 'core.wall',
    typeVersion: 1,
    params: { start: [0, 0], end: [5000, 0], thickness: 200, height: 2400 },
    classification: { ifcClass: 'IfcWall', loadBearing: false },
  };
  return { ...emptyScene(), elements: { W1: wall } };
}

const cache: GeometryCacheFiles = {
  'index.json': encoder.encode(JSON.stringify({ envelope: { cache: 'bnnc1' }, roots: {} })),
  'W1/0.brep': encoder.encode('DBRep_DrawableShape W1\n'.repeat(64)),
};

describe('D29 R7 — an autosave snapshot carries the design only (D-20261012-07: omit)', () => {
  it('drops a cache the caller hands it, and the recovered file carries no cache reader', async () => {
    const store = new MemoryStore();
    await new Autosave(store).snapshotScene(fixture(), { kernelBuildId: KERNEL_BUILD_ID, cache });

    const recovered = await new Autosave(store).latest();
    expect(recovered).toBeDefined();
    const pkg = loadBnn(recovered ?? new Uint8Array());
    expect(pkg.cache).toBeUndefined();
    expect(pkg.scene.elements).toEqual(fixture().elements);
  });

  it('writes no geometry-cache/ entry into the snapshot zip', async () => {
    const store = new MemoryStore();
    const key = await new Autosave(store).snapshotScene(fixture(), {
      kernelBuildId: KERNEL_BUILD_ID,
      cache,
    });
    const entries = Object.keys(unzipSync((await store.read(key)) ?? new Uint8Array()));
    expect(entries.sort()).toEqual(['manifest.json', 'scene.json']);
  });
});
