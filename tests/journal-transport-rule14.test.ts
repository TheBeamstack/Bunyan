/**
 * ⚠⚠ DOMAIN RULE 14, SWEPT BACKWARD — *"A model is ISSUED, not merely saved… and `change_type` is READ
 * from the edit log, never inferred by diffing geometry"* (D34/D40/D41, `core_logic.md` §8.14, §3.12a).
 *
 * The rule's mechanical halves were already sound and already tested (`document-persistence.test.ts`:
 * the journal is never trimmed, an undo appends a REVERSAL, a revision records `issued_at_seq`, the
 * delta since it is one filter). **What nothing checked is the PRECONDITION all of that rests on: that
 * the log a consumer is handed actually REACHES the baseline it is being read against.**
 *
 * ⚠⚠ AND THE FAILURE WAS NOT A CRASH — IT WAS A CONFIDENT "NOTHING CHANGED". Measured before the fix,
 * on a wall that demonstrably grew 6 m → 8 m after the baseline:
 *
 *   | the log the `.bnn` carried            | anchor present | the package a consumer received |
 *   |---------------------------------------|----------------|---------------------------------|
 *   | `doc.changeFeed()` (correct)          | yes            | 1 element, `modified_qty` ✓      |
 *   | `doc.history()` (the undo stack)      | **no**         | **0 elements** once the stack had dropped one |
 *   | omitted entirely, revision kept       | **no**         | **0 elements, all-zero summary** |
 *
 * A valid `contract_version: 1.2` package, `source: bunyan`, saying nothing happened. Planitor's own
 * consumer rule reads absence-from-`elements` as *unchanged*, so it keeps billing the 6 m wall — and
 * rule 14's whole sentence ("a tool that guesses what changed will eventually guess wrong, and
 * downstream that is a wrong schedule") arrives by the one road nobody watched: **not a wrong guess, a
 * missing log reported as silence.**
 *
 * ⚠ THE DETECTOR IS STRUCTURAL, NOT HEURISTIC, AND D41 IS WHY: the revision-issuing edit is journalled
 * (`#record`) but **deliberately never pushed onto the undo stack** ("you cannot recall a revision you
 * have already handed downstream"). So a log that is really the undo stack **cannot** contain the
 * anchor `seq` — the moat-losing bug is detected by the exact property that makes it a bug.
 *
 * REVERT-VERIFY: drop `journalCoversRevision` from `changesSince` / `exportCleanDelta` / `saveBnn` and
 * §1, §2 and §4 fail — §1 by publishing an empty delta instead of refusing.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  BNN_CODEC,
  CORE_COMMANDS,
  DocumentContext,
  createRegistries,
  exportCleanDelta,
  journalCoversRevision,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import type { ExportOptions, ModelRevision, Registries, Scene } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const KERNEL_BUILD = 'occt-7.9.3-emcc-6.0.2';

describe('domain rule 14 — the log a delta is read from must REACH the baseline', () => {
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

  const newRegistries = (): Registries => {
    const r = createRegistries();
    r.types.register(wallType);
    for (const command of CORE_COMMANDS) r.commands.register(command);
    return r;
  };

  const priorContext = (): NonNullable<ExportOptions['priorContext']> => ({
    registries: newRegistries(),
    geometry: client,
    create: (scene: Scene) =>
      new DocumentContext({ registries: newRegistries(), geometry: client, scene }),
  });

  const newDoc = (): DocumentContext =>
    new DocumentContext({ registries: newRegistries(), geometry: client });

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
    await doc.execute('core.createStyle', {
      id: 'EXT',
      name: 'EXT',
      typeId: wallType.id,
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });
  };

  const wall = async (doc: DocumentContext, length: number): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        styleId: 'EXT',
        containerId: 'l1',
        params: { start: [0, 0], end: [length, 0], height: 3000 },
      })
    ).changes[0]!.id;

  /** A baseline, then one real change after it: the wall grows 6 m → 8 m. */
  const issuedThenChanged = async (): Promise<{
    doc: DocumentContext;
    wallId: string;
    rev1: ModelRevision;
  }> => {
    const doc = newDoc();
    await groundwork(doc);
    const wallId = await wall(doc, 6000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;
    await doc.execute('core.setParams', { elementId: wallId, params: { end: [8000, 0] } });
    return { doc, wallId, rev1 };
  };

  const reopen = async (bytes: Uint8Array): Promise<DocumentContext> => {
    const pkg = loadBnn(bytes);
    const doc = new DocumentContext({
      registries: newRegistries(),
      geometry: client,
      scene: pkg.scene,
      journal: pkg.journal,
      revision: pkg.manifest.revision,
    });
    await doc.rebuildAll();
    return doc;
  };

  /* ============================================================================================
   * §1 — A `.bnn` THAT CARRIES A BASELINE BUT NO LOG. The delta is REFUSED, not answered "nothing".
   * ========================================================================================= */

  it('⚠⚠ a revision with no `history.json`: the export REFUSES — it used to publish an empty delta', async () => {
    const { doc, wallId, rev1 } = await issuedThenChanged();

    // The control: with the real journal the consumer is told the wall re-quantified.
    const control = await exportCleanDelta(doc, { since: rev1, priorContext: priorContext() });
    expect(control.elements.find((e) => e.pei === wallId)?.change_type).toBe('modified_qty');
    expect(control.elements.find((e) => e.pei === wallId)?.quantity?.value).toBeCloseTo(4.8, 9);

    // The same model, saved with its baseline but WITHOUT its log. Permitted — a scene-only `.bnn` is a
    // legitimate document (twenty existing tests write one). What is not legitimate is answering
    // "what changed since revision 1?" out of a log that cannot see revision 1.
    const scenic = await reopen(
      saveBnn(doc.scene, { kernelBuildId: KERNEL_BUILD, revision: rev1 }),
    );

    // ⚠ THE DOCUMENT ITSELF IS FINE, AND THE REFUSAL IS SCOPED TO THE DELTA. The recipe is truth: the
    // building opens, rebuilds and measures. Refusing to open it would be the wrong lesson (D43).
    const totals = await scenic.quantities(wallId);
    expect(totals.parts.reduce((sum, p) => sum + p.volume, 0) / 1e9).toBeCloseTo(4.8, 9);

    await expect(
      exportCleanDelta(scenic, { since: rev1, priorContext: priorContext() }),
    ).rejects.toThrow(/journal|log/i);
    // The message must name the anchor a consumer would otherwise have to guess at.
    await expect(
      exportCleanDelta(scenic, { since: rev1, priorContext: priorContext() }),
    ).rejects.toThrow(new RegExp(String(rev1.issued_at_seq)));
  }, 180000);

  /* ============================================================================================
   * §2 — THE UNDO STACK IN PLACE OF THE JOURNAL. Refused where the lie is MINTED: at the save.
   * ========================================================================================= */

  it('⚠⚠ `saveBnn` refuses the undo stack as the journal — the log cannot contain the anchor (D41)', async () => {
    const { doc, rev1 } = await issuedThenChanged();

    // ⚠ THE STRUCTURAL TELL: an issued revision is journalled and never pushed onto the undo stack, so
    // this log provably cannot support the baseline being written into the same manifest.
    expect(doc.history().some((e) => e.seq === rev1.issued_at_seq)).toBe(false);
    expect(doc.changeFeed().some((e) => e.seq === rev1.issued_at_seq)).toBe(true);

    expect(() =>
      saveBnn(doc.scene, {
        kernelBuildId: KERNEL_BUILD,
        journal: doc.history(),
        revision: doc.revision,
      }),
    ).toThrow(/changeFeed\(\)/);

    // The additivity gate: the correct call is untouched, and still round-trips to a readable delta.
    const good = await reopen(
      saveBnn(doc.scene, {
        kernelBuildId: KERNEL_BUILD,
        journal: doc.changeFeed(),
        revision: doc.revision,
      }),
    );
    const pkg = await exportCleanDelta(good, { since: rev1, priorContext: priorContext() });
    expect(pkg.elements.map((e) => e.change_type)).toContain('modified_qty');
  }, 180000);

  /* ============================================================================================
   * §3 — WHAT IT COSTS WHEN THE STACK HAS ACTUALLY DROPPED SOMETHING. The measured harm.
   * ========================================================================================= */

  it('⚠⚠ the undo stack is CAPPED and the journal is not — a whole element goes missing from the delta', async () => {
    const doc = newDoc();
    await groundwork(doc);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    // A wall built AFTER the baseline — the thing a consumer must be told to price.
    const wallId = await wall(doc, 6000);
    // …then 210 cheap edits. The undo stack is a 200-deep session convenience; the journal is the record.
    for (let i = 0; i < 210; i++) {
      await doc.execute('core.createMaterial', {
        id: `m-${String(i)}`,
        name: `M${String(i)}`,
        category: 'other',
        density: 1000,
      });
    }
    expect(doc.history()).toHaveLength(200);
    expect(doc.changeFeed().length).toBeGreaterThan(210);
    // ⚠ The wall's own creation has fallen off the stack. It is still in the journal, forever.
    expect(doc.history().some((e) => e.changes.some((c) => c.id === wallId))).toBe(false);
    expect(doc.changeFeed().some((e) => e.changes.some((c) => c.id === wallId))).toBe(true);

    // Read off the real log, the wall is `added` — the row Planitor turns into a work package.
    const control = await exportCleanDelta(doc, { since: rev1, priorContext: priorContext() });
    expect(control.elements.find((e) => e.pei === wallId)?.change_type).toBe('added');

    // ⚠⚠ AND THIS IS THE MEASURED HARM THE REFUSAL PREVENTS: persisted as the undo stack, the wall is
    // in NO row of the package at all — not `added`, not `unchanged`, absent. Before the fix this file
    // saved cleanly and the consumer was told the storey was empty.
    expect(() =>
      saveBnn(doc.scene, {
        kernelBuildId: KERNEL_BUILD,
        journal: doc.history(),
        revision: doc.revision,
      }),
    ).toThrow(/changeFeed\(\)/);
  }, 300000);

  /* ============================================================================================
   * §4 — THE ONE-LINE DELTA ITSELF, AND THE CODEC SEAM THAT WRITES THE FILE.
   * ========================================================================================= */

  it('⚠ `changesSince` refuses a baseline its log cannot see — but an EMPTY delta stays legal', async () => {
    const { doc, rev1 } = await issuedThenChanged();
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev2 = doc.revision!;

    // ⚠ THE DISTINCTION THE GUARD MUST PRESERVE: "nothing has happened since rev2" is a true, ordinary
    // answer — and it is only distinguishable from "I cannot see rev2" because the anchor is present.
    expect(doc.changesSince(rev2)).toHaveLength(0);
    expect(doc.changesSince(rev1).length).toBeGreaterThan(0);

    const orphan = new DocumentContext({
      registries: newRegistries(),
      geometry: client,
      scene: doc.scene,
      revision: rev2,
    });
    expect(() => orphan.changesSince(rev2)).toThrow(/journal|log/i);
    expect(journalCoversRevision(doc.changeFeed(), rev2)).toBe(true);
    expect(journalCoversRevision([], rev2)).toBe(false);
  }, 180000);

  it('⚠ the registered `.bnn` codec (D71) will not write a journal-less file by default', async () => {
    const { doc } = await issuedThenChanged();
    const registries = newRegistries();
    registries.codecs.register(BNN_CODEC);

    // ⚠ It used to default to `{ kernelBuildId: 'unknown' }` — fabricating a kernel build id AND
    // silently dropping both the journal and the revision, on the very seam rule 5 exists to make the
    // primary save path. A format's write options are the caller's to supply, not the codec's to invent.
    expect(() => BNN_CODEC.write!({ scene: doc.scene })).toThrow(/kernelBuildId|changeFeed\(\)/);

    // With them supplied it is still byte-identical to the direct call (domain rule 10: one description).
    const options = {
      kernelBuildId: KERNEL_BUILD,
      journal: doc.changeFeed(),
      revision: doc.revision,
    };
    expect(BNN_CODEC.write!({ scene: doc.scene, options })).toEqual(saveBnn(doc.scene, options));
  }, 180000);

  /* ============================================================================================
   * §5 — THE RESERVATION THE GUARD MUST NOT OUTLAW (D60, row Ⓒ).
   * ========================================================================================= */

  it('⚠⚠ a merge-ordered baseline (a reserved `frontier`) is NOT refused — the scalar cut is not its test', async () => {
    const { doc, rev1 } = await issuedThenChanged();

    // ⚠ Under co-editing the scalar anchor is ambiguous BY DESIGN — two replicas both have a `seq = 42`
    // — so a revision carrying a `frontier` is cut by the frontier, and the edit at `issued_at_seq` need
    // not be an issuance at all. v1.0.0 mints no frontier; the day a transport does, this guard must
    // already have got out of its way. Writing it without this clause refused a legal reserved-seam file
    // (`coauthoring-merge-seam.test.ts`) — a foreclosure of a reservation, found four days before a freeze.
    const merged: ModelRevision = {
      ...rev1,
      issued_at_seq: 1,
      frontier: { 'rep-A': 3, 'rep-B': 2 },
    };
    expect(journalCoversRevision([], merged)).toBe(true);
    expect(() =>
      saveBnn(doc.scene, {
        kernelBuildId: KERNEL_BUILD,
        journal: doc.changeFeed(),
        revision: merged,
      }),
    ).not.toThrow();

    // …and the same revision WITHOUT the reserved field is refused, so the clause is a deferral to the
    // frontier, not a hole in the guard.
    const scalar: ModelRevision = { ...rev1, issued_at_seq: 1 };
    expect(journalCoversRevision([], scalar)).toBe(false);
  }, 180000);
});
