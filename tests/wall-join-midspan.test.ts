// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * MID-SPAN / T-JUNCTION WALL JOINS — real OCCT, headless.
 *
 * ⚠⚠ WHY THIS FILE CHANGED (Entry 60, the rule-16 backward sweep). It used to LOCK IN the absence of
 * mid-span joins as a recorded limit (`review_P5.md` #4), and it asserted exactly two things: the
 * partition's cap stays at its baseline, and `core.setJoin` refuses the pair. Both were true. **Neither
 * asked what the limit did to a QUANTITY** — and that is the question domain rule 16 exists to ask.
 *
 * **The measurement that reopened it:** a 4000×200×2400 through wall and a 2000-long partition whose end
 * lands on its mid-span reported **2.8800 m³ where 2.8320 m³ is the truth** — the partition's last 100 mm
 * sits *inside* the through wall, so 0.048 m³ of blockwork exists in BOTH B-Reps and is counted twice, with
 * `unmeasured: []` and `basis: 'exact'`. The old test asserted `min[1] ≈ 0` — i.e. it pinned the
 * partition's cap at the through wall's CENTRELINE, and called it a limit.
 *
 * ⚠ The over-report is FIXED PER JUNCTION (`t_partition × t_through/2 × height`), independent of wall
 * length ⇒ it scales with the NUMBER of partitions, and a T is the commonest interior condition there is.
 *
 * **The rule it breaks, verbatim (`core_logic.md` rule 16, D45/D46):** *"⇒ A quantity can never
 * double-count."* The chronology is §1c-8's exactly: rule 16 landed 2026-07-13, the join resolver shipped
 * 07-20, `projectQuantities` began summing over these solids 07-25 — and no one swept the rule backward
 * over the geometry that already existed.
 *
 * ⚠ FREEZE-SAFE, exactly as `review_P5.md` #4 predicted and this file used to record: detection relaxes a
 * precondition (an endpoint on the other's SEGMENT rather than on its ENDPOINT — both read from the
 * `{start,end}` PARAMS, recipe-is-truth, D1-safe), and `{element, other, resolution:'butt'}` already keys
 * the junction uniquely, because two straight baselines meet at at most one point. **No new frozen field,
 * no `SCENE_SCHEMA_VERSION` bump.**
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

describe('mid-span / T-junction joins — the rule-16 double count (Entry 60)', () => {
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

  const wall = async (
    doc: DocumentContext,
    start: readonly [number, number],
    end: readonly [number, number],
  ): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start, end, thickness: T, height: H },
      })
    ).changes[0]!.id;

  const bounds = async (doc: DocumentContext, id: string) => {
    const p = doc.partsOf(id)!.find((q) => q.name === 'wall')!;
    return (await client.request('bounds', { handle: p.handle })).bounds;
  };

  const sideFace = (doc: DocumentContext, id: string): string =>
    doc
      .partsOf(id)!
      .find((q) => q.name === 'wall')!
      .refs.find((r) => r.includes('/face/lateral.1'))!;

  /** The through wall B, and the partition A whose END lands on B's mid-span. */
  const tJunction = async (doc: DocumentContext) => {
    const through = await wall(doc, [0, 0], [4000, 0]);
    const partition = await wall(doc, [2000, 0], [2000, 2000]);
    return { through, partition };
  };

  /* ============================================================================================
   * §1 — THE RULE-16 GATE. This is the test the old file did not have.
   * ========================================================================================= */

  it('⚠⚠ RULE 16: a T-junction does not double-count — the project total is the OCCUPIED volume', async () => {
    const doc = newDoc();
    await tJunction(doc);

    const q = await doc.projectQuantities();
    const reported = q.rows.reduce((sum, r) => sum + r.part.volume, 0);

    // The truth: two boxes minus the corner they would otherwise share. The partition's baseline starts
    // on the through wall's CENTRELINE, so without a join its first half-thickness is inside it.
    const truth = 4000 * T * H + 2000 * T * H - T * (T / 2) * H;

    expect(q.unmeasured).toEqual([]);
    expect(q.basis).toBe('exact');
    // Measured failing first at 2_880_000_000 (a 1.69% over-report on two walls).
    expect(reported).toBeCloseTo(truth, 0);
  });

  /* ============================================================================================
   * §2 — THE GEOMETRY THAT MAKES IT TRUE
   * ========================================================================================= */

  it('a partition meeting a wall MID-SPAN auto-butts onto its near face', async () => {
    const doc = newDoc();
    const { partition } = await tJunction(doc);

    expect(doc.brokenRefs()).toHaveLength(0);
    // The cap lands on the through wall's near FACE (y = +T/2), not on its centreline (y = 0).
    expect((await bounds(doc, partition)).min[1]).toBeCloseTo(T / 2, 6);
  });

  it('the join is DIRECTIONAL — the through wall is untouched (it runs through)', async () => {
    const doc = newDoc();
    const { through } = await tJunction(doc);

    const b = await bounds(doc, through);
    expect(b.min[0]).toBeCloseTo(0, 6);
    expect(b.max[0]).toBeCloseTo(4000, 6);
    expect(b.min[1]).toBeCloseTo(-T / 2, 6);
    expect(b.max[1]).toBeCloseTo(T / 2, 6);
  });

  it('⚠ ANTI-FUSE (D26): the partition keeps its side-face token across the butt', async () => {
    const doc = newDoc();
    // Authored AWAY from the wall first, so the token predates any join…
    const through = await wall(doc, [0, 0], [4000, 0]);
    const partition = await wall(doc, [2000, 900], [2000, 2000]);
    const before = sideFace(doc, partition);

    // …then dragged onto the through wall's mid-span, which butts it.
    await doc.execute('core.setParams', {
      elementId: partition,
      params: { start: [2000, 0], end: [2000, 2000] },
    });

    expect(sideFace(doc, partition)).toBe(before);
    expect(doc.brokenRefs()).toHaveLength(0);
    expect((await bounds(doc, partition)).min[1]).toBeCloseTo(T / 2, 6);
    expect(through).toBeTruthy();
  });

  /* ============================================================================================
   * §3 — THE OVERRIDE AND THE AMBIGUITY RULE
   * ========================================================================================= */

  it('`core.setJoin` now ACCEPTS a mid-span pair, and `none` restores the plain cap', async () => {
    const doc = newDoc();
    const { through, partition } = await tJunction(doc);

    // Disallow Join — the author's explicit choice to leave the walls as separate boxes.
    await doc.execute('core.setJoin', {
      element: partition,
      other: through,
      resolution: 'none',
    });
    expect((await bounds(doc, partition)).min[1]).toBeCloseTo(0, 6);
  });

  it('an ambiguous crowd falls back to the default cap, exactly as a corner does', async () => {
    const doc = newDoc();
    // TWO through walls crossing the same point ⇒ which face should the partition stop on? Neither.
    await wall(doc, [0, 0], [4000, 0]);
    const second = await wall(doc, [0, -500], [4000, 500]); // also passes through [2000, 0]
    const partition = await wall(doc, [2000, 0], [2000, 2000]);

    expect(doc.brokenRefs()).toHaveLength(0);
    // Conservative: no cap line, the wall draws its own perpendicular end (the corner-crowd rule).
    expect((await bounds(doc, partition)).min[1]).toBeCloseTo(0, 6);

    // ⚠ AND THE CONTROL — proving it was the AMBIGUITY that suppressed the butt, not a failure to
    // detect the T at all. Delete the second through wall and the partition butts immediately.
    await doc.execute('core.deleteElement', { elementId: second });
    expect((await bounds(doc, partition)).min[1]).toBeCloseTo(T / 2, 6);
  });

  /* ============================================================================================
   * §4 — THE INVALIDATOR EDGE. Move the through wall and the partition's cap must follow.
   * ========================================================================================= */

  it('⚠ ASSOCIATIVE: thickening the through wall re-stages the partition it carries', async () => {
    const doc = newDoc();
    const { through, partition } = await tJunction(doc);
    expect((await bounds(doc, partition)).min[1]).toBeCloseTo(T / 2, 6);

    // A fatter through wall ⇒ its near face moves ⇒ the partition's butt cap must move with it. If the
    // invalidator misses this edge, the partition keeps a stale solid — the silent class (0a's `#touched`).
    await doc.execute('core.setParams', {
      elementId: through,
      params: { thickness: 400 },
    });

    expect((await bounds(doc, partition)).min[1]).toBeCloseTo(200, 6);
  });
});
