/**
 * `UndoableEdit` — the state delta (spec §6.1) — **and the JOURNAL it is recorded in (D40).**
 *
 * ⚠ UNDO IS A DELTA, NOT A COMMAND REPLAY, and the reason is the whole project in miniature: replaying
 * commands backwards would RE-RUN THE BOOLEANS, and boolean topology is not guaranteed identical
 * across runs. A replay-based undo would therefore silently re-target references across the building
 * — the failure that has plagued parametric CAD for thirty years. A delta restores the *recipe*, and
 * the recipe rebuilds deterministically.
 *
 * ⚠⚠ AND THE THING THIS FILE GOT WRONG FOR A WHOLE PHASE — **THE UNDO STACK IS NOT THE CHANGE FEED**
 * (decision **D40**, spec §6.1, `core_logic.md` §3.12a). They are two structures with two lifetimes,
 * and this file used to be only the first:
 *
 *   | | THE UNDO STACK | THE JOURNAL |
 *   |---|---|---|
 *   | is | a session convenience | **the model's record of what happened** |
 *   | bounded? | **yes** (200 — memory) | **NO. Never trimmed.** |
 *   | an undo | **pops** the edit off it | **appends a REVERSAL.** Nothing is ever erased |
 *   | ordering | LIFO | **a monotonic `seq` on every edit** |
 *   | optional? | yes | **NO — it is part of the model transport** |
 *
 * The ecosystem's entire argument rests on *"`change_type` is **READ** off the edit log, never inferred
 * by diffing two models"* — and **a bounded, mutable, unanchored stack cannot support that sentence.**
 * It did not: with the log *being* the undo stack (200-deep, popped by `undo()`, with no anchor to a
 * revision), *"what changed since revision N?"* **had no answer in the file at all**, and a Clean Delta
 * producer would have had to fall back to **diffing two models** — the precise guessing BIMsync is an
 * entire platform built to do for foreign models, and that Bunyan says it never has to do.
 *
 * ⇒ A Model Revision records **`issued_at_seq`**, and the delta *is*
 * `journal.filter(e => e.seq > revN.issued_at_seq)`. **Read, not inferred, by construction.**
 *
 * ⚠ **Honest, and recorded rather than skipped:** `seq` is **document-scoped**, which is right for
 * single-user v1.0.0. **Co-editing will need a merge-ordered journal** (a Lamport/vector clock, or a
 * CRDT). That is **not solved here — and not foreclosed either**: `seq` is a field on an edit, and the
 * PEIs are already globally unique ULIDs (D44).
 *
 * ⚠⚠ **AND THAT REASSURANCE WAS INCOMPLETE — D60 (row Ⓒ, 2026-07-22) turned the caveat into a
 * RESERVATION** (`P5_step5C_coauthoring_merge_seam_design.md`). *Element* PEIs are ULIDs, yes — but the
 * EDIT's own `id` is `edit-${seq}-${command}` (document-scoped, `document.ts`), so **two replicas both
 * mint `edit-42-…`**, and `reverses` matches an edit by exact-string `id` equality (below). ⇒ the
 * globally-unique edit key must be **`(origin, id)`**, and a merge orders by **`(lamport, origin)`**. Both
 * are reserved below as OPTIONAL fields the single-user path never sets (absent ⇒ today's exact `seq`
 * order). D37 still stands: a ULID `origin` needs no allocator, so the seam is client-only. The revision
 * frontier (`revision.ts`) and the document lineage (`bnn.ts`) complete the reservation.
 */

import type { SceneChange } from './scene.js';
import type { ModelRevision } from './revision.js';

