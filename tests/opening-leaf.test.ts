/**
 * ⓙ — A HOSTED ELEMENT BUILDS A SOLID, NOT ONLY A HOLE (P5 step 5, `review_P5.md` #2) — against the REAL
 * OCCT kernel, headless.
 *
 * ⚠⚠ THE HEADLINE (§1): the real `core.opening` Door, hosted on the real composite `core.wall`, cuts the
 * hole AND builds a leaf + a frame — two Parts, two Materials — and `quantities()` measures the door per
 * part, per material. Before ⓙ the build engine called `buildVoid` only and pushed `parts: []`, so a door
 * was a hole; `quantities()` on it THREW ("no built geometry"). If §1 is green, a door is a door.
 *
 * The rest: the hole and the leaf come from ONE face frame so they cannot drift (§2); rebuilding the door
 * many times does not leak its old leaf on the WASM heap (§3 — the void-supersede fix, the Entry-21
 * pattern); and an un-hosted door is `unbuildable`, never a crash (§4 — a door is a solid ONLY in a wall,
 * which is why the leaf is `buildLeaf`, not `buildGeometry`).
 *
 * ⚠ REVERT-VERIFY (per §1b): §1 fails if the `buildLeaf` wire is removed from `build.ts`; §3 fails if the
 * void-supersede line is removed from `document.ts`. A fix without a test that breaks on its revert is an
 * assertion, not a fix.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import { openingType, wallType } from '@bunyan/types';

const H = 2400; // wall height (mm)
const TW = 200; // wall thickness = finish 20 + structure 180

// Door geometry (mm). Chosen to sit clear of the wall's edges (no tangential boolean).
const DW = 900;
const DH = 1600;
const FRAME = 50;
const LEAF_T = 40;
const LEAF_W = DW - 2 * FRAME; // 800
const LEAF_H = DH - 2 * FRAME; // 1500

describe('ⓙ — a hosted Door builds a leaf + frame, not only a hole (P5 step 5)', () => {
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
    registries.types.register(openingType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({ registries, geometry: client });
  };

  /** A composite wall (finish + structure) with a Door hosted on its outer finish side-face. */
  const wallWithDoor = async (
    doc: DocumentContext,
    door: Record<string, unknown> = {},
  ): Promise<{ wall: string; doorId: string }> => {
    for (const [id, name, category, density] of [
      ['plaster', 'Plaster', 'finish', 1200],
      ['block', 'Blockwork', 'masonry', 2000],
      ['oak', 'Oak leaf', 'timber', 600],
      ['hardwood', 'Hardwood frame', 'timber', 750],
    ] as const) {
      await doc.execute('core.createMaterial', { id, name, category, density });
    }
    await doc.execute('core.createStyle', {
      id: 'EXT',
      name: 'EXT',
      typeId: 'core.wall',
      layers: [
        { name: 'finish', materialId: 'plaster', thickness: 20, discipline: 'architectural' },
        { name: 'structure', materialId: 'block', thickness: 180, discipline: 'structural' },
      ],
    });
    const wall = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        styleId: 'EXT',
        params: { start: [0, 0], end: [4000, 0], height: H },
      })
    ).changes[0]!.id;

    const finish = doc.partsOf(wall)!.find((p) => p.name === 'finish')!;
    const host = finish.refs.find((r) => r.includes('/face/lateral.1'))!;
    const doorId = (
      await doc.execute('core.createElement', {
        typeId: 'core.opening',
        hostId: wall,
        hostRef: host,
        params: {
          width: DW,
          height: DH,
          offsetU: 2000, // Revit's model: distance from the wall start ⇒ centred on the 4000 baseline
          offsetV: 0,
          leafThickness: LEAF_T,
          frameWidth: FRAME,
          leafMaterialId: 'oak',
          frameMaterialId: 'hardwood',
          ...door,
        },
      })
    ).changes[0]!.id;
    return { wall, doorId };
  };

  /* ============================================================================================
   * §1 — THE HEADLINE: the door has parts, and they are measured per part, per material.
   * ========================================================================================= */

  it('⚠⚠ the Door builds a leaf + a frame — two parts, two materials, both measured (not a hole)', async () => {
    const doc = newDoc();
    const { wall, doorId } = await wallWithDoor(doc);
    expect(doc.brokenRefs()).toHaveLength(0);

    // The host still has its hole: each layer lost the door's full width×height slice (cut through ALL).
    const holed = (await doc.quantities(wall)).parts;
    expect(holed[0]!.volume).toBeCloseTo(4000 * 20 * H - DW * DH * 20, 2); // finish pierced
    expect(holed[1]!.volume).toBeCloseTo(4000 * 180 * H - DW * DH * 180, 2); // structure pierced

    // ⚠⚠ THE DOOR ITSELF NOW HAS GEOMETRY — before ⓙ this was `parts: []` and the next line THREW.
    const q = await doc.quantities(doorId);
    expect(q.parts.map((p) => p.name)).toEqual(['leaf', 'frame']);

    const leaf = q.parts.find((p) => p.name === 'leaf')!;
    const frame = q.parts.find((p) => p.name === 'frame')!;

    // Real B-Rep volumes — the leaf is a panel, the frame is a full-depth lining ring.
    expect(leaf.volume).toBeCloseTo(LEAF_W * LEAF_H * LEAF_T, 2);
    expect(frame.volume).toBeCloseTo((DW * DH - LEAF_W * LEAF_H) * TW, 2);

    // ⚠ PER PART, PER MATERIAL (D30/D45) — the door schedules its OWN timber, from each Material's own
    // density, never a hole and never a hardcoded number. Two parts, two materials, two distinct masses.
    expect(leaf.materialName).toBe('Oak leaf');
    expect(frame.materialName).toBe('Hardwood frame');
    expect(leaf.mass).toBeCloseTo(((LEAF_W * LEAF_H * LEAF_T) / 1e9) * 600, 5);
    expect(frame.mass).toBeCloseTo((((DW * DH - LEAF_W * LEAF_H) * TW) / 1e9) * 750, 5);
    expect(leaf.discipline).toBe('architectural');
  });

  /* ============================================================================================
   * §2 — the hole and the leaf share ONE frame, so the leaf sits INSIDE the hole.
   * ========================================================================================= */

  it('⚠ the leaf lands inside the hole the void cut — one face frame, so they cannot drift apart', async () => {
    const doc = newDoc();
    const { doorId } = await wallWithDoor(doc);
    const leaf = doc.partsOf(doorId)!.find((p) => p.name === 'leaf')!;
    const bounds = (await client.request('bounds', { handle: leaf.handle })).bounds;

    // The wall runs along +X with its finish face at y = −(TW/2 + …); the leaf spans LEAF_W in X and
    // LEAF_H in Z (offsetU = 2000 from the wall start ⇒ centred on the 4000 baseline; offsetV = 0 ⇒ mid-height).
    expect(bounds.max[0] - bounds.min[0]).toBeCloseTo(LEAF_W, 2); // width along the wall
    expect(bounds.max[2] - bounds.min[2]).toBeCloseTo(LEAF_H, 2); // height up the wall
    expect(bounds.max[1] - bounds.min[1]).toBeCloseTo(LEAF_T, 2); // thin through the wall
    // Centred: the leaf mid-height sits at the wall's mid-height, and its X-centre at the wall's mid-length.
    expect((bounds.min[0] + bounds.max[0]) / 2).toBeCloseTo(2000, 1);
    expect((bounds.min[2] + bounds.max[2]) / 2).toBeCloseTo(H / 2, 1);
  });

  /* ============================================================================================
   * §3 — rebuilding the door does NOT leak its old leaf on the WASM heap (the void-supersede fix).
   * ========================================================================================= */

  it('⚠⚠ re-staging the door frees its previous leaf — no heap leak across rebuilds (Entry 21 pattern)', async () => {
    const doc = newDoc();
    const { doorId } = await wallWithDoor(doc);
    // Settle at a known width, measure the WASM side's OWN live-handle count (the independent witness).
    await doc.execute('core.setParams', { elementId: doorId, params: { width: DW } });
    const before = kernel.wasmLiveHandles();

    // Re-stage the door assembly many times. Each rebuild replaces the door's leaf + frame; if their old
    // handles were not freed (void never marked superseded), this leaks ≥2 solids per rebuild.
    for (let i = 0; i < 6; i++) {
      await doc.execute('core.setParams', { elementId: doorId, params: { width: DW + (i % 2) } });
    }
    await doc.execute('core.setParams', { elementId: doorId, params: { width: DW } });

    expect(
      kernel.wasmLiveHandles(),
      'the rebuilt door leaked its previous leaf/frame on the heap',
    ).toBe(before);
  });

  /* ============================================================================================
   * §4 — an un-hosted door is `unbuildable`, not a crash: a door is a solid ONLY in a wall.
   * ========================================================================================= */

  it('⚠ an opening with no host is unbuildable (a door is `buildLeaf`, not `buildGeometry`) — the doc survives', async () => {
    const doc = newDoc();
    // A door standing on its own — no hostId. Its `buildLeaf` needs a host frame it does not have, so the
    // engine must never try to build it standalone; it is carried as `failed`, not thrown (D43).
    const doorId = (
      await doc.execute('core.createElement', {
        typeId: 'core.opening',
        params: { width: DW, height: DH },
      })
    ).changes[0]!.id;

    const geometry = doc.geometryOf(doorId);
    expect(geometry?.state).toBe('failed');
    expect(geometry?.failure).toBe('unbuildable');
    expect(geometry?.parts ?? []).toHaveLength(0);
    // The document is unharmed — it still opens, still edits.
    expect(doc.scene.elements[doorId]).toBeDefined();
  });
});
