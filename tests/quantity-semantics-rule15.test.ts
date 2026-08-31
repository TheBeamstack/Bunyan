// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ DOMAIN RULE 15 — *"A quantity is MEASURED, never reconstructed"* / *"it must never emit a WRONG one
 * wearing the `exact` badge."* Real OCCT, headless. (Entry 60's follow-on backward sweep.)
 *
 * **THE FINDING THAT OPENED THIS FILE, AND IT IS THE STRONGEST KIND — THE PACKAGE CONTRADICTED ITSELF.**
 * Inside one `CleanDeltaQuantity`, under one `basis: 'exact'`:
 *
 *   - `volume` was **measured on the B-Rep** — join-aware, correct;
 *   - `length` was **reconstructed from the `{start,end}` param** — join-blind.
 *
 * Measured on a butted partition: `length` reported **2.00 m** while the built solid ran **1.9 m**, and
 * `volume / (thickness × height)` agreed with the solid, not with `length`. A consumer could catch Bunyan
 * disagreeing with itself from the package alone.
 *
 * ⚠ **THE EXPOSURE WAS WIDENED BY THIS SESSION'S OWN D69 FIX, WHICH IS WHY IT WAS SWEPT.** Before D69 a
 * butt happened only when an author explicitly called `core.setJoin(…,'butt')` — rare. D69 made every
 * mid-span T butt automatically, so a *rare* discrepancy became *every interior partition in the
 * building*. Entry 58's standing lesson applies to one's own work first: **a surface going green is when
 * the sweep should START, not when it can be skipped.**
 *
 * ⚠ Freeze-Gate ⓗ's original reasoning still stands and is NOT overturned: `length` must not be
 * `measure.edgeLength` (the sum of every edge of a solid is meaningless as a schedule quantity). "Not
 * edgeLength" simply never implied "the raw authored baseline" — the built AXIS is the third option, and
 * it is the one a QS bills.
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
  exportCleanDelta,
} from '@bunyan/document';
import type { ExportOptions, Registries, Scene } from '@bunyan/document';
import { openingType, wallType } from '@bunyan/types';

const T = 200;
const H = 2500;

describe('domain rule 15 — a quantity is measured, never reconstructed', () => {
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

  const newRegistries = (): Registries => {
    const r = createRegistries();
    r.types.register(wallType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    return r;
  };

  const priorContext = (): NonNullable<ExportOptions['priorContext']> => ({
    registries: newRegistries(),
    geometry: client,
    create: (scene: Scene) =>
      new DocumentContext({ registries: newRegistries(), geometry: client, scene }),
  });

  it('⚠⚠ a butted partition reports its BUILT axis length, not its authored baseline', async () => {
    const doc = new DocumentContext({ registries: newRegistries(), geometry: client });
    const mk = async (s: readonly [number, number], e: readonly [number, number]) =>
      (
        await doc.execute('core.createElement', {
          typeId: 'core.wall',
          params: { start: s, end: e, thickness: T, height: H },
        })
      ).changes[0]!.id;

    await mk([0, 0], [4000, 0]); // the through wall, centreline y = 0
    const partition = await mk([2000, 0], [2000, 2000]); // butts onto its near face at y = +100

    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;
    await doc.execute('core.setParams', { elementId: partition, params: { height: 2600 } });
    await doc.execute('core.issueRevision', { by: 'architect' });

    const pkg = await exportCleanDelta(doc, { since: rev1, priorContext: priorContext() });
    const row = pkg.elements.find((e) => e.pei === partition)!;

    // The baseline is 2000 mm; the butt cuts 100 mm (the through wall's half-thickness) off the start.
    // Measured failing first at 2.0 — the authored baseline, wearing `basis: 'exact'`.
    expect(row.quantity!.canonical.length).toBeCloseTo(1.9, 6);

    // ⚠ THE INTERNAL-CONSISTENCY GATE, and it is the real assertion: the package must not contradict
    // itself. `volume` is measured; if `length` disagrees with `volume / (t × h)`, one of them is a lie.
    const impliedLength = row.quantity!.canonical.volume / ((T / 1000) * (2600 / 1000));
    expect(row.quantity!.canonical.length).toBeCloseTo(impliedLength, 6);
    expect(row.quantity!.basis).toBe('exact');
  });

  it('an UNJOINED wall still reports its full baseline — the fix changes only what a join changed', async () => {
    const doc = new DocumentContext({ registries: newRegistries(), geometry: client });
    const lone = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end: [6000, 0], thickness: T, height: H },
      })
    ).changes[0]!.id;

    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;
    await doc.execute('core.setParams', { elementId: lone, params: { height: 2600 } });
    await doc.execute('core.issueRevision', { by: 'architect' });

    const pkg = await exportCleanDelta(doc, { since: rev1, priorContext: priorContext() });
    const row = pkg.elements.find((e) => e.pei === lone)!;

    // ⚠ Purely additive in effect: with nothing to join to, the built axis IS the baseline. Every
    // existing document that has no joins reports exactly what it reported before.
    expect(row.quantity!.canonical.length).toBeCloseTo(6.0, 6);
  });
});

