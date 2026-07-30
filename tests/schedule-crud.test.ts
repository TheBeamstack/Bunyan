/**
 * THE SCHEDULE CRUD (Entry 68 — D58 row Ⓐ's second unit, owner Q4's deliberate separation).
 *
 * ⚠⚠ WHAT THIS FILE IS REALLY GUARDING, IN ONE SENTENCE: **the reserved shape had a reader and no
 * writer.** Entry 65 shipped the evaluator (`ScheduleDefinition` → rows) and `scene.schedules` still had
 * no authoring verb, so v1.0.0's "one schedule" (D58) could be evaluated but never created, renamed or
 * deleted. Measured on this codebase before the verbs existed:
 *
 *   commands able to author a schedule                    0 of 29 (0 documentation verbs of any kind)
 *   the FIRST change to an absent collection              raw `TypeError: Cannot convert undefined or
 *                                                         null to object` out of the undo machinery
 *   groupBy naming a column the schedule lacks            2 groups → 1, key `[""]`; every subtotal
 *                                                         becomes the grand total
 *   a `quantity` key outside the frozen grammar           every cell NaN, the TOTAL NaN — and NaN
 *                                                         JSON-stringifies to `null`, i.e. "no value"
 *   an unknown column `source`                            a raw TypeError out of the evaluator
 *   two columns sharing one key                           2 headers, ONE total — the second merges away
 *   deleting a schedule a SHEET places                    1 dangling viewport, `brokenRefs: []`
 *
 * ⚠⚠ AND THE SHAPE OF THE ANSWER: **the verbs carry the refusal the body deliberately will not.**
 * `projectSchedule` degrades rather than refuses, because a projection must never deny a builder his
 * table (rule 17) — so the authoring door is the only place a malformed definition can be stopped, and
 * there was no authoring door. Every REFUSED test below is that argument, executable.
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
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import type { Scene, SceneChange, ScheduleDefinition, Sheet } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const T = 200;
const H = 2400;

const COLUMNS = [
  { source: 'field', key: 'mark', heading: 'Mark' },
  { source: 'quantity', key: 'volume' },
] as const;

describe('D58 row Ⓐ — the schedule CRUD: `scene.schedules` becomes a first-class collection', () => {
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

  const makeWall = async (doc: DocumentContext, y: number, mark?: string): Promise<string> => {
    const id = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, y], end: [4000, y], thickness: T, height: H },
      })
    ).changes[0]!.id;
    if (mark !== undefined) await doc.execute('core.setElementMetadata', { elementId: id, mark });
    return id;
  };

  const createSchedule = async (
    doc: DocumentContext,
    extra: Record<string, unknown> = {},
  ): Promise<string> =>
    (
      await doc.execute('core.createSchedule', {
        name: 'Wall Schedule',
        filter: { typeId: 'core.wall' },
        columns: COLUMNS,
        ...extra,
      })
    ).changes[0]!.id;

  /* ============================================================================================
   * §1 — THE VERB EXISTS, AND IT AUTHORS THROUGH THE ONE DOOR (D19 / domain rule 9).
   * ========================================================================================= */

  it('⚠⚠ a schedule is CREATED through the command layer, stored in the scene, and EVALUATES', async () => {
    const doc = newDoc();
    await makeWall(doc, 0, 'W-01');
    await makeWall(doc, 3000, 'W-02');

    // The gap this entry closes: before it, this list was empty.
    const verbs = doc.registries.commands.list().filter((c) => /Schedule/.test(c.id));
    expect(verbs.map((c) => c.id).sort()).toEqual([
      'core.createSchedule',
      'core.deleteSchedule',
      'core.updateSchedule',
    ]);

    const id = await createSchedule(doc);
    // ⚠ MINTED, never caller-supplied (D44) — a prefixed ULID, and no counter anywhere.
    expect(id.startsWith('schedule-')).toBe(true);

    const stored = doc.scene.schedules?.[id];
    expect(stored).toBeDefined();
    expect(stored!.name).toBe('Wall Schedule');

    // ⚠⚠ THE POINT OF THE WHOLE UNIT: the STORED definition is what the body evaluates. Round-tripping
    // it through the scene must not change a single answer.
    const result = await doc.evaluateSchedule(stored!);
    expect(result.rows).toHaveLength(2);
    expect(
      result.rows.map((r) => r.cells.find((c) => c.columnKey === 'field:mark')?.value),
    ).toEqual(['W-01', 'W-02']);
    expect(result.totals.get('quantity:volume')?.value).toBeCloseTo(2 * 4000 * T * H, 0);
  }, 120000);

  it('authoring a schedule REBUILDS NOTHING — the arrow points one way (rule 17)', async () => {
    const doc = newDoc();
    await makeWall(doc, 0);
    const edit = await doc.execute('core.createSchedule', {
      name: 'S',
      columns: [{ source: 'count' }],
    });
    expect(edit.rebuilt).toEqual([]);

    // And the declared dependency edge says so directly: a schedules change seeds no rebuild, ever.
    const change: SceneChange = {
      collection: 'schedules',
      id: edit.changes[0]!.id,
      after: doc.scene.schedules?.[edit.changes[0]!.id],
    };
    expect(dependents(doc.scene, change)).toEqual([]);
  }, 120000);

  /* ============================================================================================
   * §2 — THE PROMOTION: `schedules` IS A `SceneCollection`, SO IT UNDOES LIKE ANY OTHER.
   * ========================================================================================= */

  it('⚠⚠ create → undo → redo: the schedule leaves and comes back (the promotion, end to end)', async () => {
    const doc = newDoc();
    const id = await createSchedule(doc);
    expect(Object.keys(doc.scene.schedules ?? {})).toEqual([id]);

    await doc.undo();
    expect(doc.scene.schedules?.[id]).toBeUndefined();

    await doc.redo();
    expect(doc.scene.schedules?.[id]?.name).toBe('Wall Schedule');

    // A rename undoes to the OLD NAME, not to nothing — the delta carries both sides (D40/spec §6.1).
    await doc.execute('core.updateSchedule', { id, name: 'Renamed' });
    expect(doc.scene.schedules?.[id]?.name).toBe('Renamed');
    await doc.undo();
    expect(doc.scene.schedules?.[id]?.name).toBe('Wall Schedule');
  }, 120000);

  it('⚠⚠ the FIRST create into a scene that PREDATES the collection succeeds (no raw TypeError)', async () => {
    // A `.bnn` written before this entry — and every hand-assembled `Scene` — simply has no `schedules`
    // key. Measured before the fix: `Object.entries(undefined)` threw out of the undo machinery, i.e. an
    // untyped crash where domain rule 4 promises a typed refusal or a clean edit.
    const legacy: Scene = { ...emptyScene() };
    delete (legacy as { schedules?: unknown }).schedules;
    expect(legacy.schedules).toBeUndefined();

    const doc = newDoc(legacy);
    const id = await createSchedule(doc);
    expect(doc.scene.schedules?.[id]?.name).toBe('Wall Schedule');
  }, 120000);

  /* ============================================================================================
   * §3 — THE REFUSALS. Each is a defect that was reachable and SILENT before this door existed.
   * ========================================================================================= */

  it('⚠⚠ a groupBy naming no column of the schedule is REFUSED (Q1 enforced at the only door that can)', async () => {
    const doc = newDoc();
    await makeWall(doc, 0, 'W-01');
    await makeWall(doc, 3000, 'W-02');

    // Measured degradation the refusal replaces: 'field:Mark' (a heading, not a key) collapses 2 groups
    // into 1 whose key is [""] — a table that looks grouped and whose every subtotal is the grand total.
    const degraded = await doc.evaluateSchedule({
      id: 'ad-hoc',
      name: 'x',
      filter: { typeId: 'core.wall' },
      columns: [...COLUMNS],
      groupBy: ['field:Mark'],
    });
    expect(degraded.groups).toHaveLength(1);
    expect(degraded.groups![0]!.key).toEqual(['']);

    await expect(createSchedule(doc, { groupBy: ['field:Mark'] })).rejects.toBeInstanceOf(
      CommandFailure,
    );
    // ⚠ And the correct key is accepted and really groups — the refusal is not merely "reject grouping".
    const id = await createSchedule(doc, { groupBy: ['field:mark'] });
    expect((await doc.evaluateSchedule(doc.scene.schedules![id]!)).groups).toHaveLength(2);
  }, 120000);

  it('⚠⚠ a quantity key outside the frozen grammar is REFUSED — it would ship a column of NaN', async () => {
    const doc = newDoc();
    await makeWall(doc, 0);

    // What the evaluator does with it, measured: every cell NaN and the TOTAL NaN — and `JSON.stringify`
    // writes NaN as `null`, so it reaches a consumer as "no value" rather than as an error.
    const rogue = await doc.evaluateSchedule({
      id: 'ad-hoc',
      name: 'x',
      filter: {},
      columns: [{ source: 'quantity', key: 'weight' }],
    } as unknown as ScheduleDefinition);
    expect(Number.isNaN(rogue.totals.get('quantity:weight')?.value)).toBe(true);
    // ⚠ And this is how it reaches a consumer: NaN has no JSON form, so it is written as `null`.
    expect(JSON.stringify(rogue.rows[0]!.cells[0]!)).toContain('"value":null');

    await expect(
      doc.execute('core.createSchedule', {
        name: 'S',
        columns: [{ source: 'quantity', key: 'weight' }],
      }),
    ).rejects.toBeInstanceOf(CommandFailure);
    await expect(
      doc.execute('core.createSchedule', {
        name: 'S',
        columns: [{ source: 'field', key: 'colour' }],
      }),
    ).rejects.toBeInstanceOf(CommandFailure);
  }, 120000);

  it('an unknown column SOURCE is refused by the argsSchema itself (the generated tool-list is the doc)', async () => {
    const doc = newDoc();
    await expect(
      doc.execute('core.createSchedule', {
        name: 'S',
        columns: [{ source: 'nonsense', key: 'x' }],
      }),
    ).rejects.toBeInstanceOf(CommandFailure);
    // A zero-column schedule is a blank table that renders without complaining. Also refused.
    await expect(
      doc.execute('core.createSchedule', { name: 'S', columns: [] }),
    ).rejects.toBeInstanceOf(CommandFailure);
    await expect(
      doc.execute('core.createSchedule', { name: '  ', columns: [{ source: 'count' }] }),
    ).rejects.toBeInstanceOf(CommandFailure);
  }, 120000);

  it('⚠⚠ two columns sharing one KEY are REFUSED — `checkLayers` rule, one level up', async () => {
    const doc = newDoc();
    await makeWall(doc, 0);

    // Measured: a "Gross"/"Net" pair produces TWO headers and ONE total entry, and every cell lookup
    // (`find(c => c.columnKey === key)`) resolves to the first — the second column is unaddressable.
    const dup = await doc.evaluateSchedule({
      id: 'ad-hoc',
      name: 'x',
      filter: {},
      columns: [
        { source: 'quantity', key: 'volume', heading: 'Gross' },
        { source: 'quantity', key: 'volume', heading: 'Net' },
      ],
    });
    expect(dup.columns).toHaveLength(2);
    expect([...dup.totals.keys()]).toHaveLength(1);

    await expect(
      doc.execute('core.createSchedule', {
        name: 'S',
        columns: [
          { source: 'quantity', key: 'volume', heading: 'Gross' },
          { source: 'quantity', key: 'volume', heading: 'Net' },
        ],
      }),
    ).rejects.toBeInstanceOf(CommandFailure);

    // ⚠ The `part` qualifier IS part of the key, so these two are legitimately different columns.
    await expect(
      doc.execute('core.createSchedule', {
        name: 'S',
        columns: [
          { source: 'quantity', key: 'volume', part: 'structure' },
          { source: 'quantity', key: 'volume', part: 'finish' },
        ],
      }),
    ).resolves.toBeDefined();
  }, 120000);

  it('⚠⚠ an UPDATE that would strand the STORED groupBy is refused — the merged definition is what is checked', async () => {
    const doc = newDoc();
    await makeWall(doc, 0, 'W-01');
    const id = await createSchedule(doc, { groupBy: ['field:mark'] });

    // Replacing the columns and mentioning no groupBy: each half is fine, the RESULT is not — the stored
    // grouping would name a column that no longer exists, and the table would silently collapse to one
    // group. Validating the args in isolation cannot see this.
    await expect(
      doc.execute('core.updateSchedule', { id, columns: [{ source: 'count' }] }),
    ).rejects.toBeInstanceOf(CommandFailure);

    // Changing both together is exactly what the user meant, and it is accepted.
    await doc.execute('core.updateSchedule', { id, columns: [{ source: 'count' }], groupBy: [] });
    expect(doc.scene.schedules?.[id]?.columns).toHaveLength(1);
  }, 120000);

  it('an unknown design option is NOT_FOUND, never silently dropped', async () => {
    const doc = newDoc();
    await expect(
      doc.execute('core.createSchedule', {
        name: 'S',
        columns: [{ source: 'count' }],
        designOptionIds: ['opt-nope'],
      }),
    ).rejects.toBeInstanceOf(CommandFailure);
  }, 120000);

  /* ============================================================================================
   * §4 — DELETE: the D51 refuse-or-retarget guard, and the rung of its ladder that is MISSING.
   * ========================================================================================= */

  it('⚠⚠ deleting a schedule a SHEET places is REFUSED; acknowledge:true lets it dangle', async () => {
    const doc = newDoc();
    const id = await createSchedule(doc);

    // A sheet can only arrive from a `.bnn` today (no sheet CRUD) — so it is planted the same way a
    // foreign file would deliver one.
    const sheet: Sheet = {
      id: 'sheet-1',
      number: 'A-101',
      name: 'Schedules',
      viewports: [{ viewId: id, at: [100, 100] }],
    };
    const withSheet = newDoc({ ...doc.scene, sheets: { 'sheet-1': sheet } });

    await expect(withSheet.execute('core.deleteSchedule', { id })).rejects.toBeInstanceOf(
      CommandFailure,
    );
    expect(withSheet.scene.schedules?.[id]).toBeDefined();

    // ⚠ retargetMap is refused HONESTLY rather than crashing: repointing the viewport means writing
    // `scene.sheets`, which no command authors yet, so that rung of D51's ladder does not exist.
    await expect(
      withSheet.execute('core.deleteSchedule', { id, retargetMap: { [id]: 'other' } }),
    ).rejects.toBeInstanceOf(CommandFailure);

    await withSheet.execute('core.deleteSchedule', { id, acknowledge: true });
    expect(withSheet.scene.schedules?.[id]).toBeUndefined();
    expect(withSheet.scene.sheets?.['sheet-1']?.viewports).toHaveLength(1);
  }, 120000);

  it('an UNPLACED schedule deletes without ceremony, and undo brings it back', async () => {
    const doc = newDoc();
    const id = await createSchedule(doc);
    await doc.execute('core.deleteSchedule', { id });
    expect(doc.scene.schedules?.[id]).toBeUndefined();
    await doc.undo();
    expect(doc.scene.schedules?.[id]?.name).toBe('Wall Schedule');
    await expect(
      doc.execute('core.deleteSchedule', { id: 'schedule-nope' }),
    ).rejects.toBeInstanceOf(CommandFailure);
  }, 120000);

  /* ============================================================================================
   * §5 — PERSISTENCE: an authored schedule is part of the document, and a hostile file is refused.
   * ========================================================================================= */

  it('⚠ an authored schedule survives save → load, and still evaluates against the rebuilt model', async () => {
    const doc = newDoc();
    await makeWall(doc, 0, 'W-01');
    const id = await createSchedule(doc, { groupBy: ['field:mark'] });

    const bytes = saveBnn(doc.scene, {
      kernelBuildId: 'occt-7.9.3-test',
      journal: doc.changeFeed(),
    });
    const reopened = newDoc(loadBnn(bytes).scene);
    await reopened.rebuildAll();

    const stored = reopened.scene.schedules?.[id];
    expect(stored?.groupBy).toEqual(['field:mark']);
    const result = await reopened.evaluateSchedule(stored!);
    expect(result.rows).toHaveLength(1);
    expect(result.totals.get('quantity:volume')?.value).toBeCloseTo(4000 * T * H, 0);
  }, 120000);

  it('⚠ a `.bnn` whose "schedules" is null is REFUSED with a message, not crashed into', async () => {
    const doc = newDoc();
    await createSchedule(doc);
    const bytes = saveBnn(doc.scene, { kernelBuildId: 'occt-7.9.3-test' });
    const hostile = await corruptScene(bytes, (scene) => ({ ...scene, schedules: null }));
    expect(() => loadBnn(hostile)).toThrow(/"schedules" must be an object/);
  }, 120000);
});

/** Rewrites `scene.json` inside a `.bnn` — the one part of a file a user can be SENT that a body reads. */
async function corruptScene(
  bytes: Uint8Array,
  mutate: (scene: Record<string, unknown>) => unknown,
): Promise<Uint8Array> {
  const { unzipSync, zipSync, strToU8, strFromU8 } = await import('fflate');
  const files = unzipSync(bytes);
  const scene = JSON.parse(strFromU8(files['scene.json']!)) as Record<string, unknown>;
  files['scene.json'] = strToU8(JSON.stringify(mutate(scene)));
  return zipSync(files);
}
