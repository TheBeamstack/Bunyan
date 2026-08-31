// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE CLEAN DELTA EXPORTER — *"the contract that carries money"* (Freeze-Gate ⑥, D36b/D57).
 *
 * Design: `P5_step6_clean_delta_design.md` (the payload map, proven pre-freeze to need no frozen change)
 * + `P5_step6A_enumeration_design.md` §4 Q2 (the owner's 2026-07-25 ruling on `prior`).
 * Target: `../Planitor/v2.2_spec.md` §4 — `contract_version: "1.2"`, `source: "bunyan"`.
 *
 * ⚠⚠ THE PROPERTY UNDER TEST IS THE MOAT, AND §3 IS WHERE IT IS WON: `change_type` is **READ off the
 * journal, never inferred by diffing two models.** The decisive case is the ASSOCIATIVE CASCADE — move a
 * Level, and every wall on it re-quantifies though **nothing touched them directly and no `SceneChange`
 * names them.** They appear only in `UndoableEdit.rebuilt`. A two-model diff gets that right only by
 * luck; Bunyan reads it. §3 asserts exactly that, on real geometry.
 *
 * ⚠ REVERT-VERIFY: neuter the `rebuilt` fold in `historiesIn` and §3 fails — the cascaded walls come back
 * `unchanged` while their volume has demonstrably moved, which is a schedule that never re-prices work
 * somebody has to do.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CLEAN_DELTA_CONTRACT_VERSION,
  CORE_COMMANDS,
  DocumentContext,
  createRegistries,
  exportCleanDelta,
  sceneAt,
} from '@bunyan/document';
import { loadBnn, saveBnn } from '@bunyan/document';
import type { DesignOption, ExportOptions, Registries, Scene } from '@bunyan/document';
import {
  curtainWallColumnType,
  curtainWallMullionType,
  curtainWallPanelType,
  curtainWallType,
  openingType,
  wallType,
} from '@bunyan/types';

/** Two mutually-exclusive facade schemes — the D65/D67 exclusion, seen on the EXPORTER path. */
const OPTIONS: Readonly<Record<string, DesignOption>> = {
  'opt-a': { id: 'opt-a', setName: 'Facade', name: 'Scheme A', isPrimary: true },
  'opt-b': { id: 'opt-b', setName: 'Facade', name: 'Scheme B', isPrimary: false },
};