/* ================================================================================================
 * §2 — THE BILLABLE AREA (D72). `area` was the solid's TOTAL ENCLOSING SURFACE.
 * ============================================================================================= */

describe('domain rule 15 — `area` is the face a trade bills, not the solid’s whole boundary', () => {
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

  /** A 5 × 3 m wall, three layers: 200 structure / 80 insulation / 20 finish. */
  const layeredWall = async (): Promise<{ doc: DocumentContext; id: string }> => {
    const r = createRegistries();
    r.types.register(wallType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    const doc = new DocumentContext({ registries: r, geometry: client });

    await doc.execute('core.createMaterial', {
      id: 'blockwork',
      name: 'Blockwork',
      category: 'masonry',
      density: 1800,
    });
    await doc.execute('core.createStyle', {
      id: 'EXT',
      name: 'EXT',
      typeId: wallType.id,
      layers: [
        { name: 'structure', materialId: 'blockwork', thickness: 200, discipline: 'structural' },
        { name: 'insulation', materialId: 'blockwork', thickness: 80, discipline: 'architectural' },
        { name: 'finish', materialId: 'blockwork', thickness: 20, discipline: 'architectural' },
      ],
    });
    const id = (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        styleId: 'EXT',
        params: { start: [0, 0], end: [5000, 0], height: 3000 },
      })
    ).changes[0]!.id;
    return { doc, id };
  };

  const M2 = 1e6;

  it('⚠⚠ a layered wall bills its two OUTER faces — 30 m², not the 94.80 m² of total surface', async () => {
    const { doc, id } = await layeredWall();
    const q = await doc.quantities(id);

    const byName = new Map(q.parts.map((p) => [p.name, p.area / M2]));
    // Measured failing first at structure 33.20 / insulation 31.28 / finish 30.32, summing to 94.80.
    expect(byName.get('structure')).toBeCloseTo(15, 6); // its outward a-side
    expect(byName.get('finish')).toBeCloseTo(15, 6); // the outward b-side of the last layer
    // ⚠ THE ONE WHOSE RIGHT ANSWER IS ZERO — buried between two neighbours, it has no surface at all.
    // An `exposedRefs: []` that fell back to "said nothing" would report 31.28 m² here.
    expect(byName.get('insulation')).toBeCloseTo(0, 6);

    const sum = q.parts.reduce((s, p) => s + p.area, 0) / M2;
    expect(sum).toBeCloseTo(30, 6); // the wall's two real faces, and nothing else
    expect(q.basis).toBe('exact');
  });

  it('a SINGLE-layer wall bills both of its faces — the common case, obviously right', async () => {
    const r = createRegistries();
    r.types.register(wallType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    const doc = new DocumentContext({ registries: r, geometry: client });
    const id = (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        params: { start: [0, 0], end: [5000, 0], thickness: 200, height: 3000 },
      })
    ).changes[0]!.id;

    const q = await doc.quantities(id);
    expect(q.parts[0]!.area / M2).toBeCloseTo(30, 6); // 2 × 5 × 3 — both sides, no caps, no top/bottom
  });
});

/* ================================================================================================
 * §3 — OPENINGS. Owner-ruled convention: NET of the opening, reveals EXCLUDED.
 * ============================================================================================= */

describe('domain rule 15 — a door subtracts from the billable face and its reveals do not count', () => {
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

  it('⚠⚠ a 1 × 2 m opening takes 2 m² off EACH face — 30 m² becomes 26 m², reveals excluded', async () => {
    const r = createRegistries();
    r.types.register(wallType);
    r.types.register(openingType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    const doc = new DocumentContext({ registries: r, geometry: client });

    const wallId = (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        params: { start: [0, 0], end: [5000, 0], thickness: 200, height: 3000 },
      })
    ).changes[0]!.id;

    const before = (await doc.quantities(wallId)).parts[0]!.area / 1e6;
    expect(before).toBeCloseTo(30, 6); // both faces of a single-layer wall

    const hostFace = doc.partsOf(wallId)![0]!.refs.find((ref) => ref.includes('/face/lateral.1'))!;
    await doc.execute('core.createElement', {
      typeId: openingType.id,
      hostId: wallId,
      hostRef: hostFace,
      params: { width: 1000, height: 2000, offsetU: 1500, offsetV: 0 },
    });

    const after = (await doc.quantities(wallId)).parts[0]!.area / 1e6;

    // ⚠ THE RULING, ASSERTED: the hole comes off BOTH faces it pierces (2 m² each), and the four reveal
    // returns it creates — which are real surface on the solid, and which the old total-surface number
    // would have ADDED — are different faces and are not billed. A door making a wall's paintable area
    // GO UP is the shape of wrongness this whole sweep is about.
    expect(after).toBeCloseTo(26, 6);
    expect(after).toBeLessThan(before);
  });
});
