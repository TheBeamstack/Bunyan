/**
 * `DocumentContext` — **the only door** (decision D19).
 *
 *     button / drag ─┐
 *     agent verb ────┼──►  Command registry ──►  DocumentContext  ──► KernelClient ──► OCCT
 *     MCP [v1.0.x] ──┘                          THIS FILE. THE ONLY HOLDER OF THE KERNEL.
 *
 * ⚠ It owns six things, and nothing else in the product may own any of them:
 *   1. **the scene** (the parametric truth — `scene.json`);
 *   2. **the geometry** (the WASM heap: which handles are live, and who frees them);
 *   3. **the undo stack** (state deltas — a bounded session convenience);
 *   4. **the JOURNAL** (append-only, `seq`-ordered — ⚠ **the ecosystem's change feed**, D40, and NOT
 *      the undo stack: see `undo.ts` for the distinction that cost us a phase);
 *   5. **the current Model Revision** (D41 — issuing is a Command, so the document must know where it
 *      stands in its own journal);
 *   6. **the kernel gateway** (D19 — narrowed to `GeometryGateway`, so nothing downstream of here
 *      could reach a kernel op even if it tried).
 *
 * ⚠⚠ AND THE ONE PROPERTY THE WHOLE FAILURE CONTRACT RESTS ON: **a command PROPOSES a delta; this
 * class APPLIES it** — atomically. "Reject + keep last-good" (domain rule 4) means **the scene AND the
 * geometry**, together, all-or-nothing.
 *
 * ⚠ **THAT SENTENCE USED TO BE A LIE, AND THE FILE SAID IT WAS "TRUE BY CONSTRUCTION."** The scene
 * rolled back; the geometry did not. `#rebuild` committed each element as it succeeded and freed the
 * previous solids — so when a later element failed, an *innocent sibling* was left holding geometry
 * built at the **rejected** parameters, its old handles already released. Measured: a style edit that
 * one wall refuses left another wall at double its true volume, and `quantities()` reported that number
 * with **`basis: 'exact'`**. It is now true by construction, because the rebuild is **STAGED and then
 * COMMITTED** (D42): nothing that is live is touched until every element has succeeded.
 */

import type { SectionCurve } from '@bunyan/protocol';
import type { BrokenReference, ElementId, Part } from './entities.js';
import { containerCode, modelElements } from './enumerate.js';
import type {
  EnumerateOptions,
  ModelElement,
  ProjectQuantities,
  ProjectQuantityRow,
  UnmeasuredElement,
} from './enumerate.js';
import { projectSchedule, selectRows } from './schedule.js';
import type { ScheduleResult, ScheduleSources } from './schedule.js';
import type { ScheduleDefinition, ViewDescriptor } from './documentation.js';
import type { GeometryGateway } from './geometry.js';
import {
  activeForView,
  assembleViewResult,
  cutPlaneFor,
  straddlesPlane,
  withinClip,
} from './view.js';
import type { ElementBounds, UnprojectedElement, ViewResult } from './view.js';
import { isDerivedChildId } from './geometry.js';
import { affectedAssemblies, assemblyRoot, buildAssembly, childStyleUsers } from './build.js';
import { dependents } from './dependency.js';
import type { ElementGeometry } from './build.js';
import { CommandFailure } from './commands.js';
import type { Command, CommandContext } from './commands.js';
import type { Registries } from './registries.js';
import { applyChanges, emptyScene, revertChanges } from './scene.js';
import type { Scene, SceneChange } from './scene.js';
import { MockSketchSolver } from './sketch.js';
import type { SketchSolver } from './sketch.js';
import {
  PlanarRoomSolver,
  assembleRoomInput,
  polygonPerimeter,
  signedArea,
  verticalExtentOf,
} from './room.js';
import type { RoomOptionSelection, RoomSolver, Vec2 } from './room.js';
import type { ContainerId, Params } from './entities.js';
import type { ModelRevision } from './revision.js';
import {
  Journal,
  UndoStack,
  journalCoversRevision,
  missingAnchorMessage,
  reversalOf,
} from './undo.js';
import type { UndoableEdit } from './undo.js';
import { mintPei } from './ulid.js';

export interface DocumentOptions {
  readonly registries: Registries;
  /**
   * The kernel — as a NARROW gateway, never as a `KernelClient` (D19). The app's bootstrap constructs
   * the client and hands it here; a `KernelClient` satisfies this interface structurally.
   */
  readonly geometry: GeometryGateway;
  /**
   * The 2D sketch solver (D50 §0d) — injected like the kernel, for the same reasons (D19 precedent). The
   * app's bootstrap hands over the planegcs-backed `@bunyan/sketch-solver`; absent ⇒ a `MockSketchSolver`
   * (identity solve), which keeps every non-sketch test green without booting a second WASM module.
   */
  readonly sketchSolver?: SketchSolver | undefined;
  /**
   * The room-bounding solver (D50 §Space-extent B / D55) — injected like the kernel/sketch solver (D19
   * precedent), but DEFAULTING to the real `PlanarRoomSolver`: it is pure TypeScript (Q2), so unlike
   * planegcs there is no second WASM module to quarantine, and no reason to default to a mock.
   */
  readonly roomSolver?: RoomSolver | undefined;
  readonly scene?: Scene | undefined;
  /** The journal, restored from a loaded `.bnn`'s `history.json` (D40). */
  readonly journal?: readonly UndoableEdit[] | undefined;
  /** The revision the loaded file was last issued at (D34/D40). */
  readonly revision?: ModelRevision | undefined;
}

export interface PartQuantity {
  readonly name: string;
  readonly materialId: string;
  readonly materialName: string;
  /** ⚠ Whose trade builds it (D45) — the field the downstream work-package routing runs on. */
  readonly discipline: string;
  /** mm³ — from `BRepGProp`, never from the mesh. The mesh under-reports every curved solid. */
  readonly volume: number;
  /** mm² */
  readonly area: number;
  /**
   * kg — volume × the Material's density (D33). ⚠ This is the number Planitor had to GUESS.
   *
   * ⚠⚠ **ABSENT when the density cannot be resolved** (D45) — never `0`. A missing density is an
   * **unknown, not a nought**, and `{mass: 0, basis: 'exact'}` is a wrong number wearing the badge that
   * says *trust me*. Domain rule 15 forbids an estimate dressed as a measurement; it forbids this a
   * fortiori. The volume and area beside it **are** exact, and are still reported.
   */
  readonly mass?: number;
}

export interface QuantityBreakdown {
  readonly elementId: ElementId;
  readonly parts: readonly PartQuantity[];
  /**
   * ⚠ `exact`, ALWAYS, AND IT IS A DOMAIN RULE (15). Bunyan reports quantities measured from the
   * B-Rep, per part, per material. **It must never emit an estimated quantity dressed as a measured
   * one** — the downstream products have a confidence ladder precisely because everyone else's numbers
   * cannot be trusted, and Bunyan's entire contribution is to make that ladder unnecessary.
   *
   * ⚠ Which is why a quantity that cannot be measured is **omitted** (see `PartQuantity.mass`) rather
   * than zeroed: the badge stays honest because nothing wears it that has not earned it.
   */
  readonly basis: 'exact';
}

/**
 * A Space's measured extent (D50 §Space-extent B / D55) — DERIVED from its bounding walls, never stored.
 *
 * ⚠ `enclosed: false` reports the room as UNAVAILABLE, never `area: 0` (D45, the `quantities()` discipline):
 * a seed that is not enclosed is an unknown, not a nought. `volume` is present only when the vertical extent
 * is derivable (a top Level or `upperLevelId`); an un-derivable height omits the volume while area stands.
 */
export type RoomMetrics =
  | { readonly enclosed: false }
  | {
      readonly enclosed: true;
      /** mm² — the floor area on the wall inner finish face (Q1). */
      readonly area: number;
      /** mm — the boundary length. */
      readonly perimeter: number;
      /** The boundary polygon (CCW), mm, in the Level's plane. */
      readonly boundary: readonly Vec2[];
      /** mm — the derived room height (top − base), present iff the vertical extent is derivable. */
      readonly height?: number;
      /** mm³ — prismatic volume (area × height), present iff `height` is (Q5). */
      readonly volume?: number;
    };

