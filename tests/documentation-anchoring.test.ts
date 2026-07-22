/**
 * DOCUMENTATION ANCHORING (D58, Freeze-Gate row Ⓐ; `P5_step5A_documentation_anchoring_design.md`) — the
 * WIDENED gate ⑨. Real OCCT where geometry matters; pure for the reservation proofs.
 *
 * ⚠ THE FREEZE QUESTION Ⓐ ANSWERS. Gate ⑨ (Entry 44) proved ONE dimension between two faces anchors to frozen
 * shapes and survives a resize. D58 ships a MINIMAL documentation body in v1.0.0 (one plan + one section +
 * ONE schedule) — so the freeze must not foreclose the WHOLE surface: a View, a Dimension/Tag, a Schedule
 * bound to type/param/quantity, a Sheet/Viewport. This file proves each anchors to a FROZEN shape and either
 * survives an edit (the geometric ones, against the real kernel) or round-trips (the shells).
 *
 * ⚠⚠ WHAT THESE RESERVATIONS' TESTS PROVE (the `reserve-shapes.test.ts` doctrine — there is no BODY to run):
 *   1. THE SHAPE IS OPTIONAL AND ADDITIVE — every documentation field is absent-able and every union grows by
 *      a MEMBER, enforced at COMPILE TIME by the typed constructions below.
 *   2. THE FIELD ROUND-TRIPS — a `.bnn` carrying the whole documentation surface saves + reloads byte-identical
 *      through the REAL codec; one carrying none defaults exactly as before. (This is the revert-check: the
 *      four Scene fields must be carried, or a saved schedule is lost on load.)
 *   3. THE ANCHOR IS STABLE (the widened gate ⑨, real OCCT) — a dimension's `SubShapeRef`s stay byte-identical
 *      and its value re-derives across a resize; a schedule's type/param/quantity KEYS re-derive with an
 *      unchanged definition; a tag's element anchor + subject key survive. The BODIES (renderer/exporter/
 *      `sectionCut`) are v1.0.x/P6 — no body reads these types yet, and that is the point.
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
  emptyScene,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import type {
  Annotation,
  AnnotationAnchor,
  Dimension,
  Scene,
  ScheduleColumn,
  ScheduleDefinition,
  Sheet,
  Tag,
  ViewDescriptor,
} from '@bunyan/document';
import { wallType } from '@bunyan/types';

const T = 200;
const H = 2400;
const KERNEL_BUILD = 'occt-7.9.3-test';

/* ================================================================================================
 * PART 1 — THE ANCHOR IS STABLE (the widened gate ⑨), against the REAL OCCT kernel
 * ============================================================================================= */

