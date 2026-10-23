// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-047 — a `.bnn` saved twice from one scene is byte-identical whatever the wall clock reads (spec §6.5
 * determinism, D71, D76). Headless; no kernel.
 *
 * REVERT-VERIFY: drop the `mtime` option from `zipSync` in `bnn.ts` `saveBnn` and this goes red (recorded in
 * the T-047 handoff).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyScene, saveBnn } from '@bunyan/document';
import type { Scene } from '@bunyan/document';

const scene: Scene = {
  ...emptyScene(),
  elements: {
    w1: {
      id: 'w1',
      typeId: 'core.wall',
      typeVersion: 1,
      params: { start: [0, 0], end: [5000, 0], thickness: 200, height: 2400 },
      classification: { ifcClass: 'IfcWall', loadBearing: false },
    },
  },
};

describe('T-047 saveBnn ignores the wall clock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes identical bytes for two saves more than 2 s apart', () => {
    vi.useFakeTimers();
    const options = { kernelBuildId: 'occt-7.9.3-emcc-6.0.2', journal: [] };
    vi.setSystemTime(new Date(2026, 9, 19, 10, 0, 0));
    const first = saveBnn(scene, options);
    vi.setSystemTime(new Date(2031, 2, 7, 23, 41, 37));
    const second = saveBnn(scene, options);
    expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
  });
});