describe('the Clean Delta exporter — change_type is READ, never inferred', () => {
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
    r.types.register(wallType);
    r.types.register(openingType);
    for (const command of CORE_COMMANDS) r.commands.register(command);
  };

  const newRegistries = (): Registries => {
    const r = createRegistries();
    registerAll(r);
    return r;
  };

  const newDoc = (): DocumentContext =>
    new DocumentContext({ registries: newRegistries(), geometry: client });

  /** The prior-context injection the owner's Q2 ruling needs — a throwaway document at revision N. */
  const priorContext = (): NonNullable<ExportOptions['priorContext']> => ({
    registries: newRegistries(),
    geometry: client,
    create: (scene: Scene) =>
      new DocumentContext({ registries: newRegistries(), geometry: client, scene }),
  });

  /** `Site → Tower A → Level 1/Level 2`, one material, one wall style. */
  const groundwork = async (doc: DocumentContext): Promise<void> => {
    await doc.execute('core.createMaterial', {
      id: 'concrete',
      name: 'C25/30',
      category: 'concrete',
      density: 2400,
    });
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
    await doc.execute('core.createContainer', {
      id: 'l2',
      kind: 'level',
      name: 'Level 2',
      parentId: 'bldg',
      elevation: 3000,
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

  const wall = async (doc: DocumentContext, containerId: string, length: number): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        styleId: 'EXT',
        containerId,
        params: { start: [0, 0], end: [length, 0], height: 3000 },
      })
    ).changes[0]!.id;

  /* ============================================================================================
   * §1 — THE PACKAGE. Every field of Planitor v2.2 §4, from frozen shapes.
   * ========================================================================================= */

  it('⚠⚠ emits the Planitor v2.2 §4 package — contract 1.2, source bunyan, basis exact, per-part', async () => {
    const doc = newDoc();
    await groundwork(doc);
    const w = await wall(doc, 'l1', 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    // ...then a real edit after the baseline.
    await doc.execute('core.setParams', { elementId: w, params: { end: [8000, 0] } });
    await doc.execute('core.issueRevision', { by: 'architect' });

    const pkg = await exportCleanDelta(doc, { since: rev1, priorContext: priorContext() });

    expect(pkg.contract_version).toBe(CLEAN_DELTA_CONTRACT_VERSION);
    expect(pkg.contract_version).toBe('1.2');
    expect(pkg.source).toBe('bunyan');
    expect(pkg.units).toBe('metric');
    expect(pkg.model_revision.snapshot_number).toBe(2);
    expect(pkg.model_revision.previous_snapshot_number).toBe(1);
    expect(pkg.model_revision.promoted_by).toBe('architect');

    // ⚠ THE LBS FALLS OUT OF THE AUTHORED MODEL — nothing minted, nothing mapped (D35).
    expect(pkg.spatial.zones.map((z) => z.name)).toEqual(['Tower A']);
    expect(pkg.spatial.floors.map((f) => f.label)).toEqual(['Level 1', 'Level 2']);
    expect(pkg.spatial.floors[1]!.elevation).toBe(3); // mm → m
    expect(pkg.spatial.floors[0]!.zone_code).toBe('Site/Tower A');

    const row = pkg.elements.find((e) => e.pei === w)!;
    // ⚠ The PEI **is** the element id — no minting, no fingerprinting (Planitor D9).
    expect(row.pei).toBe(w);
    expect(row.ifc_guid).toBeNull();
    expect(row.fingerprint).toBeNull();
    expect(row.spatial_container_code).toBe('Site/Tower A/Level 1');
    expect(row.classification.ifc_class).toBe('IfcWall');
    expect(row.classification.type_name).toBe(wallType.id);

    // ⚠ `basis: exact` — measured on the B-Rep, and Planitor must never downgrade it (its D10).
    expect(row.quantity!.basis).toBe('exact');
    expect(row.quantity!.unit).toBe('m3');
    expect(row.quantity!.value).toBeCloseTo((8000 * 200 * 3000) / 1e9, 9);
    // ⚠⚠ THE PER-PART BREAKDOWN — *"the point of the whole exercise"*: the material and the trade, not
    // a percentage of a wall. This is what retires Planitor's hardcoded `density: 7850`.
    expect(row.quantity!.parts).toHaveLength(1);
    expect(row.quantity!.parts[0]!.material).toBe('C25/30');
    // ⚠⚠ RULE 12 (Entry 60): the wire carries the material's shared-entity ID, not only its display
    // NAME. `material` above is a mutable, non-unique label — rename C25/30 and every downstream work
    // package re-keys; two materials sharing a display name merge into one schedule group; and an
    // unresolvable material falls back to emitting the raw id AS the name, so one material arrives
    // under two different keys. *"Materials and Sections are shared entities, never strings — a value
    // that must be grouped, scheduled, or read by an analysis engine cannot be a copy."*
    expect(row.quantity!.parts[0]!.materialId).toBe('concrete');
    expect(row.quantity!.parts[0]!.discipline).toBe('structural');
    expect(row.quantity!.parts[0]!.mass).toBeCloseTo(((8000 * 200 * 3000) / 1e9) * 2400, 6);

    // ⚠ Freeze-Gate ⓗ — LENGTH is the element's SEMANTIC axis (its baseline), never `edgeLength`.
    expect(row.quantity!.canonical.length).toBeCloseTo(8, 9);
    expect(row.quantity!.canonical.count).toBe(1);

    // v1.0.0 has no split/merge verb — both null, additive the day one lands.
    expect(row.links).toEqual({ split_from_pei: null, merge_into_pei: null });
    // ⚠ `reidentified` is declared and NEVER emitted — it cannot occur (D1 + D44). The moat.
    expect(pkg.summary.reidentified).toBe(0);
  }, 180000);

  /* ============================================================================================
   * §2 — `change_type`, each branch, read off the journal slice.
   * ========================================================================================= */

  it('reads added / modified_qty / modified_move / modified_type / deleted from the journal', async () => {
    const doc = newDoc();
    await groundwork(doc);
    const kept = await wall(doc, 'l1', 6000);
    const moved = await wall(doc, 'l1', 6000);
    const retyped = await wall(doc, 'l1', 6000);
    const removed = await wall(doc, 'l1', 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    // added — a wall that did not exist at the baseline
    const added = await wall(doc, 'l1', 4000);
    // modified_qty — longer, so its volume moved
    await doc.execute('core.setParams', { elementId: kept, params: { end: [9000, 0] } });
    // modified_move — translated with its length held, so the quantity did NOT move
    await doc.execute('core.setParams', {
      elementId: moved,
      params: { start: [0, 5000], end: [6000, 5000] },
    });
    // modified_type — a different style
    await doc.execute('core.createStyle', {
      id: 'INT',
      name: 'INT',
      typeId: wallType.id,
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 100, discipline: 'structural' },
      ],
    });
    await doc.execute('core.setElementMetadata', { elementId: retyped, mark: 'W-01' });
    // deleted
    await doc.execute('core.deleteElement', { elementId: removed });
    await doc.execute('core.issueRevision', { by: 'architect' });

    const pkg = await exportCleanDelta(doc, { since: rev1, priorContext: priorContext() });
    const typeOf = (id: string): string | undefined =>
      pkg.elements.find((e) => e.pei === id)?.change_type;

    expect(typeOf(added)).toBe('added');
    expect(typeOf(kept)).toBe('modified_qty');
    // ⚠ A pure translation: position changed, quantity did not. A schedule must NOT re-price it — but
    // it MUST reassign it if its container changed, which is why the row still carries `prior`.
    expect(typeOf(moved)).toBe('modified_move');
    expect(typeOf(removed)).toBe('deleted');
    // ⚠ A pure METADATA edit (a `mark`) is `unchanged`, and that is deliberate rather than a gap:
    // Planitor's enum has no metadata member, and its consumer rule treats `unchanged` as a no-op —
    // which is exactly right, because nothing it prices or locates is different. Claiming
    // `modified_qty` here would send a re-pricing job for an edit that moved no quantity.
    expect(typeOf(retyped)).toBe('unchanged');

    // The summary counts what the rows say — it is a fold, never a second derivation.
    const counted = pkg.elements.filter((e) => e.change_type === 'added').length;
    expect(pkg.summary.added).toBe(counted);
  }, 180000);

  it('⚠ prices `prior` EXACTLY — the wall was 3.6 m³ at the baseline and is 5.4 m³ now', async () => {
    const doc = newDoc();
    await groundwork(doc);
    const w = await wall(doc, 'l1', 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    await doc.execute('core.setParams', { elementId: w, params: { end: [9000, 0] } });
    await doc.execute('core.issueRevision', { by: 'architect' });

    const pkg = await exportCleanDelta(doc, { since: rev1, priorContext: priorContext() });
    const row = pkg.elements.find((e) => e.pei === w)!;

    expect(row.prior.quantity_value).toBeCloseTo((6000 * 200 * 3000) / 1e9, 9); // 3.6 m³
    expect(row.quantity!.value).toBeCloseTo((9000 * 200 * 3000) / 1e9, 9); // 5.4 m³
    expect(row.prior.spatial_container_code).toBe('Site/Tower A/Level 1');
  }, 180000);

  it('⚠ WITHOUT a prior context the export still succeeds — prior is null, nothing is invented', async () => {
    const doc = newDoc();
    await groundwork(doc);
    const w = await wall(doc, 'l1', 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;
    await doc.execute('core.setParams', { elementId: w, params: { end: [9000, 0] } });

    // A caller that only wants `change_type` (a schedule reconciliation) pays NO kernel time for prior.
    const pkg = await exportCleanDelta(doc, { since: rev1 });
    const row = pkg.elements.find((e) => e.pei === w)!;
    expect(row.prior.quantity_value).toBeNull();
    expect(row.change_type).toBe('modified_qty'); // still read, off the journal
  }, 180000);

  /* ============================================================================================
   * §3 — ⚠⚠ THE ASSOCIATIVE CASCADE. The case a two-model diff gets right only by luck.
   * ========================================================================================= */

  it('⚠⚠ a LEVEL MOVES and the wall spanning it is `modified_qty` — read off `rebuilt`, touched by nothing', async () => {
    const doc = newDoc();
    await groundwork(doc);

    // ⚠ A wall whose HEIGHT IS DERIVED from its storey span (D50 step 0b) — the imp_plan's own exit
    // criterion, *"A WALL SPANS LEVEL 1 → LEVEL 2, AND ITS HEIGHT IS DERIVED."* Raise Level 2 and it
    // genuinely grows, so its VOLUME moves. That is what makes this a quantity story and not a move.
    const spanning = await wall(doc, 'l1', 6000);
    await doc.execute('core.createConstraint', { element: spanning, kind: 'base', target: 'l1' });
    await doc.execute('core.createConstraint', { element: spanning, kind: 'top', target: 'l2' });
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;
    const volumeBefore = (await doc.quantities(spanning)).parts[0]!.volume;

    // ⚠ ONE edit, and it names a CONTAINER — not a single element.
    const edit = await doc.execute('core.updateContainer', { id: 'l2', elevation: 4200 });

    // (a) The wall really did re-quantify — the cascade is a fact about the geometry, not a label.
    const volumeAfter = (await doc.quantities(spanning)).parts[0]!.volume;
    expect(volumeAfter).toBeGreaterThan(volumeBefore);

    // (b) ⚠⚠ AND NO `SceneChange` NAMES IT. The edit's delta touches one container and nothing else —
    // so a consumer reading only `changes` sees a storey of re-priced walls as untouched.
    expect(edit.changes.map((c) => c.collection)).toEqual(['containers']);
    // (c) It is reachable ONLY through `rebuilt` — the field the Clean Delta reads the cascade from,
    // and which recorded `[]` for exactly this command until this build.
    expect(edit.rebuilt).toContain(spanning);

    await doc.execute('core.issueRevision', { by: 'architect' });
    const pkg = await exportCleanDelta(doc, { since: rev1, priorContext: priorContext() });

    const row = pkg.elements.find((e) => e.pei === spanning);
    expect(row, 'the cascaded wall must appear in the delta at all').toBeDefined();
    // ⚠⚠ READ, NOT INFERRED. The model knew the wall was rebuilt because it rebuilt it.
    expect(row!.change_type).toBe('modified_qty');
    expect(row!.prior.quantity_value).toBeCloseTo(volumeBefore / 1e9, 9);
    expect(row!.quantity!.value).toBeCloseTo(volumeAfter / 1e9, 9);
    expect(row!.spatial_container_code).toBe('Site/Tower A/Level 1');
  }, 180000);

  /* ============================================================================================
   * §3b — ⚠⚠ WHAT AN ADVERSARIAL PROBE OF THIS EXPORTER FOUND (2026-07-25, after it was first green).
   *
   * Three defects, each caught by asking a question the happy path never asks. Every one of them is a
   * row Planitor would have acted on: a work package for a scheme nobody builds, a spatial move that
   * never happened, and a panel that no longer exists still being billed.
   * ========================================================================================= */

  it('⚠⚠ a NON-ACTIVE design option is OMITTED — not emitted as a ghost row (D65 by a third road)', async () => {
    const doc = newDoc();
    await groundwork(doc);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    const scheme = async (designOptionId: string): Promise<string> =>
      (
        await doc.execute('core.createElement', {
          typeId: wallType.id,
          styleId: 'EXT',
          containerId: 'l1',
          designOptionId,
          params: { start: [0, 0], end: [6000, 0], height: 3000 },
        })
      ).changes[0]!.id;

    const chosen = await scheme('opt-a');
    const notBuilt = await scheme('opt-b');
    await doc.execute('core.issueRevision', { by: 'architect' });

    const pkg = await exportCleanDelta(doc, { since: rev1, designOptions: OPTIONS });

    // ⚠⚠ BEFORE THE FIX this emitted a GHOST ROW for the scheme nobody builds: `modified_qty`, no
    // quantity, an empty `spatial_container_code`, `IfcBuildingElementProxy` — i.e. **a work-package
    // row for a facade that will never be built**, which is D65's own stated failure mode verbatim.
    // `modelElements` applied the rule; the journal named the id directly and walked around it.
    expect(pkg.elements.map((e) => e.pei)).toEqual([chosen]);
    expect(pkg.elements.find((e) => e.pei === notBuilt)).toBeUndefined();
    // Not-active is neither a change nor a deletion — it is simply not in the model being published.
    expect(pkg.summary.deleted).toBe(0);
    expect(pkg.summary.modified_qty).toBe(0);
  }, 180000);

  it('⚠⚠ an edit that was UNDONE since the baseline is `unchanged` — net effect, not last event', async () => {
    const doc = newDoc();
    await groundwork(doc);
    const w = await wall(doc, 'l1', 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    await doc.execute('core.setParams', { elementId: w, params: { end: [9000, 0] } });
    await doc.undo(); // ⚠ an undo APPENDS A REVERSAL (D40) — the journal grows, the model comes back
    await doc.execute('core.issueRevision', { by: 'architect' });

    const pkg = await exportCleanDelta(doc, { since: rev1, priorContext: priorContext() });
    const row = pkg.elements.find((e) => e.pei === w)!;

    // ⚠⚠ BEFORE THE FIX the derivation read the LAST change in the slice — which is the reversal, a
    // `before → after` differing in `end` — and reported `modified_move`: a spatial move that never
    // happened. The endpoints are what a consumer cares about, and they are identical.
    expect(row.change_type).toBe('unchanged');
    expect(row.prior.quantity_value).toBeCloseTo((6000 * 200 * 3000) / 1e9, 9);
    expect(row.quantity!.value).toBeCloseTo(row.prior.quantity_value!, 9);
  }, 180000);

  it('⚠⚠ a GENERATED CHILD whose slot vanished is reported `deleted` — never silently absent', async () => {
    const registries = newRegistries();
    for (const type of [
      curtainWallType,
      curtainWallColumnType,
      curtainWallPanelType,
      curtainWallMullionType,
    ]) {
      registries.types.register(type);
    }
    const doc = new DocumentContext({ registries, geometry: client });
    await groundwork(doc);
    await doc.execute('core.createMaterial', {
      id: 'glass',
      name: 'Glass',
      category: 'other',
      density: 2500,
    });
    await doc.execute('core.createMaterial', {
      id: 'alu',
      name: 'Aluminium',
      category: 'steel',
      density: 2700,
    });
    const cw = (
      await doc.execute('core.createElement', {
        typeId: curtainWallType.id,
        containerId: 'l1',
        params: {
          origin: [0, 0],
          width: 3000,
          height: 2400,
          cols: 3,
          rows: 2,
          panelMaterialId: 'glass',
          mullionMaterialId: 'alu',
        },
      })
    ).changes[0]!.id;
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    // Shrink the grid: the third column — and the panels in it — cease to exist.
    await doc.execute('core.setParams', { elementId: cw, params: { cols: 2 } });
    await doc.execute('core.issueRevision', { by: 'architect' });

    const withPrior = {
      registries: (() => {
        const r = newRegistries();
        for (const type of [
          curtainWallType,
          curtainWallColumnType,
          curtainWallPanelType,
          curtainWallMullionType,
        ]) {
          r.types.register(type);
        }
        return r;
      })(),
      geometry: client,
      create: (scene: Scene): DocumentContext => {
        const r = newRegistries();
        for (const type of [
          curtainWallType,
          curtainWallColumnType,
          curtainWallPanelType,
          curtainWallMullionType,
        ]) {
          r.types.register(type);
        }
        return new DocumentContext({ registries: r, geometry: client, scene });
      },
    };
    const pkg = await exportCleanDelta(doc, { since: rev1, priorContext: withPrior });

    // ⚠ The vanished column is in NO scene row and in NO current enumeration — it is reachable only
    // from the PRIOR model. Without that walk it falls out of the package entirely, and Planitor's
    // *"absence-from-elements ⇒ unchanged"* rule would keep billing a panel that no longer exists.
    const gone = pkg.elements.find((e) => e.pei === `${cw}:column.c2`);
    expect(gone, 'the vanished column must be in the package').toBeDefined();
    expect(gone!.change_type).toBe('deleted');
    expect(pkg.elements.find((e) => e.pei === `${cw}:column.c2:panel.r0`)!.change_type).toBe(
      'deleted',
    );
    // ...while a surviving panel is still reported, and still priced.
    const kept = pkg.elements.find((e) => e.pei === `${cw}:column.c0:panel.r0`)!;
    expect(kept.change_type).not.toBe('deleted');
    expect(kept.quantity!.value).toBeGreaterThan(0);
  }, 180000);

  it('⚠ a wall that changed STOREY is `modified_move` — Planitor D5 reassigns the LBS leaf', async () => {
    const doc = newDoc();
    await groundwork(doc);
    const w = await wall(doc, 'l1', 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    const element = doc.scene.elements[w]!;
    await doc.execute('core.setElementMetadata', { elementId: w, mark: 'W-01' });
    // The container is not settable by a v1.0.0 verb, so re-open the scene with the wall on Level 2 —
    // the state a future `core.setContainer` will author, and the one Planitor D5 is written for.
    const moved = new DocumentContext({
      registries: newRegistries(),
      geometry: client,
      journal: doc.changeFeed(),
      revision: doc.revision,
      scene: {
        ...doc.scene,
        elements: { ...doc.scene.elements, [w]: { ...element, containerId: 'l2' } },
      },
    });
    await moved.rebuildAll();

    const pkg = await exportCleanDelta(moved, { since: rev1, priorContext: priorContext() });
    const row = pkg.elements.find((e) => e.pei === w)!;
    expect(row.change_type).toBe('modified_move');
    expect(row.spatial_container_code).toBe('Site/Tower A/Level 2');
    expect(row.prior.spatial_container_code).toBe('Site/Tower A/Level 1');
    await moved.dispose();
  }, 180000);

  it('⚠⚠ the Clean Delta is computable FROM A .bnn — save, reload, export, exact prior', async () => {
    const doc = newDoc();
    await groundwork(doc);
    const w = await wall(doc, 'l1', 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;
    await doc.execute('core.setParams', { elementId: w, params: { end: [9000, 0] } });
    await doc.execute('core.issueRevision', { by: 'architect' });

    // ⚠ The revision rides on the MANIFEST, and the journal is `changeFeed()` — never `history()`,
    // which is the bounded undo stack and the moat-losing bug (D40).
    const bytes = saveBnn(doc.scene, {
      kernelBuildId: 'test',
      journal: doc.changeFeed(),
      revision: doc.revision,
    });
    const loaded = loadBnn(bytes);
    const reopened = new DocumentContext({
      registries: newRegistries(),
      geometry: client,
      scene: loaded.scene,
      journal: loaded.journal,
      revision: loaded.manifest.revision,
    });
    await reopened.rebuildAll();

    // ⚠⚠ THE D40 HEADLINE, END TO END: a fresh session that only ever saw the FILE can still answer
    // *"what changed since revision 1?"* — exactly, with no diffing and nothing lost.
    const pkg = await exportCleanDelta(reopened, { since: rev1, priorContext: priorContext() });
    const row = pkg.elements.find((e) => e.pei === w)!;
    expect(row.change_type).toBe('modified_qty');
    expect(row.prior.quantity_value).toBeCloseTo((6000 * 200 * 3000) / 1e9, 9);
    expect(row.quantity!.value).toBeCloseTo((9000 * 200 * 3000) / 1e9, 9);
    await reopened.dispose();
  }, 180000);

  /* ============================================================================================
   * §4 — THE REWIND ITSELF (the mechanism under the owner's Q2 ruling).
   * ========================================================================================= */

  it('⚠ rewinds the scene to a revision EXACTLY — including across an undo (which is a reversal, D40)', async () => {
    const doc = newDoc();
    await groundwork(doc);
    const w = await wall(doc, 'l1', 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;
    const paramsAtRev1 = JSON.stringify(doc.scene.elements[w]!.params);

    await doc.execute('core.setParams', { elementId: w, params: { end: [9000, 0] } });
    const second = await wall(doc, 'l1', 2000);
    await doc.undo(); // ⚠ appends a REVERSAL to the journal; nothing is erased
    await doc.execute('core.setParams', { elementId: w, params: { height: 4200 } });

    const rewound = sceneAt(doc.scene, doc.changeFeed(), rev1.issued_at_seq);
    expect(JSON.stringify(rewound.elements[w]!.params)).toBe(paramsAtRev1);
    // The undone wall was created AND reversed after the baseline ⇒ absent at the baseline either way.
    expect(rewound.elements[second]).toBeUndefined();
    // ...and the live scene is untouched by the rewind (it is a pure function).
    expect(doc.scene.elements[w]!.params['height']).toBe(4200);
  }, 180000);

  it('refuses to export from a document that never issued a revision — a delta needs a baseline', async () => {
    const doc = newDoc();
    await groundwork(doc);
    await wall(doc, 'l1', 6000);
    await expect(exportCleanDelta(doc)).rejects.toThrow(/never issued a revision/);
  }, 120000);

  /* ============================================================================================
   * §5 — THE UNMEASURABLE, ON THE WIRE (owner ruling Q1).
   * ========================================================================================= */

  it('⚠⚠ carries `unmeasured` on the package — a delta that admits what it could not price', async () => {
    const doc = newDoc();
    await groundwork(doc);
    await wall(doc, 'l1', 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    // A D43 element from a future/foreign Type, added after the baseline. The document TOLERATES it.
    const stranger = 'wall-01KYSTRANGERSTRANGERSTRB';
    const reopened = new DocumentContext({
      registries: newRegistries(),
      geometry: client,
      journal: doc.changeFeed(),
      revision: rev1,
      scene: {
        ...doc.scene,
        elements: {
          ...doc.scene.elements,
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
    await reopened.execute('core.setElementMetadata', { elementId: stranger, mark: 'B-01' });

    const pkg = await exportCleanDelta(reopened, { since: rev1 });
    expect(pkg.unmeasured.map((u) => u.pei)).toContain(stranger);
    // ⚠ It is NOT reported as a zero quantity — the row carries no `quantity` at all (rule 15).
    expect(pkg.elements.find((e) => e.pei === stranger)!.quantity).toBeUndefined();
    await reopened.dispose();
  }, 180000);

  /* ============================================================================================
   * §6 — THE HEAP. A throwaway prior document must not leak the model it priced.
   * ========================================================================================= */

  it('⚠⚠ the prior-state rebuild LEAKS NOTHING — the throwaway document frees its own solids', async () => {
    const doc = newDoc();
    await groundwork(doc);
    const w = await wall(doc, 'l1', 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;
    await doc.execute('core.setParams', { elementId: w, params: { end: [9000, 0] } });

    const before = kernel.wasmLiveHandles();
    await exportCleanDelta(doc, { since: rev1, priorContext: priorContext() });
    const after = kernel.wasmLiveHandles();

    // ⚠ OCCT solids are NOT garbage-collected (spec §6.2). An export that leaked its prior model would
    // bleed the whole building into the tab the user is still modelling in, once per export.
    expect(after, 'the Clean Delta export leaked the prior model onto the WASM heap').toBe(before);
  }, 180000);
});