/** What a staged rebuild produced, before anything live has been touched (D42). */
interface StagedRebuild {
  readonly geometry: Map<ElementId, ElementGeometry>;
  readonly brokenRefs: readonly BrokenReference[];
  /** Handles the staged build created and no longer needs — freed whether we commit or discard. */
  readonly intermediates: readonly string[];
  /** Elements whose geometry the commit will supersede — freed ONLY on commit. */
  readonly superseded: readonly ElementId[];
  /** Set when the kernel refused an element the caller was rebuilding (D42). */
  readonly failure?: { readonly elementId: ElementId; readonly error: string };
}

export interface ExecuteOptions {
  readonly coalesceKey?: string;
  /**
   * ⚠⚠ **THE TRANSACTION (D23, P4.5 row ⓘ, owner-ruled Q5).** Label several `execute` calls with one id
   * and they undo and redo as **a single all-or-nothing unit** — one `Ctrl+Z` reverses the whole gesture.
   *
   * The case it exists for is the corner-drag: three walls meeting at a point are dragged together, which
   * is three `core.setParams` (a D52 wall moves by its params), and three undos is not what the user did.
   * "Add a room" — four walls and a space — is the same shape one size up.
   *
   * ⚠ **It lives on the executor's options, exactly like `dryRun`**, never on the `Command` contract: a
   * command proposes a delta and knows nothing of transactional state, so grouping cannot be something a
   * command opts into or forgets. The caller that owns the GESTURE owns the id.
   *
   * ⚠ **Any id will do, and it is never parsed** — a ULID, a gesture counter, a string. It is compared for
   * equality and nothing else (D44's discipline: an id is opaque).
   *
   * ⚠ Grouping applies to CONSECUTIVE edits (see `UndoStack.takeUndoGroup`): an undo restores state
   * deltas, and a delta is only valid against the state that produced it, so interleaving two gestures
   * reverses as far as the run reaches rather than reordering anything.
   */
  readonly transactionId?: string;
  /**
   * ⚠⚠ **THE UNIVERSAL DRY RUN (D42).** Run the command for real — the real kernel, the real rebuild,
   * full fidelity — then **throw every result away** and return the `UndoableEdit` it *would* have
   * produced (or the typed failure **naming the element that refused**).
   *
   * It emits **no** edit, appends **nothing** to the journal, leaves the undo stack alone and **leaks
   * no handle**. A UI highlights the offender; an agent reads it and re-plans.
   *
   * ⚠ It lives on the **executor's options**, never on the `Command` contract — a command stays passive
   * and knows nothing of transactional state. And it is why **`planDelete()` is DELETED** (D42): a
   * hand-written `plan…()` beside every verb is a second description of one behaviour, and it drifts.
   * `execute('core.deleteElement', args, { dryRun: true })` already returns an edit that lists the
   * whole cascade — because the real command computed it.
   */
  readonly dryRun?: boolean;
}

export class DocumentContext {
  #scene: Scene;
  readonly #registries: Registries;
  readonly #geometry: GeometryGateway;
  readonly #sketchSolver: SketchSolver;
  readonly #roomSolver: RoomSolver;
  readonly #undo = new UndoStack();
  /** ⚠ The change feed (D40). Append-only, never trimmed — NOT the undo stack. */
  readonly #journal = new Journal();
  #revision: ModelRevision | undefined;
  /** elementId → its built parts. NOT persisted: parts are built from the recipe, never stored (D30). */
  readonly #geometryByElement = new Map<ElementId, ElementGeometry>();

  constructor(options: DocumentOptions) {
    this.#registries = options.registries;
    this.#geometry = options.geometry;
    this.#sketchSolver = options.sketchSolver ?? new MockSketchSolver();
    this.#roomSolver = options.roomSolver ?? new PlanarRoomSolver();
    this.#scene = options.scene ?? emptyScene();
    this.#revision = options.revision;
    if (options.journal !== undefined) this.#journal.restore(options.journal);
  }

  get scene(): Scene {
    return this.#scene;
  }
  get registries(): Registries {
    return this.#registries;
  }
  get canUndo(): boolean {
    return this.#undo.canUndo;
  }
  get canRedo(): boolean {
    return this.#undo.canRedo;
  }

  /**
   * The UNDO STACK, oldest first — a bounded session convenience.
   *
   * ⚠⚠ **THIS IS NOT THE CHANGE FEED.** That is `changeFeed()`. They were the same thing until D40, and
   * that is precisely why the Clean Delta was not computable: this list is capped at 200 and `undo()`
   * pops entries out of it. **Do not overload it.**
   */
  history(): readonly UndoableEdit[] {
    return this.#undo.history();
  }

  /**
   * ⚠⚠ **THE ECOSYSTEM'S CHANGE FEED** (D40, domain rule 14) — append-only, `seq`-ordered, never
   * trimmed. This is what `history.json` persists and what a Clean Delta producer reads.
   */
  changeFeed(): readonly UndoableEdit[] {
    return this.#journal.entries();
  }

