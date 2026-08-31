// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ **D66 §3c — FORCE vs DECLARE, per aggregate (T-005).**
 * `docs/design/P5_step9_D66_lazy_build_design.md` §3c is the design; this is what discharges it.
 *
 * ── THE PROBLEM T-018 MEASURED ────────────────────────────────────────────────────────────────────
 * On a lazily built document `enumerate.ts` reported every element nobody had asked for yet as
 * `state: 'failed'`, `failure: 'unbuildable'` — the state a Type REFUSING to build produces. A normal
 * first paint therefore made every aggregate call most of the building broken.
 *
 * ── THE TWO HALVES ASSERTED HERE ──────────────────────────────────────────────────────────────────
 *  1. **The distinction.** An element nobody built is `stale` (*recipe present, solid not built*) with
 *     no `failure`; one whose Type refused stays `failed`/`unbuildable`. §1 puts both in ONE document,
 *     so a revert of `enumerate.ts` collapses them onto each other and the test goes red.
 *  2. **The choice.** `projectQuantities`, `evaluateSchedule`, `projectView` and the Clean Delta all
 *     **FORCE**; `saveBnn` needs neither. §2 measures WHY DECLARE was never available to the four: a
 *     deferred parent's D59 children are not enumerated at all, so there is nothing left to declare
 *     them by — an aggregate that DECLAREd would be plausible and short, which is domain rule 15's
 *     failure mode one level up.
 *
 * ⚠ Every aggregate below is asked of a document that built ONE of its four authored rows, and its
 * answer is compared against the same aggregate on a fully built document. That comparison is the
 * revert tripwire: drop the `#forceBuild()` line and each aggregate answers short.
 *
 * ⚠ A fresh partial document per aggregate, deliberately — FORCE builds, so an aggregate that ran
 * would leave the next one nothing to defer.
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
  deferredElements,
  exportCleanDelta,
  saveBnn,
} from '@bunyan/document';
import type {
  ExportOptions,
  ModelRevision,
  Registries,
  Scene,
  ScheduleDefinition,
  UndoableEdit,
  ViewDescriptor,
} from '@bunyan/document';
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
const CUT = 1200;
const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
/** A type id no registry holds — D43's unknown type, the `unbuildable` half of §1's contrast. */
const GONE = 'core.gone';

interface Authored {
  readonly scene: Scene;
  readonly journal: readonly UndoableEdit[];
  readonly revision: ModelRevision;
  readonly rev1: ModelRevision;
  readonly wall: string;
  readonly door: string;
  readonly cw: string;
  readonly ghost: string;
  readonly view: ViewDescriptor;
}

