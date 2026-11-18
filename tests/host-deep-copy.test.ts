// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-036 — `core.copy` deep-copies a host's openings (D94, owner-ruled `D-20261007-04`; D51, D44, D1).
 * Against the REAL OCCT kernel, on the demo scene's D52 walls that T-051 made copyable.
 *
 * Revert-check: restore the hosted refusal in `copyCommand` (or drop `copies` from its edit) and the first
 * block goes red.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { decodeSubShapeRef } from '@bunyan/protocol';
import {
  CORE_COMMANDS,
  CommandFailure,
  DocumentContext,
  createRegistries,
  partNodeId,
} from '@bunyan/document';
import type { ParamValue } from '@bunyan/document';
import { openingType, wallType } from '@bunyan/types';
import { createPlanegcsSolver } from '@bunyan/sketch-solver';
import type { PlanegcsSolver } from '@bunyan/sketch-solver';
import { seedDemoScene } from '../apps/web/src/scaffold/seed.js';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

describe('T-036: core.copy deep-copies a host’s openings (D94)', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let planegcs: PlanegcsSolver;
  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
    planegcs = await createPlanegcsSolver();
  });
  afterAll(() => {
    planegcs.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  /** The demo scene, its first wall hosting two openings on two different faces. */
  const hostWithOpenings = async () => {
    const r = createRegistries();
    r.types.register(wallType);
    r.types.register(openingType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    const doc = new DocumentContext({ registries: r, geometry: client });
    await seedDemoScene(doc);
    const walls = Object.values(doc.scene.elements)
      .filter((e) => e.typeId === 'core.wall')
      .map((w) => w.id);
    const refs = doc.partsOf(walls[0]!)![0]!.refs;
    const openings: string[] = [];
    for (const [lateral, offsetU] of [
      ['lateral.1', 1000],
      ['lateral.3', 2500],
    ] as const) {
      const edit = await doc.execute('core.createElement', {
        typeId: 'core.opening',
        hostId: walls[0]!,
        hostRef: refs.find((r) => r.includes(`/face/${lateral}#`))!,
        params: { width: 900, height: 2100, offsetU },
      });
      openings.push(edit.changes[0]!.id);
    }
    return { doc, walls, host: walls[0]!, openings };
  };

  const failureOf = (p: Promise<unknown>) =>
    p.then(() => undefined).catch((e: unknown) => e as CommandFailure);

  it('copying a host with N openings yields N fresh openings on the copy, all valid; the source is unchanged', async () => {
    const { doc, host, openings } = await hostWithOpenings();
    const source = structuredClone(doc.scene.elements);
    const ids = new Set(Object.keys(doc.scene.elements));

    const edit = await doc.execute('core.copy', { elementId: host, by: [0, 5000, 0] });

    const copyId = edit.changes[0]!.id;
    const fresh = edit.changes.filter((c) => c.collection === 'elements').map((c) => c.id);
    expect(fresh).toHaveLength(1 + openings.length);
    for (const id of fresh) expect(ids.has(id)).toBe(false); // fresh PEIs (D44)
    expect(new Set(fresh).size).toBe(fresh.length);

    const copied = fresh.slice(1).map((id) => doc.scene.elements[id]!);
    const copyRefs = doc.partsOf(copyId)!.flatMap((p) => p.refs);
    copied.forEach((opening, i) => {
      const from = source[openings[i]!]!;
      expect(opening.hostId).toBe(copyId);
      expect(opening.params).toEqual(from.params);
      // The copy's own build minted this face: same part, kind, role and occurrence, on the copy's node.
      expect(copyRefs).toContain(opening.hostRef);
      const was = decodeSubShapeRef(from.hostRef!)!;
      expect(decodeSubShapeRef(opening.hostRef!)).toEqual({
        ...was,
        nodeId: partNodeId(copyId, was.nodeId.slice(host.length + 1)),
      });
    });

    const states = new Map(doc.modelElements().map((e) => [e.id, e.state]));
    for (const id of fresh) expect(states.get(id), id).toBe('valid');
    for (const id of openings) expect(states.get(id), id).toBe('valid');
    for (const [id, el] of Object.entries(source)) expect(doc.scene.elements[id], id).toEqual(el);
    expect(doc.brokenRefs()).toEqual([]);
  }, 120_000);

  it('one edit, one undo; dryRun names the openings it would copy; brokenRefs() stays empty', async () => {
    const { doc, host, openings } = await hostWithOpenings();
    const before = structuredClone(doc.scene);

    const dry = await doc.execute(
      'core.copy',
      { elementId: host, by: [0, 5000, 0] },
      { dryRun: true },
    );
    expect(doc.scene).toEqual(before);
    const named = dry.changes.filter((c) => c.collection === 'elements').slice(1);
    expect(named.map((c) => (c.after as { hostId?: string }).hostId)).toEqual(
      openings.map(() => dry.changes[0]!.id),
    );
    expect(named).toHaveLength(openings.length);

    await doc.execute('core.copy', { elementId: host, by: [0, 5000, 0] });
    expect(doc.brokenRefs()).toEqual([]);
    // One undo removes the copy AND its openings: it was one edit.
    await doc.undo();
    expect(doc.scene).toEqual(before);
    expect(doc.brokenRefs()).toEqual([]);
  }, 120_000);

  it('a join override pointing at the source still refuses, unchanged', async () => {
    const { doc, walls } = await hostWithOpenings();
    await doc.execute('core.setJoin', { element: walls[0]!, other: walls[1]!, resolution: 'butt' });
    const failure = await failureOf(
      doc.execute('core.copy', { elementId: walls[0]!, by: [0, 5000, 0] }),
    );
    expect(failure?.code).toBe('REFUSED');
    expect(failure?.message).toMatch(/cannot be copied exactly: join override/);
  });

  it('a sketch constraint pointing at the source still refuses, unchanged', async () => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client, sketchSolver: planegcs });
    const sketch = {
      points: [
        { id: 'A', x: 0, y: 0, fixed: true },
        { id: 'B', x: 3000, y: 0, fixed: false },
        { id: 'C', x: 3000, y: 2000, fixed: false },
        { id: 'D', x: 0, y: 2000, fixed: false },
      ],
      segments: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'D' },
        { from: 'D', to: 'A' },
      ],
    };
    const id = (
      await doc.execute('core.createElement', {
        typeId: 'core.sketchProfile.v1',
        params: { sketch: sketch as unknown as ParamValue, thickness: 200 },
      })
    ).changes[0]!.id;
    await doc.execute('core.createSketchConstraint', {
      element: id,
      kind: 'horizontal',
      segments: [0],
    });
    const failure = await failureOf(doc.execute('core.copy', { elementId: id, by: [5000, 0, 0] }));
    expect(failure?.code).toBe('REFUSED');
    expect(failure?.message).toMatch(/cannot be copied exactly: sketch constraint/);
  });
});
