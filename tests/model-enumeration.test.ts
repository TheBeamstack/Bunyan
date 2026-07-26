/**
 * THE MODEL ENUMERATION QUERY + THE PROJECT-WIDE QUANTITY ROLL-UP
 * (design: `P5_step6A_enumeration_design.md`; owner rulings 2026-07-25).
 *
 * ⚠⚠ WHY THIS EXISTS. The 2026-07-25 adversarial sweep (Entry 57, finding 2) measured that **the model
 * cannot be enumerated**: `scene.elements` is the AUTHORED ROWS, which is not the set of real elements.
 * `review_P4.md` had measured the same crash on **2026-07-14** and it was still zero code 42 days and 13
 * entries later, while P5 was declared closed twice — §1c-7's disease, third occurrence.
 *
 * ⚠⚠ AND THE FINDING THAT WIDENED THE RULE, measured here in §1: both `review_P4.md` and Entry 57 named
 * **the Opening** as what kills the naive loop (*"a void has no parts"*). On the shipped `@bunyan/types`
 * the loop dies on the **CURTAIN WALL** instead — a **pure composite** with no own parts BY DESIGN. A
 * rule written to skip voids specifically would have shipped green and still crashed on the very element
 * D59 was built to prove.
 *
 * ⚠ REVERT-VERIFY (§1b: a fix without a test that fails in its absence is an assertion) — §3 is written
 * to fail in two distinct ways: delete the no-own-parts guard in `projectQuantities` and it THROWS on the
 * curtain wall; delete the children walk in `modelElements` and the glass/aluminium totals silently
 * collapse to nothing while the run still looks green. Both are asserted explicitly.
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
  totalsByContainer,
  totalsByDiscipline,
  totalsByMaterial,
  totalsByType,
} from '@bunyan/document';
import type { ActiveOptions, DesignOption, Registries } from '@bunyan/document';
import {
  curtainWallColumnType,
  curtainWallMullionType,
  curtainWallPanelType,
  curtainWallType,
  openingType,
  wallType,
} from '@bunyan/types';

const COLS = 3;
const ROWS = 2;

/** Two mutually-exclusive facade schemes, for the D67 cascade seen through a QUANTITY (§4). */
const OPTIONS: Readonly<Record<string, DesignOption>> = {
  'opt-a': { id: 'opt-a', setName: 'Facade', name: 'Scheme A', isPrimary: true },
  'opt-b': { id: 'opt-b', setName: 'Facade', name: 'Scheme B', isPrimary: false },
};

