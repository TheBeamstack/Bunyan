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

import type { BrokenReference, ElementId, Part } from './entities.js';
import { containerCode, modelElements } from './enumerate.js';
import type {
  EnumerateOptions,
  ModelElement,
  ProjectQuantities,
  ProjectQuantityRow,
  UnmeasuredElement,
} from './enumerate.js';
import type { GeometryGateway } from './geometry.js';
import { isDerivedChildId } from './geometry.js';
import { affectedAssemblies, assemblyRoot, buildAssembly } from './build.js';
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
import type { RoomSolver, Vec2 } from './room.js';
import type { ContainerId, Params } from './entities.js';
import type { ModelRevision } from './revision.js';
import { Journal, UndoStack, reversalOf } from './undo.js';
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
    const journalled: UndoableEdit = { ...edit, rebuilt: affected };

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

  async undo(): Promise<UndoableEdit | undefined> {
    const edit = this.#undo.takeUndo();
    if (edit === undefined) return undefined;

    const next = revertChanges(this.#scene, edit.changes);
    const staged = await this.#stage(next, this.#affected(edit), {});
    if (staged.failure !== undefined) {
      // ⚠ `undo()` and `redo()` had NO try/catch at all. An undo whose rebuild refuses now leaves the
      // document exactly where it was — and, because the undo did not happen, the edit goes back on the
      // stack it was taken from.
      await this.#release(staged.intermediates);
      await this.#release(handlesOf(staged.geometry));
      this.#undo.takeRedo();
      throw new CommandFailure(
        'GEOMETRY_FAILED',
        `undo of "${edit.command}" was rejected: element "${staged.failure.elementId}" — ${staged.failure.error}`,
        [staged.failure.elementId],
      );
    }

    this.#scene = next;
    await this.#commit(staged);

    // ⚠⚠ THE UNDO IS JOURNALLED AS A **REVERSAL**, NEVER AS AN ERASURE (D40). A consumer downstream may
    // already hold the state being reversed *from* — deleting the original entry would leave it holding
    // a state the model denies ever existed. An undo is a thing that HAPPENED, and the journal records
    // what happened.
    const reversal = reversalOf(edit, this.#journal.nextSeq, this.#editId(edit.command));
    this.#record(reversal);
    return edit;
  }

  async redo(): Promise<UndoableEdit | undefined> {
    const edit = this.#undo.takeRedo();
    if (edit === undefined) return undefined;

    const next = applyChanges(this.#scene, edit.changes);
    const staged = await this.#stage(next, this.#affected(edit), {});
    if (staged.failure !== undefined) {
      await this.#release(staged.intermediates);
      await this.#release(handlesOf(staged.geometry));
      this.#undo.takeUndo();
      throw new CommandFailure(
        'GEOMETRY_FAILED',
        `redo of "${edit.command}" was rejected: element "${staged.failure.elementId}" — ${staged.failure.error}`,
        [staged.failure.elementId],
      );
    }

    this.#scene = next;
    await this.#commit(staged);
    // A redo is a re-application: it is journalled as its own entry, with a fresh `seq`.
    this.#record({
      ...edit,
      id: this.#editId(edit.command),
      seq: this.#journal.nextSeq,
      at: new Date().toISOString(),
      label: `Redo: ${edit.label}`,
    });
    return edit;
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
      parts.push({
        name: part.name,
        materialId: part.materialId,
        materialName: material?.name ?? part.materialId,
        discipline: part.discipline,
        volume: measured.volume,
        area: measured.area,
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

      const breakdown = await this.quantities(element.id);
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
  roomMetrics(spaceId: ContainerId): RoomMetrics {
    const input = assembleRoomInput(this.#scene, spaceId);
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
    for (const change of changes) {
      for (const id of dependents(this.#scene, change)) ids.add(id);
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
    const broken: BrokenReference[] = scene.brokenRefs.filter(
      (b) => !roots.includes(assemblyRoot(scene, b.elementId)),
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
