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
import type { GeometryGateway } from './geometry.js';
import { affectedAssemblies, assembliesUsingStyle, assemblyRoot, buildAssembly } from './build.js';
import type { ElementGeometry } from './build.js';
import { CommandFailure } from './commands.js';
import type { Command, CommandContext } from './commands.js';
import type { Registries } from './registries.js';
import { applyChanges, emptyScene, revertChanges } from './scene.js';
import type { Scene, SceneChange } from './scene.js';
import type { Params } from './entities.js';
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
  readonly #undo = new UndoStack();
  /** ⚠ The change feed (D40). Append-only, never trimmed — NOT the undo stack. */
  readonly #journal = new Journal();
  #revision: ModelRevision | undefined;
  /** elementId → its built parts. NOT persisted: parts are built from the recipe, never stored (D30). */
  readonly #geometryByElement = new Map<ElementId, ElementGeometry>();

  constructor(options: DocumentOptions) {
    this.#registries = options.registries;
    this.#geometry = options.geometry;
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
    const staged = await this.#stage(next, this.#affected(edit), options);

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

    // 3. A DRY RUN stops here: full fidelity, real kernel, and then we throw it all away.
    if (options.dryRun === true) {
      await this.#release(staged.intermediates);
      await this.#release(handlesOf(staged.geometry));
      return edit;
    }

    // 4. COMMIT. Now — and only now — the live state moves.
    this.#scene = next;
    await this.#commit(staged);
    // ⚠ AN ISSUED REVISION IS JOURNALLED BUT **NOT UNDOABLE** (D41). You cannot recall a revision you
    // have already handed downstream, and an "undo" of one would be a lie in the single log three
    // products compute schedules and payments from. It changes no scene state either — so putting it on
    // the undo stack would offer the user a menu item that does nothing.
    if (edit.revision === undefined) this.#undo.push(edit);
    this.#record(edit);
    return edit;
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

  /** Which elements a delta touched — including the ones a STYLE edit reaches (all 400 of them, D31). */
  #touched(changes: readonly SceneChange[]): readonly ElementId[] {
    const ids = new Set<ElementId>();
    for (const change of changes) {
      if (change.collection === 'elements') {
        const element = (change.after ?? change.before) as { id: ElementId; hostId?: ElementId };
        ids.add(element.id);
        if (element.hostId !== undefined) ids.add(element.hostId);
      }
      if (change.collection === 'styles') {
        for (const id of assembliesUsingStyle(this.#scene, change.id)) ids.add(id);
      }
      // ⚠ Materials and sections deliberately rebuild NOTHING. A material carries density and
      // structural properties — it is read by `quantities()` and by Miqdar, and **no geometry depends
      // on it**: a part's shape comes from the style's layer THICKNESS. Blanket-rebuilding the document
      // on a material change was pure cost for zero effect.
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
      for (const voidGeometry of built.voids) geometry.set(voidGeometry.elementId, voidGeometry);
      broken.push(...built.brokenRefs);
      if (this.#geometryByElement.has(root)) superseded.push(root);
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
    for (const [id, geometry] of this.#geometryByElement) {
      if (this.#scene.elements[id] === undefined) {
        for (const part of geometry.parts) garbage.push(part.handle);
        this.#geometryByElement.delete(id);
      }
    }
    for (const id of staged.superseded) {
      const previous = this.#geometryByElement.get(id);
      if (previous !== undefined) for (const part of previous.parts) garbage.push(part.handle);
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