  /**
   * ⚠⚠ **THE CLEAN DELTA, AND IT IS ONE LINE**: *what changed since the given revision.* **Read off the
   * journal — never inferred by diffing two models.** That sentence is the entire ecosystem argument,
   * and until D40 it was not true: the revision had no anchor into the log, so a producer would have had
   * to diff — the exact guessing BIMsync is an entire platform built to do for foreign models.
   */
  changesSince(revision: ModelRevision): readonly UndoableEdit[] {
    // ⚠⚠ AND IT REFUSES RATHER THAN ANSWERING `[]` OUT OF A LOG THAT CANNOT SEE THE BASELINE (rule 14,
    // swept 2026-07-28). An empty delta is a true and ordinary answer — *"nothing has happened since I
    // issued it"* — and it is indistinguishable from *"I cannot see that revision at all"* unless
    // somebody checks. Nobody did: a document reopened from a `.bnn` that carried its revision but not
    // its journal reported every element unchanged, in a package that carries money.
    if (!journalCoversRevision(this.#journal.entries(), revision)) {
      throw new Error(missingAnchorMessage(revision));
    }
    return this.#journal.since(revision.issued_at_seq);
  }

  /** The revision this document was last ISSUED at (D34). `undefined` ⇒ never issued. Saving ≠ issuing. */
  get revision(): ModelRevision | undefined {
    return this.#revision;
  }

  brokenRefs(): readonly BrokenReference[] {
    return this.#scene.brokenRefs;
  }

  /**
   * Elements that could not be built **at all** — an unregistered Type, or one from the future (D43).
   * Visible, preserved, never built, never edited, and **never a reason to refuse somebody else's
   * command**. A UI lists them beside the broken refs; a save round-trips them verbatim.
   */
  unbuildable(): readonly { readonly elementId: ElementId; readonly reason: string }[] {
    const out: { elementId: ElementId; reason: string }[] = [];
    for (const [id, geometry] of this.#geometryByElement) {
      if (geometry.failure === 'unbuildable') {
        out.push({ elementId: id, reason: geometry.error ?? 'unbuildable' });
      }
    }
    return out;
  }

  /** The built parts of an element. `undefined` if it has never been built (or failed to). */
  partsOf(id: ElementId): readonly Part[] | undefined {
    return this.#geometryByElement.get(id)?.parts;
  }
  geometryOf(id: ElementId): ElementGeometry | undefined {
    return this.#geometryByElement.get(id);
  }

  /* ============================================================================================
   * THE ONE ENTRY POINT. Every actor — human, agent, test — comes through here (D19).
   * ========================================================================================= */

  /**
   * Execute a registered command and RETURN ITS `UndoableEdit` (D23).
   *
   * ⚠ **Agent-issued commands opt OUT of edit-coalescing** (D23): a `SUPERSEDED` failure is meaningless
   * to an agent that issued one deliberate command. Coalescing belongs to interactive input — a drag —
   * which is why `coalesceKey` is an option here rather than a default.
   *
   * ⚠⚠ **ALL-OR-NOTHING** (D42). The command proposes; we stage the whole rebuild; and only when every
   * element has succeeded do we swap the new geometry in and free the old. If anything refuses, the
   * scene AND the heap are exactly as they were — not "mostly", not "the scene at least".
   */
  async execute(
    commandId: string,
    args: Params,
    options: ExecuteOptions = {},
  ): Promise<UndoableEdit> {
    const command = this.#registries.commands.get(commandId);
    if (command === undefined) {
      throw new CommandFailure('NOT_FOUND', `unknown command "${commandId}"`);
    }

    // 1. The command PROPOSES. It cannot touch the scene, the kernel, the journal or the undo stack.
    const edit = await command.execute(this.#contextFor(command), args);

    // 2. We STAGE the whole rebuild against a scene that only exists locally, so far.
    const next = applyChanges(this.#scene, edit.changes);
    const affected = this.#affected(edit);
    const staged = await this.#stage(next, affected, options);

    if (staged.failure !== undefined) {
      // ⚠ REJECT + KEEP LAST-GOOD (domain rule 4), and it means BOTH halves: the staged solids are
      // released, the live ones are untouched, the scene was never swapped, no edit is returned, and
      // the journal never heard about it. The failure NAMES the element that refused (D42) — a UI
      // highlights it; an agent re-plans against it.
      await this.#release(staged.intermediates);
      await this.#release(handlesOf(staged.geometry));
      throw new CommandFailure(
        'GEOMETRY_FAILED',
        `"${commandId}" was rejected: element "${staged.failure.elementId}" — ${staged.failure.error}`,
        [staged.failure.elementId],
      );
    }

    // ⚠⚠ RECORD THE CASCADE THAT ACTUALLY HAPPENED, NOT THE ONE THE COMMAND DECLARED — and this is a
    // MOAT-BEARING line, found by building the Clean Delta exporter against it (`P5_step6A_enumeration_
    // design.md`). `UndoableEdit.rebuilt` is the field the Clean Delta reads the ASSOCIATIVE CASCADE from:
    // *"a Level moved and 400 walls' quantities changed though nothing touched them directly"*
    // (`P5_step6_clean_delta_design.md` §3, `modified_qty`) — the one case the design says *"a naive
    // two-model diff gets right only by luck; Bunyan reads it off `rebuilt`."*
    //
    // ⚠ IT DID NOT. Thirteen commands — `updateContainer`, `updateGrid`, `updateMaterial`,
    // `updateSection` among them — declare `rebuilt: []`, because the command layer legitimately does not
    // KNOW what a container/grid/material edit reaches; the TYPED DEPENDENCY GRAPH does (`dependency.ts`,
    // D50 step 0a), and `#affected` has resolved it two lines above to do the rebuild. So the geometry was
    // always correct and **the journal simply did not say so**: moving a Level rebuilt every wall on it
    // and recorded `rebuilt: []`, and a Clean Delta consumer would have been told that a storey full of
    // re-quantified walls was `unchanged`. A wrong schedule, from a green suite. *(§1c-7's disease again:
    // the claim was written in a design doc and never read against the code.)*
    //
    // The command's declaration and the graph's answer are now ONE answer, exactly as `#affected` itself
    // exists to make them (see its own comment). Additive: the field is frozen and unchanged; only its
    // content is now complete.
    //
    // ⚠ AND THE TRANSACTION IS STAMPED HERE FOR THE SAME REASON `rebuilt` IS CORRECTED HERE: it is the
    // EXECUTOR's knowledge, not the command's. A command proposes a delta; whether that delta is one step
    // of a larger gesture is something only the caller driving the gesture can know (D23, row ⓘ).
    const journalled: UndoableEdit = {
      ...edit,
      rebuilt: affected,
      ...(options.transactionId === undefined ? {} : { transactionId: options.transactionId }),
    };

    // 3. A DRY RUN stops here: full fidelity, real kernel, and then we throw it all away.
    if (options.dryRun === true) {
      await this.#release(staged.intermediates);
      await this.#release(handlesOf(staged.geometry));
      return journalled;
    }

    // 4. COMMIT. Now — and only now — the live state moves.
    this.#scene = next;
    await this.#commit(staged);
    // ⚠ AN ISSUED REVISION IS JOURNALLED BUT **NOT UNDOABLE** (D41). You cannot recall a revision you
    // have already handed downstream, and an "undo" of one would be a lie in the single log three
    // products compute schedules and payments from. It changes no scene state either — so putting it on
    // the undo stack would offer the user a menu item that does nothing.
    if (journalled.revision === undefined) this.#undo.push(journalled);
    this.#record(journalled);
    return journalled;
  }

  /**
   * Reverse the last edit — or, when it carries a `transactionId`, **the whole transaction, atomically**
   * (D23, P4.5 row ⓘ, owner-ruled Q5). Returns the NEWEST edit of the unit reversed.
   *
   * ⚠⚠ ONE STAGE, ONE COMMIT, FOR THE WHOLE UNIT — the group is reverted against a candidate scene and
   * the entire rebuild is staged once, so D42's all-or-nothing covers the transaction and not merely each
   * edit inside it. Undoing three of four walls and refusing on the fourth would leave a room the user
   * never drew, and *"must all apply or none"* is exactly what the row asked to be confirmed.
   */
  async undo(): Promise<UndoableEdit | undefined> {
    // ⚠ NEWEST FIRST, and reverted in that order: a delta is only valid against the state that produced
    // it, so the last edit made is the first edit reversed.
    const group = this.#undo.takeUndoGroup();
    const newest = group[0];
    if (newest === undefined) return undefined;

    let next = this.#scene;
    for (const edit of group) next = revertChanges(next, edit.changes);
    const affected = [...new Set(group.flatMap((edit) => [...this.#affected(edit)]))];
    const staged = await this.#stage(next, affected, {});
    if (staged.failure !== undefined) {
      // ⚠ `undo()` and `redo()` had NO try/catch at all. An undo whose rebuild refuses now leaves the
      // document exactly where it was — and, because the undo did not happen, the edit goes back on the
      // stack it was taken from. ⚠ The WHOLE group goes back, one `takeRedo` per edit taken: they are the
      // top of the redo branch in the order they were popped, so this restores the stack exactly.
      await this.#release(staged.intermediates);
      await this.#release(handlesOf(staged.geometry));
      for (let i = 0; i < group.length; i++) this.#undo.takeRedo();
      throw new CommandFailure(
        'GEOMETRY_FAILED',
        `undo of "${newest.command}"${group.length > 1 ? ` (a transaction of ${String(group.length)} edits)` : ''} was rejected: element "${staged.failure.elementId}" — ${staged.failure.error}`,
        [staged.failure.elementId],
      );
    }

    this.#scene = next;
    await this.#commit(staged);

    // ⚠⚠ THE UNDO IS JOURNALLED AS A **REVERSAL**, NEVER AS AN ERASURE (D40). A consumer downstream may
    // already hold the state being reversed *from* — deleting the original entry would leave it holding
    // a state the model denies ever existed. An undo is a thing that HAPPENED, and the journal records
    // what happened. ⚠ One reversal PER EDIT, in the order they were reversed: the journal is a record of
    // events, so a three-edit transaction undone is three reversals (each naming what it `reverses`),
    // never one summary entry that no original edit corresponds to.
    for (const edit of group) {
      this.#record(reversalOf(edit, this.#journal.nextSeq, this.#editId(edit.command)));
    }
    return newest;
  }

  /** Re-apply the last undone edit — or its whole transaction, atomically. Returns the newest edit. */
  async redo(): Promise<UndoableEdit | undefined> {
    // ⚠ OLDEST FIRST — the order the edits were originally applied in, which is the only order their
    // deltas compose in.
    const group = this.#undo.takeRedoGroup();
    const newest = group[group.length - 1];
    if (newest === undefined) return undefined;

    let next = this.#scene;
    for (const edit of group) next = applyChanges(next, edit.changes);
    const affected = [...new Set(group.flatMap((edit) => [...this.#affected(edit)]))];
    const staged = await this.#stage(next, affected, {});
    if (staged.failure !== undefined) {
      await this.#release(staged.intermediates);
      await this.#release(handlesOf(staged.geometry));
      for (let i = 0; i < group.length; i++) this.#undo.takeUndo();
      throw new CommandFailure(
        'GEOMETRY_FAILED',
        `redo of "${newest.command}"${group.length > 1 ? ` (a transaction of ${String(group.length)} edits)` : ''} was rejected: element "${staged.failure.elementId}" — ${staged.failure.error}`,
        [staged.failure.elementId],
      );
    }

    this.#scene = next;
    await this.#commit(staged);
    // A redo is a re-application: it is journalled as its own entry, with a fresh `seq`.
    for (const edit of group) {
      this.#record({
        ...edit,
        id: this.#editId(edit.command),
        seq: this.#journal.nextSeq,
        at: new Date().toISOString(),
        label: `Redo: ${edit.label}`,
      });
    }
    return newest;
  }

  /**
   * Build (or rebuild) EVERY element from the recipe.
   *
   * ⚠⚠ THIS IS THE PRIMARY LOAD PATH, AND IT MUST REMAIN ONE FOREVER (spec §6): a document loads from
   * `scene.json` **alone**, with no geometry cache present — which is the state the product has been
   * in since the day it was written, and the state a `.bnn` written by Miqdar (which has a solver, not
   * an OCCT kernel, and so *cannot* produce a cache even in principle) will always be in.
   *
   * ⚠ **IT DOES NOT THROW ON A FAILED ELEMENT** (D43). It used to, and so **one unregistered type
   * bricked the whole file**: a `.bnn` from Miqdar, a plugin type, or simply a newer Bunyan, and the
   * document would not open at all. A failed element is now `failed`, visible via `unbuildable()` /
   * `geometryOf()`, and **preserved verbatim through save**. The building around it opens and edits.
   */
  async rebuildAll(): Promise<void> {
    const staged = await this.#stage(this.#scene, Object.keys(this.#scene.elements), {}, false);
    await this.#commit(staged);
  }

  /**
   * Build (or rebuild) ONLY the named elements — the bounded counterpart of `rebuildAll`.
   *
   * ⚠ WHY IT EXISTS (owner ruling 2026-07-25, `P5_step6A_enumeration_design.md` §4 Q2): the Clean Delta's
   * `prior` values need the model **as it stood at the last issued revision**, and the ruling was to
   * rewind the journal and **rebuild only what the delta names** — so the cost scales with the size of
   * the CHANGE, not the size of the model. `rebuildAll` on a 10k-element building to price a 38-element
   * delta is the difference between an export and a coffee break (§1a: cold load is ~6.35 min at target).
   *
   * ⚠ Like `rebuildAll` it does NOT throw on a failed element (D43) — one unregistered type must not
   * brick an export any more than it bricks a file. It builds whole ASSEMBLIES: naming a hosted window
   * builds its wall, because a hole is not a thing you can build on its own.
   */
  async rebuildOnly(ids: Iterable<ElementId>): Promise<void> {
    const roots = affectedAssemblies(this.#scene, ids);
    if (roots.length === 0) return;
    const staged = await this.#stage(this.#scene, roots, {}, false);
    await this.#commit(staged);
  }

  /**
   * Free every OCCT solid this document holds, and forget them.
   *
   * ⚠⚠ THE HEAP DISCIPLINE, FOR A DOCUMENT THAT IS ITSELF DISPOSABLE (spec §6.2). OCCT solids live on
   * the Emscripten heap and are **not** garbage-collected, so a *throwaway* document — the Clean Delta
   * exporter builds one to price the model at the previous revision — leaks its entire geometry the
   * moment the reference is dropped, silently, into the same tab the user is still modelling in. This is
   * the Entry-21 leak class one level up: there the leak was per-rebuild, here it is per-export.
   *
   * ⚠ Idempotent, and the document is unusable afterwards by design (its handles are gone). It is for a
   * document you built to answer one question.
   */
  async dispose(): Promise<void> {
    const handles: string[] = [];
    for (const geometry of this.#geometryByElement.values()) {
      for (const part of geometry.parts) handles.push(part.handle);
    }
    this.#geometryByElement.clear();
    // ⚠ Cleared FIRST: `#release` skips any handle the document still points at, so releasing before
    // clearing would free nothing at all.
    await this.#release(handles);
  }

  /* ============================================================================================
   * QUERIES — they read the RECIPE (no kernel op), and they return SEMANTICS, never triangles (D23).
   * ========================================================================================= */

  /**
   * ⚠ THE QUANTITY. Measured from the B-Rep, **per part, per material** — the thing a monolithic solid
   * could not answer at any price, and the thing three products downstream are waiting for.
   *
   * *"How much plaster is on this wall?"* is this function, and it is why D30 exists.
   */
  async quantities(id: ElementId): Promise<QuantityBreakdown> {
    const geometry = this.#geometryByElement.get(id);
    if (geometry === undefined || geometry.parts.length === 0) {
      throw new CommandFailure('NOT_FOUND', `element "${id}" has no built geometry`);
    }
    const parts: PartQuantity[] = [];
    for (const part of geometry.parts) {
      const measured = await this.#geometry.request('measure', { handle: part.handle });
      const material = this.#scene.materials[part.materialId];
      // ⚠⚠ THE BILLABLE AREA (D72, domain rule 15). When the Type declares which faces are EXPOSED, the
      // area is the sum of those faces, each MEASURED on the B-Rep via `measure(ref)` — never the
      // solid's total enclosing surface, which for a 5 × 3 m three-layer wall came to 94.80 m² against a
      // 15 m² paintable face because it counted every buried face, every edge and both caps.
      //
      // ⚠ Openings fall out correctly for free, which is why this is measured per FACE rather than
      // computed: a door's hole shrinks the face it cuts, and the reveals it creates are DIFFERENT faces
      // that are not in `exposedRefs` — exactly the owner-ruled QS convention (net of openings, reveals
      // excluded). No opening-aware arithmetic exists anywhere, and none should.
      //
      // ⚠ A Type that declares nothing keeps the old whole-solid number. That is a deliberate
      // transitional fallback, not a second definition: `core.wall` declares, and every remaining
      // shipped Type owes the same declaration (recorded in Entry 60).
      // ⚠ ABSENT and EMPTY are DIFFERENT, and conflating them is a real defect: a wall's MIDDLE layer
      // declares an empty list because it genuinely has no exposed face, and treating that as "said
      // nothing" would fall back to its 31.28 m² total surface — re-introducing the exact over-report
      // this member exists to remove, on the one layer whose right answer is zero.
      let area = measured.area;
      if (part.exposedRefs !== undefined) {
        area = 0;
        for (const ref of part.exposedRefs) {
          const face = await this.#geometry.request('measure', { handle: part.handle, ref });
          area += face.area;
        }
      }
      parts.push({
        name: part.name,
        materialId: part.materialId,
        materialName: material?.name ?? part.materialId,
        discipline: part.discipline,
        volume: measured.volume,
        area,
        // ⚠ mm³ → m³ → kg, from the Material's OWN density (D33) — never a hardcoded 7850. And when
        // there is no density to read, `mass` is **ABSENT** (D45): the volume and area are still exact,
        // and a missing density is an unknown rather than a nought. `0 kg, basis: 'exact'` was a wrong
        // number wearing the badge that says trust me — worse than no number at all (rule 15).
        ...(material === undefined ? {} : { mass: (measured.volume / 1e9) * material.density }),
      });
    }
    return { elementId: id, parts, basis: 'exact' };
  }

  /* --------------------------------------------------------------------------------------------
   * ⚠⚠ THE PROJECT-WIDE PATH (`P5_step6A_enumeration_design.md`). Entry 57's second finding was that
   * `scene.elements` is the AUTHORED ROWS, not the model: it misses generated children (measured: a
   * 3×2 curtain wall is 1 row and 17 real elements), includes non-active design options, and includes
   * elements with no own parts — on which the naive project-wide loop THROWS. One query serves the
   * roll-up, the schedules (D58) and the Clean Delta alike, which is the plan's own instruction:
   * *"make it a command/query, not a loop every consumer rewrites."*
   * ----------------------------------------------------------------------------------------------- */

  /** Every REAL element of the model — authored rows AND generated children, options resolved. */
  modelElements(options: EnumerateOptions = {}): readonly ModelElement[] {
    return modelElements(this.#scene, (id) => this.#geometryByElement.get(id), options);
  }

  /** The LBS address of a container — `Site/Tower A/Level 1` (spec §7a). `''` when unplaced. */
  containerCodeOf(id: ContainerId | undefined): string {
    return containerCode(this.#scene, id);
  }

  /**
   * ⚠⚠ *"HOW MUCH C25/30 IS IN THIS BUILDING?"* — the P5 exit criterion whose naive implementation has
   * crashed since it was first measured on 2026-07-14. Per part, per material, per discipline, per
   * container, over every real element.
   *
   * ⚠ **Voids and pure composites contribute nothing BY CONSTRUCTION, not by catching an exception** —
   * an element with no own parts simply yields no rows. ⚠⚠ And an element that cannot be MEASURED is
   * reported in `unmeasured`, never zeroed and never silently dropped (owner-ruled 2026-07-25): a
   * project total that is plausible and short is domain rule 15's failure mode as an aggregate.
   */
  async projectQuantities(options: EnumerateOptions = {}): Promise<ProjectQuantities> {
    const rows: ProjectQuantityRow[] = [];
    const unmeasured: UnmeasuredElement[] = [];

    for (const element of this.modelElements(options)) {
      if (element.state !== 'valid') {
        unmeasured.push({
          elementId: element.id,
          reason:
            this.#geometryByElement.get(element.id)?.error ?? element.failure ?? element.state,
        });
        continue;
      }
      // A pure void (a plain opening) or a pure composite (a curtain wall, its columns) has no own
      // parts. It is a real element with a PEI a tag may bind to — it just has nothing to measure.
      if (!element.hasParts) continue;

      // ⚠⚠ A MEASUREMENT THAT REFUSES COSTS ITS ELEMENT, NEVER THE BUILDING (domain rule 4, swept
      // 2026-07-27). This call was unguarded, so ONE `measure` refusal anywhere threw out of the loop
      // and the whole take-off returned nothing — no rows, no totals, not even the `unmeasured` list
      // that exists for exactly this. **The owner had already ruled the opposite** (Entry 58, Q1: an
      // element that cannot be measured is reported, never zeroed and never silently dropped);
      // aborting was a third behaviour nobody sanctioned. It is D43's shape one level up — *one
      // unregistered type must not brick a file* becomes *one unmeasurable element must not brick an
      // export* — and at the 10k-element target D48 makes binding, that is a building lost to a box.
      //
      // ⚠ D72 WIDENED THE SURFACE THIS SITS ON: `quantities()` now issues a `measure(ref)` per declared
      // exposed face, so a take-off makes many times the kernel calls it used to, each of which can
      // refuse. `build.ts` pre-empts the reachable cause (a Type declaring a face it does not have is
      // refused at build time); this is the backstop for every other way a measurement can fail.
      //
      // ⚠ A DIRECT `quantities(id)` STILL THROWS, deliberately. The rule is about which last-good state
      // is preserved: for one element that is nothing, for an aggregate it is every other element.
      let breakdown;
      try {
        breakdown = await this.quantities(element.id);
      } catch (error) {
        unmeasured.push({
          elementId: element.id,
          reason: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      for (const part of breakdown.parts) {
        rows.push({
          elementId: element.id,
          rootId: element.rootId,
          typeId: element.typeId,
          containerPath: element.containerPath,
          containerCode: element.containerCode,
          part,
        });
      }
    }

    return { rows, unmeasured, basis: 'exact' };
  }

  /**
   * ⚠⚠ THE SCHEDULE — `ScheduleDefinition` → rows (D58 row Ⓐ, `P5_step6B_schedules_design.md`). The third
   * and last consumer of `modelElements()`, and the one D58 ships in v1.0.0's minimal 2D.
   *
   * ⚠⚠ IT HAS NO ENUMERATION LOOP OF ITS OWN, AND THAT IS ITS CORRECTNESS. Measured 2026-07-28 against
   * the naive `Object.values(scene.elements)` loop the reservation's own test carried: a curtain-panel
   * schedule returned **0 rows where 6 is correct** (1 authored row, 17 real elements), a no-filter
   * schedule **THREW** on the pure composite, and one non-active design option produced a **2.0000×
   * over-report** — D65's named failure mode on the consumer its own sentence names first.
   *
   * ⚠ A schedule with no `quantity` column makes ZERO kernel calls: selection and every `field`/`param`/
   * `count` cell are pure functions of the scene and the built tree.
   *
   * ⚠ AND IT IS A QUERY, NOT AN EDIT (domain rule 17 — a schedule is a PROJECTION): it writes no
   * `scene.json` byte, mints no `UndoableEdit`, and caches nothing. The `.bnn` carries the DEFINITION.
   */
  /**
   * PROJECT A VIEW — the D19 door, and symmetric with `evaluateSchedule` on purpose.
   *
   * ⚠⚠ IT IS A QUERY, NOT AN EDIT (domain rule 17 — a drawing is a PROJECTION): it writes no
   * `scene.json` byte, mints no `UndoableEdit`, and caches nothing. The `.bnn` carries the DESCRIPTOR.
   * That is what makes the drawing LIVE: resize a wall and the next call draws the new wall, with zero
   * re-authoring, because there was never a stored drawing to go stale.
   *
   * ⚠ `GeometryGateway` already admitted `sectionCut` — `DocumentOpName` excludes only `tessellate` —
   * so NO SEAM CHANGED here. A drawing is parametric truth, not a render, and the type system already
   * said so.
   *
   * ⚠⚠ ONE REFUSAL COSTS ITS ELEMENT, NEVER THE DRAWING (rule 4 / D75, the `projectQuantities`
   * discipline one artifact along). An element that cannot be projected is reported in `unprojected[]`
   * beside the curves — never dropped silently. A plausible, SHORT drawing is exactly what nobody
   * audits, and a drawing is the artifact people build from.
   */
  async projectView(
    descriptor: ViewDescriptor,
    options: EnumerateOptions = {},
  ): Promise<ViewResult> {
    const plane = cutPlaneFor(descriptor, this.#scene);
    if (plane === undefined) {
      // A `3d` view is not a section — the renderer serves it from `tessellate` through its own
      // gateway. Asking a 2D op for a 3D answer would be the category error, so this REFUSES rather
      // than pretending. ⚠ It throws; it does not return an empty drawing, and the difference is the
      // whole point — an empty `ViewResult` is indistinguishable from "nothing is on this line", which
      // is the D78 failure mode this file guards against everywhere else.
      throw new Error(
        `view "${descriptor.id}" is kind "${descriptor.kind}", which has no cut plane — ` +
          `a 3d view is served by the renderer, not by sectionCut`,
      );
    }

    // The stored selection is the artifact's own — `evaluateSchedule`'s EXACT rule, deliberately, so a
    // drawing and a table asked the same question can never answer it two different ways.
    const catalogue = options.designOptions ?? this.#scene.designOptions;
    const active = activeForView(descriptor, catalogue, options.active);

    // ⚠ `catalogue` is resolved above only to seed `active` from the descriptor's own selection. It is
    // deliberately NOT forwarded here: `optionScopeOf` already falls back to `scene.designOptions` when
    // the caller passes no override, so forwarding it would be a redundant second road to the same
    // value. (I added that forward first, wrote a comment claiming it was load-bearing, then
    // revert-verified it and the suite stayed GREEN — the line was doing nothing. Removed rather than
    // kept with a false justification: §1c-7.)
    const elements = this.modelElements({ ...options, active });
    const unprojected: UnprojectedElement[] = [];
    const candidates: { element: ModelElement; handles: string[] }[] = [];

    for (const element of elements) {
      if (element.state !== 'valid') {
        unprojected.push({
          elementId: element.id,
          reason:
            this.#geometryByElement.get(element.id)?.error ?? element.failure ?? element.state,
        });
        continue;
      }
      // A pure void or a pure composite has no own parts. It is a real element a tag may bind to; it
      // simply contributes no cut curve. Nothing failed, so it is NOT `unprojected`.
      if (!element.hasParts) continue;
      const parts = this.#geometryByElement.get(element.id)?.parts ?? [];
      if (parts.length === 0) continue;
      candidates.push({ element, handles: parts.map((p) => p.handle) });
    }

    /* THE PRE-FILTER (§1.4 / §8's algorithm) — throw away what the plane and the clip cannot touch
     * BEFORE any section runs.
     *
     * ⚠⚠ IT IS TWO DIFFERENT THINGS AT ONCE AND ONLY ONE OF THEM IS AN OPTIMISATION. `straddlesPlane`
     * is pure cost: an element the plane misses contributes no cut curve either way. **`withinClip` is
     * CORRECTNESS** — `clip` is a stored, validated field of the descriptor, and without this line a
     * clipped view draws the whole model. That matters most for an `elevation`, whose plane
     * `cutPlaneFor` places at the world origin: `view.ts` says in writing that "the clip is what bounds
     * it", so for an elevation the clip is the ONLY bound in existence.
     *
     * ⚠ THE DESIGN SAID THIS TEST WAS "FREE" AND IT IS NOT QUITE — bounds are not cached on
     * `ElementGeometry`, so it costs one `bounds` crossing per part. That is still the right trade by
     * three orders of magnitude: a crossing is 0.21–0.39 µs (Entry 73, measured) against the section's
     * 1.28–1.31 ms/solid (Entry 69, measured). The whole batch is issued at once rather than serially.
     *
     * ⚠ AND IT DEGRADES CONSERVATIVELY, which is `straddlesPlane`'s own stated discipline: a `bounds`
     * that refuses leaves its element IN. A false keep costs one kernel call; a false drop costs a
     * missing wall in a drawing somebody builds from.
     */
    const bounded = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const boxes = await Promise.all(
            candidate.handles.map(async (handle) => this.#geometry.request('bounds', { handle })),
          );
          let bounds: ElementBounds | undefined;
          for (const { bounds: box } of boxes) {
            bounds =
              bounds === undefined
                ? { min: box.min, max: box.max }
                : {
                    min: [
                      Math.min(bounds.min[0], box.min[0]),
                      Math.min(bounds.min[1], box.min[1]),
                      Math.min(bounds.min[2], box.min[2]),
                    ],
                    max: [
                      Math.max(bounds.max[0], box.max[0]),
                      Math.max(bounds.max[1], box.max[1]),
                      Math.max(bounds.max[2], box.max[2]),
                    ],
                  };
          }
          return { candidate, bounds };
        } catch {
          return { candidate, bounds: undefined };
        }
      }),
    );
    const kept = bounded
      .filter(
        ({ bounds }) =>
          bounds === undefined || (straddlesPlane(bounds, plane) && withinClip(bounds, descriptor)),
      )
      .map(({ candidate }) => candidate);
    candidates.length = 0;
    candidates.push(...kept);

    // ⚠ ONE REQUEST FOR THE WHOLE VIEW, not one per element. The op takes every handle at once because
    // that is what a section is — and it is also what keeps the boundary crossings at one per drawing
    // instead of one per wall at D48's 10,000-element target.
    const handles = candidates.flatMap((c) => c.handles);
    if (handles.length === 0) {
      return assembleViewResult(descriptor, plane, [], unprojected);
    }

    let curves;
    try {
      const result = await this.#geometry.request('sectionCut', {
        handles,
        plane: { origin: plane.origin, normal: plane.normal, xAxis: plane.xAxis },
        mode: 'cut',
      });
      curves = result.curves;
    } catch (error) {
      // The whole cut refused. Every candidate is reported rather than the drawing coming back
      // plausibly empty — the D78 failure mode this file keeps guarding against.
      for (const { element } of candidates) {
        unprojected.push({
          elementId: element.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
      return assembleViewResult(descriptor, plane, [], unprojected);
    }

    /* Attribute each curve back to the element whose part produced it.
     *
     * ⚠⚠ BY THE REF **TOKEN**, NEVER BY ITS `nodeId` — AND THIS IS THE TRAP THE DESIGN PREDICTED AND I
     * WALKED INTO ANYWAY. A `nodeId` names the node that MINTED an identity, not the part that CARRIES
     * it: a wall with a window in it holds faces minted by the CUT node, and a `REL_INHERIT` face keeps
     * the token of the operand it came from. Entry 71 measured exactly this — **16 of a real wall's 34
     * identities belong to OTHER nodes, and 26 of a door frame's 34 do** — which is why §5's fixture
     * must carry an opening. Keyed by `nodeId`, the plan through a window drew **6 wall curves where 8
     * is correct** (and 10 where 20 is, across the drawing), and reported no error: D78's empty
     * artifact on the one artifact people build from. ⚠ That pair of numbers is the one the branch's
     * own §6 test reproduces on revert — `expected length 8 but got 6`, re-executed by Entry 78's
     * review. An earlier draft of this comment said "0 where 5", which no longer matched the fixture.
     *
     * `Part.refs` is the authority, because it is the canonical list of every token that part actually
     * carries whoever minted them.
     */
    const elementOfRef = new Map<string, ModelElement>();
    for (const { element, handles: partHandles } of candidates) {
      const parts = this.#geometryByElement.get(element.id)?.parts ?? [];
      for (const part of parts) {
        if (!partHandles.includes(part.handle)) continue;
        for (const token of part.refs) elementOfRef.set(token, element);
      }
    }

    const byElement = new Map<ElementId, { element: ModelElement; curves: SectionCurve[] }>();
    for (const curve of curves) {
      const token =
        curve.ref === undefined
          ? undefined
          : `${curve.ref.nodeId}/${curve.ref.kind}/${curve.ref.role}#${String(curve.ref.occurrence)}`;
      const owner = token === undefined ? undefined : elementOfRef.get(token);
      if (owner === undefined) continue;
      let bucket = byElement.get(owner.id);
      if (bucket === undefined) {
        bucket = { element: owner, curves: [] };
        byElement.set(owner.id, bucket);
      }
      bucket.curves.push(curve);
    }

    return assembleViewResult(descriptor, plane, [...byElement.values()], unprojected);
  }

  async evaluateSchedule(
    definition: ScheduleDefinition,
    options: EnumerateOptions = {},
  ): Promise<ScheduleResult> {
    // ⚠ THE STORED SELECTION IS THE ARTIFACT'S OWN (owner Q2, the `ViewCommon.designOptionIds` shape): a
    // schedule saved as "the Option B door schedule" shows Option B when it is opened. It wins for the
    // sets it names; the caller's `active` covers every other set. Absent ⇒ each set's primary, which is
    // the rule everywhere else in the product.
    const catalogue = options.designOptions ?? this.#scene.designOptions;
    let active = options.active ?? {};
    if (definition.designOptionIds !== undefined && catalogue !== undefined) {
      const declared: Record<string, string> = { ...active };
      for (const optionId of definition.designOptionIds) {
        const option = catalogue[optionId];
        if (option !== undefined) declared[option.setName] = optionId;
      }
      active = declared;
    }

    const elements = this.modelElements({ ...options, active });
    const rows = selectRows(elements, definition.filter);

    // Measure ONLY when a quantity column asks — and only for rows that have something to measure.
    const wantsQuantity = definition.columns.some((column) => column.source === 'quantity');
    const measured = new Map<ElementId, QuantityBreakdown>();
    const unmeasured: UnmeasuredElement[] = [];
    if (wantsQuantity) {
      for (const element of rows) {
        if (element.state !== 'valid') {
          unmeasured.push({
            elementId: element.id,
            reason:
              this.#geometryByElement.get(element.id)?.error ?? element.failure ?? element.state,
          });
          continue;
        }
        // A pure void or a pure composite has no own parts. It keeps its ROW — it is a real element with
        // a PEI a tag may bind to — and simply has no quantity. It is not `unmeasured`: nothing failed.
        if (!element.hasParts) continue;
        // ⚠⚠ ONE REFUSAL COSTS ITS ROW, NEVER THE TABLE (domain rule 4 / D75, the `projectQuantities`
        // discipline one artifact along). The element keeps its row with the value ABSENT and is reported
        // here; dropping it would leave a schedule that is plausible and short, which nobody audits.
        try {
          measured.set(element.id, await this.quantities(element.id));
        } catch (error) {
          unmeasured.push({
            elementId: element.id,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const sources: ScheduleSources = {
      scene: this.#scene,
      quantitiesOf: (id) => measured.get(id),
      schemaOf: (typeId) => this.#registries.types.get(typeId)?.parameterSchema,
    };
    return projectSchedule(definition, rows, sources, unmeasured);
  }

  /** The area of ONE named face — paint, formwork, cladding. This is what `measure(ref)` bought. */
  async faceArea(id: ElementId, ref: string): Promise<number> {
    const geometry = this.#geometryByElement.get(id);
    const part = geometry?.parts.find((p) => p.refs.includes(ref));
    if (part === undefined) {
      throw new CommandFailure('NOT_FOUND', `"${ref}" is not a face of any part of "${id}"`);
    }
    const measured = await this.#geometry.request('measure', { handle: part.handle, ref });
    return measured.area;
  }

  /**
   * ⚠ THE ROOM METRIC (D50 §Space-extent B / D55). A Space's floor area/volume, DERIVED from its bounding
   * walls by the room-bounding solver — never stored (recipe-is-truth), never cached (design §1): it reads
   * the LIVE scene, so moving a wall and re-querying returns the new area with nothing to invalidate.
   *
   * *"How much floor area is this room?"* — architecture's most-scheduled quantity (paint, ceilings, screed).
   * Synchronous: room bounding is pure 2D document-layer work (Q2), it never reaches the kernel.
   */
  roomMetrics(spaceId: ContainerId, selection: RoomOptionSelection = {}): RoomMetrics {
    const input = assembleRoomInput(this.#scene, spaceId, selection);
    if (input === undefined) return { enclosed: false };
    const result = this.#roomSolver.solve(input);
    if (!result.enclosed) return { enclosed: false };

    const area = Math.abs(signedArea(result.boundary));
    const perimeter = polygonPerimeter(result.boundary);
    const space = this.#scene.containers[spaceId]!;
    const extent = verticalExtentOf(this.#scene, space);
    const base = {
      enclosed: true as const,
      area,
      perimeter,
      boundary: result.boundary,
    };
    if (extent === undefined) return base;
    const height = extent.top - extent.base;
    return { ...base, height, volume: area * height };
  }

  /* ============================================================================================
   * Internals
   * ========================================================================================= */

  #editId(commandId: string): string {
    return `edit-${String(this.#journal.nextSeq)}-${commandId}`;
  }

  #contextFor(command: Command): CommandContext {
    // ⚠ The seq this command's edit WILL carry — peeked, not consumed. A command that is rejected
    // (or dry-run) burns no journal position, so the feed has no holes in it.
    const seq = this.#journal.nextSeq;
    return {
      scene: this.#scene,
      registries: this.#registries,
      revision: this.#revision,
      seq,
      // ⚠ D44 — a PREFIXED ULID, not a counter. The counter was rebuilt on load from the SURVIVING
      // ids, so a deleted `wall-3` was re-minted as `wall-3` for a different building element — and a
      // PEI is what Planitor's progress records and Miqdar's model bind to. Reuse is now impossible by
      // construction, and (the reason it was a ruling) co-editing is no longer foreclosed: a counter
      // would need an allocator, an allocator is a backend, and D37 forbids one.
      mintId: (prefix) => mintPei(prefix),
      edit: (label, changes, rebuilt, extra = {}) => ({
        id: this.#editId(command.id),
        command: command.id,
        label,
        changes,
        seq,
        at: new Date().toISOString(),
        // ⚠ `transactionId` is RESERVED, not built (D23). v1.0.0 emits one edit per command.
        rebuilt,
        ...extra,
      }),
    };
  }

  /** Append to the journal — and adopt a revision if the edit issued one (D41). */
  #record(edit: UndoableEdit): void {
    this.#journal.append(edit);
    if (edit.revision !== undefined) this.#revision = edit.revision;
  }

  /**
   * ⚠ ONE DERIVATION OF "WHAT MUST REBUILD", USED BY `execute`, `undo` AND `redo` ALIKE.
   *
   * There used to be two — `execute` trusted `edit.rebuilt` while `undo` recomputed it from the changes
   * — and two answers to one question is a bug waiting for a witness. (It had one: undoing a
   * `createMaterial` rebuilt **every element in the document**, ~7.3 s on a 195-element building, for an
   * edit that changed no geometry.)
   *
   * Both inputs are needed and neither alone suffices: the command's `rebuilt` knows what a *style* edit
   * reaches (400 walls that appear nowhere in the delta), while the changes know what a *delete* undone
   * puts back (elements that appear in no `rebuilt` list because, when the edit was made, they were
   * being destroyed).
   */
  #affected(edit: UndoableEdit): readonly ElementId[] {
    return [...new Set([...edit.rebuilt, ...this.#touched(edit.changes)])];
  }

  /**
   * Which elements a delta touched — via the TYPED DEPENDENCY GRAPH (`dependency.ts`, D50 step 0a). Every
   * rebuild edge (element-self, style→instance, container→element, grid→element) is DECLARED there, and
   * the switch is exhaustive over `SceneCollection` so no collection can silently invalidate nothing — the
   * hole through which the container→element edge (Entry 24b) was lost. This method is now the seam that
   * FEEDS the graph, not the place the edges live.
   */
  #touched(changes: readonly SceneChange[]): readonly ElementId[] {
    const ids = new Set<ElementId>();
    // ⚠ THE ONE THING THE GRAPH CANNOT DERIVE FROM THE SCENE (rule 18, D59): which generated children
    // exist, and what style each wears. They are produced by a Type's `buildChildren` — code, not data —
    // so the live tree is the only source, and it lives here. The graph still DECLARES the edge; this
    // method still only feeds it (see the note above).
    const childStyles = childStyleUsers(this.#geometryByElement, Object.keys(this.#scene.elements));
    for (const change of changes) {
      for (const id of dependents(this.#scene, change, childStyles)) ids.add(id);
    }
    return [...ids];
  }

  /**
   * ⚠⚠ **STAGE THE REBUILD — BUILD EVERYTHING, COMMIT NOTHING** (D42).
   *
   * This is the heart of "reject + keep last-good", and it is what the phrase *"true by construction"*
   * was claiming before it was true. Every affected assembly is built against the *candidate* scene into
   * a staging map. **Not one live handle is released and not one live element is replaced** until the
   * whole set has succeeded — so a failure anywhere leaves the document, and the WASM heap, exactly as
   * they were.
   *
   * @param rejectOnFailure `false` on the LOAD path (`rebuildAll`), where a failed element is a state to
   *   be carried (D43), not a command to be refused. A command always rejects (D42).
   */
  async #stage(
    scene: Scene,
    ids: Iterable<ElementId>,
    options: ExecuteOptions,
    rejectOnFailure = true,
  ): Promise<StagedRebuild> {
    const roots = affectedAssemblies(scene, ids);
    const geometry = new Map<ElementId, ElementGeometry>();
    const intermediates: string[] = [];
    const superseded: ElementId[] = [];

    // Broken refs of assemblies we are NOT rebuilding survive untouched; the rest are re-derived.
    //
    // ⚠⚠ AND AN ENTRY WHOSE ELEMENT IS GONE IS DROPPED — domain rules 1 and 3, swept backward 2026-07-27.
    // `affectedAssemblies` deliberately skips any id that is no longer in the scene, so **a deleted
    // element is never a rebuild root** and its entry sailed through the filter above untouched, forever.
    // Measured both roads: deleting an orphaned opening, and deleting the host whose D39 cascade took it.
    //
    // ⚠ Rule 3 says a broken ref is a first-class visible state **awaiting manual retargeting**. That one
    // awaited nothing — `core.retargetReference` cannot act on an element that does not exist — and
    // `scene.brokenRefs` is PERSISTED on purpose, so it was permanent: the document stayed unfixably
    // dirty, `brokenRefs()` never emptied, and a consumer asking *"is this model clean?"* read dirty for
    // the life of the file. *A refusal nobody can act on has stopped being a refusal.*
    //
    // ⚠ Rule 1 is the deeper half: `brokenRefs` is a RESULT, re-derived on every rebuild. This entry
    // outlived its subject and survived even `rebuildAll` — the primary load path — because the element
    // it names is not among the elements there are to rebuild. A derived value that outlives what it
    // describes is no longer derived, it is stored.
    //
    // ⚠ SAFE BECAUSE THERE IS EXACTLY ONE PRODUCER AND IT READS `scene.elements`: `buildAssembly` pushes
    // one entry per hosted opening it could not resolve, and `hostedBy` filters the scene's own rows. So
    // no entry can legitimately name something absent from `scene.elements` — in particular a D59
    // GENERATED CHILD is not a scene row, and cannot be the subject of one (it is not a hosted void).
    // If that ever changes, this line is where it bites, and the test naming §5 is the additivity gate.
    const broken: BrokenReference[] = scene.brokenRefs.filter(
      (b) =>
        scene.elements[b.elementId] !== undefined &&
        !roots.includes(assemblyRoot(scene, b.elementId)),
    );

    for (const root of roots) {
      const built = await buildAssembly(
        scene,
        this.#registries,
        this.#geometry,
        this.#sketchSolver,
        root,
        options.coalesceKey === undefined ? {} : { coalesceKey: options.coalesceKey },
      );
      intermediates.push(...built.intermediates);

      // ⚠ THE KERNEL REFUSED (D42) — and only this kind of failure rejects. An `unbuildable` type
      // (unregistered, or from the future) is D43's business: it is carried, not refused.
      if (
        built.result.state === 'failed' &&
        built.result.failure === 'geometry' &&
        rejectOnFailure
      ) {
        return {
          geometry,
          brokenRefs: broken,
          intermediates,
          superseded,
          failure: {
            elementId: root,
            error: built.result.error ?? 'the kernel refused the rebuild',
          },
        };
      }

      geometry.set(root, built.result);
      for (const voidGeometry of built.voids) {
        geometry.set(voidGeometry.elementId, voidGeometry);
        // ⚠ ⓙ: a hosted element now carries its OWN parts (a door's leaf), so its previous solids must be
        // freed when its assembly rebuilds — exactly like the root's. Before ⓙ a void's parts were always
        // `[]`, so this was a no-op and the void was never superseded; now a re-staged door would LEAK its
        // old leaf every rebuild without this (the Entry-21 heap-leak pattern — measured, revert-verified).
        if (this.#geometryByElement.has(voidGeometry.elementId)) {
          superseded.push(voidGeometry.elementId);
        }
      }
      // ⚠ D59 COMPOSITION: register every generated child FLAT by its derived PEI, so `quantities`/`geometryOf`
      // reach a panel and the heap discipline covers it. The TREE (ownership) lives on `built.result.children`.
      for (const childGeometry of built.children) {
        geometry.set(childGeometry.elementId, childGeometry);
      }
      broken.push(...built.brokenRefs);
      if (this.#geometryByElement.has(root)) superseded.push(root);
      // ⚠⚠ SUPERSEDE THE ROOT'S PRIOR SUBTREE (freed at commit). The freshly-built children above REPLACE the
      // previous set; every prior descendant (`${root}/…`, including a slot that VANISHED this rebuild — a
      // shrunk grid) is superseded so nothing leaks. A persistent slot's new solid is live (skipped by
      // `#release`); its old one is freed. This is the void-supersede pattern, one level up (Entry-21 leak class).
      for (const id of this.#geometryByElement.keys()) {
        if (id.startsWith(`${root}:`)) superseded.push(id);
      }
    }

    return { geometry, brokenRefs: broken, intermediates, superseded };
  }

  /**
   * Swap the staged geometry in, and free everything the rebuild orphaned.
   *
   * ⚠ THE HEAP DISCIPLINE (spec §6.2). OCCT solids live on the Emscripten heap and are NOT
   * garbage-collected. Three classes of garbage exist and all are freed here: the **superseded** solids
   * of the elements we just rebuilt, the **intermediates** the rebuild created (a wall's base solid,
   * before the window was cut out of it), and the solids of elements that were **deleted**. Miss any and
   * a drag leaks one dead solid per frame until the tab dies.
   */
  async #commit(staged: StagedRebuild): Promise<void> {
    const garbage: string[] = [...staged.intermediates];

    // Elements that vanished (a delete) take their geometry — and their handles — with them.
    // ⚠⚠ D59: a derived CHILD (a `${parentId}/…` PEI) is never a scene row, so this scene-delete scan must
    // SKIP it — else it would free every panel of a live curtain wall on every commit (a use-after-free). A
    // child is freed ONLY via its parent's subtree-supersede (a rebuild, `#stage`) or with its parent here (a
    // delete): so when an AUTHORED parent vanishes, we sweep its whole generated subtree with it, or a deleted
    // curtain wall leaks all its panels.
    const deletedRoots: ElementId[] = [];
    for (const id of this.#geometryByElement.keys()) {
      if (isDerivedChildId(id)) continue;
      if (this.#scene.elements[id] === undefined) deletedRoots.push(id);
    }
    for (const id of deletedRoots) {
      const geometry = this.#geometryByElement.get(id);
      if (geometry !== undefined) for (const part of geometry.parts) garbage.push(part.handle);
      this.#geometryByElement.delete(id);
      for (const childId of [...this.#geometryByElement.keys()]) {
        if (!childId.startsWith(`${id}:`)) continue;
        const childGeometry = this.#geometryByElement.get(childId);
        if (childGeometry !== undefined)
          for (const part of childGeometry.parts) garbage.push(part.handle);
        this.#geometryByElement.delete(childId);
      }
    }
    for (const id of staged.superseded) {
      const previous = this.#geometryByElement.get(id);
      if (previous !== undefined) for (const part of previous.parts) garbage.push(part.handle);
      // ⚠⚠ D59: DELETE, don't just free. A persistent element is re-set from `staged.geometry` below; but a
      // VANISHED generated child (a shrunk grid's dropped slot) is superseded and NOT in the fresh set — if
      // we only freed its handle it would LINGER in the map with a dangling (freed) handle. Delete first, let
      // the fresh set re-add the survivors. (For the root/voids this is a harmless delete-then-immediate-set.)
      this.#geometryByElement.delete(id);
    }
    for (const [id, geometry] of staged.geometry) this.#geometryByElement.set(id, geometry);

    this.#scene = { ...this.#scene, brokenRefs: staged.brokenRefs };
    await this.#release(garbage);
  }

  async #release(handles: readonly string[]): Promise<void> {
    const live = new Set<string>();
    for (const geometry of this.#geometryByElement.values()) {
      for (const part of geometry.parts) live.add(part.handle);
    }
    for (const handle of new Set(handles)) {
      // ⚠ Never free a handle the document still points at. A boolean's operand can also be a part's
      // final solid when an element has one part and no openings — releasing it would free the wall.
      if (live.has(handle)) continue;
      await this.#geometry.request('releaseShape', { handle });
    }
  }
}

/** Every handle in a staged build — what a rejection or a dry run must hand back to the heap. */
function handlesOf(geometry: ReadonlyMap<ElementId, ElementGeometry>): readonly string[] {
  const handles: string[] = [];
  for (const element of geometry.values()) {
    for (const part of element.parts) handles.push(part.handle);
  }
  return handles;
}
