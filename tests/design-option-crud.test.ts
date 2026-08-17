/**
 * THE DESIGN-OPTION CRUD (D85/Q17a — `P5_step6D_design_options_crud_design.md` §4/§5).
 *
 * ⚠⚠ WHAT THIS FILE CLOSES, MEASURED (design doc §1.4): two identical 6000×200×3000 walls, one tagged
 * with a `designOptionId` naming NOTHING — because before this unit, **0 of 40 commands could author a
 * design option**, so no tag could ever resolve. `modelElements()` returned 1 of 2, the roll-up
 * 3 600 000 000 mm³ where 7 200 000 000 is correct, wearing `basis: 'exact'`, with `brokenRefs()` and
 * `unbuildable()` both empty. §6 reproduces that baseline (still real for an id nothing minted, since
 * `core.createElement` deliberately does not check — Q17b) and then closes it for an id the CRUD
 * actually minted.
 *
 * ⚠ `unresolvedDesignOptions`/the schedule-vs-view "two doors, two throws" split are already covered by
 * `tests/design-option-refs.test.ts`; this file is the CRUD that makes an id resolvable at all.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  CommandFailure,
  DocumentContext,
  createRegistries,
  dependents,
  emptyScene,
  resolveJoins,
} from '@bunyan/document';
import type { Scene, SceneChange } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const T = 200;
const H = 3000;
const WALL_VOLUME = 6000 * T * H;
/**
 * ⚠ Pin the CODE, not just the class — `REFUSED` vs `NOT_FOUND` is agent-visible surface that must not
 * move, and `design-option-refs.test.ts` already holds the two doors apart by exactly this field.
 */
const refuses = async (call: Promise<unknown>, code: CommandFailure['code']): Promise<void> => {
  const error: unknown = await call.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(CommandFailure);
  expect((error as CommandFailure).code).toBe(code);
};