export interface UndoableEdit {
  readonly id: string;
  /** The command that produced it — `core.createElement`. */
  readonly command: string;
  /** Human-facing: what the undo menu says. */
  readonly label: string;
  /** The state delta. Both sides of every change (see `SceneChange`). */
  readonly changes: readonly SceneChange[];
  /**
   * ⚠ THE JOURNAL POSITION (D40). Monotonic, document-scoped, **never reused**. The Clean Delta since
   * revision N is `journal.filter(e => e.seq > revN.issued_at_seq)` — and that is the whole mechanism.
   */
  readonly seq: number;
  /** When it happened. A consumer orders by `seq`; a human reads this. */
  readonly at: string;
  /**
   * ⚠ RESERVED, NOT BUILT (D60, row Ⓒ). The replica that produced this edit — a ULID-shaped id, minted
   * with **no allocator** (the D44 mechanism), so it stays client-only (D37).
   *
   * **ABSENT ⇒ the single local replica — v1.0.0 never sets it and orders purely by `seq`.** When a
   * co-editing transport lands, the **globally-unique edit key is `(origin, id)`** — `id` stays
   * document-scoped and human-readable (`edit-42-core.createElement`); `origin` disambiguates the
   * `edit-42` collision two replicas would otherwise share. `reverses` stays a bare `id` resolved WITHIN
   * the same `origin` (undo is replica-local — you undo your own edits); a future cross-replica undo
   * carries an `origin:id` composite, additive to the string, foreclosing nothing.
   */
  readonly origin?: string;
  /**
   * ⚠ RESERVED, NOT BUILT (D60, row Ⓒ). A **Lamport logical clock** — `max(every lamport this replica has
   * seen) + 1`. **ABSENT ⇒ equals `seq`** (single writer), so a one-origin journal orders identically
   * whether read by `seq` or by `(lamport, origin)`; v1.0.0's ordering is the degenerate case, unchanged.
   *
   * A merge-ordered journal totally-orders by **`(lamport, origin)`** lexicographically — deterministic
   * and causality-respecting. Reserving the scalar does NOT commit to Lamport-over-vector-clock: a
   * version-vector transport ignores `lamport` and orders by per-origin `seq`; neither is foreclosed.
   */
  readonly lamport?: number;
  /**
   * ⚠ Set when this edit is the **REVERSAL** of an earlier one (an undo): the `id` of the edit it
   * reverses. The reversed edit **stays in the journal** — a downstream consumer may already hold the
   * state being reversed *from*, so erasing it would leave that consumer holding a state the model
   * denies ever existed.
   */
  readonly reverses?: string;
  /**
   * ⚠ Set when this edit ISSUED a Model Revision (D41, `core.issueRevision`). The journal therefore
   * records the issuance *in line*, which is what makes `issued_at_seq` meaningful: the revision knows
   * exactly where in the log it stands.
   */
  readonly revision?: ModelRevision;
  /**
   * ⚠ RESERVED, NOT BUILT (D23). Edits sharing a transaction id undo and redo as a single
   * all-or-nothing unit.
   *
   * **v1.0.0 emits exactly one edit per command and does NOT implement grouping.** The field exists
   * because the undo contract FREEZES AT P5, retrofitting grouping into a frozen contract is invasive,
   * and every composite verb the product grows toward ("add a room", "import and place") is a set of
   * edits that must never be left half-applied.
   */
  readonly transactionId?: string;
  /** Elements whose geometry this edit invalidated — what the rebuild engine must redo. */
  readonly rebuilt: readonly string[];
}

/**
 * The undo/redo stack — **a session convenience, and nothing more** (D40).
 *
 * ⚠ It stores deltas, so an undo is O(delta) in the document but may trigger an **incremental kernel
 * rebuild of the affected subgraph** — undo is not O(1), and spec §6.1 says so on purpose.
 *
 * ⚠ **It is bounded, and that is CORRECT** — it is a memory budget on a convenience. What is *not*
 * correct is reading the ecosystem's change feed off it, which is what the code did until D40. The feed
 * is the `Journal`, below.
 */
export class UndoStack {
  #done: UndoableEdit[] = [];
  #undone: UndoableEdit[] = [];
  readonly #limit: number;

  constructor(limit = 200) {
    this.#limit = limit;
  }

