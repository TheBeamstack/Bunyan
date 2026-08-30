// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE PLAN + SECTION UNIT (D58 row Ⓐ's third unit — `P5_step6C_plan_section_design.md`, D81).
 *
 * Real OCCT throughout, because the entire claim under test is that **a drawing IS the B-Rep**. A plan
 * projected from a mock would prove nothing at all: the mock holds no solid, so it has nothing to cut,
 * and curves it invented would be exactly the picture this unit exists to refuse.
 *
 * ⚠⚠ EVERY TEST HERE IS WRITTEN AGAINST THE DESIGN'S OWN §5 TABLE, WHICH NAMES — PER CRITERION — HOW
 * THAT TEST COULD PASS WHILE ITS TITLE IS FALSE. That table is why the fixture below is not one plain
 * wall. Entry 47 froze the anchoring contract green on a two-plain-wall fixture and was wrong about the
 * model in three ways; Entry 65 measured the damage (a curtain-panel schedule returning 0 rows where 6
 * is correct). ⇒ **THE FIXTURE CARRIES A CURTAIN WALL (children), AN OPENING (cut faces) AND A DESIGN
 * OPTION (a non-active variant).** A plain box exercises neither `REL_INHERIT` nor a cut node — Entry 71
 * measured that from the other side: 16 of a real wall's 34 identities belong to OTHER nodes, and 26 of
 * a door frame's 34 do.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries, emptyScene } from '@bunyan/document';
import type { DesignOption, Params, Scene, ViewDescriptor } from '@bunyan/document';
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
/** The cut plane: 1200 mm up, so it passes through the wall body AND through the window opening. */
const CUT = 1200;

const CW = {
  width: 3000,
  height: H,
  rows: 2,
  cols: 3,
  depth: 100,
  mullionWidth: 50,
  panelThickness: 24,
} as const;

