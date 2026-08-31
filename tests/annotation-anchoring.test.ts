// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GATE ⑨ — 2D-ANNOTATION ANCHORING survives a resize (Freeze-Gate ⑨, D49) — real OCCT, headless.
 *
 * ⚠ THE FREEZE QUESTION: 2D documentation (dimensions/tags) ships in v1.0.x, but its anchoring CONTRACT
 * freezes now (D49) — an annotation is a persistent reference to an **element id** + one or more
 * **`SubShapeRef`s** (+ the reserved `kind:'vertex'`). Do the FROZEN refs suffice to anchor a dimension that
 * survives a host edit, or does 2D documentation need a new frozen field?
 *
 * ⚠⚠ THE ANSWER, MODELLED HERE: the frozen shapes SUFFICE — no new field. A "dimension" between two faces of
 * a wall is just `{ elementId, [refA, refB] }`. After the wall is RESIZED, both `SubShapeRef`s still resolve
 * (byte-identical derivation-path tokens, D1 — never geometric indices), the element id is unchanged (a ULID
 * PEI, D44), and the dimension's VALUE re-derives from the live geometry. That is exactly a Revit dimension:
 * a stable anchor, a derived value. So a v1.0.x annotation collection is purely additive over the frozen refs.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const T = 200;
const H = 2400;

describe('gate ⑨ — a SubShapeRef-anchored dimension survives a resize (D49)', () => {
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

  const newDoc = (): DocumentContext => {
    const registries = createRegistries();
    registries.types.register(wallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({ registries, geometry: client });
  };

  /** A length dimension = the two end-cap faces (`lateral.0` = start, `lateral.2` = end). Its VALUE is the
   * distance between their centres along the wall; its ANCHOR is the two refs — this is what an annotation
   * would persist. Returns the two refs + the derived length. */
  const lengthDimension = async (
    doc: DocumentContext,
    id: string,
  ): Promise<{ refs: [string, string]; value: number }> => {
    const part = doc.partsOf(id)!.find((p) => p.name === 'wall')!;
    const startCap = part.refs.find((r) => r.includes('/face/lateral.0'))!;
    const endCap = part.refs.find((r) => r.includes('/face/lateral.2'))!;
    const a = (await client.request('bounds', { handle: part.handle, ref: startCap })).bounds;
    const b = (await client.request('bounds', { handle: part.handle, ref: endCap })).bounds;
    const centreX = (bb: typeof a): number => (bb.min[0] + bb.max[0]) / 2;
    return { refs: [startCap, endCap], value: centreX(b) - centreX(a) };
  };

  it('⚠⚠ a dimension anchored to two SubShapeRefs keeps its anchor byte-identical and re-derives its value', async () => {
    const doc = newDoc();
    const wall = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end: [3000, 0], thickness: T, height: H },
      })
    ).changes[0]!.id;

    // AUTHOR THE ANNOTATION: persist { elementId, [refA, refB] }. This is all a v1.0.x dimension stores.
    const before = await lengthDimension(doc, wall);
    expect(before.value).toBeCloseTo(3000, 3);

    // RESIZE THE HOST — drag the end from 3000 to 5000 (D52 `setParams{end}`, the commonest edit).
    await doc.execute('core.setParams', { elementId: wall, params: { end: [5000, 0] } });

    const after = await lengthDimension(doc, wall);

    // ⚠⚠ THE ANCHOR IS STABLE: both SubShapeRefs are byte-identical across the rebuild (D1 — a derivation
    // path, not a geometric index). An index-based anchor would have silently re-pointed here.
    expect(after.refs).toEqual(before.refs);
    // ⚠ THE ELEMENT ID (the tag anchor) is unchanged — a ULID PEI, assigned once, never reused (D44).
    expect(doc.scene.elements[wall]).toBeDefined();
    // ⚠ THE VALUE RE-DERIVES from the live geometry: the dimension now reads 5000, not a stale 3000.
    expect(after.value).toBeCloseTo(5000, 3);
    expect(doc.brokenRefs()).toHaveLength(0);
  });
});