describe('Ⓐ documentation anchoring — the anchor survives an edit (real OCCT)', () => {
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

  const capRef = (doc: DocumentContext, id: string, cap: 0 | 2): string =>
    doc
      .partsOf(id)!
      .find((p) => p.name === 'wall')!
      .refs.find((r) => r.includes(`/face/lateral.${cap}`))!;

  /** The value of a linear `Dimension` — the distance between the centres of its two `ref` anchors, X. */
  const dimensionValue = async (doc: DocumentContext, dim: Dimension): Promise<number> => {
    const centres = await Promise.all(
      dim.anchors.map(async (a) => {
        if (a.kind !== 'ref') throw new Error('this helper reads ref anchors');
        const part = doc.partsOf(a.elementId)!.find((p) => p.refs.includes(a.token))!;
        const bb = (await client.request('bounds', { handle: part.handle, ref: a.token })).bounds;
        return (bb.min[0] + bb.max[0]) / 2;
      }),
    );
    return Math.abs(centres[1]! - centres[0]!);
  };

  it('⚠⚠ a Dimension (the reserved shape) keeps its SubShapeRef anchors byte-identical and re-derives its value', async () => {
    const doc = newDoc();
    const wall = await makeWall(doc, [0, 0], [3000, 0]);

    // AUTHOR the reserved annotation — { anchors: [ref, ref] } is all a v1.0.x dimension stores.
    const dim: Dimension = {
      id: 'dim-1',
      kind: 'dimension',
      dimensionKind: 'linear',
      anchors: [
        { kind: 'ref', elementId: wall, token: capRef(doc, wall, 0) },
        { kind: 'ref', elementId: wall, token: capRef(doc, wall, 2) },
      ],
    };
    expect(await dimensionValue(doc, dim)).toBeCloseTo(3000, 3);

    // RESIZE the host — drag the end 3000 → 5000 (D52 setParams{end}, the commonest edit).
    await doc.execute('core.setParams', { elementId: wall, params: { end: [5000, 0] } });

    // ⚠ THE ANCHOR IS STABLE: the stored tokens still resolve, byte-identical (D1, not a geometric index).
    const afterCaps = [capRef(doc, wall, 0), capRef(doc, wall, 2)];
    expect(afterCaps).toEqual(dim.anchors.map((a) => (a.kind === 'ref' ? a.token : '')));
    // ⚠ THE VALUE RE-DERIVES from live geometry: 5000, not a stale 3000 — with the SAME stored dimension.
    expect(await dimensionValue(doc, dim)).toBeCloseTo(5000, 3);
    expect(doc.brokenRefs()).toHaveLength(0);
  });

  it('⚠⚠ a Schedule binds to type/param/quantity KEYS that re-derive across a resize (the row gate ⑨ did NOT cover)', async () => {
    const doc = newDoc();
    const w1 = await makeWall(doc, [0, 0], [3000, 0], { mark: 'W-01' });
    const w2 = await makeWall(doc, [0, 1000], [3000, 1000], { mark: 'W-02' });

    // A wall schedule bound entirely to FROZEN keys: filter by typeId; columns = field/param/quantity/count.
    const schedule: ScheduleDefinition = {
      id: 'sch-1',
      name: 'Wall Schedule',
      filter: { typeId: 'core.wall' },
      columns: [
        { source: 'field', key: 'mark' },
        { source: 'param', key: 'thickness' },
        { source: 'quantity', key: 'volume' },
        { source: 'count' },
      ],
    };

    // Evaluate the schedule against the LIVE doc — this is what the v1.0.x renderer will do; the KEYS are all
    // that is stored, every value derives. (A schedule is a query with a layout.)
    const evaluate = async (def: ScheduleDefinition) => {
      const rows = Object.values(doc.scene.elements).filter(
        (e) => def.filter.typeId === undefined || e.typeId === def.filter.typeId,
      );
      return Promise.all(
        rows.map(async (e) => {
          const cells: Record<string, unknown> = {};
          for (const col of def.columns) {
            if (col.source === 'field' && col.key === 'mark') cells['mark'] = e.mark;
            else if (col.source === 'param') cells[col.key] = e.params[col.key];
            else if (col.source === 'quantity' && col.key === 'volume') {
              const q = await doc.quantities(e.id);
              cells['volume'] = q.parts.reduce((s, p) => s + p.volume, 0);
            } else if (col.source === 'count') cells['count'] = rows.length;
          }
          return cells;
        }),
      );
    };

    const before = await evaluate(schedule);
    // The filter selected exactly the two walls (typeId discriminates — a frozen, stable contract id).
    expect(before).toHaveLength(2);
    expect(before.map((r) => r['mark']).sort()).toEqual(['W-01', 'W-02']);
    expect(before.every((r) => r['thickness'] === T)).toBe(true);
    expect(before.every((r) => r['count'] === 2)).toBe(true);
    const w1VolBefore = before.find((r) => r['mark'] === 'W-01')!['volume'] as number;
    expect(w1VolBefore).toBeCloseTo(3000 * T * H, 0);
    // A filter on a DIFFERENT frozen typeId selects nothing — the key genuinely discriminates.
    expect(await evaluate({ ...schedule, filter: { typeId: 'core.opening' } })).toHaveLength(0);

    // RESIZE w1 (3000 → 6000). Re-evaluate with the SAME definition object — no re-authoring.
    await doc.execute('core.setParams', { elementId: w1, params: { end: [6000, 0] } });
    const after = await evaluate(schedule);
    const w1VolAfter = after.find((r) => r['mark'] === 'W-01')!['volume'] as number;

    // ⚠⚠ THE QUANTITY KEY RE-DERIVED: w1's volume doubled; the definition's KEYS never changed.
    expect(w1VolAfter).toBeCloseTo(6000 * T * H, 0);
    expect(w1VolAfter / w1VolBefore).toBeCloseTo(2, 2);
    // w2 (untouched) is unchanged — the schedule reflects only the live edit.
    expect(after.find((r) => r['mark'] === 'W-02')!['volume']).toBeCloseTo(w1VolBefore, 0);
    void w2;
  });

  it('a Tag anchored to an element keeps its PEI anchor and subject key across a resize', async () => {
    const doc = newDoc();
    const wall = await makeWall(doc, [0, 0], [3000, 0], { mark: 'W-05' });
    const tag: Tag = {
      id: 'tag-1',
      kind: 'tag',
      anchor: { kind: 'element', elementId: wall },
      subject: 'mark',
    };

    const resolveTag = (t: Tag): string | undefined => {
      if (t.anchor.kind !== 'element') return undefined;
      const e = doc.scene.elements[t.anchor.elementId];
      return t.subject === 'mark' ? e?.mark : undefined;
    };
    expect(resolveTag(tag)).toBe('W-05');

    await doc.execute('core.setParams', { elementId: wall, params: { end: [5000, 0] } });

    // The anchor is a ULID PEI (D44) — unchanged by the rebuild; the subject key still resolves.
    expect(doc.scene.elements[wall]).toBeDefined();
    expect(resolveTag(tag)).toBe('W-05');
    expect(doc.brokenRefs()).toHaveLength(0);
  });
});

