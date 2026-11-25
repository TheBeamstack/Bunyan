// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-073 — a plan and an elevation register as `ViewDefinition`s and project through the views registry
 * (imp plan Phase 6 step 2, spec §4.4).
 *
 * Real OCCT, because the claim is that dispatching through the registry returns the SAME drawing
 * `DocumentContext.projectView` does, and a mock has no solid to cut. Each test asserts the dispatched
 * result deep-equals the direct one AND carries curves, so an empty-vs-empty match cannot pass it.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  CORE_VIEWS,
  DocumentContext,
  createRegistries,
  dispatchView,
  viewFor,
} from '@bunyan/document';
import type { Registries, ViewDescriptor } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const T = 200;
const H = 2400;

describe('T-073 — plan and elevation ViewDefinitions dispatch through registries.views', () => {
  let kernel: OcctKernel;
  let client: KernelClient;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  });
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  const setup = (): { doc: DocumentContext; registries: Registries } => {
    const registries = createRegistries();
    registries.types.register(wallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    for (const view of CORE_VIEWS) registries.views.register(view);
    return { doc: new DocumentContext({ registries, geometry: client }), registries };
  };

  const makeWall = async (
    doc: DocumentContext,
    start: readonly [number, number],
    end: readonly [number, number],
    extra: Record<string, unknown> = {},
  ): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start, end, thickness: T, height: H },
        ...extra,
      })
    ).changes[0]!.id;

  const createView = async (
    doc: DocumentContext,
    args: Record<string, unknown>,
  ): Promise<ViewDescriptor> => {
    const id = (await doc.execute('core.createView', { scale: 100, ...args })).changes[0]!.id;
    return doc.scene.views![id]!;
  };

  it('a stored PLAN view dispatched through the registry returns projectView’s ViewResult unchanged', async () => {
    const { doc, registries } = setup();
    await doc.execute('core.createContainer', {
      id: 'L00',
      kind: 'level',
      name: 'Level 00',
      elevation: 0,
    });
    await makeWall(doc, [0, 0], [4000, 0], { containerId: 'L00' });
    const descriptor = await createView(doc, {
      kind: 'plan',
      name: 'Level 00 Plan',
      levelId: 'L00',
      cutHeight: 1200,
    });

    expect(viewFor(registries, descriptor)?.kind).toBe('plan');

    const direct = await doc.projectView(descriptor);
    const dispatched = await dispatchView(registries, doc, descriptor);

    expect(direct.curves.length).toBeGreaterThan(0);
    expect(dispatched).toEqual(direct);
  }, 180000);

  it('a stored ELEVATION view, on geometry crossing its cut plane, dispatches to projectView’s ViewResult unchanged', async () => {
    const { doc, registries } = setup();
    // An elevation's plane passes through the world origin with the look direction as its normal
    // (`cutPlaneFor`), so a wall spanning x = -2000..2000 crosses the x = 0 plane of a +x elevation.
    await makeWall(doc, [-2000, 0], [2000, 0]);
    const descriptor = await createView(doc, {
      kind: 'elevation',
      name: 'East Elevation',
      direction: [1, 0, 0],
    });

    expect(viewFor(registries, descriptor)?.kind).toBe('elevation');

    const direct = await doc.projectView(descriptor);
    const dispatched = await dispatchView(registries, doc, descriptor);

    expect(direct.kind).toBe('elevation');
    expect(direct.curves.length).toBeGreaterThan(0);
    expect(dispatched).toEqual(direct);
  }, 180000);

  it('a kind with no registered view is refused, never answered with an empty drawing', async () => {
    const { doc } = setup();
    const empty = createRegistries();
    const descriptor: ViewDescriptor = {
      id: 'v',
      name: 'Plan',
      scale: 100,
      kind: 'plan',
      levelId: 'L00',
    };
    expect(viewFor(empty, descriptor)).toBeUndefined();
    await expect(dispatchView(empty, doc, descriptor)).rejects.toThrow(/no view registered/);
  });
});