describe('D85/Q17a — the design-option CRUD: `scene.designOptions` becomes a first-class collection', () => {
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
    registries.types.register(wallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({
      registries,
      geometry: client,
      ...(scene === undefined ? {} : { scene }),
    });
  };

  const makeWall = async (
    doc: DocumentContext,
    y: number,
    designOptionId?: string,
  ): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        params: { start: [0, y], end: [6000, y], thickness: T, height: H },
        ...(designOptionId === undefined ? {} : { designOptionId }),
      })
    ).changes[0]!.id;

  /** A wall on an arbitrary baseline — what a JOIN case needs and `makeWall`'s parallel rows cannot give. */
  const makeWallAt = async (
    doc: DocumentContext,
    start: readonly [number, number],
    end: readonly [number, number],
    designOptionId?: string,
  ): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        params: { start, end, thickness: T, height: H },
        ...(designOptionId === undefined ? {} : { designOptionId }),
      })
    ).changes[0]!.id;

  /** The element's LIVE built solid, measured in the kernel — the B-Rep, not the recipe's opinion of it. */
  const boundsOf = async (
    doc: DocumentContext,
    id: string,
  ): Promise<{ min: readonly number[]; max: readonly number[] }> =>
    (await client.request('bounds', { handle: doc.partsOf(id)![0]!.handle })).bounds;

  const createOption = async (
    doc: DocumentContext,
    extra: Record<string, unknown> = {},
  ): Promise<string> =>
    (await doc.execute('core.createDesignOption', { setName: 'Facade', name: 'A', ...extra }))
      .changes[0]!.id;

  /* ============================================================================================
   * §1 — 0 OF 40 GAP CLOSES, AND THE COLLECTION MATERIALISES ON FIRST AUTHORING.
   * ========================================================================================= */

  it('⚠⚠ the verbs exist, author through the one door, and close 0-of-40 (design doc §1.1)', async () => {
    const doc = newDoc();
    const verbs = doc.registries.commands.list().filter((c) => /DesignOption/.test(c.id));
    expect(verbs.map((c) => c.id).sort()).toEqual([
      'core.createDesignOption',
      'core.deleteDesignOption',
      'core.updateDesignOption',
    ]);

    // ⚠ NO `designOptions` KEY YET — the schedules/views precedent verbatim.
    expect(doc.scene.designOptions).toBeUndefined();

    const id = await createOption(doc, { name: 'Option A' });
    // ⚠ MINTED (D44) — a prefixed ULID, never caller-supplied.
    expect(id.startsWith('option-')).toBe(true);

    // Materialises on first authoring — the collection appears now, not before.
    expect(Object.keys(doc.scene.designOptions!)).toEqual([id]);
    // The FIRST option in a brand-new set defaults to primary — there is no other valid single state.
    expect(doc.scene.designOptions![id]!.isPrimary).toBe(true);
  }, 120000);

  it('⚠⚠ the first create into a scene that PREDATES the collection succeeds (no raw TypeError)', async () => {
    const legacy: Scene = { ...emptyScene() };
    delete (legacy as { designOptions?: unknown }).designOptions;
    expect(legacy.designOptions).toBeUndefined();

    const doc = newDoc(legacy);
    const id = await createOption(doc);
    expect(doc.scene.designOptions?.[id]?.name).toBe('A');
  }, 120000);

  it('⚠⚠ a document that never authors an option is BYTE-IDENTICAL to one before this unit existed', async () => {
    // ⚠ The claim is about a document that NEVER calls the verb, not about create-then-undo: undo
    // restores the collection to EMPTY (`{}`), never back to absent — the `views`/`schedules` precedent
    // verbatim (`applyOne`'s `?? {}` always writes the key back, `plan-section.test.ts` §8 asserts the
    // same shape). Empty and absent are equivalent to every reader (`?? {}`/`Object.values`), so this is
    // not a regression — it is the promotion's own terms.
    const doc = newDoc();
    expect(JSON.stringify(doc.scene)).toBe(JSON.stringify(emptyScene()));

    const id = await createOption(doc);
    expect(doc.scene.designOptions?.[id]).toBeDefined();

    await doc.undo();
    expect(Object.keys(doc.scene.designOptions ?? {})).toHaveLength(0);
  }, 120000);

  /* ============================================================================================
   * §2 — UNDO/REDO, EACH VERB (criterion 3 — assert the journal, not just the scene).
   * ========================================================================================= */

  it('⚠⚠ create → undo → redo, and each verb mints its own UndoableEdit', async () => {
    const doc = newDoc();
    const createEdit = await doc.execute('core.createDesignOption', {
      setName: 'Facade',
      name: 'A',
    });
    const id = createEdit.changes[0]!.id;
    expect(createEdit.changes).toEqual([
      { collection: 'designOptions', id, after: expect.objectContaining({ name: 'A' }) },
    ]);

    const updateEdit = await doc.execute('core.updateDesignOption', { id, name: 'Renamed' });
    expect(updateEdit.changes.some((c) => c.collection === 'designOptions' && c.id === id)).toBe(
      true,
    );
    expect(doc.scene.designOptions![id]!.name).toBe('Renamed');
    await doc.undo();
    expect(doc.scene.designOptions![id]!.name).toBe('A');
    await doc.redo();
    expect(doc.scene.designOptions![id]!.name).toBe('Renamed');

    const deleteEdit = await doc.execute('core.deleteDesignOption', { id });
    expect(deleteEdit.changes.some((c) => c.collection === 'designOptions' && c.id === id)).toBe(
      true,
    );
    expect(doc.scene.designOptions?.[id]).toBeUndefined();
    await doc.undo();
    expect(doc.scene.designOptions?.[id]?.name).toBe('Renamed');
  }, 120000);

  /* ============================================================================================
   * §3 — THE PRIMARY INVARIANT: REFUSED in both directions, never papered over (criterion 4).
   * ========================================================================================= */

  it('⚠⚠ two explicit primaries in one set is REFUSED', async () => {
    const doc = newDoc();
    await createOption(doc, { name: 'A', isPrimary: true });
    await refuses(
      doc.execute('core.createDesignOption', { setName: 'Facade', name: 'B', isPrimary: true }),
      'REFUSED',
    );

    // ⚠ And joining WITHOUT claiming primary is fine — the set still has exactly one.
    const b = (await doc.execute('core.createDesignOption', { setName: 'Facade', name: 'B' }))
      .changes[0]!.id;
    expect(doc.scene.designOptions![b]!.isPrimary).toBe(false);
  }, 120000);

  it('⚠⚠ demoting the sole primary with nothing promoted is REFUSED — zero primaries', async () => {
    const doc = newDoc();
    const a = await createOption(doc);
    expect(doc.scene.designOptions![a]!.isPrimary).toBe(true);

    await refuses(doc.execute('core.updateDesignOption', { id: a, isPrimary: false }), 'REFUSED');
    expect(doc.scene.designOptions![a]!.isPrimary).toBe(true); // refused, unchanged
  }, 120000);

  it('⚠⚠ deleting the sole primary while a sibling remains is REFUSED — promote first, then delete', async () => {
    const doc = newDoc();
    const a = await createOption(doc, { name: 'A' });
    const b = (await doc.execute('core.createDesignOption', { setName: 'Facade', name: 'B' }))
      .changes[0]!.id;

    await refuses(doc.execute('core.deleteDesignOption', { id: a }), 'REFUSED');

    // ⚠⚠ Promoting B atomically demotes A, in ONE edit — the swap that would otherwise deadlock: demote
    // A first and the set has zero primaries (refused); promote B first and it has two (refused too).
    await doc.execute('core.updateDesignOption', { id: b, isPrimary: true });
    expect(doc.scene.designOptions![a]!.isPrimary).toBe(false);
    expect(doc.scene.designOptions![b]!.isPrimary).toBe(true);

    // Now A can go — it is no longer the set's only primary.
    await doc.execute('core.deleteDesignOption', { id: a });
    expect(doc.scene.designOptions?.[a]).toBeUndefined();

    // Deleting the LAST option in a set needs no primary at all.
    await doc.execute('core.deleteDesignOption', { id: b });
    expect(doc.scene.designOptions?.[b]).toBeUndefined();
  }, 120000);

  /* ============================================================================================
   * §4 — DELETE: THE D51 GUARD, ALL THREE REFERRER CLASSES (§4.2 item 2 — every rung is REAL here).
   * ========================================================================================= */

  it('⚠⚠ deleting an option an ELEMENT is tagged with is REFUSED; retargetMap redirects the tag', async () => {
    const doc = newDoc();
    const a = await createOption(doc, { name: 'A' });
    const b = (await doc.execute('core.createDesignOption', { setName: 'Facade', name: 'B' }))
      .changes[0]!.id;
    const wall = await makeWall(doc, 0, b);

    await refuses(doc.execute('core.deleteDesignOption', { id: b }), 'REFUSED');
    await doc.execute('core.deleteDesignOption', { id: b, retargetMap: { [b]: a } });
    expect(doc.scene.elements[wall]!.designOptionId).toBe(a);
    expect(doc.scene.designOptions?.[b]).toBeUndefined();
  }, 120000);

  it('⚠⚠ deleting an option a VIEW or SCHEDULE shows is REFUSED; acknowledge:true lets it dangle', async () => {
    const doc = newDoc();
    const a = await createOption(doc, { name: 'A' });
    const b = (await doc.execute('core.createDesignOption', { setName: 'Facade', name: 'B' }))
      .changes[0]!.id;
    const view = (
      await doc.execute('core.createView', {
        kind: '3d',
        name: 'V',
        scale: 100,
        designOptionIds: [b],
      })
    ).changes[0]!.id;
    const schedule = (
      await doc.execute('core.createSchedule', {
        name: 'S',
        columns: [{ source: 'count' }],
        designOptionIds: [b],
      })
    ).changes[0]!.id;

    await refuses(doc.execute('core.deleteDesignOption', { id: b }), 'REFUSED');
    // ⚠ acknowledge:true lets both dangle — proving the refusal above named real referrers, not a phantom.
    // ⚠ The referrers are read BACK: without that, this case would pass just as well if `acknowledge`
    // silently cleaned them up, which is the opposite of what it means (REVIEW.md item 6).
    const acked = newDoc(doc.scene);
    await acked.execute('core.deleteDesignOption', { id: b, acknowledge: true });
    expect(acked.scene.designOptions?.[b]).toBeUndefined();
    expect(acked.scene.views?.[view]?.designOptionIds).toEqual([b]);
    expect(acked.scene.schedules?.[schedule]?.designOptionIds).toEqual([b]);

    await doc.execute('core.deleteDesignOption', { id: b, retargetMap: { [b]: a } });
    expect(doc.scene.views?.[view]?.designOptionIds).toEqual([a]);
    expect(doc.scene.schedules?.[schedule]?.designOptionIds).toEqual([a]);
  }, 120000);

  /* ============================================================================================
   * §5 — THE DEPENDENCY EDGE (§4.3): re-stages tagged elements AND their host/parent descendants,
   * and NOTHING unrelated (criterion 7 — assert WHICH, not just "something").
   * ========================================================================================= */

  it('⚠⚠ editing a design option re-stages tagged elements and their hosted descendants, and no others', async () => {
    const doc = newDoc();
    const a = await createOption(doc, { name: 'A' });
    const tagged = await makeWall(doc, 0, a);
    const untagged = await makeWall(doc, 5000);
    const opening = (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        params: { start: [0, 0], end: [1000, 0], thickness: 100, height: 1000 },
        hostId: tagged,
      })
    ).changes[0]!.id;

    const change: SceneChange = {
      collection: 'designOptions',
      id: a,
      before: doc.scene.designOptions![a],
      after: { ...doc.scene.designOptions![a]!, isPrimary: true },
    };
    const staged = dependents(doc.scene, change);
    expect(new Set(staged)).toEqual(new Set([tagged, opening]));
    expect(staged).not.toContain(untagged);
  }, 120000);

  /**
   * ⚠⚠ THE JOIN NEIGHBOUR, MEASURED THROUGH THE SHIPPED VERBS. The §5 case above cannot see this: its
   * negative control is parallel and 5000 mm away, so it can never be a join partner and proves nothing
   * about a wall that IS one. `partnersAt` filters by `isElementActive`, so demoting an option removes a
   * MAIN-MODEL wall's only partner and its miter with it — `resolveJoins` says so before and after, and
   * the wall must be in `edit.rebuilt` or it keeps a solid mitered against a wall nobody builds.
   */
  it('⚠⚠ promoting the other option re-stages the MAIN-MODEL wall whose miter it silently changes', async () => {
    const doc = newDoc();
    const a = await createOption(doc, { name: 'A' });
    const b = await createOption(doc, { name: 'B' });
    const main = await makeWallAt(doc, [0, 0], [6000, 0]);
    await makeWallAt(doc, [6000, 0], [6000, 4000], a);

    // Ground truth, both directions: A is primary, so the option wall is active and `main` miters to it.
    expect(resolveJoins(doc.scene, main).map((j) => j.end)).toEqual(['end']);
    const before = await boundsOf(doc, main);
    const edit = await doc.execute('core.updateDesignOption', { id: b, isPrimary: true });
    expect(resolveJoins(doc.scene, main)).toEqual([]);

    // `main`'s geometry just changed and nothing it owns was edited — the invalidator is the only thing
    // that can know. `rebuilt` is the cascade that ACTUALLY happened (`#affected`), not the command's
    // declaration, so this is the staged set.
    expect(edit.rebuilt).toContain(main);

    // ⚠⚠ AND THE B-REP ITSELF, because "re-staged" is not the criterion — "not stale" is. Volume and area
    // cannot see this: a 45° miter between two equal-thickness walls adds on one lateral face exactly what
    // it removes on the other, so both are byte-identical before and after (measured). The SHAPE is what
    // moves, and the bound says so — the mitered solid runs 100 mm (half a thickness) past its baseline
    // end, the plain-capped one stops on it.
    expect(await boundsOf(doc, main)).toEqual({ min: [0, -100, 0], max: [6000, 100, 3000] });
    expect(before).toEqual({ min: [0, -100, 0], max: [6100, 100, 3000] });
  }, 120000);

  /**
   * ⚠⚠ UNDO OF A DELETE IS THE ONE DIRECTION WHERE PRE- AND POST-EDIT SCENES DISAGREE. `#affected` reads
   * the pre-change scene, which on an undo is the POST-delete one: the option is already out of the
   * catalogue, so a seed resolved as `setName → optionIds → elements` finds nothing and the elements that
   * go active again are re-staged by nothing.
   */
  it('⚠⚠ undoing the delete of a set’s only option re-stages the elements that go active again', async () => {
    const doc = newDoc();
    const a = await createOption(doc, { name: 'A' });
    const tagged = await makeWall(doc, 0, a);
    // `acknowledge` lets the tag dangle: the element goes inactive, so its geometry is dropped.
    await doc.execute('core.deleteDesignOption', { id: a, acknowledge: true });
    expect(doc.modelElements().map((e) => e.id)).not.toContain(tagged);

    const change: SceneChange = {
      collection: 'designOptions',
      id: a,
      before: { id: a, setName: 'Facade', name: 'A', isPrimary: true },
    };
    expect(dependents(doc.scene, change)).toContain(tagged);

    await doc.undo();
    expect(doc.modelElements().map((e) => e.id)).toContain(tagged);
    expect(doc.partsOf(tagged)).toBeDefined();
  }, 120000);

  it('authoring a design option re-stages NOTHING when no element is tagged into its set yet', async () => {
    const doc = newDoc();
    await makeWall(doc, 0);
    const edit = await doc.execute('core.createDesignOption', { setName: 'Facade', name: 'A' });
    expect(edit.rebuilt).toEqual([]);
  }, 120000);

  /* ============================================================================================
   * §6 — THE MEASURED DEFECT (design doc §1.4), REPRODUCED AND CLOSED.
   * ========================================================================================= */

  it('⚠⚠ RED: a tag naming no option is excluded — 1 of 2 walls, 50% under-report (unchanged baseline)', async () => {
    const doc = newDoc();
    await makeWall(doc, 0);
    await makeWall(doc, 5000, 'ghost'); // no verb ever minted this id — a broken reference (D86)

    expect(doc.modelElements()).toHaveLength(1);
    const result = await doc.evaluateSchedule({
      id: 'ad-hoc',
      name: 'x',
      filter: {},
      columns: [{ source: 'quantity', key: 'volume' }],
    });
    expect(result.rows).toHaveLength(1);
    expect(result.totals.get('quantity:volume')?.value).toBeCloseTo(WALL_VOLUME, 0);
    expect(result.basis).toBe('exact');

    // ⚠ AND STILL SILENT AT THE PROJECTION — this is D86's own boundary, not something this unit moves.
    expect(doc.unbuildable()).toEqual([]);
    // The dangling tag IS reported, by D86 — this half is what makes the silence above survivable.
    expect(doc.brokenRefs()).toHaveLength(1);
  }, 120000);

  it('⚠⚠ GREEN: the SAME two walls, tagged with an id the CRUD actually minted, both count', async () => {
    const doc = newDoc();
    await makeWall(doc, 0);
    // Sole option in a brand-new set ⇒ primary by default ⇒ active with no selection passed at all —
    // the ordinary path an agent reaches for, no `active` override required.
    const optionId = await createOption(doc, { name: 'Option B' });
    await makeWall(doc, 5000, optionId);

    expect(doc.modelElements()).toHaveLength(2);
    expect(doc.brokenRefs()).toEqual([]);
    expect(doc.unbuildable()).toEqual([]);

    const result = await doc.evaluateSchedule({
      id: 'ad-hoc',
      name: 'x',
      filter: {},
      columns: [{ source: 'quantity', key: 'volume' }],
    });
    expect(result.rows).toHaveLength(2);
    expect(result.totals.get('quantity:volume')?.value).toBeCloseTo(2 * WALL_VOLUME, 0);
    expect(result.basis).toBe('exact');
    expect(result.unmeasured).toEqual([]);
  }, 120000);
});