/* ================================================================================================
 * PART 2 — FREEZE-SAFETY (compile-time): every documentation shape is optional and additive.
 * If `tsc` accepts this file, the shapes are absent-able and the unions grow by MEMBER, not by edit.
 * ============================================================================================= */

describe('Ⓐ freeze-safety — the documentation shapes are optional and additive', () => {
  it('a Scene with NONE of the documentation collections is valid (absent-able)', () => {
    const scene: Scene = emptyScene();
    expect(scene.views).toBeUndefined();
    expect(scene.annotations).toBeUndefined();
    expect(scene.schedules).toBeUndefined();
    expect(scene.sheets).toBeUndefined();
  });

  it('every AnnotationAnchor kind is a distinct, additive member', () => {
    const anchors: AnnotationAnchor[] = [
      { kind: 'ref', elementId: 'wall-1', token: 'wall-1.structure/face/lateral.0#0' },
      { kind: 'vertex', elementId: 'wall-1', token: 'wall-1.structure/vertex/corner#0' },
      { kind: 'element', elementId: 'wall-1' },
      { kind: 'point', at: [100, 200] },
    ];
    expect(anchors.map((a) => a.kind)).toEqual(['ref', 'vertex', 'element', 'point']);
  });

  it('every ScheduleColumn source is a distinct, additive member', () => {
    const columns: ScheduleColumn[] = [
      { source: 'field', key: 'mark' },
      { source: 'param', key: 'thickness', heading: 'Width' },
      { source: 'quantity', key: 'volume', part: 'structure' },
      { source: 'count' },
    ];
    expect(columns.map((c) => c.source)).toEqual(['field', 'param', 'quantity', 'count']);
  });

  it('every ViewDescriptor kind and both Annotation kinds are members, and a Sheet nests its Viewports', () => {
    const views: ViewDescriptor[] = [
      { id: 'v1', name: 'Level 1', kind: 'plan', scale: 100, levelId: 'L1', cutHeight: 1200 },
      {
        id: 'v2',
        name: 'Section A',
        kind: 'section',
        scale: 50,
        origin: [0, 0, 0],
        normal: [0, 1, 0],
      },
      { id: 'v3', name: 'North', kind: 'elevation', scale: 100, direction: [0, -1, 0] },
      { id: 'v4', name: '3D', kind: '3d', scale: 100 },
    ];
    const annotations: Annotation[] = [
      {
        id: 'd1',
        kind: 'dimension',
        dimensionKind: 'linear',
        anchors: [
          { kind: 'element', elementId: 'w1' },
          { kind: 'element', elementId: 'w2' },
        ],
      },
      { id: 't1', kind: 'tag', anchor: { kind: 'element', elementId: 'w1' }, subject: 'mark' },
    ];
    const sheet: Sheet = {
      id: 's1',
      number: 'A-101',
      name: 'Ground Floor Plan',
      titleblock: 'a1-landscape',
      viewports: [
        { viewId: 'v1', at: [200, 200] },
        { viewId: 'sch-1', at: [900, 200] },
      ],
    };
    expect(views.map((v) => v.kind)).toEqual(['plan', 'section', 'elevation', '3d']);
    expect(annotations.map((a) => a.kind)).toEqual(['dimension', 'tag']);
    expect(sheet.viewports).toHaveLength(2);
  });
});