  push(edit: UndoableEdit): void {
    this.#done.push(edit);
    if (this.#done.length > this.#limit) this.#done.shift();
    // A new edit after an undo forks history: the redo branch is gone. Every editor works this way,
    // and the alternative (a tree) is a feature, not a default.
    this.#undone = [];
  }

  /** The edit to reverse, moved onto the redo branch. `undefined` ⇒ nothing to undo. */
  takeUndo(): UndoableEdit | undefined {
    const edit = this.#done.pop();
    if (edit !== undefined) this.#undone.push(edit);
    return edit;
  }

  /** The edit to re-apply, moved back onto the done branch. */
  takeRedo(): UndoableEdit | undefined {
    const edit = this.#undone.pop();
    if (edit !== undefined) this.#done.push(edit);
    return edit;
  }

  get canUndo(): boolean {
    return this.#done.length > 0;
  }
  get canRedo(): boolean {
    return this.#undone.length > 0;
  }

  /** The undo stack, oldest first. ⚠ **NOT the change feed** — that is `Journal.entries()` (D40). */
  history(): readonly UndoableEdit[] {
    return [...this.#done];
  }
}

/**
 * ⚠⚠ THE JOURNAL — **THE ECOSYSTEM'S CHANGE FEED** (D40, domain rule 14, `core_logic.md` §3.12a).
 *
 * Append-only. Monotonic `seq`. **Never trimmed, never popped.** An undo does not remove an entry from
 * it; it **appends a reversal**. This is `history.json`, and it is part of the model transport — not an
 * optional session-continuity file, which is what the spec used to call it while simultaneously
 * resting the entire moat on it.
 *
 * **Downstream, `change_type` is READ from here.** BIMsync must *diff*, because it is handed foreign
 * files and has nothing else. Bunyan *knows*, because it was there when the wall moved. A tool that
 * guesses what changed will eventually guess wrong, and downstream that is a wrong schedule and a
 * wrong payment.
 */
export class Journal {
  #entries: UndoableEdit[] = [];
  #nextSeq = 1;

  /** The seq the next edit will carry. Peeked (not consumed) so a *rejected* edit burns no number. */
  get nextSeq(): number {
    return this.#nextSeq;
  }

  /** ⚠ APPEND. There is no `pop`, no `shift` and no `trim` on this class, by design. */
  append(edit: UndoableEdit): void {
    this.#entries.push(edit);
    this.#nextSeq = Math.max(this.#nextSeq, edit.seq + 1);
  }

  entries(): readonly UndoableEdit[] {
    return [...this.#entries];
  }

  /**
   * ⚠⚠ THE CLEAN DELTA, AND IT IS ONE LINE — *"what changed since revision N?"*
   *
   * This function is the entire ecosystem claim, and the reason D40 was worth a contract amendment on
   * the day before the freeze. It **reads**; it does not infer, compare, fingerprint or guess.
   */
  since(seq: number): readonly UndoableEdit[] {
    return this.#entries.filter((edit) => edit.seq > seq);
  }

  /** Restore a persisted journal (`history.json`). Ordered by `seq`, defensively. */
  restore(edits: readonly UndoableEdit[]): void {
    this.#entries = [...edits].sort((a, b) => a.seq - b.seq);
    this.#nextSeq = this.#entries.reduce((next, edit) => Math.max(next, edit.seq + 1), 1);
  }
}

/**
 * ⚠⚠ DOES THIS LOG ACTUALLY REACH THE BASELINE IT IS ABOUT TO BE READ AGAINST? (domain rule 14.)
 *
 * `issued_at_seq` names a **position in the journal**, and until this function existed **nothing ever
 * checked that the journal handed to a consumer contained that position.** The mechanical halves of
 * rule 14 were all sound and all tested — never trimmed, an undo appends a reversal, the delta is one
 * filter — and the precondition underneath them was enforced by prose in three files.
 *
 * ⚠⚠ THE FAILURE IT CATCHES IS NOT A CRASH, IT IS A CONFIDENT *"NOTHING CHANGED"*: `since()` on a log
 * that cannot see the baseline returns `[]`, which is indistinguishable from the true and ordinary
 * answer *"nothing has happened since I issued it."* Measured on a wall that grew 6 m → 8 m after the
 * baseline: a valid `contract_version: 1.2` package with **zero elements and an all-zero summary**, and
 * Planitor reads absence-from-`elements` as *unchanged*. **The moat's own sentence — *"a tool that
 * guesses what changed will eventually guess wrong"* — arrives here without any guessing at all.**
 *
 * ⚠ THE DETECTOR IS STRUCTURAL, AND D41 IS WHY IT WORKS: the revision-issuing edit is journalled but
 * **never pushed onto the undo stack** (you cannot recall a revision you have handed downstream). So a
 * "journal" that is really `doc.history()` — the 200-deep, undo-popped session convenience — **cannot**
 * carry the anchor. The one mistake the docs have warned about in prose since D40 is now the one thing
 * this predicate is guaranteed to see.
 *
 * ⚠⚠ AND IT DEFERS TO THE RESERVED MERGE FRONTIER RATHER THAN OUTLAWING IT (D60, row Ⓒ). Under
 * co-editing the scalar cut is *ambiguous by design* — two replicas both have a `seq = 42` — so a
 * merge-ordered journal's baseline is `frontier` (`origin → highest lamport included`), and the edit at
 * `issued_at_seq` need not be an issuance at all. **v1.0.0 never mints a frontier**, so absence is the
 * only case this product reaches; a present one means the scalar test does not apply and the check
 * belongs on the frontier path that will compute the delta. *Writing the guard without this clause
 * refused a legal reserved-seam file — caught by `coauthoring-merge-seam.test.ts`, which is exactly why
 * D60 reserved with a working test rather than with prose.*
 */
export function journalCoversRevision(
  journal: readonly UndoableEdit[],
  revision: ModelRevision,
): boolean {
  // ⚠ A merge-ordered baseline (D60, reserved — absent in v1.0.0): not answerable by a scalar anchor,
  // and not this function's to refuse. `sinceFrontier` is where the co-editing transport checks it.
  if (revision.frontier !== undefined) return true;
  const anchor = journal.find((edit) => edit.seq === revision.issued_at_seq);
  // The entry at that position must BE the issuance — a `seq` is unique per edit, so this can only
  // fail by the log being the wrong one, truncated, or from another document.
  return anchor?.revision?.snapshot_number === revision.snapshot_number;
}

/**
 * The ONE wording of that refusal, shared by all three sites that make it (`changesSince`, the Clean
 * Delta exporter, `saveBnn`) — because a refusal three products will meet should not be three
 * differently-worded guesses at the same cause (domain rule 10).
 *
 * ⚠ It names the anchor and the fix, per rule 3's lesson: a refusal nobody can act on has stopped being
 * a refusal. The actionable cause is almost always one of two, and both are named.
 */
export function missingAnchorMessage(revision: ModelRevision): string {
  return (
    `the journal does not reach revision ${String(revision.snapshot_number)} ` +
    `(issued_at_seq ${String(revision.issued_at_seq)}), so "what changed since it" cannot be READ — ` +
    `and this product does not INFER a delta by diffing (D34/D40, domain rule 14). ` +
    `Either the log persisted was \`doc.history()\` (the 200-deep undo stack, which by D41 can never ` +
    `contain a revision's own edit) instead of \`doc.changeFeed()\`, or the file carries a revision ` +
    `with no history.json at all.`
  );
}

/**
 * The REVERSAL of an edit — what an undo appends to the journal (D40).
 *
 * ⚠ Its `changes` are the original's, **inverted** (`before` ↔ `after`), so a consumer that replays the
 * journal forward arrives at the true current state. It is an ordinary journal entry with an ordinary
 * `seq`: the undo is *a thing that happened*, and the model records what happened.
 */
export function reversalOf(edit: UndoableEdit, seq: number, id: string): UndoableEdit {
  return {
    id,
    command: edit.command,
    label: `Undo: ${edit.label}`,
    changes: edit.changes.map((change) => ({
      collection: change.collection,
      id: change.id,
      ...(change.after === undefined ? {} : { before: change.after }),
      ...(change.before === undefined ? {} : { after: change.before }),
    })),
    seq,
    at: new Date().toISOString(),
    reverses: edit.id,
    rebuilt: edit.rebuilt,
  };
}
