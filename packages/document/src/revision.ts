/**
 * ⚠⚠ THE MODEL REVISION — the ONE new concept the ecosystem costs us (D34), and the anchor D40 gave it.
 *
 * **SAVING IS NOT ISSUING.** A revision is a deliberate act — *"this is the model I am handing
 * downstream"* — and it is **the anchor every delta is computed against**. `.bnn` had no revision
 * concept at all, and **you cannot diff against a file that was never declared a baseline.**
 *
 * ⚠⚠ **AND A BASELINE WITH NO POSITION IN THE LOG IS STILL NOT A BASELINE** (D40). *"What changed since
 * revision N?"* is `journal.filter(e => e.seq > revN.issued_at_seq)` — **that sentence is computable
 * only because the revision knows where in the journal it stands.** It did not: the revision carried no
 * anchor and the "log" was a 200-deep undo stack, so the delta was **not computable from the file at
 * all**. `issued_at_seq` is the whole fix, and it is one field.
 *
 * ⚠ **Issuing is a COMMAND** (D41) — `core.issueRevision`, in `commands.ts`. It was a free function in
 * the persistence codec, which meant **an agent could author a building but not release one**, and
 * `listCommands()` never mentioned it. Domain rule 9 admits no second path.
 *
 * (This lives in its own module, and not in `bnn.ts` where it was born, because a revision is a
 * **domain concept the document owns** — the journal references it and the command mints it. It ended
 * up in the persistence codec only because saving was the first thing that needed to write it down,
 * which is exactly the accident that made it a file operation instead of an act.)
 */

export interface ModelRevision {
  readonly snapshot_number: number;
  readonly previous_snapshot_number?: number;
  /** Stable for the life of the model — the thread every revision hangs on. */
  readonly lineage: string;
  readonly issued_at: string;
  readonly issued_by: string;
  /**
   * ⚠⚠ THE JOURNAL POSITION AT WHICH IT WAS ISSUED (D40). Everything after this `seq` is "what changed
   * since this revision". Without it, a revision is a date stamp.
   */
  readonly issued_at_seq: number;
}

/**
 * Mint the next revision on a lineage. Called by `core.issueRevision` (D41) — **and by nothing else**:
 * if you find yourself calling this from a save path, saving has started issuing, and D34's central
 * distinction has quietly died.
 */
export function nextRevision(
  previous: ModelRevision | undefined,
  by: string,
  issuedAtSeq: number,
  lineage?: string,
): ModelRevision {
  return {
    snapshot_number: (previous?.snapshot_number ?? 0) + 1,
    ...(previous === undefined ? {} : { previous_snapshot_number: previous.snapshot_number }),
    lineage: lineage ?? previous?.lineage ?? `bnn-${String(Date.now())}`,
    issued_at: new Date().toISOString(),
    issued_by: by,
    issued_at_seq: issuedAtSeq,
  };
}