describe('D58 row Ⓐ — plan/section: a drawing is a PROJECTION of the B-Rep (D81)', () => {
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

  const newDoc = (scene?: Scene): DocumentContext => {
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
    return new DocumentContext({
      registries,
      geometry: client,
      ...(scene === undefined ? {} : { scene }),
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
    await doc.execute('core.createMaterial', {
      id: 'glass',
      name: 'Glass',
      category: 'other',
      density: 2500,
    });
    await doc.execute('core.createMaterial', {
      id: 'alu',
      name: 'Aluminium',
      category: 'other',
      density: 2700,
    });
    return (
      await doc.execute('core.createElement', {
        typeId: 'core.curtainwall',
        params: { origin: [0, 0], ...CW, panelMaterialId: 'glass', mullionMaterialId: 'alu' },
      })
    ).changes[0]!.id;
  };

  /** A level to hang a plan on — a plan cut at anything else is refused (§4.3). */
  const makeLevel = async (doc: DocumentContext, elevation = 0): Promise<string> => {
    await doc.execute('core.createContainer', {
      id: 'L00',
      kind: 'level',
      name: 'Level 00',
      elevation,
    });
    return 'L00';
  };

  const planOn = async (doc: DocumentContext, levelId: string): Promise<ViewDescriptor> => {
    const id = (
      await doc.execute('core.createView', {
        kind: 'plan',
        name: 'Level 00 Plan',
        scale: 100,
        levelId,
        cutHeight: CUT,
      })
    ).changes[0]!.id;
    return doc.scene.views![id]!;
  };

  /* ============================================================================================
   * §1 — A PLAN CUTS THE REAL MODEL
   *
   * ⚠ §5's named false-pass: "fixture is one plain wall — the Entry-47 trap exactly."
   * ========================================================================================= */

  it('⚠⚠ a plan cuts the REAL model — a wall, an opening and a curtain wall, all from one descriptor', async () => {
    const doc = newDoc();
    const levelId = await makeLevel(doc);
    const wallId = await makeWall(doc, [0, 0], [4000, 0], { containerId: levelId });
    await makeCurtainWall(doc);

    const descriptor = await planOn(doc, levelId);
    const result = await doc.projectView(descriptor);

    // The plane is the one the descriptor asked for — 1200 above the Level's own datum.
    expect(result.plane.origin[2]).toBe(CUT);
    expect(result.kind).toBe('plan');

    // ⚠ THE FIXTURE IS NOT ONE PLAIN WALL, and this is the assertion that says so: the curtain wall's
    // GENERATED CHILDREN are drawn. 1 authored row, 17 real elements (Entry 65's measurement).
    expect(doc.modelElements().length).toBeGreaterThan(17);
    expect(result.curves.length).toBeGreaterThan(0);

    // Curves came from more than one element — a drawing of one wall would pass a weaker test.
    const drawn = new Set(result.curves.map((c) => c.elementId));
    expect(drawn.size).toBeGreaterThan(1);
    expect(drawn.has(wallId)).toBe(true);

    // Nothing failed silently. An empty `unprojected` is the claim; a non-empty one is never hidden.
    expect(result.unprojected).toEqual([]);
  }, 180000);

  /* ============================================================================================
   * §2 — CUT CURVES CARRY IDENTITY
   *
   * ⚠ §5's named false-pass: "asserting `ref !== undefined` only. ⇒ assert the token is BYTE-IDENTICAL
   * to the face's own ref." That is exactly what this does — it is the difference between a drawing
   * that is annotatable and one that merely looks it.
   * ========================================================================================= */

  it('⚠⚠ every cut curve carries the OWNER FACE’s OWN token, byte-identical — not merely "a ref"', async () => {
    const doc = newDoc();
    const levelId = await makeLevel(doc);
    const wallId = await makeWall(doc, [0, 0], [4000, 0], { containerId: levelId });

    const result = await doc.projectView(await planOn(doc, levelId));
    const wallCurves = result.curves.filter((c) => c.elementId === wallId);
    expect(wallCurves.length).toBeGreaterThan(0);

    // Every single one is attributed. Entry 69 measured section history complete (4/4, 1/1, 8/8,
    // zero orphans); this is that finding re-measured through the whole stack rather than trusted.
    expect(wallCurves.every((c) => c.curve.ref !== undefined)).toBe(true);
    expect(wallCurves.every((c) => c.curve.kind === 'cut')).toBe(true);

    // ⚠⚠ THE BYTE-IDENTICAL CHECK. The curve's ref must be a token the PART ITSELF already carries —
    // not a new identity minted for the drawing, and not a re-encoding that merely round-trips.
    const parts = doc.partsOf(wallId)!;
    const everyRealRef = new Set(parts.flatMap((p) => p.refs));
    for (const { curve } of wallCurves) {
      const encoded = `${curve.ref!.nodeId}/${curve.ref!.kind}/${curve.ref!.role}#${String(curve.ref!.occurrence)}`;
      expect(everyRealRef.has(encoded), `${encoded} is not a ref this wall actually has`).toBe(
        true,
      );
    }

    // And each names a FACE of a live part — the provenance a dimension anchors to.
    for (const { curve } of wallCurves) {
      expect(curve.ref!.kind).toBe('face');
      expect(parts.some((p) => p.nodeId === curve.ref!.nodeId)).toBe(true);
    }
  }, 180000);

  /* ============================================================================================
   * §3 — THE DRAWING IS LIVE
   *
   * ⚠ §5's named false-pass: "asserting the descriptor round-trips, which tests STORAGE, not
   * PROJECTION." So this edits the MODEL and re-projects the SAME stored descriptor.
   * ========================================================================================= */

  it('⚠⚠ the drawing is LIVE — resize the wall, re-project the SAME descriptor, the geometry follows with ZERO re-authoring', async () => {
    const doc = newDoc();
    const levelId = await makeLevel(doc);
    const wallId = await makeWall(doc, [0, 0], [4000, 0], { containerId: levelId });
    const descriptor = await planOn(doc, levelId);

    const before = await doc.projectView(descriptor);
    const spanBefore = drawingSpan(before.curves.map((c) => c.curve.points));

    // Edit the MODEL — not the view. The view is not touched, re-created, or re-authored.
    await doc.execute('core.setParams', {
      elementId: wallId,
      params: { start: [0, 0], end: [9000, 0], thickness: T, height: H },
    });

    const after = await doc.projectView(descriptor);
    const spanAfter = drawingSpan(after.curves.map((c) => c.curve.points));

    // ⚠ THE DRAWING MOVED BECAUSE THE MODEL DID. A stored drawing would have returned the old number.
    expect(spanAfter).toBeGreaterThan(spanBefore + 4000);

    // ⚠ AND NOTHING WAS STORED — the `.bnn` carries the DESCRIPTOR, never the curves (rule 17). The
    // stored view is byte-identical before and after a projection that produced hundreds of points.
    expect(doc.scene.views![descriptor.id]).toEqual(descriptor);
  }, 180000);

  /* ============================================================================================
   * §4 — A CURTAIN WALL IS DRAWN
   *
   * ⚠ §5's named false-pass: "a fixture with no children — Entry 65's 0-rows-where-6 with worse
   * consequences." A plan that silently omits every panel is D78's empty table on an artifact someone
   * BUILDS FROM.
   * ========================================================================================= */

  it('⚠⚠ a CURTAIN WALL is drawn — its generated children appear, though `scene.elements` holds ONE row', async () => {
    const doc = newDoc();
    const levelId = await makeLevel(doc);
    const cwId = await makeCurtainWall(doc);

    // The measurement that motivates the enumeration decision: 1 authored row, 17 real elements.
    expect(Object.keys(doc.scene.elements)).toHaveLength(1);
    expect(doc.modelElements()).toHaveLength(17);

    const result = await doc.projectView(await planOn(doc, levelId));

    // ⚠⚠ THE HEADLINE. Curves come from the CHILDREN, whose ids are derived (`${parentId}:${slot}`)
    // and which are in no `scene.elements` row at all. A body with its own enumeration loop over
    // `scene.elements` would draw NOTHING here and report no error.
    const drawn = new Set(result.curves.map((c) => c.elementId));
    expect(drawn.size).toBeGreaterThan(1);
    expect([...drawn].some((id) => id !== cwId)).toBe(true);

    // Every drawn curve traces back to the authored curtain wall through `rootId` — which is how a
    // drawing stays addressable by the thing a user actually authored.
    expect(result.curves.every((c) => c.rootId === cwId)).toBe(true);
    expect(result.unprojected).toEqual([]);
  }, 180000);

  /* ============================================================================================
   * §5 — A NON-ACTIVE OPTION IS NOT DRAWN
   *
   * ⚠ §5's named false-pass: "no option in the fixture." D65's named failure mode is a 2.0000×
   * over-report; in a drawing it is two walls drawn on top of each other, which reads as one.
   * ========================================================================================= */

  it('⚠⚠ a NON-ACTIVE design option is NOT drawn — the variant wall contributes no curves', async () => {
    /* ⚠⚠ THE OPTIONS ARE SEEDED INTO THE SCENE, which is one of three roads onto `scene.designOptions`:
     * `core.createDesignOption` (D85/Q17a), a loaded `.bnn`, or a Scene assembled in code, as here. The
     * artifact doors refuse an id absent from the collection while `core.createElement` deliberately
     * SKIPS the same check for its `designOptionId` field, so the three doors onto one collection still
     * hold two policies — the accepting one is what this fixture reaches.
     *
     * ⚠⚠ THIS COMMENT USED TO SAY `checkDesignOptions` WAS *"shared with the schedule CRUD"*, AND IT WAS
     * NOT — the view door carried its own second copy of the lookup in `view.ts`, with a different failure
     * code (Entry 82 found the same false claim in `open_rulings.md`'s Q17 row; this was its third home).
     * It is shared NOW: both doors call `unresolvedDesignOptions`, and each keeps its own throw. The
     * standing guard for that is `tests/design-option-refs.test.ts`.
     *
     * ⚠ The ACCEPTING door is the one that matters: it produces a 50.0% silent under-report (Entry 82,
     * `docs/design/P5_step6D_design_options_crud_design.md` §1.4). Q17a/Q17b/Q17c. */
    const designOptions: Record<string, DesignOption> = {
      'opt-a': { id: 'opt-a', setName: 'Facade', name: 'A', isPrimary: true },
      'opt-b': { id: 'opt-b', setName: 'Facade', name: 'B', isPrimary: false },
    };
    const doc = newDoc({ ...emptyScene(), designOptions });
    const levelId = await makeLevel(doc);
    /* ⚠ BOTH WALLS ARE TAGGED, AND THE UNTAGGED CASE IS THE TRAP. An element with NO `designOptionId`
     * is MAIN MODEL — "shared by every option" (`ownTagActive`) — so it is drawn in every view, and a
     * test that left the first wall untagged would assert it disappears under an Option B view and be
     * asserting something FALSE about the product. The exclusion invariant is between SIBLING options
     * of one set, never between an option and the main model. */
    const primary = await makeWall(doc, [0, 0], [4000, 0], {
      containerId: levelId,
      designOptionId: 'opt-a',
    });
    const variant = await makeWall(doc, [0, 0], [4000, 0], {
      containerId: levelId,
      designOptionId: 'opt-b',
    });

    const result = await doc.projectView(await planOn(doc, levelId));
    const drawn = new Set(result.curves.map((c) => c.elementId));

    // Absent an explicit selection, each set's PRIMARY is drawn — and the variant is not. Two walls
    // at identical coordinates would otherwise draw on top of each other and READ AS ONE, which is
    // D65's 2.0000x over-report wearing a shape nobody can see.
    expect(drawn.has(primary)).toBe(true);
    expect(drawn.has(variant)).toBe(false);

    // ⚠ AND THE VIEW'S OWN STORED SELECTION WINS when it names one — `evaluateSchedule`'s exact rule,
    // so a drawing and a table asked the same question can never answer it differently.
    const optionView = (
      await doc.execute('core.createView', {
        kind: 'plan',
        name: 'Option B Plan',
        scale: 100,
        levelId,
        cutHeight: CUT,
        designOptionIds: ['opt-b'],
      })
    ).changes[0]!.id;

    const optionResult = await doc.projectView(doc.scene.views![optionView]!);
    const optionDrawn = new Set(optionResult.curves.map((c) => c.elementId));
    expect(optionDrawn.has(variant)).toBe(true);
    expect(optionDrawn.has(primary)).toBe(false);
  }, 180000);

  /* ============================================================================================
   * §6 — OPENINGS READ CORRECTLY
   *
   * ⚠ §5's named false-pass: "asserting only the segment count and not the REF OWNERSHIP." A window
   * splits the wall in plan into two segments; the reveal faces belong to the CUT NODE, not to the
   * wall's own primitive — which is `REL_INHERIT` vs a cut node, the thing a plain box never exercises.
   * ========================================================================================= */

  it('⚠⚠ a plan through a WINDOW yields more wall curves than the same wall unbroken — and the reveals resolve to a live part', async () => {
    const doc = newDoc();
    const levelId = await makeLevel(doc);
    const wallId = await makeWall(doc, [0, 0], [4000, 0], { containerId: levelId });
    const descriptor = await planOn(doc, levelId);

    const solid = await doc.projectView(descriptor);
    const solidCount = solid.curves.filter((c) => c.elementId === wallId).length;

    // Cut a window THROUGH the plane the plan is taken at, so the plan actually meets the hole.
    /* ⚠ THE FACE ROLE IS `lateral.0`, NOT `y-min` — §1c-4's lesson one shape along. A D52 baseline wall
     * is an EXTRUDED PROFILE, so its faces are `lateral.k` (numbered by the profile segment they were
     * swept from) and `cap-start`/`cap-end`. Guessing `y-min` — the box role — yields `undefined`,
     * which the opening then stores as a broken host ref. Measured: the wall goes `broken-ref`, the
     * plan draws 0 curves, and BOTH elements are reported in `unprojected[]` rather than the drawing
     * coming back plausibly short. That is rule 4 / D75 doing its job, and it is why this test asserts
     * `unprojected` is empty at the end.
     *
     * ⚠⚠ AND IT IS `lateral.1`, NOT `lateral.0` — WHICH IS THE SAME LESSON A SECOND TIME. `lateral.0`
     * IS a real face and the opening hosts on it happily; the void then cuts a face the plan never
     * meets, so the wall's volume comes back EXACTLY uncut (1,920,000,000 mm³ — measured) and the
     * drawing is unchanged while everything reports success. `tests/opening-join-drift.test.ts` uses
     * `lateral.1` for the same wall, which is the a-side long face. **A plausible face is not the
     * right face, and nothing fails when you pick the wrong one.** */
    const structure = doc.partsOf(wallId)!.find((p) => p.name === 'wall')!;
    const hostFace = structure.refs.find((r) => r.includes('/face/lateral.1'))!;
    await doc.execute('core.createElement', {
      typeId: 'core.opening',
      hostId: wallId,
      hostRef: hostFace,
      params: { width: 1200, height: 1400, offsetU: 1200, offsetV: 0 },
    });

    const holed = await doc.projectView(descriptor);
    const holedWallCurves = holed.curves.filter((c) => c.elementId === wallId);

    /* ⚠⚠ THE COUNT IS PINNED AT 8, AND `toBeGreaterThan` WAS A WEAK GREEN THAT REVERT-VERIFICATION
     * CAUGHT. The design's own §1.1 table measured this exact case natively — *"wall WITH A WINDOW, cut
     * THROUGH the opening: 8 cut edges, 8 with exactly one owner, 0 orphans"* — and the kernel here
     * returns 8 of 8 attributed. But attribution happens in `projectView`, and with the WRONG key it
     * drops curves SILENTLY: keyed by `ref.nodeId` instead of the ref token, this same fixture yields
     * **6 wall curves and 10 total instead of 8 and 20** — half the drawing gone, no error raised, and
     * `6 > 4` still passes. A drawing that is quietly half-missing is the one failure mode this whole
     * file exists to refuse, so the assertion has to be the NUMBER, not a direction. */
    expect(solidCount).toBe(4);
    expect(holedWallCurves).toHaveLength(8);

    // ⚠⚠ AND THE REF OWNERSHIP IS THE REAL ASSERTION (the named false-pass). Every curve still
    // resolves to a face of a LIVE part of this wall — including the reveals the boolean created,
    // which carry the cut node's identity rather than the wall primitive's.
    const parts = doc.partsOf(wallId)!;
    const live = new Set(parts.flatMap((p) => p.refs));
    for (const { curve } of holedWallCurves) {
      expect(curve.ref).toBeDefined();
      const encoded = `${curve.ref!.nodeId}/${curve.ref!.kind}/${curve.ref!.role}#${String(curve.ref!.occurrence)}`;
      expect(live.has(encoded), `${encoded} is not a live ref of this wall`).toBe(true);
    }
    expect(holed.unprojected).toEqual([]);
  }, 180000);

  /* ============================================================================================
   * §7 — THE VERBS REFUSE
   *
   * ⚠ §5's named false-pass: "testing the ARGS and not the MERGED DESCRIPTOR." The last case below is
   * exactly that — each half legal, the merge degenerate.
   * ========================================================================================= */

  it('⚠⚠ the verbs refuse every §4.3 malformation — including the one only the MERGED descriptor shows', async () => {
    const doc = newDoc();
    const levelId = await makeLevel(doc);
    await doc.execute('core.createContainer', { id: 'BLK-A', kind: 'building', name: 'Block A' });
    const buildingId = 'BLK-A';

    const refused = async (args: Params): Promise<string> => {
      try {
        await doc.execute('core.createView', args);
      } catch (error) {
        // ⚠ THE REASON IS IN `details`, NOT THE SUMMARY. A refusal names EVERY problem at once
        // (`checkViewDescriptor` builds one failure over all issues), so asserting the summary would
        // pass for any refusal at all — including the wrong one.
        const failure = error as { message?: string; details?: readonly string[] };
        return [failure.message ?? String(error), ...(failure.details ?? [])].join(' | ');
      }
      throw new Error(`expected a refusal for ${JSON.stringify(args)}`);
    };

    const base = { kind: 'plan', name: 'P', scale: 100, levelId };

    // A plan whose levelId names nothing.
    expect(await refused({ ...base, levelId: 'nope' })).toMatch(/names no container/);
    // ⚠ A plan cut at a BUILDING is not a plan — the container EXISTS, so a bare existence check passes.
    expect(await refused({ ...base, levelId: buildingId })).toMatch(/not a level/);
    // A blank name — a plausible empty artifact in the sheet list.
    expect(await refused({ ...base, name: '   ' })).toMatch(/needs a name/);
    // A scale of zero divides annotation sizing.
    expect(await refused({ ...base, scale: 0 })).toMatch(/greater than 0/);
    // A section with the ZERO NORMAL — a degenerate plane whose drawing looks like "nothing is here".
    expect(
      await refused({
        kind: 'section',
        name: 'S',
        scale: 100,
        origin: [0, 0, 0],
        normal: [0, 0, 0],
      }),
    ).toMatch(/non-zero normal/);
    // An empty clip on one axis — an empty drawing again, silently.
    expect(
      await refused({
        ...base,
        clip: [
          [1000, 0, 0],
          [0, 1000, 1000],
        ],
      }),
    ).toMatch(/clip is empty on axis x/);
    // An unknown design option is NOT_FOUND, never silently dropped (Entry 68's rule).
    expect(await refused({ ...base, designOptionIds: ['ghost'] })).toMatch(
      /names no design option/,
    );

    /* ⚠⚠ THE MERGED-DESCRIPTOR CASE, WHICH IS THE ONE §5 SINGLES OUT. Create a legal PLAN, then
     * `updateView` it to `kind:'section'` mentioning NO normal. Each half is legal on its own — the
     * stored descriptor is a valid plan, and "change the kind" is a valid edit — and the RESULT is a
     * section with no cut direction. A validator that read the ARGS would see nothing wrong. */
    const planId = (await doc.execute('core.createView', base)).changes[0]!.id;
    let mergedFailure = '';
    try {
      await doc.execute('core.updateView', { id: planId, kind: 'section' });
      throw new Error('expected the merged descriptor to be refused');
    } catch (error) {
      const failure = error as { message?: string; details?: readonly string[] };
      mergedFailure = [failure.message ?? '', ...(failure.details ?? [])].join(' | ');
    }
    expect(mergedFailure).toMatch(/non-zero normal/);

    // And the stored view is untouched by the refusal — reject + keep last-good (rule 4).
    expect(doc.scene.views![planId]!.kind).toBe('plan');
  }, 180000);

  /* ============================================================================================
   * §8 — THE PROMOTION IS ADDITIVE
   *
   * ⚠ §5's named false-pass: "modifying them — the move Entry 68 correctly refused." So this asserts
   * the SHAPE of the promotion directly: a document with no views carries no `views` key at all.
   * ========================================================================================= */

  it('⚠⚠ the `views` promotion is ADDITIVE — a document with no views has no `views` key, and one materialises on first authoring', async () => {
    const doc = newDoc();

    // ⚠ NO `emptyScene()` ENTRY. Entry 68 predicted one for `schedules` and MEASURED that it was
    // wrong: it turned two green Entry-47 reservation assertions red. A document with no views is
    // byte-identical to one written before this entry existed, and all four documentation
    // collections keep ONE rule — absent ⇒ none of it.
    expect(doc.scene.views).toBeUndefined();

    const levelId = await makeLevel(doc);
    await planOn(doc, levelId);

    // It materialises on FIRST AUTHORING (`applyOne` creates it) — the schedules precedent verbatim.
    expect(Object.keys(doc.scene.views!)).toHaveLength(1);

    // And it is a real undoable `SceneChange`, which is what "first-class collection" buys.
    await doc.undo();
    expect(Object.keys(doc.scene.views ?? {})).toHaveLength(0);
  }, 180000);

  /* ============================================================================================
   * §9 — THE PRE-FILTER, WHICH §8's ALGORITHM REQUIRES AND §5's TABLE FORGOT TO ASK FOR
   *
   * ⚠⚠ THIS SECTION EXISTS BECAUSE THE UNIT SHIPPED `straddlesPlane`/`withinClip`/`levelScope` —
   * fully written, exported, commented at length — AND `projectView` CALLS NONE OF THEM. §5's table
   * has eight rows and not one of them is the pre-filter, so eight green tests said nothing about it.
   * That is REVIEW.md item 4 in its purest form: the criterion list, not the code, was the thing that
   * was incomplete, and a test plan can only ever be as good as the row it does not have.
   *
   * The clip is not a nicety. `cutPlaneFor` places an ELEVATION's plane at the world origin and
   * `view.ts` says in writing that "the clip is what bounds it" — so for an elevation the clip is the
   * ONLY bound that exists.
   * ========================================================================================= */

  it('⚠⚠ a view HONOURS its `clip` — the descriptor stores one, and a wall outside it is not drawn', async () => {
    const doc = newDoc();
    const levelId = await makeLevel(doc);
    const nearId = await makeWall(doc, [0, 0], [4000, 0], { containerId: levelId });
    // 50 m away on +Y. Same level, same cut height, so the plane cuts it exactly as it cuts `near`.
    const farId = await makeWall(doc, [0, 50000], [4000, 50000], { containerId: levelId });

    // Both are drawn with no clip — the control, so a green below cannot come from `far` being
    // un-cuttable for some unrelated reason. This is the measurement the assertion is built on.
    const unclipped = await doc.projectView(await planOn(doc, levelId));
    const drawnUnclipped = new Set(unclipped.curves.map((c) => c.elementId));
    expect(drawnUnclipped.has(nearId)).toBe(true);
    expect(drawnUnclipped.has(farId)).toBe(true);

    // Now a clip that encloses `near` and excludes `far` by 40 m.
    const clippedId = (
      await doc.execute('core.createView', {
        kind: 'plan',
        name: 'Clipped Plan',
        scale: 100,
        levelId,
        cutHeight: CUT,
        clip: [
          [-1000, -1000, -1000],
          [5000, 10000, 5000],
        ],
      })
    ).changes[0]!.id;
    const clipped = await doc.projectView(doc.scene.views![clippedId]!);
    const drawn = new Set(clipped.curves.map((c) => c.elementId));

    // ⚠ THE NUMBER, NOT A DIRECTION — Entry 77's own lesson about weak greens, applied to the test
    // that catches Entry 77. `drawn.size > 0` would be green on the broken code, and so would
    // `drawn.has(nearId)`: the defect ADDS curves, so every "something is there" assertion survives it.
    expect(drawn.has(nearId)).toBe(true);
    expect(drawn.has(farId)).toBe(false);

    // And the element outside the clip is not "unprojected" either — it was never a candidate.
    // Excluding it is not a failure to draw it, and reporting it as one would be its own defect.
    expect(clipped.unprojected).toEqual([]);
  }, 180000);

  /* ============================================================================================
   * §10 — `closed` IS FALSE ON A CUT CURVE, AND THE FROZEN COMMENT USED TO SAY OTHERWISE
   *
   * ⚠ Entry 77 measured this and left the comment standing, believing a correction was a second
   * contract edit. It is not: `scripts/frozen-surface.mjs` strips comments before hashing and says so
   * in its own header. So the fix was free, and the only thing that had ever been missing was a test —
   * which is what turns a measurement somebody wrote down into one the build keeps re-checking.
   * ========================================================================================= */

  it('⚠⚠ every cut curve reports `closed=false` — the section returns EDGES, not the loop they form', async () => {
    const doc = newDoc();
    const levelId = await makeLevel(doc);
    await makeWall(doc, [0, 0], [4000, 0], { containerId: levelId });

    const result = await doc.projectView(await planOn(doc, levelId));

    // ⚠ THE NUMBER, NOT A DIRECTION. `some(c => !c.closed)` would be green if ONE of four were open,
    // which is exactly the state a half-fixed implementation would leave behind.
    expect(result.curves).toHaveLength(4);
    expect(result.curves.every((c) => c.curve.kind === 'cut')).toBe(true);
    expect(result.curves.filter((c) => c.curve.closed)).toHaveLength(0);
  }, 180000);
});

/**
 * The larger side of the drawing's own 2D bounding box, in mm.
 *
 * ⚠ IT MEASURES BOTH AXES ON PURPOSE. The plan's `xAxis` is DERIVED (`xAxisFor`), and for a Z-normal
 * plane it lands on -Y — so the drawing's "u" is a wall's THICKNESS and its "v" is the length. A test
 * that measured u alone would compare 100 against 100 and report a live drawing as dead.
 */
function drawingSpan(polylines: readonly (readonly number[])[]): number {
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const points of polylines) {
    for (let i = 0; i + 1 < points.length; i += 2) {
      minU = Math.min(minU, points[i]!);
      maxU = Math.max(maxU, points[i]!);
      minV = Math.min(minV, points[i + 1]!);
      maxV = Math.max(maxV, points[i + 1]!);
    }
  }
  return Math.max(maxU - minU, maxV - minV);
}