describe('D66 §3c — FORCE vs DECLARE, per aggregate (T-005)', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let authored: Authored;
  /** Every document this file builds, so the OCCT solids are freed rather than left on the heap. */
  const live: DocumentContext[] = [];

  const newRegistries = (): Registries => {
    const r = createRegistries();
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
    return r;
  };

  /** The prior-context injection owner ruling Q2 needs — a throwaway document at revision N. */
  const priorContext = (): NonNullable<ExportOptions['priorContext']> => ({
    registries: newRegistries(),
    geometry: client,
    create: (scene: Scene) =>
      new DocumentContext({ registries: newRegistries(), geometry: client, scene }),
  });

  const docOn = (scene?: Scene, withJournal = false): DocumentContext => {
    const doc = new DocumentContext({
      registries: newRegistries(),
      geometry: client,
      ...(scene === undefined ? {} : { scene }),
      ...(withJournal ? { journal: authored.journal, revision: authored.revision } : {}),
    });
    live.push(doc);
    return doc;
  };

  /** The scene with one element's Type made unknown — authored by a newer Bunyan, in D43's terms. */
  const sceneWithGhost = (): Scene => {
    const clone = JSON.parse(JSON.stringify(authored.scene)) as {
      elements: Record<string, { typeId: string }>;
    };
    clone.elements[authored.ghost]!.typeId = GONE;
    return clone as unknown as Scene;
  };

  /** Built: the wall (and its door, which is the same assembly). Deferred: the curtain wall. */
  const partialOn = async (scene: Scene, withJournal = false): Promise<DocumentContext> => {
    const doc = docOn(scene, withJournal);
    await doc.rebuildOnly([authored.wall]);
    return doc;
  };

  const fullOn = async (scene: Scene, withJournal = false): Promise<DocumentContext> => {
    const doc = docOn(scene, withJournal);
    await doc.rebuildAll();
    return doc;
  };

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));

    const doc = docOn();
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

    // ⚠ Far from the wall in plan, and on its own: `partnersAt` matches endpoints with no container
    // scoping, so a touching baseline would put this element in the wall's join neighbourhood.
    const ghost = (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        styleId: 'EXT',
        containerId: 'l1',
        params: { start: [40_000, 0], end: [44_000, 0], height: 3000 },
      })
    ).changes[0]!.id;

    const viewId = (
      await doc.execute('core.createView', {
        kind: 'plan',
        name: 'Level 1 Plan',
        scale: 100,
        levelId: 'l1',
        cutHeight: CUT,
      })
    ).changes[0]!.id;

    // The baseline, issued BEFORE the curtain wall exists — so the delta below is exactly the curtain
    // wall and its generated children, the population a partial build loses.
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    const cw = (
      await doc.execute('core.createElement', {
        typeId: curtainWallType.id,
        containerId: 'l1',
        params: {
          origin: [10_000, 0],
          width: 3000,
          height: 2400,
          cols: COLS,
          rows: ROWS,
          panelMaterialId: 'glass',
          mullionMaterialId: 'alu',
        },
      })
    ).changes[0]!.id;

    await doc.execute('core.issueRevision', { by: 'architect' });
    const revision = doc.revision!;

    expect(doc.brokenRefs(), 'the authored fixture is clean').toHaveLength(0);
    authored = {
      scene: doc.scene,
      journal: doc.changeFeed(),
      revision,
      rev1,
      wall,
      door,
      cw,
      ghost,
      view: doc.scene.views![viewId]!,
    };
  });

  afterAll(async () => {
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  /* ============================================================================================
   * §1 — THE DISTINCTION: deferred is `stale`, refused is `unbuildable`
   * ========================================================================================= */

  it('⚠⚠ a deferred element is `stale`; only a Type that REFUSED is `failed`/`unbuildable`', async () => {
    const doc = docOn(sceneWithGhost());
    // Build the wall AND the ghost — the ghost's Type is unknown, so the build engine marks it. The
    // curtain wall is asked for by nobody, so it has no `ElementGeometry` at all.
    await doc.rebuildOnly([authored.wall, authored.ghost]);

    const byId = new Map(doc.modelElements().map((e) => [e.id, e]));

    const deferred = byId.get(authored.cw)!;
    expect(deferred.state, 'nobody asked for the curtain wall').toBe('stale');
    expect(deferred.failure, 'nothing failed, so there is no reason to give').toBeUndefined();

    const refused = byId.get(authored.ghost)!;
    expect(refused.state, 'its Type is not registered — D43').toBe('failed');
    expect(refused.failure).toBe('unbuildable');

    // ⚠ THE REVERT TRIPWIRE. `enumerate.ts` used `state: node?.state ?? 'failed'` with
    // `failure: 'unbuildable'`, which makes these two elements INDISTINGUISHABLE. Restore that line and
    // this assertion is the one that goes red — a consumer cannot tell "nobody asked for this yet"
    // from "this cannot be built at all", and under lazy build the two differ by the whole building.
    expect(
      [deferred.state, deferred.failure ?? 'none'],
      'deferred must not wear the refused element’s state',
    ).not.toEqual([refused.state, refused.failure]);

    // ⚠ And `unbuildable()` reports only the refused one: it reads the geometry map, so an element with
    // no entry was never in its reach. The two roads agree.
    expect(doc.unbuildable().map((u) => u.elementId)).toEqual([authored.ghost]);
  });

  /* ============================================================================================
   * §2 — WHY DECLARE WAS NEVER AVAILABLE: the missing population cannot be named
   * ========================================================================================= */

  it('⚠⚠ a deferred parent’s D59 children are not enumerated AT ALL — the measurement that rules out DECLARE', async () => {
    const partial = docOn(authored.scene);
    await partial.rebuildOnly([authored.wall]);
    const full = await fullOn(authored.scene);

    const childrenOf = (doc: DocumentContext): string[] =>
      doc
        .modelElements()
        .map((e) => e.id)
        .filter((id) => id.startsWith(`${authored.cw}:`));

    expect(
      childrenOf(full).length,
      'the built curtain wall derives its columns/panels/mullions',
    ).toBeGreaterThan(0);
    expect(
      childrenOf(partial),
      'a child is the BUILD’s output, so an unbuilt parent yields no child to declare',
    ).toEqual([]);

    // The authored row is still reported — it is the CHILDREN that vanish, and that asymmetry is the
    // whole argument: a declaration can only name what it can see.
    expect(partial.modelElements().some((e) => e.id === authored.cw)).toBe(true);
    expect(deferredElements(partial.scene, (id) => partial.geometryOf(id))).toContain(authored.cw);
  });

  /* ============================================================================================
   * §3 — THE CHOICE, PER AGGREGATE
   * ========================================================================================= */

  it('`projectQuantities` FORCES — the take-off is the same from a partial document as from a full one', async () => {
    const partial = await partialOn(sceneWithGhost());
    const full = await fullOn(sceneWithGhost());

    const a = await partial.projectQuantities();
    const b = await full.projectQuantities();

    expect(a.rows.length, 'row for row').toBe(b.rows.length);
    expect(a.rows.map((r) => r.elementId).sort()).toEqual(b.rows.map((r) => r.elementId).sort());
    // The ONLY unmeasured element is the one whose Type refused — deferral contributes none.
    expect(a.unmeasured.map((u) => u.elementId)).toEqual([authored.ghost]);
    expect(a.unmeasured[0]!.reason).toContain(GONE);
  });

  it('`evaluateSchedule` FORCES — and it is the ROW SET, not the measurement, that needs it', async () => {
    const definition: ScheduleDefinition = {
      id: 'sch-panels',
      name: 'Curtain wall panels',
      // ⚠ NO `quantity` column: this schedule makes zero measurement calls, and is still short by every
      // panel without FORCE, because the rows themselves are the build's output.
      filter: { typeId: curtainWallPanelType.id },
      columns: [
        { source: 'field', key: 'name' },
        { source: 'field', key: 'type' },
      ],
    };
    const partial = await partialOn(authored.scene);
    const full = await fullOn(authored.scene);

    const a = await partial.evaluateSchedule(definition);
    const b = await full.evaluateSchedule(definition);

    expect(b.rows.length, 'a 3×2 curtain wall has panels to schedule').toBe(COLS * ROWS);
    expect(a.rows.map((r) => r.elementId)).toEqual(b.rows.map((r) => r.elementId));
  });

  it('`projectView` FORCES — a drawing that is plausible and short is what nobody audits', async () => {
    const partial = await partialOn(authored.scene);
    const full = await fullOn(authored.scene);

    const a = await partial.projectView(authored.view);
    const b = await full.projectView(authored.view);

    const drawn = (r: { curves: readonly { elementId: string }[] }): string[] =>
      [...new Set(r.curves.map((c) => c.elementId))].sort();

    expect(
      drawn(b).filter((id) => id.startsWith(`${authored.cw}:`)).length,
      'the full plan cuts the curtain wall’s children too',
    ).toBeGreaterThan(0);
    expect(drawn(a), 'the same drawing from a partial document').toEqual(drawn(b));
    expect(a.unprojected.length).toBe(b.unprojected.length);
  });

  it('the Clean Delta FORCES, bounded to the delta — an unbilled panel is Planitor’s `unchanged`', async () => {
    const partial = await partialOn(authored.scene, true);
    const full = await fullOn(authored.scene, true);

    const options = { since: authored.rev1, priorContext: priorContext() };
    const a = await exportCleanDelta(partial, options);
    const b = await exportCleanDelta(full, options);

    const peis = (pkg: { elements: readonly { pei: string }[] }): string[] =>
      pkg.elements.map((e) => e.pei).sort();

    expect(
      peis(b).filter((id) => id.startsWith(`${authored.cw}:`)).length,
      'the delta is the curtain wall AND its generated children',
    ).toBeGreaterThan(0);
    expect(peis(a), 'the same package from a partial document').toEqual(peis(b));

    // ⚠ BOUNDED, not whole-model: the wall is outside the delta, so FORCE never builds it. That is
    // owner ruling Q2's scope — the export's cost tracks the size of the CHANGE.
    expect(
      deferredElements(partial.scene, (id) => partial.geometryOf(id)),
      'the wall is outside the delta, so FORCE never reached it',
    ).toContain(authored.ghost);
  });

  it('`saveBnn` needs NEITHER — its signature takes the recipe, so no built state is in reach', async () => {
    const partial = await partialOn(authored.scene);
    const full = await fullOn(authored.scene);

    expect(JSON.stringify(partial.scene)).toBe(JSON.stringify(full.scene));
    expect(saveBnn(partial.scene, { kernelBuildId: KERNEL_BUILD_ID }).length).toBe(
      saveBnn(full.scene, { kernelBuildId: KERNEL_BUILD_ID }).length,
    );
  });

  /* ============================================================================================
   * §4 — FORCE IS A BUILD, NOT AN EDIT (domain rule 17)
   * ========================================================================================= */

  it('⚠ FORCE mints no `UndoableEdit`, no journal entry and no revision', async () => {
    const doc = await partialOn(authored.scene, true);
    const journal = doc.changeFeed().length;
    const undo = doc.history().length;
    const revision = doc.revision;

    await doc.projectQuantities();

    expect(doc.changeFeed().length, 'the append-only journal is untouched').toBe(journal);
    expect(doc.history().length, 'no undoable edit was minted').toBe(undo);
    expect(doc.revision).toBe(revision);
    expect(deferredElements(doc.scene, (id) => doc.geometryOf(id))).toEqual([]);
  });
});
