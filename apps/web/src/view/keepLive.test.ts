// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The keep-live set and the first-paint order (D66 §3a/§3b, T-006), headless. The frustum is stubbed as
 * a plan-x window: what is under test is what the set does with whatever the camera reports.
 */

import { describe, expect, it } from 'vitest';
import { emptyScene, saveBnn } from '@bunyan/document';
import type { DocumentContext, Element, ElementId, Scene } from '@bunyan/document';
import { buildKeepLive, keepLiveSet, orderByContainer, recipeBounds } from './keepLive';
import type { Bounds, CameraView } from './keepLive';

const wall = (id: string, containerId: string, x: number, extra: Partial<Element> = {}): Element =>
  ({
    id,
    typeId: 'core.wall',
    typeVersion: 1,
    containerId,
    classification: {},
    params: { start: [x, 0], end: [x + 4000, 0], thickness: 200, height: 3000 },
    ...extra,
  }) as unknown as Element;

const opening = (id: string, hostId: string): Element =>
  ({
    id,
    typeId: 'core.opening',
    typeVersion: 1,
    hostId,
    classification: {},
    params: { width: 900, height: 2100 },
  }) as unknown as Element;

/** Three levels at 0 / 3200 / 6400; each level's walls sit at a different plan x. */
function fixture(extra: readonly Element[] = []): Scene {
  const base = emptyScene();
  const level = (id: string, elevation: number) => ({ id, kind: 'level', name: id, elevation });
  const elements: Element[] = [
    wall('a0', 'L0', 0),
    wall('b0', 'L0', 50_000),
    wall('a1', 'L1', 0),
    wall('a2', 'L2', 0),
    opening('door', 'a0'),
    ...extra,
  ];
  return {
    ...base,
    containers: { L0: level('L0', 0), L1: level('L1', 3200), L2: level('L2', 6400) },
    elements: Object.fromEntries(elements.map((e) => [e.id, e])),
  } as unknown as Scene;
}

/** A camera that sees plan x in [lo, hi] at every height. */
const seesX = (lo: number, hi: number, targetZ = 1400): CameraView => ({
  sees: (box: Bounds) => box.max[0] >= lo && box.min[0] <= hi,
  target: [0, 0, targetZ],
});

const registered = (): boolean => true;
const sorted = (ids: readonly ElementId[]): readonly ElementId[] => [...ids].sort();

describe('recipeBounds — where the recipe puts an element before it is built', () => {
  it('spans the padded baseline from the level elevation up by the height', () => {
    const scene = fixture();
    expect(recipeBounds(scene, scene.elements['a1']!)).toEqual({
      min: [-200, -200, 3200],
      max: [4200, 200, 6200],
    });
  });

  it('places a hosted element by its host, and cannot place a placed or baseline-less one', () => {
    const scene = fixture([
      wall('moved', 'L0', 0, { placement: [{ kind: 'translate' }] } as unknown as Partial<Element>),
    ]);
    expect(recipeBounds(scene, scene.elements['door']!)).toEqual(
      recipeBounds(scene, scene.elements['a0']!),
    );
    expect(recipeBounds(scene, scene.elements['moved']!)).toBeUndefined();
    expect(recipeBounds(fixture([opening('orphan', 'gone')]), opening('orphan', 'gone'))).toBe(
      undefined,
    );
  });
});

describe('keepLiveSet — camera, selection, and what only a build can surface', () => {
  it('keeps what the camera sees and defers what it cannot', () => {
    const scene = fixture();
    expect(sorted(keepLiveSet(scene, seesX(-1000, 10_000), [], registered))).toEqual([
      'a0',
      'a1',
      'a2',
      'door',
    ]);
  });

  it('adds the selection even when it is out of view', () => {
    const scene = fixture();
    expect(keepLiveSet(scene, seesX(-1000, 10_000), ['b0'], registered)).toContain('b0');
  });

  it('keeps an unregistered type and a missing host live wherever they are (D43, rule 3)', () => {
    const scene = fixture([
      wall('plugin', 'L0', 90_000, { typeId: 'x.plugin' }),
      opening('o', 'x'),
    ]);
    const live = keepLiveSet(scene, seesX(-1000, 10_000), [], (t) => t !== 'x.plugin');
    expect(live).toContain('plugin');
    expect(live).toContain('o');
  });

  it('keeps an element the recipe cannot place', () => {
    const scene = fixture([wall('free', 'L0', 90_000, { params: { width: 1 } })]);
    expect(keepLiveSet(scene, seesX(-1000, 10_000), [], registered)).toContain('free');
  });
});

describe('orderByContainer — the camera level first, then outward (§3b)', () => {
  it('starts at the level under the target and walks outward, below first on a tie', () => {
    const scene = fixture();
    const ids = ['a0', 'a1', 'a2', 'door'];
    expect(orderByContainer(scene, ids, 4000)).toEqual([['a1'], ['a0', 'door'], ['a2']]);
    expect(orderByContainer(scene, ids, 100)).toEqual([['a0', 'door'], ['a1'], ['a2']]);
    expect(orderByContainer(scene, ids, -500)).toEqual([['a0', 'door'], ['a1'], ['a2']]);
    expect(orderByContainer(scene, [], 0)).toEqual([]);
  });
});

describe('buildKeepLive — rebuildOnly, batch by batch, and nothing persisted', () => {
  function fakeDoc(scene: Scene, builtAlready: readonly ElementId[] = []) {
    const built = new Set<ElementId>(builtAlready);
    const calls: (readonly ElementId[])[] = [];
    const doc = {
      scene,
      registries: { types: { get: () => ({ version: 1 }) } },
      geometryOf: (id: ElementId) => (built.has(id) ? { parts: [] } : undefined),
      rebuildOnly: (ids: Iterable<ElementId>) => {
        const batch = [...ids];
        calls.push(batch);
        for (const id of batch) built.add(id);
        return Promise.resolve();
      },
    } as unknown as DocumentContext;
    return { doc, calls };
  }

  it('builds only the unbuilt keep-live elements, camera level first, painting after each batch', async () => {
    const scene = fixture();
    const { doc, calls } = fakeDoc(scene, ['a2']);
    const painted: (readonly ElementId[])[] = [];
    const count = await buildKeepLive(doc, seesX(-1000, 10_000, 4000), [], (b) => painted.push(b));
    expect(calls).toEqual([['a1'], ['a0', 'door']]);
    expect(painted).toEqual(calls);
    expect(count).toBe(3);
    // A second pass over the same view builds nothing.
    expect(await buildKeepLive(doc, seesX(-1000, 10_000, 4000), [], () => undefined)).toBe(0);
  });

  it('builds an out-of-view element authored against a future Type version (D43)', async () => {
    const scene = fixture([wall('future', 'L0', 90_000, { typeVersion: 2 })]);
    const { doc, calls } = fakeDoc(scene);
    (doc as unknown as { registries: unknown }).registries = {
      types: { get: () => ({ version: 1 }) },
    };
    await buildKeepLive(doc, seesX(-1000, 10_000), [], () => undefined);
    expect(calls.flat()).toContain('future');
  });

  it('never writes the set into the document — scene.json is byte-identical', async () => {
    const scene = fixture();
    const before = saveBnn(scene, { kernelBuildId: 'k' });
    const { doc } = fakeDoc(scene);
    await buildKeepLive(doc, seesX(-1000, 10_000), ['b0'], () => undefined);
    expect(saveBnn(doc.scene, { kernelBuildId: 'k' })).toEqual(before);
  });
});
