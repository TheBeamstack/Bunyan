/**
 * OPENINGS, HOSTS, AND THE BROKEN-REFERENCE STATE — the canonical parametric relationship, at the
 * document level (`core_logic` §3.6; domain rule 3; **D39**, owner ruling 2026-07-13).
 *
 * ⚠⚠ THIS FILE CUTS A SHAPE NOBODY IN THIS PROJECT HAS CUT: **a window through all three layers of a
 * ROTATED wall.** Every gap this project has ever found was found by using the API to build something a
 * building actually has — never by reading the code. The score before today was five-for-five (`at`,
 * the split-face bug, `extrude`/`chamfer`, the symmetric tie, the loose `bounds`), and the lesson each
 * time was the same: **the probe only measures the shapes you think to cut.**
 *
 * So: the wall is composite (D30) — because a window that pierced only the blockwork and left the
 * plaster hanging in front of it is the bug a single-solid model could never have expressed. And it is
 * rotated 30° — because a real wall is, and because the identity claim (`transform` mints no
 * identities, D25) has never been tested through a *document* rebuild.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, CommandFailure, DocumentContext, createRegistries } from '@bunyan/document';
import type { BimObjectType } from '@bunyan/document';
import { FIXTURE_TYPES, wallType } from './fixtures/bim-types.js';

const PLASTER = 15;
const BLOCKWORK = 200;
const INSULATION = 80;
const LENGTH = 4000;
const HEIGHT = 2800;
const WINDOW_W = 1200;
const WINDOW_H = 1400;

describe('openings, hosts, and the broken-reference state', () => {
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

  /** A composite wall, optionally rotated into the world, with the interior face named. */
  const buildWall = async (
    rotate = 0,
  ): Promise<{ doc: DocumentContext; wallId: string; hostFace: string }> => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });

    for (const [id, name, category, density] of [
      ['plaster-15', 'Plaster', 'finish', 1200],
      ['blockwork-200', 'Blockwork', 'masonry', 2000],
      ['eps-80', 'EPS', 'insulation', 20],
    ] as const) {
      await doc.execute('core.createMaterial', { id, name, category, density });
    }
    await doc.execute('core.createStyle', {
      id: 'EXT-295',
      name: 'EXT-295',
      typeId: 'core.wall.v1',
      layers: [
        {
          name: 'finish.interior',
          materialId: 'plaster-15',
          thickness: PLASTER,
          discipline: 'architectural',
        },
        {
          name: 'structure',
          materialId: 'blockwork-200',
          thickness: BLOCKWORK,
          discipline: 'structural',
        },
        {
          name: 'insulation',
          materialId: 'eps-80',
          thickness: INSULATION,
          discipline: 'architectural',
        },
      ],
    });

    const wall = await doc.execute('core.createElement', {
      typeId: 'core.wall.v1',
      styleId: 'EXT-295',
      params: { length: LENGTH, height: HEIGHT },
      ...(rotate === 0
        ? {}
        : {
            placement: [
              { kind: 'rotate', axis: [0, 0, 1], degrees: rotate },
              { kind: 'translate', by: [12000, 5000, 0] },
            ],
          }),
    });
    const wallId = wall.changes[0]!.id;

    // The face the window is hosted on: the interior face of the INTERIOR LAYER — a face of a PART,
    // which is a thing that only exists because of D30.
    const interior = doc.partsOf(wallId)!.find((p) => p.name === 'finish.interior')!;
    const hostFace = interior.refs.find((ref) => ref.includes('/face/y-min'))!;
    return { doc, wallId, hostFace };
  };

  const addWindow = (doc: DocumentContext, wallId: string, hostFace: string, offsetU = 800) =>
    doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: wallId,
      hostRef: hostFace,
      params: { width: WINDOW_W, height: WINDOW_H, anchor: 'fixed', offsetU, offsetV: 900 },
    });

  /* ============================================================================================
   * THE ONE THAT MATTERS
   * ========================================================================================= */

  it('⚠⚠ a window cuts through ALL THREE LAYERS of its host — not just the structure', async () => {
    const { doc, wallId, hostFace } = await buildWall();

    const solidVolumes = (await doc.quantities(wallId)).parts.map((p) => p.volume);
    await addWindow(doc, wallId, hostFace);
    const holedVolumes = (await doc.quantities(wallId)).parts.map((p) => p.volume);

    // EVERY layer lost exactly the window's slice of itself. A void that pierced only the blockwork
    // would leave a pane of plaster hanging across the opening — visibly absurd, and completely
    // invisible to a model in which a wall is one solid.
    const layers = [PLASTER, BLOCKWORK, INSULATION];
    for (const [i, thickness] of layers.entries()) {
      const lost = solidVolumes[i]! - holedVolumes[i]!;
      expect(lost, `layer ${i} was not pierced`).toBeCloseTo(WINDOW_W * WINDOW_H * thickness, 3);
    }
  });

  it('⚠ THE SHAPE NOBODY HAD CUT: a window through all three layers of a wall ROTATED 30°', async () => {
    const straight = await buildWall(0);
    await addWindow(straight.doc, straight.wallId, straight.hostFace);
    const straightVolumes = (await straight.doc.quantities(straight.wallId)).parts.map(
      (p) => p.volume,
    );

    const rotated = await buildWall(30);
    await addWindow(rotated.doc, rotated.wallId, rotated.hostFace);
    const rotatedVolumes = (await rotated.doc.quantities(rotated.wallId)).parts.map(
      (p) => p.volume,
    );

    // ⚠ THE CLAIM UNDER TEST (D25): a rigid motion is a topological ISOMORPHISM, so a rotated wall is
    // THE SAME WALL. The window is cut in the wall's own build frame and the whole assembly is placed
    // afterwards — so rotating a wall 30° across the site cannot move, resize or re-target its window.
    // The volumes must be IDENTICAL, not merely close.
    for (const [i, volume] of straightVolumes.entries()) {
      expect(rotatedVolumes[i]!).toBeCloseTo(volume, 3);
    }

    // And the host face's DERIVATION PATH is byte-identical — the window is hosted on the same face of
    // the same part, whatever the wall's attitude in the world. This is what makes "move the wall" safe.
    //
    // ⚠ The element id is stripped before comparing, and that is not a weakening of the claim: since
    // D44 a PEI is a ULID, so two walls in two documents are two different elements and *must* carry
    // different tokens. The claim under test is that ROTATION changes nothing — i.e. that the path
    // derived from the op DAG (`…/face/y-min#0`, on the `finish.interior` part) is the same one.
    const path = (ref: string, id: string): string => ref.slice(id.length);
    expect(path(rotated.hostFace, rotated.wallId)).toBe(path(straight.hostFace, straight.wallId));
    expect(path(rotated.hostFace, rotated.wallId)).toBe('.finish.interior/face/y-min#0');
  });

  it('a second window does not re-target the first — identity chains through both cuts', async () => {
    const { doc, wallId, hostFace } = await buildWall();
    const first = await addWindow(doc, wallId, hostFace, 500);
    const firstId = first.changes[0]!.id;

    await addWindow(doc, wallId, hostFace, 2400);

    // The first window is still hosted on the same face, and still cuts a hole of exactly its size.
    expect(doc.scene.elements[firstId]!.hostRef).toBe(hostFace);
    expect(doc.brokenRefs()).toHaveLength(0);

    const volumes = (await doc.quantities(wallId)).parts;
    const structure = volumes.find((p) => p.name === 'structure')!;
    expect(structure.volume).toBeCloseTo(
      LENGTH * BLOCKWORK * HEIGHT - 2 * WINDOW_W * WINDOW_H * BLOCKWORK,
      3,
    );
  });

  it('resizing the host rebuilds its windows WITH it, and every reference survives', async () => {
    const { doc, wallId, hostFace } = await buildWall();
    await addWindow(doc, wallId, hostFace);

    // The wall gets longer and taller. The whole recipe re-runs — every solid is rebuilt from scratch.
    await doc.execute('core.setParams', {
      elementId: wallId,
      params: { length: 6000, height: 3200 },
    });

    // ⚠ The window is STILL THERE, still the same size, still hosted on the same face token. If
    // identity were recovered by matching geometry after the fact, this is where it would silently
    // re-target — the failure that has plagued parametric CAD for thirty years.
    expect(doc.brokenRefs()).toHaveLength(0);
    expect(doc.scene.elements[wallId]!.params['length']).toBe(6000);

    const structure = (await doc.quantities(wallId)).parts.find((p) => p.name === 'structure')!;
    expect(structure.volume).toBeCloseTo(
      6000 * BLOCKWORK * 3200 - WINDOW_W * WINDOW_H * BLOCKWORK,
      3,
    );
  });

  /* ============================================================================================
   * D39 — CASCADE DELETE. **OWNER RULING, 2026-07-13.**
   * ========================================================================================= */

  it('⚠ DELETING A WALL DELETES THE WINDOWS IN IT — in ONE undoable edit (D39)', async () => {
    const { doc, wallId, hostFace } = await buildWall();
    const window1 = (await addWindow(doc, wallId, hostFace, 500)).changes[0]!.id;
    const window2 = (await addWindow(doc, wallId, hostFace, 2400)).changes[0]!.id;

    // ⚠ WARN FIRST — AND THE WARNING IS THE VERB ITSELF, RUN DRY (D42). `planDelete()` is DELETED: a
    // hand-written `plan…()` beside every command is a second description of one behaviour, and it
    // drifts. The dry run's would-be edit already lists the whole cascade, because the REAL command
    // computed it. A UI says "2 elements will also be deleted"; an agent reads the same list.
    const editsBefore = doc.history().length;
    const feedBefore = doc.changeFeed().length;

    const planned = await doc.execute(
      'core.deleteElement',
      { elementId: wallId },
      { dryRun: true },
    );
    expect(new Set(planned.changes.map((c) => c.id))).toEqual(new Set([wallId, window1, window2]));

    // ⚠ AND THE DRY RUN CHANGED NOTHING — it is a question, not an act. No edit, no journal entry.
    expect(doc.scene.elements[wallId]).toBeDefined();
    expect(doc.history()).toHaveLength(editsBefore);
    expect(doc.changeFeed()).toHaveLength(feedBefore);

    const edit = await doc.execute('core.deleteElement', { elementId: wallId });

    // One edit, three elements. An Opening is DEFINED BY its host — a window floating in space is not
    // a thing, and its geometry is a boolean against a solid that no longer exists.
    expect(edit.changes).toHaveLength(3);
    expect(doc.scene.elements[wallId]).toBeUndefined();
    expect(doc.scene.elements[window1]).toBeUndefined();
    expect(doc.scene.elements[window2]).toBeUndefined();

    // ⚠ AND UNDO BRINGS BACK ALL THREE — which is the whole reason it had to be one edit and not
    // three. An undo that restored the wall and left its windows deleted would be a data-loss bug
    // wearing an undo button.
    await doc.undo();
    expect(doc.scene.elements[wallId]).toBeDefined();
    expect(doc.scene.elements[window1]).toBeDefined();
    expect(doc.scene.elements[window2]).toBeDefined();

    const structure = (await doc.quantities(wallId)).parts.find((p) => p.name === 'structure')!;
    expect(structure.volume).toBeCloseTo(
      LENGTH * BLOCKWORK * HEIGHT - 2 * WINDOW_W * WINDOW_H * BLOCKWORK,
      3,
    );
  });

  it('deleting a WINDOW heals its host — the hole closes', async () => {
    const { doc, wallId, hostFace } = await buildWall();
    const windowId = (await addWindow(doc, wallId, hostFace)).changes[0]!.id;

    await doc.execute('core.deleteElement', { elementId: windowId });

    const structure = (await doc.quantities(wallId)).parts.find((p) => p.name === 'structure')!;
    expect(structure.volume).toBeCloseTo(LENGTH * BLOCKWORK * HEIGHT, 3);
  });

  /* ============================================================================================
   * DOMAIN RULE 3 — THE BROKEN-REFERENCE STATE. It did not exist anywhere in the codebase.
   * ========================================================================================= */

  it('⚠⚠ A BROKEN REFERENCE DOES NOT TAKE THE DOCUMENT WITH IT (domain rule 3)', async () => {
    const { doc, wallId, hostFace } = await buildWall();
    const windowId = (await addWindow(doc, wallId, hostFace)).changes[0]!.id;

    // Retarget the window onto a face that DOES NOT EXIST. This is the state a wall re-authored into a
    // different shape would leave its openings in — the face they were anchored to is simply gone.
    await doc.execute('core.retargetReference', {
      elementId: windowId,
      hostId: wallId,
      hostRef: `${wallId}.structure/face/does-not-exist#0`,
    });

    // ⚠ 1. IT IS MARKED, AND IT IS VISIBLE. Not swallowed, not auto-healed, not silently reattached to
    //      whatever face happens to be nearby — which is exactly what "never auto-healed" forbids.
    const broken = doc.brokenRefs();
    expect(broken).toHaveLength(1);
    expect(broken[0]!.elementId).toBe(windowId);
    expect(broken[0]!.reason).toMatch(/does not exist/);
    expect(doc.geometryOf(windowId)!.state).toBe('broken-ref');

    // ⚠ 2. AND THE DOCUMENT STILL WORKS. The wall built — WITHOUT the hole, because the hole no longer
    //      knows where it goes. "Predictable breakage beats silent wrongness" is only half-kept if the
    //      breakage bricks the file: today an unresolvable ref threw and the whole operation failed,
    //      which meant deleting a wall that hosts a window had NO DEFINED BEHAVIOUR at all.
    const structure = (await doc.quantities(wallId)).parts.find((p) => p.name === 'structure')!;
    expect(structure.volume).toBeCloseTo(LENGTH * BLOCKWORK * HEIGHT, 3);

    // ⚠ 3. AND IT IS STILL EDITABLE while carrying the break — the user is not trapped.
    await doc.execute('core.setParams', { elementId: wallId, params: { length: 5000 } });
    expect(doc.brokenRefs()).toHaveLength(1);

    // ⚠ 4. AND THE ONLY WAY OUT IS MANUAL RETARGETING — which is itself an UndoableEdit (spec §6.1).
    //      A broken reference that can be SEEN but not FIXED is a document the user cannot leave.
    const good = doc.partsOf(wallId)!.find((p) => p.name === 'finish.interior')!;
    const goodFace = good.refs.find((ref) => ref.includes('/face/y-min'))!;
    await doc.execute('core.retargetReference', {
      elementId: windowId,
      hostId: wallId,
      hostRef: goodFace,
    });

    expect(doc.brokenRefs()).toHaveLength(0);
    const repaired = (await doc.quantities(wallId)).parts.find((p) => p.name === 'structure')!;
    expect(repaired.volume).toBeCloseTo(
      5000 * BLOCKWORK * HEIGHT - WINDOW_W * WINDOW_H * BLOCKWORK,
      3,
    );
  });

  /**
   * ⚠⚠ THE SIBLING OF THE TEST ABOVE, AND UNTIL ENTRY 80'S REVIEW IT LANDED IN A FOURTH STATE THAT NO
   * DIAGNOSTIC REPORTED — the one failure mode this document model did not have a name for.
   *
   * The test above retargets onto a face that DOES NOT EXIST: `hostPart` is not found, a
   * `BrokenReference` is recorded, `state` is `broken-ref`, and the user can see it and retarget it.
   * This one names a token that **does** exist on the part — an **EDGE** of the same wall. The `refs`
   * lookup therefore SUCCEEDS, and the failure surfaces one step later, out of the kernel, as
   * `UNRESOLVED_SUBSHAPE_REF` from `bounds`/`faceFrame`, into a `catch` that marked the opening
   * `state: 'failed'` and moved on.
   *
   * Measured on this branch before the fix (real kernel, headless):
   *
   * ```
   * GEOMETRY:    {"state":"failed","parts":[],"error":"[UNRESOLVED_SUBSHAPE_REF] … no such named face"}
   * UNBUILDABLE: []      ← only `failure: 'unbuildable'` reaches this list
   * BROKENREFS:  []      ← nothing was pushed
   * ```
   *
   * So the SAME authoring error — *"this opening names a host sub-shape it cannot be hosted on"* — was
   * visible or invisible depending on whether the token happened to be in `part.refs`. That is not a
   * design question, it is an inconsistency: `document.ts`'s own comment promises a failed element is
   * *"visible via `unbuildable()` / `geometryOf()`"*, and `unbuildable()` never saw this one (§1c-7).
   *
   * ⚠ Found while REVIEWING Entry 80, which met the same silence from the browser side (a corner snap
   * handed the opening tool an edge ref and the door simply was not there — no banner, no console
   * error). Amer guarded the tool, which was theirs to guard; this is the layer underneath, where an
   * agent driving `core.createElement` directly meets the identical hole.
   */
  it('⚠⚠ an opening hosted on an EDGE is a BROKEN REF, not a silent `failed` (Entry 80 review)', async () => {
    const { doc, wallId, hostFace } = await buildWall();
    const windowId = (await addWindow(doc, wallId, hostFace)).changes[0]!.id;

    // An edge of the very part the window is hosted on: present in `refs`, and no surface to read.
    const interior = doc.partsOf(wallId)!.find((p) => p.name === 'finish.interior')!;
    const edgeRef = interior.refs.find((ref) => ref.includes('/edge/'))!;
    expect(
      edgeRef,
      'the fixture wall exposes no edge ref — this test proves nothing',
    ).toBeDefined();

    await doc.execute('core.retargetReference', {
      elementId: windowId,
      hostId: wallId,
      hostRef: edgeRef,
    });

    // ⚠ 1. IT IS VISIBLE, by the same route as its sibling. A user or an agent can enumerate it.
    const broken = doc.brokenRefs();
    expect(broken).toHaveLength(1);
    expect(broken[0]!.elementId).toBe(windowId);
    expect(broken[0]!.ref).toBe(edgeRef);
    expect(broken[0]!.reason).toMatch(/edge/);
    expect(doc.geometryOf(windowId)!.state).toBe('broken-ref');

    // ⚠ 2. AND THE WALL STILL BUILDS, un-pierced — domain rule 3, exactly as for a missing face.
    const structure = (await doc.quantities(wallId)).parts.find((p) => p.name === 'structure')!;
    expect(structure.volume).toBeCloseTo(LENGTH * BLOCKWORK * HEIGHT, 3);

    // ⚠ 3. AND RETARGETING BACK ONTO A FACE HEALS IT — the way out is the same one.
    await doc.execute('core.retargetReference', {
      elementId: windowId,
      hostId: wallId,
      hostRef: hostFace,
    });
    expect(doc.brokenRefs()).toHaveLength(0);
    expect(doc.geometryOf(windowId)!.state).toBe('valid');
  });

  /**
   * ⚠⚠ D84 (Q18, owner-ruled 2026-08-15) — A HOSTED VOID MAY ONLY HOST ON ITS HOST'S OWN BASE PART.
   *
   * The bug this closes: a door reaching the wall's own base (`offsetV: 0`, sill coincident with the
   * wall's z-min) leaves OCCT reporting that boundary as MODIFIED, not merely holed — so the cut mints
   * a genuinely DERIVED face token there (`<host>.<layer>~<opening>/face/cut(...)#n`), the same shape a
   * picked-from-the-already-cut-mesh face would carry. Hosting a SECOND void on that token used to reach
   * `hostedBy`'s resolution (`build.ts`), which matches only against the host's PRISTINE base parts —
   * built before any void cuts — and silently landed `broken-ref`, discovered only at the next rebuild.
   *
   * ⚠ The test goes through the VERB (`core.createElement`), not a simulated pick: `hostRef`'s node and
   * role carry the cut's own markers regardless of how a caller obtained them (§ the same defect an
   * agent driving the command directly would meet).
   */
  it('⚠⚠ D84 — createElement REFUSES a host face a prior cut already created or modified', async () => {
    const { doc, wallId, hostFace } = await buildWall();

    // A door reaching the floor (`offsetV: 0`) — its sill is coincident with the wall's own base face,
    // which is what earns a genuinely DERIVED face token, not merely a new hole in an inherited one.
    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: wallId,
      hostRef: hostFace,
      params: { width: WINDOW_W, height: 900, anchor: 'fixed', offsetU: 500, offsetV: 0 },
    });

    const interior = doc.partsOf(wallId)!.find((p) => p.name === 'finish.interior')!;
    const derivedFace = interior.refs.find((ref) => ref.includes('/face/cut('));
    expect(
      derivedFace,
      'the fixture did not produce a derived face — this test proves nothing',
    ).toBeDefined();

    await expect(
      doc.execute('core.createElement', {
        typeId: 'core.opening.v1',
        hostId: wallId,
        hostRef: derivedFace!,
        params: { width: WINDOW_W, height: WINDOW_H, anchor: 'fixed', offsetU: 2400, offsetV: 900 },
      }),
    ).rejects.toThrow(/own base part/);

    // ⚠ AND REFUSED, NOT SILENTLY BROKEN: no half-created element, no new broken reference to show for it.
    expect(doc.brokenRefs()).toHaveLength(0);
  });

  /** The same rule, generalised to the OTHER door onto a host face (D51) — manual retargeting. */
  it('⚠⚠ D84 — retargetReference REFUSES a host face a prior cut already created or modified', async () => {
    const { doc, wallId, hostFace } = await buildWall();
    const windowId = (await addWindow(doc, wallId, hostFace)).changes[0]!.id;

    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: wallId,
      hostRef: hostFace,
      params: { width: WINDOW_W, height: 900, anchor: 'fixed', offsetU: 2400, offsetV: 0 },
    });
    const interior = doc.partsOf(wallId)!.find((p) => p.name === 'finish.interior')!;
    const derivedFace = interior.refs.find((ref) => ref.includes('/face/cut('));
    expect(
      derivedFace,
      'the fixture did not produce a derived face — this test proves nothing',
    ).toBeDefined();

    await expect(
      doc.execute('core.retargetReference', {
        elementId: windowId,
        hostId: wallId,
        hostRef: derivedFace!,
      }),
    ).rejects.toThrow(/own base part/);
  });

  /* ============================================================================================
   * DOMAIN RULE 4 — REJECT + KEEP LAST-GOOD.
   * ========================================================================================= */

  /**
   * ⚠⚠ THIS TEST IS A REWRITE, AND THE REWRITE IS THE DELIVERABLE (D42).
   *
   * **The test that used to be here was green, well-named, and asserted something WEAKER THAN ITS OWN
   * TITLE.** It passed `params: { length: -1 }` — which the **schema** rejects *inside the command,
   * before the kernel is ever called*. So the geometry-failure path, **the one the rule is actually
   * about**, was never exercised. And it was broken: the scene rolled back and the **geometry did not**.
   * A style edit that one wall refused left an *innocent sibling* holding a solid built at the
   * **rejected** thickness, its old handles already freed — and `quantities()` reported **double the
   * true volume** of an element the user never touched, with **`basis: 'exact'`**.
   *
   * So this one fails **in the kernel**, on a **multi-element** edit, and asserts what the rule claims:
   * the sibling's geometry, its quantities, AND the live handle count are all exactly as they were.
   *
   * *(The standing lesson, now in the brief: for every exit criterion, read the test that discharges it
   * and ask what it would take for that test to pass while the criterion is FALSE.)*
   */
  /**
   * The asymmetry the rule needs, and it is the one thing today's fixtures could not produce.
   *
   * ⚠ **A failure that hits EVERY instance is accidentally safe** — an all-fail rolls back cleanly
   * because there is no successful sibling left holding rejected geometry. The bug only bites when a
   * rebuild succeeds for **some** elements and refuses for **others**, which is exactly what the spec
   * calls *normal* (§6.4: *"fillet radius too large, open/self-intersecting profile, empty boolean"*)
   * and exactly what **P5's real Wall/Slab/Opening will do**.
   *
   * So: a wall that rounds a vertical corner. **The radius is an INSTANCE param; the thickness is on
   * the STYLE.** Thin the style and the wall with the big radius becomes unfilletable — OCCT's own
   * `BRepCheck_Analyzer` refuses the result — while its thin-radius sibling rebuilds perfectly.
   * *(A rounded wall end is not a contrivance; it is a wall.)*
   */
  const roundedWallType: BimObjectType = {
    ...wallType,
    id: 'test.roundedWall.v1',
    label: 'Wall with a rounded end',
    parameterSchema: {
      ...wallType.parameterSchema,
      cornerRadius: { kind: 'number', label: 'Corner radius', unit: 'mm', default: 0, min: 0 },
    },
    async buildGeometry(ctx) {
      const parts = await wallType.buildGeometry!(ctx);
      const radius = Number(ctx.params['cornerRadius'] ?? 0);
      if (radius <= 0) return parts;

      // Round the structural layer's vertical corner. ⚠ Fails in OCCT — not in our schema — the moment
      // the radius no longer fits the layer it is cut into.
      return Promise.all(
        parts.map(async (part) => {
          if (part.name !== 'structure') return part;
          const edge = part.refs.find((ref) => ref.includes('/edge/x-max|y-min'))!;

          // ⚠⚠ DECLARE THE BOX AS GARBAGE **BEFORE** THE OP THAT MIGHT REFUSE IT — and this is the
          // authoring pattern, not a trick. `discard` only *declares*; the engine frees at the END of
          // the rebuild, so the box is still a perfectly valid operand for the fillet below. Declare it
          // afterwards and the throw skips the declaration: the box leaks on exactly the path where a
          // leak is least visible. (Measured writing this test: 2 solids leaked per refused rebuild.)
          ctx.discard(part.handle);

          const rounded = await ctx.geometry.request('fillet', {
            nodeId: `${part.nodeId}~corner`,
            handle: part.handle,
            edge,
            radius,
          });
          return { ...part, handle: rounded.handle, refs: rounded.refs };
        }),
      );
    },
  };

  it('⚠⚠ REJECT + KEEP LAST-GOOD IS TRUE OF THE GEOMETRY, NOT JUST THE SCENE — a multi-element edit the KERNEL refuses (rule 4, D42)', async () => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    registries.types.register(roundedWallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });

    await doc.execute('core.createMaterial', {
      id: 'blockwork-200',
      name: 'Blockwork',
      category: 'masonry',
      density: 2000,
    });
    await doc.execute('core.createStyle', {
      id: 'RND',
      name: 'RND',
      typeId: 'test.roundedWall.v1',
      layers: [
        {
          name: 'structure',
          materialId: 'blockwork-200',
          thickness: 200,
          discipline: 'structural',
        },
      ],
    });

    // Two walls on ONE style. They differ only in their own corner radius.
    const mk = async (cornerRadius: number): Promise<string> =>
      (
        await doc.execute('core.createElement', {
          typeId: 'test.roundedWall.v1',
          styleId: 'RND',
          params: { length: LENGTH, height: HEIGHT, cornerRadius },
        })
      ).changes[0]!.id;

    const sibling = await mk(10); // survives a thin wall
    const fragile = await mk(150); // cannot be rounded once the wall is 50 mm thick

    const beforeVolumes = (await doc.quantities(sibling)).parts.map((p) => p.volume);
    const beforeHandles = doc.partsOf(sibling)!.map((p) => p.handle);
    const liveBefore = kernel.wasmLiveHandles();
    const feedBefore = doc.changeFeed().length;

    // ⚠ THE STYLE EDIT THE KERNEL REFUSES — for ONE of the two walls. `INVALID_RESULT` comes back from
    // OCCT's own checker, not from our schema: this is the geometry-failure path, and it is the one the
    // rule is actually about. (The old test never reached it: `length: -1` died in the schema.)
    await expect(
      doc.execute('core.updateStyle', {
        styleId: 'RND',
        layers: [
          {
            name: 'structure',
            materialId: 'blockwork-200',
            thickness: 50,
            discipline: 'structural',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(CommandFailure);

    // The failure NAMES THE OFFENDER (D42) — a UI highlights it; an agent re-plans against it.
    await expect(
      doc.execute('core.updateStyle', {
        styleId: 'RND',
        layers: [
          {
            name: 'structure',
            materialId: 'blockwork-200',
            thickness: 50,
            discipline: 'structural',
          },
        ],
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining(fragile) });

    // ---- THE SCENE rolled back. This was ALWAYS true, and it is why the bug hid for a whole phase. --
    expect(doc.scene.styles['RND']!.layers![0]!.thickness).toBe(200);

    // ---- ⚠⚠ AND THE GEOMETRY DID TOO — WHICH IS WHAT WAS FALSE. -----------------------------------
    // Measured before the fix: the sibling was left holding the solid built at the REJECTED thickness,
    // its old handles already released, and `quantities()` reported that volume with `basis: 'exact'`.
    expect(doc.partsOf(sibling)!.map((p) => p.handle)).toEqual(beforeHandles);
    expect((await doc.quantities(sibling)).parts.map((p) => p.volume)).toEqual(beforeVolumes);

    // ---- AND NOT ONE HANDLE LEAKED. The staged solids went back; the live ones never moved. --------
    expect(kernel.wasmLiveHandles()).toBe(liveBefore);

    // ---- AND NOTHING REACHED THE JOURNAL. A rejected edit did not happen. --------------------------
    expect(doc.changeFeed()).toHaveLength(feedBefore);

    // ---- AND THE DOCUMENT IS STILL ALIVE: a valid edit still works. --------------------------------
    await doc.execute('core.updateStyle', {
      styleId: 'RND',
      layers: [
        {
          name: 'structure',
          materialId: 'blockwork-200',
          thickness: 300,
          discipline: 'structural',
        },
      ],
    });
    expect(doc.scene.styles['RND']!.layers![0]!.thickness).toBe(300);
  });

  it('a DRY RUN of a valid edit returns the would-be edit and applies NOTHING (D42)', async () => {
    const { doc, wallId } = await buildWall();
    const before = (await doc.quantities(wallId)).parts.map((p) => p.volume);
    const liveBefore = kernel.wasmLiveHandles();
    const feedBefore = doc.changeFeed().length;

    const planned = await doc.execute(
      'core.setParams',
      { elementId: wallId, params: { length: 9000 } },
      { dryRun: true },
    );

    // It ran for real, against the real kernel, and handed back the edit it WOULD have produced…
    expect(planned.command).toBe('core.setParams');
    expect(planned.rebuilt).toContain(wallId);

    // …and then threw every bit of it away. Bit-for-bit identical: scene, geometry, journal, heap.
    expect(doc.scene.elements[wallId]!.params['length']).toBe(LENGTH);
    expect((await doc.quantities(wallId)).parts.map((p) => p.volume)).toEqual(before);
    expect(doc.changeFeed()).toHaveLength(feedBefore);
    expect(kernel.wasmLiveHandles()).toBe(liveBefore);
  });

  it('a command whose own args are invalid is still refused by the schema, before the kernel (rule 4)', async () => {
    const { doc, wallId } = await buildWall();
    const before = (await doc.quantities(wallId)).parts.map((p) => p.volume);

    // The cheap half of the rule, and it was the ONLY half the old test covered. Kept, because it is
    // genuinely a path — just not *the* path the rule is about.
    await expect(
      doc.execute('core.setParams', { elementId: wallId, params: { length: -1 } }),
    ).rejects.toBeInstanceOf(CommandFailure);

    expect((await doc.quantities(wallId)).parts.map((p) => p.volume)).toEqual(before);
    expect(doc.scene.elements[wallId]!.params['length']).toBe(LENGTH);
  });

  it('the WASM heap does not leak through a document rebuild (spec §6.2)', async () => {
    const { doc, wallId, hostFace } = await buildWall();
    await addWindow(doc, wallId, hostFace);

    const live = () => kernel.wasmLiveHandles();
    const settled = live();

    // Twenty parameter edits — the shape of a drag. Each one rebuilds three layers, cuts a window
    // through each, and throws away the intermediates. Without the release discipline this leaks one
    // dead OCCT solid per layer per frame.
    for (let i = 0; i < 20; i++) {
      await doc.execute('core.setParams', {
        elementId: wallId,
        params: { length: LENGTH + i * 10 },
      });
    }

    // Exactly the same number of live solids as before the drag: 3 parts, and nothing else.
    expect(live()).toBe(settled);
  });
});
