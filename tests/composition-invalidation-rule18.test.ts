// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ DOMAIN RULE 18, SWEPT BACKWARD — *"An element may own child ELEMENTS, not only parts"* (D59,
 * `core_logic.md` §8.18), against the INVALIDATOR, which was written before children existed.
 *
 * ⚠⚠ THE FINDING: a generated child (D59 Model A) may wear a SHARED STYLE — `BuiltChild.styleId` is a
 * real member, and `build.ts` resolves it into the child's `BuildContext` exactly as it does for an
 * authored row — but the style→instance edge answered *"every element wearing this style"* with
 * `Object.values(scene.elements)`, **and a generated child is not a scene row.** Measured on real OCCT:
 *
 *     a panel built from its style at 20 mm      →  20,000,000 mm³
 *     `core.updateStyle` 20 mm → 60 mm           →  `rebuilt: []`   (nothing invalidated)
 *     the same panel, after the edit             →  20,000,000 mm³  (60,000,000 is correct — 3× wrong)
 *     …and after any unrelated `rebuildAll()`    →  60,000,000 mm³
 *
 * So the model contradicted its own recipe **until something else happened to force a full rebuild** —
 * and `projectQuantities` published the stale number under `basis: 'exact'` in the meantime. It is
 * D31's headline promise (*"change one style, 400 walls follow"*) failing exactly one level down, and it
 * is `dependency.ts`'s own stated rule broken: **an edge the build READS must be an edge the
 * invalidator KNOWS.**
 *
 * ⚠ THE DATES ARE THE SWEEP: `instancesOfStyle` and the style edge are D31 (2026-07-13); composition
 * landed 2026-07-22 (D59, Entry 48). The rule bound every consumer written after it and did nothing
 * about the one written before — §1c-8, for the fourth time.
 *
 * ⚠ The section edge is the same defect one road further out (section → styles using it → their
 * instances), and is covered below, because a `Section` reaches geometry only through a style.
 *
 * REVERT-VERIFY: drop the `childStyleUsers` argument from `dependents` (or the walk that feeds it) and
 * §1 and §2 fail with the 20,000,000-where-60,000,000 above.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import type {
  BimObjectType,
  BuildContext,
  BuiltChild,
  BuiltPart,
  Registries,
} from '@bunyan/document';

/**
 * A child whose SIZE comes from its shared style (D31 + D59) — the case `BuiltChild.styleId` exists for.
 * The shipped `core.curtainwall` passes its children explicit params instead, which is why nothing in the
 * suite had ever exercised the member: the contract permitted it and no test walked that road.
 */
const styledPanel: BimObjectType = {
  id: 'test.styled-panel',
  version: 1,
  label: 'Styled panel',
  parameterSchema: {},
  styleSchema: {},
  defaultClassification: { ifcClass: 'IfcPlate', loadBearing: false },
  async buildGeometry(ctx: BuildContext): Promise<readonly BuiltPart[]> {
    const layer = ctx.style?.layers?.[0];
    const nodeId = ctx.nodeId('panel');
    const solid = await ctx.geometry.request('makeBox', {
      nodeId,
      dx: 1000,
      dy: layer?.thickness ?? 10,
      dz: 1000,
      at: [0, 0, 0],
    });
    return [
      {
        name: 'panel',
        nodeId,
        handle: solid.handle,
        refs: solid.refs,
        materialId: layer?.materialId ?? 'glass',
        discipline: ctx.defaultDiscipline,
      },
    ];
  },
};

const facade: BimObjectType = {
  id: 'test.facade',
  version: 1,
  label: 'Facade',
  parameterSchema: {},
  defaultClassification: { ifcClass: 'IfcCurtainWall', loadBearing: false },
  buildChildren: (): Promise<readonly BuiltChild[]> =>
    Promise.resolve([
      { slot: 'p0', typeId: styledPanel.id, params: {}, styleId: 'PANEL' },
      { slot: 'p1', typeId: styledPanel.id, params: {}, styleId: 'PANEL' },
    ]),
};

const PANE_AREA = 1000 * 1000;