describe('the model enumeration query — `scene.elements` is not the model', () => {
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

  const registerAll = (r: Registries): void => {
    for (const type of [
      wallType,
      openingType,
      curtainWallType,
      curtainWallColumnType,
      curtainWallPanelType,
      curtainWallMullionType,
    ]) {
      r.types.register(type);
    }
    for (const command of CORE_COMMANDS) r.commands.register(command);
  };

  const newDoc = (): DocumentContext => {
    const registries = createRegistries();
    registerAll(registries);
    return new DocumentContext({ registries, geometry: client });
  };

  /** The materials + the `Site → Tower A → Level 1` spine every fixture below shares. */
  const groundwork = async (doc: DocumentContext): Promise<void> => {
    for (const m of [
      { id: 'concrete', name: 'C25/30', category: 'concrete', density: 2400 },
      { id: 'glass', name: 'Glass', category: 'other', density: 2500 },
      { id: 'alu', name: 'Aluminium', category: 'steel', density: 2700 },
      { id: 'timber', name: 'Timber', category: 'timber', density: 600 },
    ]) {
      await doc.execute('core.createMaterial', m);
    }
    await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
    await doc.execute('core.createContainer', {
      id: 'bldg',
      kind: 'building',
      name: 'Tower A',
      parentId: 'site',
    });
    await doc.execute('core.createContainer', {
      id: 'l1',
      kind: 'level',
      name: 'Level 1',
      parentId: 'bldg',
      elevation: 0,
    });
    await doc.execute('core.createStyle', {
      id: 'EXT',
      name: 'EXT',
      typeId: wallType.id,
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });
  };

  /**
   * THE BUILDING OF THE DESIGN DOC §1 — 3 authored rows, 19 real elements: one C25/30 wall, one Door
   * hosted in it (a leaf + a frame — it is NOT a pure void), and one 3×2 curtain wall.
   */
  const building = async (): Promise<{
    doc: DocumentContext;
    wall: string;
    door: string;
    cw: string;
  }> => {
    const doc = newDoc();
    await groundwork(doc);

    const wall = (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        styleId: 'EXT',
        containerId: 'l1',
        params: { start: [0, 0], end: [6000, 0], height: 3000 },
      })
    ).changes[0]!.id;

    const structure = doc.partsOf(wall)!.find((p) => p.name === 'structure')!;
    const face = structure.refs.find((r) => r.includes('/face/lateral.1'))!;
    const door = (
      await doc.execute('core.createElement', {
        typeId: openingType.id,
        hostId: wall,
        hostRef: face,
        containerId: 'l1',
        params: {
          width: 1000,
          height: 2100,
          offsetU: 1000,
          offsetV: 0,
          leafMaterialId: 'timber',
          frameMaterialId: 'timber',
        },
      })
    ).changes[0]!.id;

    const cw = (
      await doc.execute('core.createElement', {
        typeId: curtainWallType.id,
        containerId: 'l1',
        params: {
          origin: [10000, 0],
          width: 3000,
          height: 2400,
          cols: COLS,
          rows: ROWS,
          panelMaterialId: 'glass',
          mullionMaterialId: 'alu',
        },
      })
    ).changes[0]!.id;

    expect(doc.brokenRefs()).toHaveLength(0);
    return { doc, wall, door, cw };
  };

  /* ============================================================================================
   * §1 — THE CENSUS. 3 authored rows; 19 real elements.
   * ========================================================================================= */

  it('⚠⚠ 3 authored rows are 19 REAL elements — 16 of them invisible to `scene.elements`', async () => {
    const { doc, cw } = await building();

    expect(Object.keys(doc.scene.elements)).toHaveLength(3);

    const real = doc.modelElements();
    expect(real).toHaveLength(19);
    // The curtain wall alone: 1 authored row ⇒ 17 real elements (1 parent + 3 columns + 6 panels
    // + 4 vertical mullions + 3 horizontal mullions).
    expect(real.filter((e) => e.rootId === cw)).toHaveLength(17);

    // ⚠ THE TREE, NOT ONE LEVEL (rule 18) — a column is ITSELF composite, so a depth-1 walk would find
    // the columns and miss every panel. Naming a DEPTH-2 PEI is what only a recursive walk can satisfy.
    expect(real.map((e) => e.id)).toContain(`${cw}:column.c0:panel.r1`);

    const derived = real.filter((e) => e.derived);
    expect(derived).toHaveLength(16);
    // Every derived child reports its OWN Type — the hole found while building this query: the engine
    // built a full `Element` for each child and threw it away, so a panel schedule had no type to group by.
    expect(new Set(derived.map((e) => e.typeId))).toEqual(
      new Set([curtainWallColumnType.id, curtainWallPanelType.id, curtainWallMullionType.id]),
    );
    // And it inherits its root's LBS address — a panel is on the storey its curtain wall is on.
    for (const child of derived) expect(child.containerCode).toBe('Site/Tower A/Level 1');
  }, 120000);

  it('reports which real elements carry no OWN parts — 4 of the 19, and they are the composites', async () => {
    const { doc, cw } = await building();
    const real = doc.modelElements();

    const empty = real.filter((e) => !e.hasParts);
    expect(empty).toHaveLength(4);
    // ⚠ The curtain-wall PARENT and its three COLUMNS — pure composites, no own geometry by design.
    // This is the population Entry 57 and `review_P4.md` both missed while naming the Opening.
    expect(empty.map((e) => e.id).sort()).toEqual(
      [cw, `${cw}:column.c0`, `${cw}:column.c1`, `${cw}:column.c2`].sort(),
    );
  }, 120000);

  it('⚠ the ⓙ Door is NOT in that population — it has a leaf and a frame, and it is measured', async () => {
    const { doc, door } = await building();
    const asEnumerated = doc.modelElements().find((e) => e.id === door)!;
    expect(asEnumerated.hasParts).toBe(true);

    const rows = (await doc.projectQuantities()).rows.filter((r) => r.elementId === door);
    expect(rows.map((r) => r.part.name)).toEqual(['leaf', 'frame']);
  }, 120000);

  /* ============================================================================================
   * §2 — THE EXIT CRITERION. *"How much C25/30 is in this building?"*
   * ========================================================================================= */

  it('⚠⚠ answers "how much C25/30 is in this building?" — one call, no throw', async () => {
    const { doc } = await building();

    const quantities = await doc.projectQuantities();
    expect(quantities.basis).toBe('exact');
    expect(quantities.unmeasured).toHaveLength(0);

    const byMaterial = totalsByMaterial(quantities.rows);
    // 6000 × 200 × 3000 mm, less the door's 1000 × 2100 slice through the 200 mm layer.
    const wallVolume = 6000 * 200 * 3000 - 1000 * 2100 * 200;
    expect(byMaterial.get('concrete')!.volume).toBeCloseTo(wallVolume, 2);
    expect(byMaterial.get('concrete')!.mass).toBeCloseTo((wallVolume / 1e9) * 2400, 6);

    // The curtain wall's glass and aluminium are in the total — and they exist ONLY through the walk.
    expect(byMaterial.get('glass')!.volume).toBeGreaterThan(0);
    expect(byMaterial.get('alu')!.volume).toBeGreaterThan(0);
    expect(byMaterial.get('glass')!.elements).toBe(COLS * ROWS); // one row per panel
  }, 120000);

  it('⚠ the NAIVE loop still dies — the query is not a convenience, it is the only thing that works', async () => {
    const { doc } = await building();

    // Exactly the loop `review_P4.md` measured on 2026-07-14 and Entry 57 re-measured on 2026-07-25.
    await expect(
      (async () => {
        for (const id of Object.keys(doc.scene.elements)) await doc.quantities(id);
      })(),
    ).rejects.toThrow(/has no built geometry/);

    // ...while the query answers the same question without one.
    await expect(doc.projectQuantities()).resolves.toBeDefined();
  }, 120000);

  it('rolls up per discipline, per container and per type — the four axes the plan demands', async () => {
    const { doc } = await building();
    const { rows } = await doc.projectQuantities();

    // Per discipline (D45 — the work-package routing axis). The wall layer is structural; the door's
    // leaf/frame and every curtain-wall part are architectural.
    const byDiscipline = totalsByDiscipline(rows);
    expect([...byDiscipline.keys()].sort()).toEqual(['architectural', 'structural']);

    // Per container — the LBS address (spec §7a) that `QuantityBreakdown` had nowhere to carry.
    const byContainer = totalsByContainer(rows);
    expect([...byContainer.keys()]).toEqual(['Site/Tower A/Level 1']);

    // Per type — the schedule axis. A curtain-panel schedule is standard Revit and needs the child's type.
    const byType = totalsByType(rows);
    expect(byType.get(curtainWallPanelType.id)!.elements).toBe(COLS * ROWS);
    expect(byType.get(wallType.id)!.elements).toBe(1);
  }, 120000);

  it('splits the roll-up across TWO TOWERS — the per-container question Planitor asks', async () => {
    const doc = newDoc();
    await groundwork(doc);
    await doc.execute('core.createContainer', {
      id: 'bldg2',
      kind: 'building',
      name: 'Tower B',
      parentId: 'site',
    });
    await doc.execute('core.createContainer', {
      id: 'l1b',
      kind: 'level',
      name: 'Level 1',
      parentId: 'bldg2',
      elevation: 0,
    });
    for (const [container, length] of [
      ['l1', 6000],
      ['l1b', 3000],
    ] as const) {
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        styleId: 'EXT',
        containerId: container,
        params: { start: [0, 0], end: [length, 0], height: 3000 },
      });
    }

    const byContainer = totalsByContainer((await doc.projectQuantities()).rows);
    expect(byContainer.get('Site/Tower A/Level 1')!.volume).toBeCloseTo(6000 * 200 * 3000, 2);
    expect(byContainer.get('Site/Tower B/Level 1')!.volume).toBeCloseTo(3000 * 200 * 3000, 2);
  }, 120000);

  /* ============================================================================================
   * §3 — REVERT-VERIFY. The two ways this can silently regress.
   * ========================================================================================= */

  it('⚠⚠ REVERT-VERIFY (guard): with no-own-parts elements included, the roll-up THROWS', async () => {
    const { doc, cw } = await building();

    // Reproduce `projectQuantities` WITHOUT filter 3 (`if (!element.hasParts) continue`). This is the
    // exact body the guard removes — and it dies on the curtain wall, not on the Opening.
    await expect(
      (async () => {
        for (const element of doc.modelElements()) await doc.quantities(element.id);
      })(),
    ).rejects.toThrow(`element "${cw}" has no built geometry`);
  }, 120000);

  it('⚠⚠ REVERT-VERIFY (children walk): without it the totals silently LOSE the curtain wall', async () => {
    const { doc } = await building();
    const { rows } = await doc.projectQuantities();

    // Reproduce a depth-0 enumeration — the authored rows only, which is what every consumer wrote by
    // hand. It does not throw and it does not look wrong; it is simply missing 16 elements of glass and
    // aluminium. THAT is the failure mode: a plausible, short number wearing `basis: 'exact'`.
    const authoredOnly = rows.filter((r) => r.elementId === r.rootId);
    expect(totalsByMaterial(authoredOnly).get('glass')).toBeUndefined();
    expect(totalsByMaterial(authoredOnly).get('alu')).toBeUndefined();
    // ...while the real walk finds both.
    expect(totalsByMaterial(rows).get('glass')!.volume).toBeGreaterThan(0);
    expect(totalsByMaterial(rows).get('alu')!.volume).toBeGreaterThan(0);
  }, 120000);

  /* ============================================================================================
   * §4 — THE D67 CASCADE, SEEN THROUGH A QUANTITY (not through a count).
   * ========================================================================================= */

  it('⚠⚠ excludes a non-active scheme AND its hosted windows — D67, now visible as GLASS', async () => {
    const doc = newDoc();
    await groundwork(doc);

    /** One facade scheme: a wall carrying the option tag, with `windows` doors hosted in it. */
    const scheme = async (designOptionId: string, windows: number): Promise<string> => {
      const wall = (
        await doc.execute('core.createElement', {
          typeId: wallType.id,
          styleId: 'EXT',
          containerId: 'l1',
          designOptionId,
          params: { start: [0, 0], end: [9000, 0], height: 3000 },
        })
      ).changes[0]!.id;
      const structure = doc.partsOf(wall)!.find((p) => p.name === 'structure')!;
      const face = structure.refs.find((r) => r.includes('/face/lateral.1'))!;
      for (let i = 0; i < windows; i++) {
        await doc.execute('core.createElement', {
          typeId: openingType.id,
          hostId: wall,
          hostRef: face,
          containerId: 'l1',
          params: {
            width: 1000,
            height: 1400,
            offsetU: 1000 + i * 2000,
            offsetV: 400,
            leafMaterialId: 'glass',
            frameMaterialId: 'alu',
          },
        });
      }
      return wall;
    };

    await scheme('opt-a', 1); // the chosen scheme
    await scheme('opt-b', 3); // the scheme nobody builds
    expect(doc.brokenRefs()).toHaveLength(0);

    // ⚠ Only the WALLS carry the tag — the natural authoring act, and the only one Revit asks for.
    // The windows belong to their scheme by being HOSTED in it, which is the edge D65 did not walk.
    const opts = { designOptions: OPTIONS, active: {} as ActiveOptions };
    const real = doc.modelElements(opts);
    const windows = real.filter((e) => e.typeId === openingType.id);
    expect(windows).toHaveLength(1); // ⚠ 4 before D67 — three of them hosted on the excluded wall

    const rows = (await doc.projectQuantities(opts)).rows;
    const byType = totalsByType(rows);
    expect(byType.get(openingType.id)!.elements).toBe(1);
    expect(byType.get(wallType.id)!.elements).toBe(1);

    // ...and choosing the other scheme moves the quantity, rather than adding to it.
    const b = await doc.projectQuantities({ designOptions: OPTIONS, active: { Facade: 'opt-b' } });
    expect(totalsByType(b.rows).get(openingType.id)!.elements).toBe(3);
    expect(totalsByType(b.rows).get(wallType.id)!.elements).toBe(1);
  }, 180000);

  /* ============================================================================================
   * §5 — THE UNMEASURABLE (owner ruling Q1): reported, never zeroed, never silently dropped.
   * ========================================================================================= */

  it('⚠⚠ an element that cannot be BUILT is reported in `unmeasured`, not omitted and not zeroed', async () => {
    const doc = newDoc();
    await groundwork(doc);
    await doc.execute('core.createElement', {
      typeId: wallType.id,
      styleId: 'EXT',
      containerId: 'l1',
      params: { start: [0, 0], end: [6000, 0], height: 3000 },
    });

    // A D43 element: authored against a Type this app does not have. The document TOLERATES it (it must
    // — one Miqdar-authored column must never brick a file), so the roll-up must account for it.
    const scene = doc.scene;
    const stranger = 'wall-01KYSTRANGERSTRANGERSTRA';
    const reopened = new DocumentContext({
      registries: (() => {
        const r = createRegistries();
        registerAll(r);
        return r;
      })(),
      geometry: client,
      scene: {
        ...scene,
        elements: {
          ...scene.elements,
          [stranger]: {
            id: stranger,
            typeId: 'core.beam.from.the.future',
            typeVersion: 9,
            params: { length: 4000 },
            classification: { ifcClass: 'IfcBeam', loadBearing: true },
            containerId: 'l1',
          },
        },
      },
    });
    await reopened.rebuildAll();

    const quantities = await reopened.projectQuantities();
    // It is ENUMERATED (it is a real element the author placed) …
    expect(reopened.modelElements().map((e) => e.id)).toContain(stranger);
    // … reported as unmeasurable, with a reason …
    expect(quantities.unmeasured.map((u) => u.elementId)).toEqual([stranger]);
    expect(quantities.unmeasured[0]!.reason).toMatch(/core\.beam\.from\.the\.future/);
    // … and it contributes NO row: an unmeasurable quantity is omitted, never zeroed (rule 15).
    expect(quantities.rows.some((r) => r.elementId === stranger)).toBe(false);
    // The rest of the building still totals exactly.
    expect(totalsByMaterial(quantities.rows).get('concrete')!.volume).toBeCloseTo(
      6000 * 200 * 3000,
      2,
    );
    await reopened.dispose();
  }, 120000);

  it('⚠ a total whose density does not resolve reports volume EXACTLY and omits the mass', async () => {
    const doc = newDoc();
    await groundwork(doc);
    await doc.execute('core.createElement', {
      typeId: wallType.id,
      styleId: 'EXT',
      containerId: 'l1',
      params: { start: [0, 0], end: [6000, 0], height: 3000 },
    });

    // ⚠ The command layer REFUSES a style naming a material the document does not embed (a good guard),
    // so this state is only reachable the way it happens in the field: a `.bnn` that lost its material
    // pack — exactly the case `scene.materials` is embedded to prevent (D33). Re-open the scene with the
    // material gone; volume and area stay EXACT, the mass becomes an unknown rather than a nought (D45).
    const survivors = { ...doc.scene.materials };
    delete survivors['concrete'];
    const reopened = new DocumentContext({
      registries: (() => {
        const r = createRegistries();
        registerAll(r);
        return r;
      })(),
      geometry: client,
      scene: { ...doc.scene, materials: survivors },
    });
    await reopened.rebuildAll();

    const total = totalsByMaterial((await reopened.projectQuantities()).rows).get('concrete')!;
    expect(total.volume).toBeCloseTo(6000 * 200 * 3000, 2);
    expect(total.mass).toBeUndefined(); // ⚠ absent, NEVER 0 — and never a partial sum
    await reopened.dispose();
  }, 120000);
});
