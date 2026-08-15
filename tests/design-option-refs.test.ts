/**
 * THE DESIGN-OPTION REFERENTIAL CHECK — one predicate, three doors, two deliberate failure codes.
 *
 * ⚠⚠ WHAT THIS FILE GUARDS, IN ONE SENTENCE: **one rule had two homes, and the prose describing it had
 * already drifted from both.** `core.createSchedule`/`updateSchedule` resolved a `designOptionIds`
 * selection in `commands.ts`; `core.createView`/`updateView` resolved it AGAIN in `view.ts`'s own loop.
 * Two implementations, two files — domain rule 10's *"one description, never two"*, and the same drift
 * `optionScopeOf` was extracted to stop one level up. Meanwhile `open_rulings.md`'s Q17 row, and the
 * comment in `tests/plan-section.test.ts`, both described the check as **shared**. It was not.
 *
 * ⚠⚠ AND WHAT THIS FILE HONESTLY CANNOT DO: **the collapse is behaviour-preserving, so no test here
 * fails in its absence.** This project's rule is *"a fix without a test that fails in its absence is an
 * assertion"* — the honest form of that claim for a de-duplication is a different one: these tests pass
 * IDENTICALLY before and after the collapse (verified by running them against both trees), and what they
 * buy is the FUTURE drift, which is the defect that actually happened. They pin the two things a second
 * copy would break:
 *   1. both doors refuse exactly the same SET of ids (the predicate), and
 *   2. each door keeps its OWN failure code and its OWN cardinality (the throw) — `NOT_FOUND` on the
 *      first for a schedule, `REFUSED` over ALL of them for a view. `CommandFailure.code` is
 *      agent-visible surface; sharing the throw would have silently re-coded one door.
 *
 * ⚠ Per the design doc's §5 criterion 8, this DRIVES the verbs. A source-grep for the shared call is a
 * proxy for execution (Entry 81's lesson) and would pass on a file that imports it and never calls it.
 *
 * ⚠ §4 is the THIRD door — `core.createElement`'s own `designOptionId`, which accepts an id the other two
 * refuse and excludes the element from every enumerating consumer. D86 makes that exclusion visible in
 * `brokenRefs()` and changes nothing else; unlike the collapse above, it DOES fail in its absence.
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
  emptyScene,
  unresolvedDesignOptions,
} from '@bunyan/document';
import type { DesignOption, Scene } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const OPTIONS: Record<string, DesignOption> = {
  'opt-a': { id: 'opt-a', setName: 'Facade', name: 'A', isPrimary: true },
  'opt-b': { id: 'opt-b', setName: 'Facade', name: 'B', isPrimary: false },
};

describe('the design-option referential check — one predicate, two throws', () => {
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

  /** The catalogue can only arrive by another road — 0 of 40 verbs can author one (design doc §1.1). */
  const seeded = (): DocumentContext => newDoc({ ...emptyScene(), designOptions: OPTIONS });

  const failure = async (
    doc: DocumentContext,
    verb: string,
    args: Parameters<DocumentContext['execute']>[1],
  ): Promise<CommandFailure> => {
    try {
      await doc.execute(verb, args);
    } catch (error) {
      if (error instanceof CommandFailure) return error;
      throw error;
    }
    throw new Error(`${verb} was expected to refuse, and it ACCEPTED`);
  };

  /* ============================================================================================
   * §1 — THE PREDICATE ITSELF.
   * ========================================================================================= */

  it('the predicate names every id the document cannot resolve, and only those', () => {
    const scene: Scene = { ...emptyScene(), designOptions: OPTIONS };

    // ⚠ Absent is not empty is not unresolved. An ABSENT selection means "each set's primary" and must
    // never be reported as a miss — reporting it would refuse every legitimate call, which is exactly
    // the reasoning `core.createElement` used to skip its own check.
    expect(unresolvedDesignOptions(scene, undefined)).toEqual([]);
    expect(unresolvedDesignOptions(scene, [])).toEqual([]);

    expect(unresolvedDesignOptions(scene, ['opt-a', 'opt-b'])).toEqual([]);
    expect(unresolvedDesignOptions(scene, ['opt-a', 'ghost'])).toEqual(['ghost']);

    // ⚠ ORDER AND MULTIPLICITY ARE PART OF THE CONTRACT, because the schedule door reports `[0]` and the
    // view door reports all of them. A predicate returning a Set would silently re-order the first.
    expect(unresolvedDesignOptions(scene, ['ghost-1', 'opt-a', 'ghost-2'])).toEqual([
      'ghost-1',
      'ghost-2',
    ]);

    // ⚠ THE WHOLE-CATALOGUE-ABSENT CASE, which is the one that actually ships: no verb can author an
    // option, so `scene.designOptions` is `undefined` on every document a command ever produced.
    expect(unresolvedDesignOptions(emptyScene(), ['opt-a'])).toEqual(['opt-a']);
  });

  /* ============================================================================================
   * §2 — THE TWO DOORS AGREE ON THE SET AND DIFFER ON THE THROW. BOTH HALVES ARE THE POINT.
   * ========================================================================================= */

  it('⚠⚠ both doors refuse the SAME ids — driven through the verbs, not grepped', async () => {
    const doc = seeded();

    const scheduleFailure = await failure(doc, 'core.createSchedule', {
      name: 'S',
      columns: [{ source: 'quantity', key: 'volume' }],
      designOptionIds: ['ghost-1'],
    });
    const viewFailure = await failure(doc, 'core.createView', {
      kind: '3d',
      name: 'V',
      scale: 100,
      designOptionIds: ['ghost-1'],
    });

    // Both refused. Same document, same id, same rule.
    expect(scheduleFailure.message).toContain('ghost-1');
    expect(JSON.stringify(viewFailure.details ?? [])).toContain('ghost-1');
  }, 120000);

  it('⚠⚠ …and each door keeps its OWN code and cardinality — the throw is NOT shared', async () => {
    const doc = seeded();

    // THE SCHEDULE DOOR: `NOT_FOUND`, and it stops at the FIRST unresolved id.
    const scheduleFailure = await failure(doc, 'core.createSchedule', {
      name: 'S',
      columns: [{ source: 'quantity', key: 'volume' }],
      designOptionIds: ['ghost-1', 'ghost-2'],
    });
    expect(scheduleFailure.code).toBe('NOT_FOUND');
    expect(scheduleFailure.message).toContain('ghost-1');
    expect(scheduleFailure.message).not.toContain('ghost-2');

    // THE VIEW DOOR: `REFUSED`, and it collects EVERY problem — an author fixing a descriptor one
    // refusal at a time is the failure mode `checkViewDescriptor` exists to avoid.
    const viewFailure = await failure(doc, 'core.createView', {
      kind: '3d',
      name: 'V',
      scale: 100,
      designOptionIds: ['ghost-1', 'ghost-2'],
    });
    expect(viewFailure.code).toBe('REFUSED');
    const detail = JSON.stringify(viewFailure.details ?? []);
    expect(detail).toContain('ghost-1');
    expect(detail).toContain('ghost-2');
  }, 120000);

  it('⚠ the view door still collects the option miss ALONGSIDE unrelated descriptor problems', async () => {
    // ⚠ THE WEAK GREEN THIS BLOCKS: a "collapse" that moved the option check into `commands.ts` ahead of
    // `checkViewDescriptor` would still refuse, still say `REFUSED`, and still name both ghosts — and
    // would report the option miss on its own, losing the grammar problems the author also has to fix.
    const doc = seeded();
    const viewFailure = await failure(doc, 'core.createView', {
      kind: 'section',
      name: 'V',
      scale: 100,
      origin: [0, 0, 0],
      normal: [0, 0, 0], // degenerate — a grammar problem, unrelated to options
      designOptionIds: ['ghost-1'],
    });
    expect(viewFailure.code).toBe('REFUSED');
    const detail = JSON.stringify(viewFailure.details ?? []);
    expect(detail).toContain('ghost-1');
    expect(detail).toContain('non-zero normal');
  }, 120000);

  /* ============================================================================================
   * §3 — AND A RESOLVABLE SELECTION IS STILL ACCEPTED BY BOTH.
   *
   * ⚠ Without this, a predicate that refused EVERYTHING would pass every test above.
   * ========================================================================================= */

  it('a resolvable option is accepted by both doors', async () => {
    const doc = seeded();

    const schedule = await doc.execute('core.createSchedule', {
      name: 'S',
      columns: [{ source: 'quantity', key: 'volume' }],
      designOptionIds: ['opt-b'],
    });
    expect(doc.scene.schedules?.[schedule.changes[0]!.id]?.designOptionIds).toEqual(['opt-b']);

    const view = await doc.execute('core.createView', {
      kind: '3d',
      name: 'V',
      scale: 100,
      designOptionIds: ['opt-b'],
    });
    expect(doc.scene.views?.[view.changes[0]!.id]?.designOptionIds).toEqual(['opt-b']);
  }, 120000);

  /* ============================================================================================
   * §4 — THE THIRD DOOR: `core.createElement`'s OWN TAG, SURFACED (D86 / Q17c, owner-ruled 2026-08-15).
   *
   * ⚠⚠ The other two doors REFUSE an unresolvable selection. This one ACCEPTS an unresolvable tag and
   * excludes the element from every enumerating consumer — which is correct (excluding it is what stops
   * the double-count) and which was SILENT: `brokenRefs()` and `unbuildable()` both came back empty on a
   * document missing 50.0% of its volume (design doc §1.4).
   *
   * ⚠ D86 surfaces and nothing else. Q17b — whether the door should refuse instead — is ruled OUT, so
   * every assertion here that the element is still created, still built and still excluded is as
   * load-bearing as the one that it is now reported.
   * ========================================================================================= */

  const taggedWall = async (doc: DocumentContext, designOptionId: string): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        params: { start: [0, 0], end: [6000, 0], thickness: 200, height: 3000 },
        designOptionId,
      })
    ).changes[0]!.id;

  it('⚠⚠ a dangling `designOptionId` is a BROKEN REFERENCE — accepted, built, excluded, and REPORTED', async () => {
    const doc = newDoc(); // no catalogue at all: the document every command has ever produced
    const wall = await taggedWall(doc, 'ghost');

    // The door still accepts, and the element still builds. D86 refuses nothing.
    expect(doc.scene.elements[wall]?.designOptionId).toBe('ghost');
    expect(doc.partsOf(wall)?.length).toBeGreaterThan(0);
    expect(doc.unbuildable()).toEqual([]);

    // The exclusion is unchanged — this is the half D86 must NOT move, or it pre-empts Q17b.
    expect(doc.modelElements().map((e) => e.id)).not.toContain(wall);

    const broken = doc.brokenRefs();
    expect(broken).toHaveLength(1);
    expect(broken[0]?.elementId).toBe(wall);
    expect(broken[0]?.ref).toBe('ghost');
    expect(broken[0]?.reason).toContain('ghost');
  }, 120000);

  it('⚠ …and it reports NOTHING when the tag resolves, or when there is no tag', async () => {
    // Without this, a body that reported every element, or every tagged element, would pass above.
    const resolvable = seeded();
    const tagged = await taggedWall(resolvable, 'opt-a');
    expect(resolvable.brokenRefs()).toEqual([]);
    expect(resolvable.modelElements().map((e) => e.id)).toContain(tagged);

    const untagged = newDoc();
    await untagged.execute('core.createElement', {
      typeId: wallType.id,
      params: { start: [0, 0], end: [6000, 0], thickness: 200, height: 3000 },
    });
    expect(untagged.brokenRefs()).toEqual([]);
  }, 120000);

  it('⚠ it is derived from the scene, so it needs no verb and does not displace a built one', () => {
    // The `.bnn`/hand-assembled population D43 exists for: nothing here was authored through a command,
    // and the entry the last rebuild measured against real geometry is still there beside the new one.
    const stored = {
      elementId: 'wall-stored',
      ref: 'wall-stored/structure/face/lateral.1',
      hostId: 'wall-stored',
      reason: 'measured by a rebuild',
    };
    const scene: Scene = {
      ...emptyScene(),
      elements: {
        'wall-stored': {
          id: 'wall-stored',
          typeId: wallType.id,
          typeVersion: wallType.version,
          name: 'W',
          params: { start: [0, 0], end: [6000, 0], thickness: 200, height: 3000 },
          classification: wallType.defaultClassification,
          designOptionId: 'ghost',
        },
      },
      brokenRefs: [stored],
    };

    expect(newDoc(scene).brokenRefs()).toEqual([
      stored,
      expect.objectContaining({ elementId: 'wall-stored', ref: 'ghost' }),
    ]);
  }, 120000);
});
