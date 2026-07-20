/**
 * WALL-TO-WALL JOINS (D50 step 0c, `P5_step0c_design.md`) — against the REAL OCCT kernel, headless.
 *
 * ⚠⚠ THE HEADLINE IS THE ANTI-FUSE GATE (§7.1, §4h): two walls meet at a corner, they join, and a window
 * hosted on a wall's SIDE face STILL RESOLVES — its host token byte-identical. A join reshapes only the
 * cap; it re-owns no face (D26). If this is green, the join is not a fuse; if it were a fuse, D1 is dead.
 *
 * The rest: the miter cleans the corner, a butt override lands the cap on the neighbour's face, the join is
 * ASSOCIATIVE (move a wall, its neighbour's corner follows — the bidirectional 0a edge), deleting a wall
 * reverts its neighbour and clears the override, a composite wall miters every layer, and a joined model
 * round-trips from `scene.json` alone.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  createRegistries,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import { wallType } from '@bunyan/types';
import { openingType } from './fixtures/bim-types.js';

const T = 200; // wall thickness (mm)
const H = 2400; // wall height (mm)

describe('wall-to-wall joins — the anti-fuse corner (D50 step 0c)', () => {
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

  /** A single-layer baseline wall from `start` to `end`. Returns its element id. */
  const wall = async (
    doc: DocumentContext,
    start: readonly [number, number],
    end: readonly [number, number],
  ): Promise<string> => {
    const edit = await doc.execute('core.createElement', {
      typeId: 'core.wall',
      params: { start, end, thickness: T, height: H },
    });
    return edit.changes[0]!.id;
  };

  /** The bounds of a wall's part (the single `wall` layer unless named). */
  const wallBounds = async (doc: DocumentContext, id: string, part = 'wall') => {
    const p = doc.partsOf(id)!.find((q) => q.name === part)!;
    return (await client.request('bounds', { handle: p.handle })).bounds;
  };

  /** The `lateral.1` side-face token of a wall's part — the window-hosting face. */
  const sideFace = (doc: DocumentContext, id: string, part = 'wall'): string => {
    const p = doc.partsOf(id)!.find((q) => q.name === part)!;
    return p.refs.find((r) => r.includes('/face/lateral.1'))!;
  };

  /* ============================================================================================
   * §7.1 — THE ANTI-FUSE GATE
   * ========================================================================================= */

  it('⚠⚠ a window on a wall SIDE FACE survives the corner being joined — its host token is byte-identical', async () => {
    const doc = newDoc();
    // Wall A runs east from the corner; wall B will meet it at the origin.
    const a = await wall(doc, [0, 0], [4000, 0]);
    const host = sideFace(doc, a); // a-side, the y = −T/2 face — nowhere near the cap

    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: a,
      hostRef: host,
      params: { width: 800, height: 1000, anchor: 'fixed', offsetU: 1500, offsetV: 700 },
    });
    expect(doc.brokenRefs()).toHaveLength(0);
    const holedVolume = (await doc.quantities(a)).parts[0]!.volume;

    // Now bring a second wall into the corner. It AUTO-MITERS against A (owner-ruled Q3).
    await wall(doc, [0, 0], [0, 3000]);

    // ⚠⚠ THE CLAIM: the join moved A's CAP, not its side. The window's host face is the SAME derivation
    // path, it still resolves, and the window still removes exactly its own slice. A fuse would have
    // re-owned this face and broken the window retroactively (measured, Entry 12).
    expect(doc.brokenRefs(), 'the join broke a hosted window — it fused').toHaveLength(0);
    expect(sideFace(doc, a)).toBe(host); // byte-identical token
    expect((await doc.quantities(a)).parts[0]!.volume).toBeCloseTo(holedVolume, 6);
  });

  /* ============================================================================================
   * §7.2 / §7.3 — THE CORNER GEOMETRY
   * ========================================================================================= */

  it('⚠ auto-miter: the wall’s cap is cut on the bisector — its footprint reaches past the corner', async () => {
    const doc = newDoc();
    const a = await wall(doc, [0, 0], [4000, 0]);
    const soloMin = (await wallBounds(doc, a)).min[0];
    expect(soloMin).toBeCloseTo(0, 6); // a plain wall starts exactly at the baseline end

    await wall(doc, [0, 0], [0, 3000]); // 90° corner ⇒ 45° miter through the origin
    // The a-side (y = −100) meets the y = x miter line at (−100, −100): the cap now reaches x = −100.
    expect((await wallBounds(doc, a)).min[0]).toBeCloseTo(-T / 2, 3);
  });

  it('⚠ a butt override lands the butting wall’s cap flush on the through wall’s face', async () => {
    const doc = newDoc();
    const a = await wall(doc, [0, 0], [4000, 0]); // A butts into B
    const b = await wall(doc, [0, 0], [0, 3000]); // B runs north, its east face at x = +100
    await doc.execute('core.setJoin', { element: a, other: b, resolution: 'butt' });

    // A now stops at B's near face (x = +T/2), perpendicular — its whole start edge sits at x = 100.
    const bounds = await wallBounds(doc, a);
    expect(bounds.min[0]).toBeCloseTo(T / 2, 3);
    // B is the THROUGH wall — untouched by the butt (its cap is still its own).
    expect((await wallBounds(doc, b)).min[1]).toBeCloseTo(0, 6);
  });

  it('a `none` override disallows the join — both walls stay plain boxes', async () => {
    const doc = newDoc();
    const a = await wall(doc, [0, 0], [4000, 0]);
    const b = await wall(doc, [0, 0], [0, 3000]);
    await doc.execute('core.setJoin', { element: a, other: b, resolution: 'none' });
    expect((await wallBounds(doc, a)).min[0]).toBeCloseTo(0, 6); // no miter — a plain perpendicular cap
    expect((await wallBounds(doc, b)).min[1]).toBeCloseTo(0, 6);
  });

  /* ============================================================================================
   * §7.4 — ASSOCIATIVITY (the bidirectional 0a edge)
   * ========================================================================================= */

  it('⚠⚠ move a wall, and its neighbour’s miter FOLLOWS (the bidirectional join edge)', async () => {
    const doc = newDoc();
    const a = await wall(doc, [0, 0], [4000, 0]);
    await wall(doc, [0, 0], [0, 3000]);
    const before = (await wallBounds(doc, a)).min[0];
    expect(before).toBeCloseTo(-T / 2, 3); // the 45° miter

    // Swing B round to a NE diagonal (still sharing the corner). A never moved — but its corner must.
    const bId = Object.values(doc.scene.elements).find(
      (e) => e.id !== a && Array.isArray(e.params['end']),
    )!.id;
    await doc.execute('core.setParams', { elementId: bId, params: { end: [3000, 3000] } });

    // The miter line rotated ⇒ A's cap reaches further along −x. If the join edge were missing, A would
    // keep its stale −100 cap and this would read −100, not past −150.
    expect((await wallBounds(doc, a)).min[0]).toBeLessThan(-150);
  });

  /* ============================================================================================
   * §7.5 — DELETION reverts the neighbour and clears the override
   * ========================================================================================= */

  it('deleting a wall reverts its neighbour to a plain cap and clears any override', async () => {
    const doc = newDoc();
    const a = await wall(doc, [0, 0], [4000, 0]);
    const b = await wall(doc, [0, 0], [0, 3000]);
    await doc.execute('core.setJoin', { element: a, other: b, resolution: 'none' });
    // The override exists.
    expect(Object.values(doc.scene.constraints).some((c) => c.kind === 'join')).toBe(true);

    await doc.execute('core.deleteElement', { elementId: b });
    // A no longer finds a partner ⇒ plain cap again; the dangling override is gone.
    expect((await wallBounds(doc, a)).min[0]).toBeCloseTo(0, 6);
    expect(Object.values(doc.scene.constraints).some((c) => c.kind === 'join')).toBe(false);
  });

  /* ============================================================================================
   * §7.6 — a COMPOSITE wall miters every layer, and a window still cuts them all
   * ========================================================================================= */

  it('⚠ a joined COMPOSITE wall miters every layer, and a window pierces all of them', async () => {
    const doc = newDoc();
    for (const [id, name, category, density] of [
      ['plaster', 'Plaster', 'finish', 1200],
      ['block', 'Blockwork', 'masonry', 2000],
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
    const a = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        styleId: 'EXT',
        params: { start: [0, 0], end: [4000, 0], height: H },
      })
    ).changes[0]!.id;

    const host = sideFace(doc, a, 'finish');
    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: a,
      hostRef: host,
      params: { width: 800, height: 1000, anchor: 'fixed', offsetU: 1500, offsetV: 700 },
    });
    // Each layer lost the window's own slice (width × height × its thickness) — cut through ALL layers.
    const slice = (t: number) => 800 * 1000 * t;
    const full = (t: number) => 4000 * t * H;
    const holed = (await doc.quantities(a)).parts.map((p) => p.volume);
    expect(holed[0]!).toBeCloseTo(full(20) - slice(20), 3); // finish pierced
    expect(holed[1]!).toBeCloseTo(full(180) - slice(180), 3); // structure pierced

    await wall(doc, [0, 0], [0, 3000]); // auto-miter the corner
    // ⚠ The window survives the join: still resolves, still on the same face token.
    expect(doc.brokenRefs()).toHaveLength(0);
    expect(sideFace(doc, a, 'finish')).toBe(host);
    // ⚠ EVERY layer got mitered — its cap now reaches past the corner (min x < 0), not just the structure.
    // (A join that mitred only one layer would be the same class of bug as a window piercing only one.)
    for (const name of ['finish', 'structure']) {
      expect((await wallBounds(doc, a, name)).min[0]).toBeLessThan(-1);
    }
  });

  /* ============================================================================================
   * §7.7 — round-trip: the override is in the recipe, so it survives save→load
   * ========================================================================================= */

  it('a joined model round-trips from scene.json alone — geometry identical, override survives', async () => {
    const doc = newDoc();
    const a = await wall(doc, [0, 0], [4000, 0]);
    const b = await wall(doc, [0, 0], [0, 3000]);
    await doc.execute('core.setJoin', { element: a, other: b, resolution: 'butt' });
    const before = await wallBounds(doc, a);

    const loaded = loadBnn(saveBnn(doc.scene, { kernelBuildId: 'test' }));
    const reopened = new DocumentContext({
      registries: (() => {
        const r = createRegistries();
        r.types.register(wallType);
        r.types.register(openingType);
        for (const command of CORE_COMMANDS) r.commands.register(command);
        return r;
      })(),
      geometry: client,
      scene: loaded.scene,
    });
    await reopened.rebuildAll();

    expect(Object.values(reopened.scene.constraints).some((c) => c.kind === 'join')).toBe(true);
    const after = await wallBounds(reopened, a);
    expect(after.min[0]).toBeCloseTo(before.min[0], 6); // the butt cap rebuilt identically
    expect(after.max[0]).toBeCloseTo(before.max[0], 6);
  });
});
