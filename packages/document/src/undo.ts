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
