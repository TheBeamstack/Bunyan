// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-076 — an `ElevationView` carries an optional `origin`, so a house off the world origin draws
 * (`docs/design/P5_step6C_plan_section_design.md` §10.2 option B, ruled on D-20261125-02).
 *
 * Real OCCT on §10.1's fixture: at main every one of these four elevations returned 0 curves, because
 * `cutPlaneFor` put the plane through [0, 0, 0] and the house sits at x, y ≥ 10000.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries, cutPlaneFor } from '@bunyan/document';
import type { ViewDescriptor } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const CLIP = [
  [9000, 9000, -100],
  [21000, 19000, 2600],
];
const INSIDE: readonly [number, number, number] = [15000, 14000, 1200];
const DIRECTIONS: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [0, 1, 0],
  [-1, 0, 0],
  [0, -1, 0],
];

describe('T-076 — an elevation with an origin cuts a house away from the world origin', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let doc: DocumentContext;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
    const registries = createRegistries();
    registries.types.register(wallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    doc = new DocumentContext({ registries, geometry: client });
    const walls: readonly (readonly [[number, number], [number, number]])[] = [
      [
        [10000, 10000],
        [20000, 10000],
      ],
      [
        [20000, 10000],
        [20000, 18000],
      ],
      [
        [20000, 18000],
        [10000, 18000],
      ],
      [
        [10000, 18000],
        [10000, 10000],
      ],
    ];
    for (const [start, end] of walls) {
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start, end, thickness: 200, height: 2400 },
      });
    }
  }, 180000);
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  const createElevation = async (
    direction: readonly [number, number, number],
    origin?: readonly [number, number, number],
  ): Promise<ViewDescriptor> => {
    const id = (
      await doc.execute('core.createView', {
        kind: 'elevation',
        name: `Elevation ${direction.join(',')}`,
        scale: 100,
        clip: CLIP,
        direction,
        ...(origin === undefined ? {} : { origin }),
      })
    ).changes[0]!.id;
    return doc.scene.views![id]!;
  };

  for (const direction of DIRECTIONS) {
    it(`elevation [${direction.join(', ')}] with an origin inside the house draws curves`, async () => {
      const descriptor = await createElevation(direction, INSIDE);
      expect(descriptor.kind === 'elevation' && descriptor.origin).toEqual(INSIDE);
      const result = await doc.projectView(descriptor);
      expect(result.curves.length).toBeGreaterThan(0);
    }, 180000);
  }

  it('an elevation with no origin still cuts through the world origin, as at main', async () => {
    const descriptor = await createElevation([1, 0, 0]);
    expect('origin' in descriptor).toBe(false);
    expect(cutPlaneFor(descriptor, doc.scene)?.origin).toEqual([0, 0, 0]);
    expect((await doc.projectView(descriptor)).curves.length).toBe(0);
  }, 180000);
});