describe('domain rule 18 — a style edit reaches the CHILD elements wearing it', () => {
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

  const newDoc = async (): Promise<{ doc: DocumentContext; facadeId: string }> => {
    const registries: Registries = createRegistries();
    registries.types.register(styledPanel);
    registries.types.register(facade);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });

    await doc.execute('core.createMaterial', {
      id: 'glass',
      name: 'Glass',
      category: 'other',
      density: 2500,
    });
    await doc.execute('core.createSection', {
      id: 'PANE',
      name: 'Pane',
      shape: 'rectangle',
      dimensions: { b: 1000, h: 1000 },
    });
    await doc.execute('core.createStyle', {
      id: 'PANEL',
      name: 'Panel',
      typeId: styledPanel.id,
      sectionId: 'PANE',
      layers: [{ name: 'pane', materialId: 'glass', thickness: 20, discipline: 'architectural' }],
    });
    const created = await doc.execute('core.createElement', { typeId: facade.id, params: {} });
    return { doc, facadeId: created.changes[0]!.id };
  };

  const builtVolume = async (doc: DocumentContext): Promise<number> => {
    const project = await doc.projectQuantities();
    expect(project.unmeasured).toEqual([]);
    return project.rows.reduce((sum, row) => sum + row.part.volume, 0);
  };

  /* ============================================================================================
   * §1 — THE STYLE EDGE.
   * ========================================================================================= */

  it('⚠⚠ `updateStyle` rebuilds a generated child — it used to leave a 3× stale solid behind', async () => {
    const { doc, facadeId } = await newDoc();
    expect(await builtVolume(doc)).toBeCloseTo(2 * PANE_AREA * 20, 6);

    const edit = await doc.execute('core.updateStyle', {
      styleId: 'PANEL',
      layers: [{ name: 'pane', materialId: 'glass', thickness: 60, discipline: 'architectural' }],
    });

    // ⚠ THE MOAT-BEARING HALF, not only the geometry (Entry 58): `rebuilt` is what a Clean Delta consumer
    // reads the associative cascade off. It was `[]` — so even once the geometry was right, Planitor
    // would have been told the façade was `unchanged`.
    expect(edit.rebuilt).toContain(facadeId);
    expect(await builtVolume(doc)).toBeCloseTo(2 * PANE_AREA * 60, 6);

    // ⚠ AND THE STALENESS WAS INVISIBLE PRECISELY BECAUSE A FULL REBUILD CURED IT: the live session and
    // a reloaded file disagreed, and only the file was right.
    await doc.rebuildAll();
    expect(await builtVolume(doc)).toBeCloseTo(2 * PANE_AREA * 60, 6);
  }, 180000);

  /* ============================================================================================
   * §2 — THE SECTION EDGE, which reaches geometry only THROUGH a style (the same defect, one road out).
   * ========================================================================================= */

  it('⚠ `updateSection` reaches a child through the style that names the section', async () => {
    const { doc, facadeId } = await newDoc();
    const edit = await doc.execute('core.updateSection', { id: 'PANE', name: 'Pane 2' });
    expect(edit.rebuilt).toContain(facadeId);
  }, 180000);

  /* ============================================================================================
   * §3 — THE ADDITIVITY GATE. An authored row is untouched, and a style nobody wears still rebuilds
   * nothing — the edge was WIDENED, not replaced by "rebuild everything".
   * ========================================================================================= */

  it('⚠ an unrelated style edit still invalidates nothing — the fix widens the edge, it does not blunt it', async () => {
    const { doc } = await newDoc();
    await doc.execute('core.createStyle', {
      id: 'UNUSED',
      name: 'Unused',
      typeId: styledPanel.id,
      layers: [{ name: 'pane', materialId: 'glass', thickness: 5, discipline: 'architectural' }],
    });
    const edit = await doc.execute('core.updateStyle', {
      styleId: 'UNUSED',
      layers: [{ name: 'pane', materialId: 'glass', thickness: 7, discipline: 'architectural' }],
    });
    expect(edit.rebuilt).toEqual([]);
    expect(await builtVolume(doc)).toBeCloseTo(2 * PANE_AREA * 20, 6);
  }, 180000);
});