/* ================================================================================================
 * PART 3 — ROUND-TRIP (the revert-check): the four Scene fields must be carried by the codec.
 * ============================================================================================= */

describe('Ⓐ round-trip — the whole documentation surface survives save→load', () => {
  it('a .bnn carrying views/annotations/schedules/sheets reloads byte-identical', () => {
    const scene: Scene = {
      ...emptyScene(),
      views: {
        'view-plan': {
          id: 'view-plan',
          name: 'Level 1',
          kind: 'plan',
          scale: 100,
          levelId: 'L1',
          cutHeight: 1200,
        },
        'view-sec': {
          id: 'view-sec',
          name: 'Section A',
          kind: 'section',
          scale: 50,
          origin: [0, 0, 0],
          normal: [1, 0, 0],
          clip: [
            [0, 0, 0],
            [6000, 6000, 3000],
          ],
        },
      },
      annotations: {
        'dim-1': {
          id: 'dim-1',
          kind: 'dimension',
          dimensionKind: 'linear',
          viewId: 'view-plan',
          anchors: [
            { kind: 'ref', elementId: 'wall-1', token: 'wall-1.structure/face/lateral.0#0' },
            { kind: 'vertex', elementId: 'wall-1', token: 'wall-1.structure/vertex/corner#0' },
          ],
        },
        'tag-1': {
          id: 'tag-1',
          kind: 'tag',
          viewId: 'view-plan',
          anchor: { kind: 'element', elementId: 'wall-1' },
          subject: 'quantity:volume',
        },
      },
      schedules: {
        'sch-1': {
          id: 'sch-1',
          name: 'Wall Schedule',
          filter: { typeId: 'core.wall', loadBearing: true },
          columns: [
            { source: 'field', key: 'mark' },
            { source: 'param', key: 'thickness', heading: 'Width' },
            { source: 'quantity', key: 'volume' },
            { source: 'count' },
          ],
          groupBy: ['mark'],
        },
      },
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          number: 'A-101',
          name: 'Ground Floor',
          titleblock: 'a1',
          viewports: [
            { viewId: 'view-plan', at: [200, 200] },
            { viewId: 'sch-1', at: [1200, 200] },
          ],
        },
      },
    };

    const { scene: loaded } = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD }));
    expect(loaded.views).toEqual(scene.views);
    expect(loaded.annotations).toEqual(scene.annotations);
    expect(loaded.schedules).toEqual(scene.schedules);
    expect(loaded.sheets).toEqual(scene.sheets);
  });

  it('a .bnn carrying NO documentation defaults exactly as before (absent, not empty)', () => {
    const { scene: loaded } = loadBnn(saveBnn(emptyScene(), { kernelBuildId: KERNEL_BUILD }));
    expect(loaded.views).toBeUndefined();
    expect(loaded.annotations).toBeUndefined();
    expect(loaded.schedules).toBeUndefined();
    expect(loaded.sheets).toBeUndefined();
  });
});
