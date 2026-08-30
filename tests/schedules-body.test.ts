// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE SCHEDULES BODY (D58 row Ⓐ, `P5_step6B_schedules_design.md`) — the body that turns a
 * `ScheduleDefinition` into rows. Real OCCT throughout, because every number here is measured.
 *
 * ⚠⚠ WHY THIS FILE EXISTS AT ALL, AND WHAT IT IS REALLY GUARDING. The anchoring contract froze green in
 * Entry 47 with a hand-rolled evaluator in its own test — `Object.values(doc.scene.elements)` — that was
 * correct for its fixture (two plain walls) and WRONG on the model in three separate ways. Measured before
 * this body existed (design §1):
 *
 *   a curtain-panel schedule over `scene.elements`     0 rows      where 6 is correct  (1 authored row / 17 real)
 *   a no-filter schedule over `scene.elements`         THREW       on the pure composite, not the void
 *   a wall schedule with one non-active option         2.0000×     over-report — D65's named failure mode
 *
 * ⇒ **THE SCHEDULE BODY ADDS NO ENUMERATION RULE. Its correctness is that it does not have its own loop** —
 * it consumes `modelElements()`, where the four filters already live (`P5_step6A_enumeration_design.md` §2).
 * Every test below that asserts a row count is really asserting that this file never grew a second walk.
 *
 * ⚠ AND THE SECOND THING IT GUARDS (Entry 64's rule-17 finding): a schedule is a PROJECTION. The reserved
 * shape stores KEYS and has nowhere to put a value — rule 17 came back clean *by shape*, and clean by shape
 * only holds until a body is written against it. This is that body. §7 asserts it stores nothing.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  columnKeyOf,
  createRegistries,
  emptyScene,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import type { DesignOption, ScheduleDefinition, ScheduleResult } from '@bunyan/document';
import {
  curtainWallColumnType,
  curtainWallMullionType,
  curtainWallPanelType,
  curtainWallType,
  openingType,
  wallType,
} from '@bunyan/types';

const T = 200;
const H = 2400;
const KERNEL_BUILD = 'occt-7.9.3-test';

/** The curtain wall of `tests/composition-nesting.test.ts` — 3 cols × 2 rows ⇒ 1 row, 17 real elements. */
const CW = {
  width: 3000,
  height: H,
  rows: 2,
  cols: 3,
  depth: 100,
  mullionWidth: 50,
  panelThickness: 24,
} as const;

describe('D58 row Ⓐ — the schedules body: a schedule is modelElements() + a cell projector', () => {
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
    for (const t of [
      wallType,
      openingType,
      curtainWallType,
      curtainWallColumnType,
      curtainWallPanelType,
      curtainWallMullionType,
    ]) {
      registries.types.register(t);
    }
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({ registries, geometry: client });
  };

  const material = async (
    doc: DocumentContext,
    id: string,
    name: string,
    density?: number,
  ): Promise<void> => {
    await doc.execute('core.createMaterial', {
      id,
      name,
      category: 'other',
      ...(density === undefined ? {} : { density }),
    });
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

  const makeCurtainWall = async (doc: DocumentContext): Promise<string> => {
    await material(doc, 'glass', 'Glass', 2500);
    await material(doc, 'alu', 'Aluminium', 2700);
    return (
      await doc.execute('core.createElement', {
        typeId: 'core.curtainwall',
        params: {
          origin: [0, 0],
          ...CW,
          panelMaterialId: 'glass',
          mullionMaterialId: 'alu',
        },
      })
    ).changes[0]!.id;
  };

  const cell = (result: ScheduleResult, rowIndex: number, key: string) =>
    result.rows[rowIndex]!.cells.find((c) => c.columnKey === key);

  /* ============================================================================================
   * §1 — WHAT IS A ROW? The generated-children tree (design §1.1).
   * ========================================================================================= */

  it('⚠⚠ a CURTAIN PANEL schedule returns 6 rows — `scene.elements` returns 0, and reports no error', async () => {
    const doc = newDoc();
    await makeCurtainWall(doc);

    // The measurement that motivates the whole body: 1 authored row, 17 real elements.
    expect(Object.keys(doc.scene.elements)).toHaveLength(1);
    expect(doc.modelElements()).toHaveLength(17);

    const panels: ScheduleDefinition = {
      id: 'sch-panels',
      name: 'Curtain Panel Schedule',
      filter: { typeId: 'core.curtainwall.panel' },
      columns: [
        { source: 'field', key: 'name' },
        { source: 'quantity', key: 'volume' },
      ],
    };

    const result = await doc.evaluateSchedule(panels);

    // ⚠⚠ THE HEADLINE. The naive loop renders an EMPTY table with no error — the failure mode is not a
    // crash but a schedule of a building that appears to have no panels.
    expect(result.rows).toHaveLength(6);
    expect(
      Object.values(doc.scene.elements).filter((e) => e.typeId === 'core.curtainwall.panel'),
    ).toHaveLength(0);

    // Every row is a GENERATED child, and each is a first-class row with its own PEI (D59).
    expect(result.rows.every((r) => r.derived)).toBe(true);
    expect(new Set(result.rows.map((r) => r.elementId)).size).toBe(6);

    // Each panel is measured — the glazing box of `composition-nesting.test.ts`.
    const one = CW.width / CW.cols - CW.mullionWidth;
    const oneH = CW.height / CW.rows - CW.mullionWidth;
    expect(cell(result, 0, 'quantity:volume')!.value).toBeCloseTo(
      one * CW.panelThickness * oneH,
      0,
    );
    expect(result.unmeasured).toEqual([]);
  }, 120000);

  /* ============================================================================================
   * §2 — THE WHOLE-MODEL SCHEDULE RETURNS (design §1.2) — it dies on the composite, not the void.
   * ========================================================================================= */

  it('⚠⚠ a NO-FILTER schedule over a model containing a pure composite RETURNS — and totals 250,320,000 mm³', async () => {
    const doc = newDoc();
    const cw = await makeCurtainWall(doc);

    // The naive loop's exact death, still reachable and still deliberate (a direct ask still throws).
    await expect(doc.quantities(cw)).rejects.toThrow(/has no built geometry/);

    const all: ScheduleDefinition = {
      id: 'sch-all',
      name: 'Everything',
      filter: {},
      columns: [
        { source: 'field', key: 'type' },
        { source: 'quantity', key: 'volume' },
      ],
    };
    const result = await doc.evaluateSchedule(all);

    // ⚠ EVERY real element is a row, including the 4 that carry no parts (the composite parent + its 3
    // columns). They are real elements with a PEI a tag may bind to — they simply have no quantity.
    expect(result.rows).toHaveLength(17);
    const noQuantity = result.rows.filter(
      (r) => r.cells.find((c) => c.columnKey === 'quantity:volume')?.value === undefined,
    );
    expect(noQuantity).toHaveLength(4);

    // ⚠ The TOTAL is the measured number, not a plausible one — and `unmeasured` is empty beside it.
    expect(result.totals.get('quantity:volume')!.value).toBeCloseTo(250_320_000, 0);
    expect(result.unmeasured).toEqual([]);
    expect(result.basis).toBe('exact');
  }, 120000);

  /* ============================================================================================
   * §3 — THE DESIGN-OPTION GHOST ROW (design §1.3) — D65's named failure mode, on its first consumer.
   * ========================================================================================= */

  it('⚠⚠ a non-active design option contributes NO row and NO volume — the 2.0000× over-report is gone', async () => {
    const doc = newDoc();
    await makeWall(doc, [0, 0], [4000, 0]);
    await makeWall(doc, [0, 0], [4000, 0], { designOptionId: 'opt-b' });

    const designOptions: Record<string, DesignOption> = {
      'opt-a': { id: 'opt-a', setName: 'Facade', name: 'A', isPrimary: true },
      'opt-b': { id: 'opt-b', setName: 'Facade', name: 'B', isPrimary: false },
    };

    const walls: ScheduleDefinition = {
      id: 'sch-walls',
      name: 'Wall Schedule',
      filter: { typeId: 'core.wall' },
      columns: [{ source: 'quantity', key: 'volume' }, { source: 'count' }],
    };

    const result = await doc.evaluateSchedule(walls, { designOptions });

    // Two walls are AUTHORED; exactly one is BUILT in the scheme that gets built.
    expect(Object.keys(doc.scene.elements)).toHaveLength(2);
    expect(result.rows).toHaveLength(1);
    expect(result.totals.get('quantity:volume')!.value).toBeCloseTo(4000 * T * H, 0);
    // The `count` column counts ROWS — so it, too, must not see the ghost.
    expect(cell(result, 0, 'count')!.value).toBe(1);
  }, 120000);

  /* ============================================================================================
   * §4 — THE KEYS RE-DERIVE ACROSS A RESIZE, with the SAME definition object (the Entry-47 discipline).
   * ========================================================================================= */

  it('a quantity column re-derives across a resize — the definition object is passed twice, unchanged', async () => {
    const doc = newDoc();
    const w1 = await makeWall(doc, [0, 0], [3000, 0], { mark: 'W-01' });
    await makeWall(doc, [0, 1000], [3000, 1000], { mark: 'W-02' });

    const walls: ScheduleDefinition = {
      id: 'sch-walls',
      name: 'Wall Schedule',
      filter: { typeId: 'core.wall' },
      columns: [
        { source: 'field', key: 'mark' },
        { source: 'param', key: 'thickness' },
        { source: 'quantity', key: 'volume' },
        { source: 'count' },
      ],
    };

    const before = await doc.evaluateSchedule(walls);
    expect(before.rows).toHaveLength(2);
    expect(
      before.rows.map((r) => cell(before, before.rows.indexOf(r), 'field:mark')!.value).sort(),
    ).toEqual(['W-01', 'W-02']);
    const w1Before = before.rows.find((r) => r.elementId === w1)!;
    const volBefore = w1Before.cells.find((c) => c.columnKey === 'quantity:volume')!
      .value as number;
    expect(volBefore).toBeCloseTo(3000 * T * H, 0);

    await doc.execute('core.setParams', { elementId: w1, params: { end: [6000, 0] } });

    // ⚠ THE SAME OBJECT, not a rebuilt one — a schedule is a query with a layout, re-asked.
    const after = await doc.evaluateSchedule(walls);
    const volAfter = after.rows
      .find((r) => r.elementId === w1)!
      .cells.find((c) => c.columnKey === 'quantity:volume')!.value as number;
    expect(volAfter / volBefore).toBeCloseTo(2, 2);
    // The param key is unchanged and still resolves; the count is unchanged.
    expect(cell(after, 0, 'param:thickness')!.value).toBe(T);
    expect(cell(after, 0, 'count')!.value).toBe(2);
  }, 120000);

  /* ============================================================================================
   * §5 — AN UNMEASURABLE ELEMENT: the row STAYS, the value is ABSENT, the total EXCLUDES it (D75/rule 15).
   * ========================================================================================= */

  it('⚠⚠ an unbuildable element keeps its ROW with the value ABSENT, is listed in `unmeasured`, and is excluded from the total', async () => {
    const doc = newDoc();
    await makeWall(doc, [0, 0], [3000, 0], { mark: 'W-01' });

    // A D43 element: a type this session does not know. It OPENS, it is preserved, it cannot be measured.
    const scene = {
      ...doc.scene,
      elements: {
        ...doc.scene.elements,
        'ghost-01': {
          id: 'ghost-01',
          typeId: 'acme.gadget',
          typeVersion: 1,
          params: {},
          classification: { ifcClass: 'IfcBuildingElementProxy', loadBearing: false },
          mark: 'G-01',
        },
      },
    };
    const doc2 = new DocumentContext({
      registries: (() => {
        const r = createRegistries();
        r.types.register(wallType);
        for (const c of CORE_COMMANDS) r.commands.register(c);
        return r;
      })(),
      geometry: client,
      scene,
    });
    await doc2.rebuildAll();

    const all: ScheduleDefinition = {
      id: 'sch-all',
      name: 'Everything',
      filter: {},
      columns: [
        { source: 'field', key: 'mark' },
        { source: 'quantity', key: 'volume' },
      ],
    };
    const result = await doc2.evaluateSchedule(all);

    // ⚠ THE ROW IS STILL THERE. Silently dropping it is D75's defect one level down: a schedule that is
    // plausible and short is exactly what nobody audits.
    expect(result.rows).toHaveLength(2);
    const ghost = result.rows.find((r) => r.elementId === 'ghost-01')!;
    // ⚠ ABSENT, NEVER ZERO (rule 15) — and its own identity cell still reads.
    expect(ghost.cells.find((c) => c.columnKey === 'quantity:volume')!.value).toBeUndefined();
    expect(ghost.cells.find((c) => c.columnKey === 'field:mark')!.value).toBe('G-01');
    // It is REPORTED beside the rows...
    expect(result.unmeasured.map((u) => u.elementId)).toEqual(['ghost-01']);
    // ...and the total is the wall alone — an unknown never joins a sum wearing `basis: 'exact'`.
    expect(result.totals.get('quantity:volume')!.value).toBeCloseTo(3000 * T * H, 0);
    expect(result.basis).toBe('exact');
  }, 120000);

  /* ============================================================================================
   * §6 — RULE 7: every numeric cell declares its unit. And rule 15: `mass` is absent, never partial.
   * ========================================================================================= */

  it('⚠ every NUMERIC cell declares a unit (rule 7) — enumerated over all four column sources', async () => {
    const doc = newDoc();
    await makeCurtainWall(doc);

    const everything: ScheduleDefinition = {
      id: 'sch-units',
      name: 'Units',
      filter: { typeId: 'core.curtainwall.panel' },
      columns: [
        { source: 'field', key: 'name' },
        { source: 'field', key: 'type' },
        { source: 'param', key: 'dx' },
        { source: 'quantity', key: 'volume' },
        { source: 'quantity', key: 'area' },
        { source: 'quantity', key: 'mass' },
        { source: 'count' },
      ],
    };
    const result = await doc.evaluateSchedule(everything);
    expect(result.rows.length).toBeGreaterThan(0);

    // ⚠ The rule is about NUMBERS crossing a boundary. A schedule cell is the last boundary before a
    // human reads it AS a measurement (rule 17), so a bare number here is rule 7's failure at its worst.
    const numeric = result.rows.flatMap((r) => r.cells.filter((c) => typeof c.value === 'number'));
    expect(numeric.length).toBeGreaterThan(0);
    const bare = numeric.filter((c) => c.unit === undefined && c.columnKey !== 'count');
    expect(bare).toEqual([]);
    expect(result.columns.find((c) => c.key === 'quantity:volume')!.unit).toBe('mm³');
    expect(result.columns.find((c) => c.key === 'quantity:area')!.unit).toBe('mm²');
    expect(result.columns.find((c) => c.key === 'quantity:mass')!.unit).toBe('kg');
    // ⚠ The `param` unit is READ OFF THE ParamField, never guessed — a param's unit is its own declaration.
    expect(result.columns.find((c) => c.key === 'param:dx')!.unit).toBe('mm');
  }, 120000);

  it('⚠ `mass` is ABSENT rather than partial when a density cannot be resolved (rule 15, one level down)', async () => {
    const doc = newDoc();
    // ⚠ A DANGLING material reference — the layer names a material the document does not hold, so its
    // density cannot be resolved. (`core.createMaterial` REQUIRES a density, by design: a material
    // without one "cannot answer the question it exists for" — so this is the road that stays open.)
    await doc.execute('core.createStyle', {
      id: 'style-nodens',
      typeId: 'core.wall',
      name: 'No-density wall',
      params: { layers: [{ name: 'board', thickness: T, materialId: 'not-in-this-document' }] },
    });
    await makeWall(doc, [0, 0], [3000, 0], { styleId: 'style-nodens' });

    const walls: ScheduleDefinition = {
      id: 'sch-mass',
      name: 'Mass',
      filter: { typeId: 'core.wall' },
      columns: [
        { source: 'quantity', key: 'mass' },
        { source: 'quantity', key: 'volume' },
      ],
    };
    const result = await doc.evaluateSchedule(walls);

    expect(result.rows).toHaveLength(1);
    // ⚠ ABSENT, not 0 — `{mass: 0, basis: 'exact'}` is a wrong number wearing the badge that says trust me.
    expect(cell(result, 0, 'quantity:mass')!.value).toBeUndefined();
    // ...while the volume beside it IS exact and IS reported.
    expect(cell(result, 0, 'quantity:volume')!.value).toBeCloseTo(3000 * T * H, 0);
    // The TOTAL is absent too — a partial sum is the same defect as an aggregate.
    expect(result.totals.get('quantity:mass')!.value).toBeUndefined();
  }, 120000);

  /* ============================================================================================
   * §7 — RULE 17: A SCHEDULE IS A PROJECTION. Nothing it computes is stored (Entry 64's finding).
   * ========================================================================================= */

  it('⚠⚠ evaluating a schedule stores NOTHING — the scene is byte-identical and the .bnn carries no cells', async () => {
    const doc = newDoc();
    await makeWall(doc, [0, 0], [3000, 0], { mark: 'W-01' });

    const definition: ScheduleDefinition = {
      id: 'sch-1',
      name: 'Wall Schedule',
      filter: { typeId: 'core.wall' },
      columns: [{ source: 'quantity', key: 'volume' }],
    };
    const withSchedule = { ...doc.scene, schedules: { 'sch-1': definition } };
    const doc2 = new DocumentContext({
      registries: (() => {
        const r = createRegistries();
        r.types.register(wallType);
        for (const c of CORE_COMMANDS) r.commands.register(c);
        return r;
      })(),
      geometry: client,
      scene: withSchedule,
    });
    await doc2.rebuildAll();

    const before = JSON.stringify(doc2.scene);
    const result = await doc2.evaluateSchedule(definition);
    expect(result.rows).toHaveLength(1);

    // ⚠⚠ THE PROJECTION RULE. A schedule is a query with a layout; asking it moves no stored byte.
    expect(JSON.stringify(doc2.scene)).toBe(before);
    // And no undoable edit was minted — a query is not an edit.
    expect(doc2.history()).toHaveLength(0);

    // The .bnn carries the DEFINITION and never the result.
    const bytes = saveBnn(doc2.scene, { kernelBuildId: KERNEL_BUILD });
    const loaded = loadBnn(bytes).scene;
    expect(loaded.schedules).toEqual({ 'sch-1': definition });
    expect(JSON.stringify(loaded)).not.toContain('cells');
  }, 120000);

  /* ============================================================================================
   * §8 — GROUPING (owner Q1): by the STABLE COLUMN KEY, never the display heading (D70's defect).
   * ========================================================================================= */

  it('⚠⚠ `groupBy` names STABLE COLUMN KEYS — renaming a heading cannot re-key a group (owner Q1, the D70 lesson)', async () => {
    const doc = newDoc();
    await makeWall(doc, [0, 0], [3000, 0], { mark: 'W-01' });
    await makeWall(doc, [0, 1000], [3000, 1000], { mark: 'W-02' });
    await doc.execute('core.createElement', {
      typeId: 'core.wall',
      params: { start: [0, 2000], end: [3000, 2000], thickness: 300, height: H },
      mark: 'W-03',
    });

    const grouped: ScheduleDefinition = {
      id: 'sch-grouped',
      name: 'Walls by thickness',
      filter: { typeId: 'core.wall' },
      columns: [
        { source: 'param', key: 'thickness', heading: 'Thickness' },
        { source: 'quantity', key: 'volume', heading: 'Volume' },
      ],
      groupBy: ['param:thickness'],
    };

    const result = await doc.evaluateSchedule(grouped);
    expect(result.groups).toHaveLength(2);
    const byKey = new Map(result.groups!.map((g) => [g.key.join('|'), g]));
    expect(byKey.get(String(T))!.rows).toHaveLength(2);
    expect(byKey.get('300')!.rows).toHaveLength(1);
    // Subtotals are DERIVED per group, exactly as the grand total is.
    expect(byKey.get(String(T))!.subtotals.get('quantity:volume')!.value).toBeCloseTo(
      2 * 3000 * T * H,
      0,
    );

    // ⚠⚠ THE RULING, ASSERTED: rename BOTH headings — including to the SAME text, which under the
    // heading-keyed reading would merge two columns into one group (D70's "two materials sharing a
    // display name merge"). The grouping is untouched, because a heading is not an identity.
    const renamed = await doc.evaluateSchedule({
      ...grouped,
      columns: [
        { source: 'param', key: 'thickness', heading: 'Same' },
        { source: 'quantity', key: 'volume', heading: 'Same' },
      ],
    });
    expect(renamed.groups!.map((g) => g.key.join('|')).sort()).toEqual(
      result.groups!.map((g) => g.key.join('|')).sort(),
    );
    expect(renamed.groups!.map((g) => g.rows.length).sort()).toEqual([1, 2]);

    // And a column with NO heading is groupable — the case the heading reading cannot express at all.
    const unheaded = await doc.evaluateSchedule({
      ...grouped,
      columns: [{ source: 'param', key: 'thickness' }],
      groupBy: ['param:thickness'],
    });
    expect(unheaded.groups).toHaveLength(2);
  }, 120000);

  it('`columnKeyOf` is the ONE place the key grammar lives, and it discriminates every reserved source', () => {
    expect(columnKeyOf({ source: 'field', key: 'mark' })).toBe('field:mark');
    expect(columnKeyOf({ source: 'param', key: 'thickness' })).toBe('param:thickness');
    expect(columnKeyOf({ source: 'quantity', key: 'volume' })).toBe('quantity:volume');
    // ⚠ The part qualifier is PART OF THE KEY — "concrete volume" and "plaster volume" are two columns.
    expect(columnKeyOf({ source: 'quantity', key: 'volume', part: 'structure' })).toBe(
      'quantity:volume:structure',
    );
    expect(columnKeyOf({ source: 'count' })).toBe('count');
    // A heading NEVER reaches the key (the whole of owner Q1).
    expect(columnKeyOf({ source: 'quantity', key: 'area', heading: 'Paint area m²' })).toBe(
      'quantity:area',
    );
  });

  /* ============================================================================================
   * §9 — THE FILTER: every reserved field discriminates against a FROZEN, stable key.
   * ========================================================================================= */

  it('the filter binds to frozen keys — typeId / ifcClass / loadBearing / containerId, AND-combined', async () => {
    const doc = newDoc();
    await doc.execute('core.createContainer', { id: 'site-1', kind: 'site', name: 'Site' });
    await doc.execute('core.createContainer', {
      id: 'level-1',
      kind: 'level',
      name: 'Level 1',
      parentId: 'site-1',
      elevation: 0,
    });
    await doc.execute('core.createContainer', {
      id: 'level-2',
      kind: 'level',
      name: 'Level 2',
      parentId: 'site-1',
      elevation: 3000,
    });
    const a = await makeWall(doc, [0, 0], [3000, 0], { containerId: 'level-1', loadBearing: true });
    await makeWall(doc, [0, 1000], [3000, 1000], { containerId: 'level-2' });

    const base: ScheduleDefinition = {
      id: 's',
      name: 's',
      filter: {},
      columns: [{ source: 'field', key: 'level' }],
    };

    expect((await doc.evaluateSchedule(base)).rows).toHaveLength(2);
    expect(
      (await doc.evaluateSchedule({ ...base, filter: { containerId: 'level-1' } })).rows,
    ).toHaveLength(1);
    expect(
      (await doc.evaluateSchedule({ ...base, filter: { typeId: 'core.opening' } })).rows,
    ).toHaveLength(0);
    expect(
      (await doc.evaluateSchedule({ ...base, filter: { loadBearing: true } })).rows,
    ).toHaveLength(1);
    expect(
      (await doc.evaluateSchedule({ ...base, filter: { ifcClass: 'IfcWall' } })).rows,
    ).toHaveLength(2);
    // AND-combined: a filter that is individually satisfiable but jointly empty.
    expect(
      (
        await doc.evaluateSchedule({
          ...base,
          filter: { containerId: 'level-2', loadBearing: true },
        })
      ).rows,
    ).toHaveLength(0);

    // The `level` field column resolves the nearest ancestor Level, not the raw container id.
    const onLevel1 = await doc.evaluateSchedule({ ...base, filter: { containerId: 'level-1' } });
    expect(onLevel1.rows[0]!.elementId).toBe(a);
    expect(cell(onLevel1, 0, 'field:level')!.value).toBe('Level 1');
  }, 120000);

  /* ============================================================================================
   * §10 — A SCHEDULE WITH NO QUANTITY COLUMN MAKES NO KERNEL CALL (design §4.2).
   * ========================================================================================= */

  it('a schedule with no quantity column is kernel-free — a 400-door schedule costs nothing', async () => {
    const doc = newDoc();
    await makeCurtainWall(doc);

    let calls = 0;
    const counted = new KernelClient(
      new InProcessTransport(new KernelHost(kernel)),
    ) as KernelClient & { request: unknown };
    const original = counted.request.bind(counted);
    (counted as unknown as { request: unknown }).request = (...args: unknown[]) => {
      calls += 1;
      return (original as (...a: unknown[]) => unknown)(...args);
    };

    const noQuantity: ScheduleDefinition = {
      id: 'sch-cheap',
      name: 'Panels, no measure',
      filter: { typeId: 'core.curtainwall.panel' },
      columns: [
        { source: 'field', key: 'name' },
        { source: 'param', key: 'width' },
        { source: 'count' },
      ],
    };
    const before = calls;
    const result = await doc.evaluateSchedule(noQuantity);
    expect(result.rows).toHaveLength(6);
    expect(calls).toBe(before);
    counted.dispose();
  }, 120000);

  /* ============================================================================================
   * §11 — THE Q2/Q3 RESERVATIONS (owner-ruled 2026-07-28) — optional, absent-defaulted, additive.
   * ========================================================================================= */

  it('⚠ Q2 — a ScheduleDefinition can RECORD which design option it shows, and absent ⇒ each set primary', async () => {
    const doc = newDoc();
    // ⚠ BOTH walls are optioned — the two mutually-exclusive facade schemes. (A main-model wall would
    // count under every selection, which is correct and would make this test unable to discriminate.)
    const wallA = await makeWall(doc, [0, 0], [4000, 0], { designOptionId: 'opt-a' });
    const wallB = await makeWall(doc, [0, 0], [6000, 0], { designOptionId: 'opt-b' });
    const designOptions: Record<string, DesignOption> = {
      'opt-a': { id: 'opt-a', setName: 'Facade', name: 'A', isPrimary: true },
      'opt-b': { id: 'opt-b', setName: 'Facade', name: 'B', isPrimary: false },
    };

    const base: ScheduleDefinition = {
      id: 'sch-opt',
      name: 'Wall Schedule',
      filter: { typeId: 'core.wall' },
      columns: [{ source: 'quantity', key: 'volume' }],
    };

    // Absent ⇒ the set's PRIMARY, which is the rule everywhere else in the product.
    const primary = await doc.evaluateSchedule(base, { designOptions });
    expect(primary.rows).toHaveLength(1);
    expect(primary.rows[0]!.elementId).toBe(wallA);

    // ⚠ The STORED selection is what Q2 reserved — "the Option B door schedule" is now expressible.
    const optionB: ScheduleDefinition = { ...base, designOptionIds: ['opt-b'] };
    const shown = await doc.evaluateSchedule(optionB, { designOptions });
    // ⚠⚠ ONE per set, never both — the exclusion invariant is a correctness rule this field cannot switch off.
    expect(shown.rows).toHaveLength(1);
    expect(shown.rows[0]!.elementId).toBe(wallB);
    expect(shown.totals.get('quantity:volume')!.value).toBeCloseTo(6000 * T * H, 0);

    // ⚠⚠ AND THE EXCLUSION INVARIANT STILL BINDS (D65): selecting an option shows ONE per set, never both.
    const bytes = saveBnn(
      { ...doc.scene, schedules: { 'sch-opt': optionB } },
      {
        kernelBuildId: KERNEL_BUILD,
      },
    );
    expect(loadBnn(bytes).scene.schedules!['sch-opt']!.designOptionIds).toEqual(['opt-b']);
  }, 120000);

  it('⚠ Q3 — `ChildOverride.mark?` is RESERVED and round-trips; nothing reads it in v1.0.0', () => {
    const scene = {
      ...emptyScene(),
      elements: {
        'cw-1': {
          id: 'cw-1',
          typeId: 'core.curtainwall',
          typeVersion: 1,
          params: {},
          classification: { ifcClass: 'IfcCurtainWall', loadBearing: false },
          childOverrides: { 'panel.r0c0': { mark: 'CP-01' } },
        },
      },
    };
    const loaded = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD })).scene;
    expect(loaded.elements['cw-1']!.childOverrides!['panel.r0c0']!.mark).toBe('CP-01');
  });
});
