/**
 * `.bnn` — SAVE, LOAD, MIGRATE, ISSUE, RECOVER (P3 steps 4–7; D34, D38).
 *
 * ⚠⚠ THE EXIT CRITERION THIS FILE EXISTS FOR, AND IT IS THE PRODUCT'S CENTRAL CLAIM:
 *
 *     A DOCUMENT LOADS FROM `scene.json` ALONE, WITH NO GEOMETRY CACHE PRESENT — and comes back with
 *     IDENTICAL parametric state AND IDENTICAL geometry.
 *
 * That is "the parametric recipe is the source of truth" stated as a test rather than as a slogan. It
 * is also, today, the ONLY load path there is: `geometry-cache.brep` has never existed (D29, deferred
 * by ruling to be decided with the measured rebuild cost — see `tests/measure-cold-load.ts`). And it
 * must remain a supported path forever, because **Miqdar writes `.bnn` files and has a solver rather
 * than an OCCT kernel — it cannot produce a geometry cache even in principle.**
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  Autosave,
  CORE_COMMANDS,
  DocumentContext,
  MemoryStore,
  createAgentSurface,
  createRegistries,
  emptyScene,
  loadBnn,
  migrateScene,
  saveBnn,
} from '@bunyan/document';
import type { BimObjectType, Params, Registries, Scene } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';

describe('.bnn — the native format', () => {
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

  const registries = (): Registries => {
    const r = createRegistries();
    for (const type of FIXTURE_TYPES) r.types.register(type);
    for (const command of CORE_COMMANDS) r.commands.register(command);
    return r;
  };

  /** A small, real building: a level, a composite wall, a window in it, and a column. */
  const build = async (doc: DocumentContext): Promise<string> => {
    await doc.execute('core.createMaterial', {
      id: 'concrete',
      name: 'C25/30',
      category: 'concrete',
      density: 2400,
      structural: { f_ck: 25, E: 31000 },
    });
    await doc.execute('core.createMaterial', {
      id: 'plaster',
      name: 'Plaster',
      category: 'finish',
      density: 1200,
    });
    await doc.execute('core.createSection', {
      id: 'RECT-300x300',
      name: 'RECT-300x300',
      shape: 'rectangle',
      dimensions: { width: 300, depth: 300 },
      properties: { area: 90000 },
    });
    await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
    await doc.execute('core.createContainer', {
      id: 'level-0',
      kind: 'level',
      name: 'Ground',
      parentId: 'site',
      elevation: 0,
    });
    await doc.execute('core.createGrid', { id: 'A', name: 'A', axis: 'x', offset: 0 });
    await doc.execute('core.createStyle', {
      id: 'EXT-215',
      name: 'EXT-215',
      typeId: 'core.wall.v1',
      layers: [
        {
          name: 'finish.interior',
          materialId: 'plaster',
          thickness: 15,
          discipline: 'architectural',
        },
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });
    await doc.execute('core.createStyle', {
      id: 'COL-300',
      name: 'COL-300',
      typeId: 'core.linearMember.v1',
      sectionId: 'RECT-300x300',
      params: { materialId: 'concrete' },
    });

    const wall = await doc.execute('core.createElement', {
      typeId: 'core.wall.v1',
      styleId: 'EXT-215',
      containerId: 'level-0',
      params: { length: 5000, height: 3000 },
    });
    const wallId = wall.changes[0]!.id;

    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: wallId,
      hostRef: `${wallId}.finish.interior/face/y-min#0`,
      params: { width: 1500, height: 1500, offsetU: 1000, offsetV: 900 },
    });
    await doc.execute('core.createElement', {
      typeId: 'core.linearMember.v1',
      styleId: 'COL-300',
      containerId: 'level-0',
      gridRefs: ['A'],
      params: { length: 3000, direction: 'z' },
    });
    return wallId;
  };

  it('⚠⚠ SAVE → RELOAD IN A FRESH SESSION → IDENTICAL parametric state AND IDENTICAL geometry', async () => {
    const original = new DocumentContext({ registries: registries(), geometry: client });
    const wallId = await build(original);

    const before = await original.quantities(wallId);
    const bytes = saveBnn(original.scene, { kernelBuildId: KERNEL_BUILD_ID });

    // ---- A FRESH SESSION. New registries, new document, nothing carried over but the bytes. ------
    const loaded = loadBnn(bytes);
    expect(loaded.manifest.kernelBuildId).toBe(KERNEL_BUILD_ID);
    expect(loaded.manifest.typeVersions['core.wall.v1']).toBe(1);
    // ⚠ NO GEOMETRY CACHE. There is no `geometry-cache.brep` in this file, and nothing missed it.
    expect(Object.keys(loaded.scene.elements)).toHaveLength(3);

    const reopened = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: loaded.scene,
    });
    await reopened.rebuildAll();

    // The recipe rebuilt the building. Every solid, from scratch, from JSON.
    const after = await reopened.quantities(wallId);
    expect(after.parts.map((p) => p.name)).toEqual(before.parts.map((p) => p.name));
    for (const [i, part] of before.parts.entries()) {
      expect(after.parts[i]!.volume).toBeCloseTo(part.volume, 6);
      expect(after.parts[i]!.mass!).toBeCloseTo(part.mass!, 6);
    }

    // ⚠ AND THE WINDOW SURVIVED THE ROUND-TRIP — its `SubShapeRef` still names the same face after
    // the host was rebuilt from nothing but text. That is D1 doing the one job it exists for.
    expect(reopened.brokenRefs()).toHaveLength(0);

    // And the document is still EDITABLE — it came back as a recipe, not as a corpse of frozen shapes
    // (which is precisely what saving to IFC and reopening would have given you).
    await reopened.execute('core.setParams', { elementId: wallId, params: { length: 7000 } });
    const edited = await reopened.quantities(wallId);
    expect(structureOf(edited)).toBeGreaterThan(structureOf(after));
  });

  it('⚠ SAVING IS NOT ISSUING — and ISSUING IS A COMMAND (D34, D41, domain rule 14)', async () => {
    const doc = new DocumentContext({ registries: registries(), geometry: client });
    await build(doc);

    // Save. Ten times, if you like. NO revision is minted — because none of those saves was a
    // statement about what you are handing downstream.
    const saved = loadBnn(saveBnn(doc.scene, { kernelBuildId: KERNEL_BUILD_ID }));
    expect(saved.manifest.revision).toBeUndefined();
    expect(doc.revision).toBeUndefined();

    // ⚠⚠ ISSUE — AND IT IS AN ORDINARY COMMAND (D41). It was a free function in the persistence codec,
    // which meant AN AGENT COULD AUTHOR A BUILDING BUT NOT RELEASE ONE, and `listCommands()` never
    // mentioned the one new concept the whole ecosystem rests on. Domain rule 9 admits no second path.
    await doc.execute('core.issueRevision', { by: 'zayd' });
    const first = doc.revision!;
    expect(first.snapshot_number).toBe(1);
    expect(first.previous_snapshot_number).toBeUndefined();
    expect(first.issued_by).toBe('zayd');
    // ⚠ AND IT KNOWS WHERE IN THE JOURNAL IT STANDS. Without this a "baseline" is a date stamp.
    expect(first.issued_at_seq).toBeGreaterThan(0);

    const issued = loadBnn(
      saveBnn(doc.scene, { kernelBuildId: KERNEL_BUILD_ID, revision: doc.revision }),
    );
    expect(issued.manifest.revision!.snapshot_number).toBe(1);
    expect(issued.manifest.revision!.issued_at_seq).toBe(first.issued_at_seq);

    // The chain: revision 2 knows what it came after, and stays on the same lineage.
    await doc.execute('core.setParams', {
      elementId: Object.keys(doc.scene.elements)[0]!,
      params: {},
    });
    await doc.execute('core.issueRevision', { by: 'amer' });
    const second = doc.revision!;
    expect(second.snapshot_number).toBe(2);
    expect(second.previous_snapshot_number).toBe(1);
    expect(second.lineage).toBe(first.lineage);
    expect(second.issued_at_seq).toBeGreaterThan(first.issued_at_seq);

    // ⚠ AND AN ISSUE IS NOT UNDOABLE. You cannot recall a revision you already handed to the
    // contractor, and an "undo" of one would be a lie in the log three products compute payments from.
    const undone = await doc.undo();
    expect(undone!.command).not.toBe('core.issueRevision');
    expect(doc.revision!.snapshot_number).toBe(2);
  });

  /**
   * ⚠⚠ THE HEADLINE OF THE WHOLE REVIEW, AND THE TEST THE PRODUCT'S CENTRAL CLAIM RESTS ON (D40).
   *
   * `core_logic.md` rule 14 and D34 stake the entire ecosystem argument on one sentence: *"`change_type`
   * is **READ** off the `UndoableEdit` log, never inferred by diffing two models."* **It was not true.**
   * The log *was* the undo stack — 200-deep, `shift()`ed, and `undo()` popped entries out of it — and
   * `ModelRevision` carried **no pointer into it**. So *"what changed since revision N?"* had **no
   * answer in the file**, and a P6 Clean Delta producer would have had to **diff two models**: the exact
   * guessing BIMsync is an entire platform built to do for foreign models, and that §4i says Bunyan
   * never has to do *"by construction."* **The property we sell was the property we had not built.**
   *
   * Every assertion below failed before D40.
   */
  it('⚠⚠ THE CLEAN DELTA IS COMPUTABLE FROM A .bnn — 250+ edits, an undo, two revisions, and NOTHING is lost (D40)', async () => {
    const doc = new DocumentContext({ registries: registries(), geometry: client });
    const wallId = await build(doc);

    await doc.execute('core.issueRevision', { by: 'zayd' });
    const rev1 = doc.revision!;

    // ---- 250 EDITS. ⚠ The undo stack caps at 200 and `shift()`s — the first 50 would be GONE. -----
    for (let i = 0; i < 250; i++) {
      await doc.execute('core.setParams', {
        elementId: wallId,
        params: { length: 5000 + i },
      });
    }
    // ---- AND AN UNDO. ⚠ It used to POP the edit out of the "feed" entirely. ----------------------
    await doc.undo();

    await doc.execute('core.issueRevision', { by: 'zayd' });
    const rev2 = doc.revision!;

    // ---- SAVE → RELOAD. The consumer has only the file. ------------------------------------------
    const bytes = saveBnn(doc.scene, {
      kernelBuildId: KERNEL_BUILD_ID,
      journal: doc.changeFeed(),
      revision: doc.revision,
    });
    const loaded = loadBnn(bytes);
    const reopened = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: loaded.scene,
      journal: loaded.journal,
      revision: loaded.manifest.revision,
    });

    // ⚠⚠ "WHAT CHANGED SINCE REVISION 1?" — READ, NOT INFERRED. ------------------------------------
    const delta = reopened.changesSince(rev1);

    // Nothing was trimmed: all 250 edits are there, plus the undo's reversal, plus rev2's issuance.
    // ⚠ `e.reverses === undefined` excludes the undo's REVERSAL, which carries the same command name
    // (it reverses a `setParams`, so that is what it is a reversal OF). Both are in the feed, as they
    // must be — the reversal is asserted separately below.
    const edits = delta.filter((e) => e.command === 'core.setParams' && e.reverses === undefined);
    expect(edits).toHaveLength(250);

    // ⚠ THE UNDO IS IN THE FEED AS A **REVERSAL**, NOT AS AN ERASURE. A consumer downstream may already
    // hold the state being reversed FROM — deleting the original entry would leave it holding a state
    // the model denies ever existed.
    const reversal = delta.find((e) => e.reverses !== undefined);
    expect(reversal).toBeDefined();
    expect(delta.some((e) => e.id === reversal!.reverses)).toBe(true); // the reversed edit SURVIVES

    // The journal is monotonically ordered, and rev2's anchor is after rev1's.
    expect(delta.map((e) => e.seq)).toEqual([...delta.map((e) => e.seq)].sort((a, b) => a - b));
    expect(rev2.issued_at_seq).toBeGreaterThan(rev1.issued_at_seq);

    // ⚠ AND THE DELTA SINCE REV2 IS EMPTY — nothing has happened since it was issued. That sentence is
    // only computable because the revision knows where in the journal it stands.
    expect(reopened.changesSince(rev2)).toHaveLength(0);

    // ⚠ THE UNDO STACK IS STILL BOUNDED, AND THAT IS CORRECT — it is a session convenience. The two
    // structures have two lifetimes, and conflating them is what cost us the moat.
    expect(doc.history().length).toBeLessThanOrEqual(200);
    expect(doc.changeFeed().length).toBeGreaterThan(250);
    // ⚠ 250 real kernel edits measure ~18.5 s here, so this test always needed an explicit timeout;
    // vitest 2 never enforced the 5 s default on it because `InProcessTransport` resolves through
    // `queueMicrotask`, and a microtask-only promise chain never returns to the timer phase.
  }, 120_000);

  it('an agent can ISSUE a revision through the surface alone (D41 + rule 9)', async () => {
    const doc = new DocumentContext({ registries: registries(), geometry: client });
    await build(doc);
    const bunyan = createAgentSurface(doc);

    // ⚠ It is in the GENERATED tool list — because it is a Command, and for no other reason (D21).
    expect(bunyan.listCommands().map((c) => c.name)).toContain('core.issueRevision');

    await bunyan.execute('core.issueRevision', { by: 'an agent' });
    expect(doc.revision!.issued_by).toBe('an agent');
    expect(bunyan.changeFeed().at(-1)!.revision!.snapshot_number).toBe(1);
  });

  it('a type-version bump MIGRATES an old file, and the old file still loads (P3 step 5)', async () => {
    const doc = new DocumentContext({ registries: registries(), geometry: client });
    const wallId = await build(doc);
    const bytes = saveBnn(doc.scene, { kernelBuildId: KERNEL_BUILD_ID });

    // The Wall type evolves: `height` is renamed `storeyHeight`. Old files must keep loading — which
    // is only cheap because migration moves PARAMETERS, never geometry: the recipe is truth, so there
    // is no stored geometry to migrate. That is the quiet dividend of the core invariant.
    const v2: BimObjectType = {
      ...FIXTURE_TYPES[0]!,
      version: 2,
      parameterSchema: {
        length: { kind: 'number', label: 'Length', unit: 'mm', required: true, min: 1 },
        storeyHeight: { kind: 'number', label: 'Height', unit: 'mm', required: true, min: 1 },
      },
      migrate: (params: Params, from: number): Params => {
        if (from >= 2) return params;
        const { height, ...rest } = params as { height?: number };
        return { ...rest, storeyHeight: height ?? 2500 };
      },
      buildGeometry: (ctx) =>
        FIXTURE_TYPES[0]!.buildGeometry!({
          ...ctx,
          params: { ...ctx.params, height: ctx.params['storeyHeight'] ?? 2500 },
        }),
    };

    const fresh = createRegistries();
    fresh.types.register(v2);
    for (const type of FIXTURE_TYPES.slice(1)) fresh.types.register(type);
    for (const command of CORE_COMMANDS) fresh.commands.register(command);

    const loaded = loadBnn(bytes);
    const migrated = migrateScene(loaded.scene, fresh);

    expect(migrated.elements[wallId]!.typeVersion).toBe(2);
    expect(migrated.elements[wallId]!.params['storeyHeight']).toBe(3000);
    expect(migrated.elements[wallId]!.params['height']).toBeUndefined();

    // And it still BUILDS — the migration is not merely a rename in a JSON file, it is a document that
    // opens.
    const reopened = new DocumentContext({ registries: fresh, geometry: client, scene: migrated });
    await reopened.rebuildAll();
    expect(reopened.partsOf(wallId)).toHaveLength(2);
  });

  /**
   * ⚠⚠ THIS TEST IS A REWRITE, AND THE REWRITE IS THE DELIVERABLE.
   *
   * **The test that used to be here called `latest()` on the SAME `Autosave` instance that wrote the
   * snapshots.** It never constructed a fresh one over an existing store — *which is the only situation
   * autosave exists for.* So it never opened a second session, and it would have passed forever.
   *
   * And it was broken: `#counter` started at **0 in every new session**, so session 2 wrote
   * `autosave-1` again (overwriting session 1's oldest) while `latest()` — highest counter — still
   * returned session 1's `autosave-3`. **Measured: saved 9999, recovered 1300.** The second crash
   * silently restored *old* work and the newest snapshot was unreachable. **Data loss, in the feature
   * whose only purpose is preventing data loss.**
   *
   * So this one crashes **twice**, and each session must recover **its own** work.
   */
  it('⚠⚠ AUTOSAVE RECOVERS THE NEWEST WORK ACROSS *THREE* SESSIONS — a fresh Autosave over a populated store (P3 step 7)', async () => {
    const store = new MemoryStore();

    /** One session: open the store fresh (as a new tab does), edit, snapshot, crash. */
    const session = async (
      scene: Scene | undefined,
      wallId: string,
      length: number,
    ): Promise<void> => {
      // ⚠ A FRESH `Autosave` OVER THE SAME STORE. This is what a new tab does after a crash, and it is
      // the one thing the old test never did.
      const autosave = new Autosave(store, 3);
      const doc = new DocumentContext({
        registries: registries(),
        geometry: client,
        ...(scene === undefined ? {} : { scene }),
      });
      if (scene !== undefined) await doc.rebuildAll();
      await doc.execute('core.setParams', { elementId: wallId, params: { length } });
      await autosave.snapshot(saveBnn(doc.scene, { kernelBuildId: KERNEL_BUILD_ID }));
      // …and the tab dies here. Nothing was ever saved to a file.
    };

    // ---- SESSION 1 -------------------------------------------------------------------------------
    const first = new DocumentContext({ registries: registries(), geometry: client });
    const wallId = await build(first);
    const autosave1 = new Autosave(store, 3);
    for (const length of [5100, 5200, 1300]) {
      await first.execute('core.setParams', { elementId: wallId, params: { length } });
      await autosave1.snapshot(saveBnn(first.scene, { kernelBuildId: KERNEL_BUILD_ID }));
    }
    expect(await store.list()).toHaveLength(3); // the ring holds

    // ---- CRASH → SESSION 2 recovers, edits to 9999, and crashes again ---------------------------
    const recovered1 = await new Autosave(store, 3).latest();
    const scene1 = loadBnn(recovered1!).scene;
    expect(scene1.elements[wallId]!.params['length']).toBe(1300); // session 1's NEWEST, not its oldest
    await session(scene1, wallId, 9999);

    // ---- CRASH → SESSION 3 must recover 9999, NOT session 1's 1300 -------------------------------
    // ⚠⚠ THIS IS THE ASSERTION THAT USED TO BE FALSE. Before the fix: recovered 1300. The user's last
    // session was silently thrown away by the feature that exists to save it.
    const recovered2 = await new Autosave(store, 3).latest();
    const scene2 = loadBnn(recovered2!).scene;
    expect(scene2.elements[wallId]!.params['length']).toBe(9999);

    // ⚠ Recovery is an ORDINARY LOAD of an ORDINARY `.bnn` — not a second, lesser format that gets
    // exercised once a year and is broken when you need it. It still builds, and the window survived.
    const restored = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: scene2,
    });
    await restored.rebuildAll();
    expect(restored.brokenRefs()).toHaveLength(0);

    // And the ring never grew past its depth, across all three sessions.
    expect((await store.list()).length).toBeLessThanOrEqual(3);
  });

  /* ============================================================================================
   * D43 — AN UNKNOWN OR FUTURE TYPE MUST NOT BRICK THE FILE, AND MUST NOT BE SILENTLY EATEN.
   * ========================================================================================= */

  /**
   * ⚠⚠ **THE TEST THAT IS THE WHOLE POINT OF THE RULING.**
   *
   * `rebuildAll()` **threw** on any element it could not build — so **one unregistered type bricked the
   * whole document.** A `.bnn` from Miqdar, a plugin type, a file from a newer Bunyan: it would not
   * open at all. And the mirror bug was worse than a crash: **dropping** the element on save would
   * silently **delete Miqdar's columns and their PEIs** from a file somebody merely opened to look at.
   *
   * So: the document OPENS, the wall builds, the column is `failed` and VISIBLE — and a save
   * **round-trips it byte for byte.**
   */
  it('⚠⚠ AN UNREGISTERED TYPE DOES NOT BRICK THE FILE — the document opens, and the element ROUND-TRIPS VERBATIM (D43)', async () => {
    const doc = new DocumentContext({ registries: registries(), geometry: client });
    const wallId = await build(doc); // a wall, a window, AND a column
    const columnId = Object.values(doc.scene.elements).find(
      (e) => e.typeId === 'core.linearMember.v1',
    )!.id;
    const bytes = saveBnn(doc.scene, { kernelBuildId: KERNEL_BUILD_ID });

    // ---- AN APP THAT HAS NEVER HEARD OF A LINEAR MEMBER. (A plugin it lacks; a Miqdar column.) ----
    const partial = createRegistries();
    for (const type of FIXTURE_TYPES.filter((t) => t.id !== 'core.linearMember.v1')) {
      partial.types.register(type);
    }
    for (const command of CORE_COMMANDS) partial.commands.register(command);

    const loaded = loadBnn(bytes);
    const reopened = new DocumentContext({
      registries: partial,
      geometry: client,
      scene: loaded.scene,
    });

    // ⚠ IT OPENS. This threw before D43.
    await expect(reopened.rebuildAll()).resolves.toBeUndefined();

    // The wall built. The column did not — and it says so, out loud.
    expect(reopened.partsOf(wallId)).toHaveLength(2);
    expect(reopened.unbuildable().map((u) => u.elementId)).toEqual([columnId]);
    expect(reopened.geometryOf(columnId)!.state).toBe('failed');

    // ⚠ AND THE DOCUMENT IS STILL EDITABLE while carrying it. An element we cannot build is not a
    // reason to refuse everybody else's work.
    await reopened.execute('core.setParams', { elementId: wallId, params: { length: 7000 } });
    expect(reopened.scene.elements[wallId]!.params['length']).toBe(7000);

    // ⚠⚠ AND IT ROUND-TRIPS **VERBATIM**. Drop it and you have deleted Miqdar's column, and its PEI,
    // from a file this app only half understood. THAT is the bug the ruling exists to forbid.
    const resaved = loadBnn(saveBnn(reopened.scene, { kernelBuildId: KERNEL_BUILD_ID }));
    expect(resaved.scene.elements[columnId]).toEqual(loaded.scene.elements[columnId]);
  });

  it('⚠ A TYPE VERSION FROM THE FUTURE IS REFUSED, NOT BUILT AGAINST THE OLD SCHEMA (D43)', async () => {
    const doc = new DocumentContext({ registries: registries(), geometry: client });
    const wallId = await build(doc);

    // The file was authored by a NEWER Bunyan: its Wall is v3, and ours is v1. Migration only ever
    // moves params FORWARD — you cannot migrate backwards, because our code has never heard of v3's
    // parameters. It used to be SILENTLY BUILT against v1's schema: a wrong building, not a refused one.
    const scene: Scene = {
      ...doc.scene,
      elements: {
        ...doc.scene.elements,
        [wallId]: { ...doc.scene.elements[wallId]!, typeVersion: 3 },
      },
    };

    const reopened = new DocumentContext({ registries: registries(), geometry: client, scene });
    await reopened.rebuildAll();

    expect(reopened.unbuildable().map((u) => u.elementId)).toContain(wallId);
    expect(reopened.unbuildable()[0]!.reason).toMatch(/from the future/);
    // Never built — and never quietly rebuilt at v1's meaning.
    expect(reopened.partsOf(wallId)).toHaveLength(0);
    // And preserved: a save hands the v3 element straight back.
    const resaved = loadBnn(saveBnn(reopened.scene, { kernelBuildId: KERNEL_BUILD_ID }));
    expect(resaved.scene.elements[wallId]!.typeVersion).toBe(3);
  });

  /* ============================================================================================
   * A `.bnn` IS A FILE A USER CAN BE *SENT*.
   * ========================================================================================= */

  it('a hostile .bnn fails with a message, never with a half-loaded document', () => {
    expect(() => loadBnn(new Uint8Array([1, 2, 3, 4]))).toThrow(/not a readable .bnn/);

    const doc = new DocumentContext({ registries: registries(), geometry: client });
    const good = saveBnn(doc.scene, { kernelBuildId: KERNEL_BUILD_ID });
    // Truncate the zip: a file a user can be SENT must not be trusted.
    expect(() => loadBnn(good.slice(0, 40))).toThrow();

    /**
     * A WELL-FORMED zip carrying HOSTILE JSON — which the old test never built. It only ever covered
     * garbage bytes and a truncated zip, so **every guard inside the parser went unexercised**, and the
     * one that mattered was wrong.
     *
     * ⚠ Forged with `zipSync` rather than `saveBnn`, deliberately: a `.bnn` is a file a user can be
     * **sent**, and an attacker does not call our writer. Going through `saveBnn` would only ever
     * produce files our own code can already make.
     */
    const withScene = (scene: unknown): Uint8Array =>
      zipSync({
        'manifest.json': new TextEncoder().encode(
          JSON.stringify({ app: 'bunyan', kernelBuildId: KERNEL_BUILD_ID }),
        ),
        'scene.json': new TextEncoder().encode(JSON.stringify(scene)),
      });

    // ⚠⚠ **`typeof null === 'object'`.** The guard was `typeof scene[key] !== 'object'`, so a null
    // collection sailed straight through the check written to catch it and died as a raw `TypeError`.
    expect(() => loadBnn(withScene({ ...emptyScene(), elements: null }))).toThrow(
      /"elements" must be an object/,
    );
    // An array is not a collection either, and `typeof [] === 'object'` too.
    expect(() => loadBnn(withScene({ ...emptyScene(), styles: [] }))).toThrow(
      /"styles" must be an object/,
    );
    expect(() => loadBnn(withScene({ ...emptyScene(), brokenRefs: null }))).toThrow(
      /"brokenRefs" must be an array/,
    );

    // A `scene.json` from the FUTURE is a typed refusal NAMING the version — we cannot know what a
    // later schema means, and a document half-understood is a document silently wrong (D43).
    expect(() => loadBnn(withScene({ ...emptyScene(), schemaVersion: 99 }))).toThrow(
      /schema version 99/,
    );
  });
});

function structureOf(q: { parts: readonly { name: string; volume: number }[] }): number {
  return q.parts.find((p) => p.name === 'structure')!.volume;
}
