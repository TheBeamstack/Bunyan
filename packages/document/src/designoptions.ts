/**
 * DESIGN OPTIONS — RESERVED shapes (D65, Freeze-Gate row Ⓕ; `P5_step5F_reservations_design.md`).
 * Owner-ruled 2026-07-24: **reserve the shapes AND write the exclusion invariant into the frozen contract**
 * — because the storage is the cheap half and the invariant is the expensive one to discover late.
 *
 * ⚠ WHAT A DESIGN OPTION IS (`v1.0.0_imp_plan.md` "Parity-F"). Parallel design variants held in ONE document:
 * an **Option Set** ("Lobby scheme") contains **Options** ("Option A", "Option B"), one of them primary. An
 * element may belong to an option; a view chooses which options it shows; elements in no option are the
 * **main model**, which every option shares. Revit's model, and the way an architect actually presents
 * alternatives to a client.
 *
 * ⚠⚠⚠ THE INVARIANT — READ THIS BEFORE ANY BODY READS `designOptionId`. THIS IS THE WHOLE REASON THE ROW
 * EXISTS, AND IT IS A CORRECTNESS RULE, NOT A DISPLAY RULE:
 *
 *   > **A document with design options DELIBERATELY CONTAINS MUTUALLY-EXCLUSIVE ELEMENTS. Option A's wall
 *   > and Option B's wall both exist in `scene.elements`, and EXACTLY ONE OF THEM IS REAL. Therefore every
 *   > consumer that AGGREGATES or PUBLISHES elements — `quantities()`, the project-wide quantities roll-up,
 *   > the Clean Delta exporter, any schedule — MUST resolve an ACTIVE OPTION SET and EXCLUDE every element
 *   > whose `designOptionId` names a non-active option. An element in NO option (`designOptionId` absent) is
 *   > main-model and is ALWAYS included.**
 *
 * **Why this is a frozen-contract sentence and not an implementation note.** Today `quantities()` and the
 * Clean Delta enumerate elements with no notion that some are hypothetical. Ship options without this rule
 * and a schedule **silently double-counts** every optioned element, and Planitor receives **work packages
 * for a scheme nobody is building** — a wrong number wearing the `basis: 'exact'` badge, which is **domain
 * rule 15's** exact failure mode reached by a new road, and **rule 16's** "one physical thing is one element"
 * assumption quietly broken. The number would be plausible, which is what makes it dangerous.
 *
 * This is the **`Grid.geometry` precedent (Freeze-Gate ⓥ)**: where a reserved field CHANGES HOW AN EXISTING
 * FIELD MUST BE READ, the consumer-facing invariant is written into the contract **at reserve time** — free
 * now, a field-support bug later. Three consumers must obey it: **Bunyan's own quantities**, **Planitor**
 * (scheduling/cost), and **Miqdar** (it must never analyse two exclusive variants as one structure).
 *
 * ⚠⚠ **THIS BLOCK USED TO END "NO BODY READS ANY OF THIS IN v1.0.0 — no element carries a
 * `designOptionId`, so the invariant is vacuously satisfied today." BOTH HALVES WERE FALSE, and the
 * second is what made the first dangerous** (measured, Entry 82; swept, Entry 83). `core.createElement`
 * ACCEPTS a `designOptionId` — shape-validated, never resolved — and no verb can author the catalogue it
 * would resolve against, so `ownTagActive` below returns `false` and the element is EXCLUDED from every
 * enumerating consumer. Measured through the shipped verbs: two identical walls, one tagged, **1 row
 * where 2 exist and 3 600 000 000 mm³ where 7 200 000 000 is correct — a 50.0% under-report** carrying
 * `basis: 'exact'`, with `brokenRefs()` and `unbuildable()` both empty. **D65's own named failure mode,
 * arriving inverted:** it predicted 2.0000× over; what ships is 0.5000× under.
 *
 * ⇒ The invariant is NOT vacuous and the reservation is reachable. `ownTagActive`'s surfacing half is
 * built (D86 — `danglingDesignOptionRefs` in `document.ts`), and the exclusion itself is unchanged; the
 * catalogue CRUD that would let a document resolve the tag is `docs/BACKLOG.md` **T-011** (D85). The walk
 * is `docs/design/P5_step6D_design_options_crud_design.md`.
 */

import type { ElementId } from './entities.js';

/** A design option's id — a prefixed ULID (D44): `option-01J8Z3K7Q2…`. Never parsed for meaning. */
export type DesignOptionId = string;

/**
 * One design alternative within a named set.
 *
 * ⚠ THE SET IS A NAME, NOT A SECOND COLLECTION — deliberately. A flat `Record<DesignOptionId, DesignOption>`
 * grouped by `setName` keeps this ONE optional collection (the `views`/`families` precedent, purely additive,
 * no `SCENE_SCHEMA_VERSION` bump). A separate `optionSets` collection would be a second reserved shape and a
 * referential-integrity edge to maintain, for a grouping a string already expresses. If sets later need their
 * own properties, an `optionSets?` collection is itself an additive reservation over this.
 */
export interface DesignOption {
  readonly id: DesignOptionId;
  /** The Option Set this belongs to — "Lobby scheme". Options sharing a `setName` are mutually exclusive. */
  readonly setName: string;
  /** The option's name within its set — "Option A". */
  readonly name: string;
  /**
   * The set's default. **Exactly one option per `setName` should be primary**; it is what the main model,
   * a default view, and every non-option-aware consumer sees. ⚠ A set with no primary, or two, is an
   * AUTHORING DEFECT the future CRUD must refuse (the `StyleLayer.name` uniqueness discipline) — it is not
   * something a consumer should paper over by picking one.
   */
  readonly isPrimary: boolean;
}

/**
 * The active-option selection a consumer resolves before aggregating (the invariant above), expressed as
 * `setName → chosen DesignOptionId`. Absent/unlisted set ⇒ that set's primary option.
 *
 * ⚠ RESERVED AS A TYPE ONLY — it is the SHAPE of the argument a future `quantities({options})` /
 * Clean-Delta export / view resolution takes. Nothing stores it: a selection is a *question being asked of*
 * the model, not a property *of* the model (the `dryRun`/derived-projection discipline).
 */
export type ActiveOptions = Readonly<Record<string, DesignOptionId>>;

/**
 * The subset of an element this rule reads. A structural subset, not `Element` itself, so a consumer may
 * apply the rule to anything element-shaped (a Clean Delta row, a schedule row) without holding the whole
 * entity — while the ancestor edges stay part of the rule's input, which is the correction D67 makes.
 */
export interface OptionedElement {
  readonly id: ElementId;
  readonly designOptionId?: DesignOptionId;
  /** The element it is hosted BY (a window in a wall). The edge that carried the D67 defect. */
  readonly hostId?: ElementId;
  /**
   * The manual group/assembly it is a member of (reserved; groups are v1.0.x). The same edge as `hostId`.
   *
   * ⚠⚠ **IT IS NOT DORMANT** (Entry 83's sweep). `isElementActive` below WALKS it, and **two shipped
   * verbs WRITE it** — `core.createElement` and `core.setElementMetadata` — each validating that the id
   * resolves. ⚠ `cascadeOf` (D39/D83) cascades a delete over this edge as well as `hostId`, so the two
   * walks share one edge set: a row this rule excludes and a delete spares is a row in `scene.elements`
   * that no consumer can see, which is the defect D83 measured at `modelElements()` 0 of 1 and a
   * whole-model schedule of 0 rows and 0 mm³ wearing `basis: 'exact'`.
   */
  readonly parentElementId?: ElementId;
}

/**
 * The model the rule is resolved against — the document, narrowed to what the rule reads.
 * `Scene` satisfies it structurally, so callers pass `doc.scene`.
 */
export interface OptionScope {
  readonly elements: Readonly<Record<ElementId, OptionedElement>>;
  readonly designOptions?: Readonly<Record<DesignOptionId, DesignOption>>;
}

/** The own-tag half of the rule: does THIS element's own `designOptionId` name an active option? */
function ownTagActive(
  element: OptionedElement,
  options: Readonly<Record<DesignOptionId, DesignOption>> | undefined,
  active: ActiveOptions,
): boolean {
  const optionId = element.designOptionId;
  if (optionId === undefined) return true; // main model — shared by every option
  const option = options?.[optionId];
  // ⚠ An element naming an option the document does not define is a BROKEN REFERENCE, not a licence to
  // include it: including it would double-count. Excluded here, and reported by `doc.brokenRefs()` —
  // `danglingDesignOptionRefs` in `document.ts` is that body (domain rule 3, D86).
  if (option === undefined) return false;
  const chosen = active[option.setName];
  return chosen === undefined ? option.isPrimary : chosen === optionId;
}

/**
 * ⚠ RESERVED HELPER — the invariant, expressed once, as code rather than as prose a consumer may not read.
 * Nothing calls it in v1.0.0; it exists so the three consumers implement the SAME rule instead of three
 * slightly different ones (the "one description, never two" discipline, domain rule 10).
 *
 * `true` ⇒ this element counts toward quantities / the Clean Delta / a schedule under `active`.
 * Main-model elements (no `designOptionId`) always count. An optioned element counts only when its option
 * is the one chosen for its set — or, when the set is unlisted, only when it is that set's primary.
 *
 * ⚠⚠ **AND IT CASCADES OVER EVERY "BELONGS-TO" EDGE — D67, owner-ruled 2026-07-25, and this is the half that
 * was missing.** An element counts only if **its own option is active AND every element it hangs off is
 * active.** The rule walks `hostId` (a window in a wall) and `parentElementId` (a member of a group) upward.
 *
 * *Why:* the first version read only the element's own tag, and was handed no model, so it could not ask.
 * **Measured** (`P5_step5G_option_cascade_design.md` §1): two schemes, the author tags the WALLS — the
 * natural authoring act, and the only one Revit asks for — and a consumer counted **4 windows where 1 was
 * correct**, three of them hosted on the wall the same rule had just excluded. Each was **a window with no
 * wall**, billed into a facade nobody builds: D65's own stated failure mode, reached by the hosting edge.
 *
 * ⚠ Generated children (a curtain wall's panels, D59 Model A) need no rule: they are **not** `scene.elements`
 * rows, so they are never enumerated separately and are excluded WITH their parent, by construction.
 *
 * Edge semantics, each matching an existing precedent:
 * - **a missing ancestor ⇒ excluded** (the broken-reference precedent above — an opening whose host is gone
 *   has nothing to be cut into; counting it bills a window into thin air);
 * - **a cycle ⇒ excluded, and it TERMINATES** (a hostile `.bnn` defect; the `buildChildrenTree` cycle-guard
 *   precedent — predictable breakage, never a hang).
 *
 * ⚠⚠ **AND "A CYCLE" MEANS A CYCLE, NOT A SHARED ANCESTOR — THE FIRST IMPLEMENTATION CONFLATED THE TWO
 * AND SILENTLY EXCLUDED A LEGITIMATE ELEMENT** (found by Entry 85's `hostId` sweep, which is the other
 * half of the Q19 walk). Two edges out of one node means the ancestry is a **DAG, not a chain**, so the
 * two routes can MEET: a window hosted on a wall *and* a member of a group, where the wall and the group
 * both sit in one outer group. That is a diamond. It contains no cycle.
 *
 * The old guard tested `seen.has(ancestorId)` with ONE set doing TWO jobs — *"already judged"* (which
 * must be global, or the walk is exponential) and *"on the path I am currently walking"* (which must be
 * path-scoped, or a diamond looks like a loop). The second route into the shared ancestor found it in
 * `seen` and returned `false`. **Measured through four shipped verbs, on a document with NO design
 * options at all: `scene.elements` 4, `modelElements()` 3, the window absent from every consumer, with
 * `brokenRefs()` and `unbuildable()` both empty** — and the same graph with the two routes pointed at
 * different ancestors returns all 5 of 5. ⇒ The colours below separate the two jobs: `grey` is the
 * current path and is what a cycle closes onto; `black` is done-and-fine and is what a diamond hits.
 */
export function isElementActive(
  element: OptionedElement,
  scope: OptionScope | undefined,
  active: ActiveOptions = {},
): boolean {
  const options = scope?.designOptions;
  /** `grey` ⇒ on the path being walked right now; `black` ⇒ fully judged and active. */
  const colour = new Map<ElementId, 'grey' | 'black'>();
  // ⚠ An element may hang off BOTH edges at once — a window in a wall that is also a member of a group —
  // and ALL of its ancestors must be active. So this is a traversal, not a single chain walk: following
  // only one edge would silently ignore the other, which is the shape of the very defect D67 corrects.
  const pending: { readonly node: OptionedElement; readonly leaving: boolean }[] = [
    { node: element, leaving: false },
  ];

  while (pending.length > 0) {
    const { node, leaving } = pending.pop()!;
    // The node's whole sub-walk is finished: it leaves the current path, and can never again be mistaken
    // for a cycle by a LATER route that reaches it (that route is a diamond, and a diamond is legal).
    if (leaving) {
      colour.set(node.id, 'black');
      continue;
    }

    const seen = colour.get(node.id);
    if (seen === 'black') continue; // judged already, and it passed — a second route in is a DAG
    // A cycle in the host/parent edges is an authoring defect, not a question with an answer. Refuse it
    // the way every other hostile-document path refuses: predictably, and without spinning.
    if (seen === 'grey') return false; // this edge closes onto the path we are standing on

    colour.set(node.id, 'grey');
    if (!ownTagActive(node, options, active)) return false;

    // ⚠ PUSHED BEFORE THE ANCESTORS, so it pops AFTER all of them — the whole sub-walk happens while
    // this node is still `grey`, which is what makes the cycle test mean what it says.
    pending.push({ node, leaving: true });

    for (const ancestorId of [node.hostId, node.parentElementId]) {
      if (ancestorId === undefined) continue;
      const ancestor = scope?.elements[ancestorId];
      // ⚠ The ancestor is NAMED but ABSENT — a broken reference. Excluded, never counted (see above).
      if (ancestor === undefined) return false;
      pending.push({ node: ancestor, leaving: false });
    }
  }
  return true; // every element in the belongs-to closure passed its own-tag test
}

/**
 * ⚠⚠ **WOULD POINTING `elementId`'s BELONGS-TO EDGE AT `ancestorId` CLOSE A CYCLE?** The authoring guard
 * that `isElementActive` above has always NEEDED and never had (Entry 87).
 *
 * ⚠⚠ **WHY IT EXISTS — A CYCLE IS AUTHORABLE THROUGH TWO SHIPPED VERBS, AND IT ERASES THE ELEMENT
 * SILENTLY.** Entry 85 swept `hostId` and concluded it *"cannot dangle through the shipped verbs"* —
 * true, and the wrong question. `core.retargetReference` and `core.setElementMetadata` both
 * `requireElement` the ancestor they are about to store, which proves the target **EXISTS**; neither
 * asked whether the target is **the element itself, or something that leads back to it.** A reference
 * that resolves can still be a reference that loops. Measured through the shipped verbs on a document
 * with no design options and no `.bnn` tampering:
 *
 * ```
 * core.retargetReference { elementId: w, hostId: w }        → ACCEPTED
 *   scene.elements 1 · modelElements() 0 · brokenRefs() [] · unbuildable() []
 * core.setElementMetadata { elementId: w, parentElementId: w } → ACCEPTED
 *   scene.elements 1 · modelElements() 0 · brokenRefs() [] · unbuildable() []
 *   projectQuantities() → { rows: [], unmeasured: [], basis: 'exact' }
 * ```
 *
 * **A real wall, one verb call, zero rows in a whole-model schedule wearing `basis: 'exact'`, and both
 * diagnostics empty** — domain rule 15's failure mode and D83's silent erasure, reached by a third road
 * and needing no hostile document at all.
 *
 * ⚠ **IT WALKS BOTH EDGES, AND THAT IS LOAD-BEARING RATHER THAN THOROUGH.** A guard on `hostId` alone
 * leaves the MIXED cycle open — `A.hostId = B` then `B.parentElementId = A` is refused by neither
 * single-edge check, and `isElementActive` (which walks both) excludes both elements anyway. ⇒ **the
 * guard's edge set must be the EXCLUSION RULE's edge set, or the hole simply moves.** The same
 * requirement reached `cascadeOf` under D83, which is why all three walks now share one edge set.
 *
 * ⚠ **ONE `seen` SET IS CORRECT HERE, AND THE REASON IS NOT "IT WORKED FOR THE OTHER ONE."** This
 * computes a REACHABLE SET — *"is `elementId` above `ancestorId`?"* — where arriving twice is
 * idempotent, so `seen` answers exactly one question. `isElementActive` needed two colours because its
 * `seen` decided a BOOLEAN ABOUT THE CURRENT PATH, and *"already judged"* parts company with *"on the
 * path I am walking"* on a DAG (Entry 85). Same shape, different job: ask what the set is FOR.
 *
 * ⚠ It also terminates on a scene that ALREADY contains a cycle — a `.bnn` authored before this guard
 * existed — which is why `seen` guards the walk rather than merely the answer.
 */
export function wouldCloseBelongsToCycle(
  scope: OptionScope,
  elementId: ElementId,
  ancestorId: ElementId,
): boolean {
  if (elementId === ancestorId) return true; // the self-loop, which is the one a user reaches first
  const seen = new Set<ElementId>([ancestorId]);
  const pending: ElementId[] = [ancestorId];
  while (pending.length > 0) {
    const node = scope.elements[pending.pop()!];
    if (node === undefined) continue; // a BROKEN ancestor is not this guard's business (domain rule 3)
    for (const next of [node.hostId, node.parentElementId]) {
      if (next === undefined) continue;
      if (next === elementId) return true;
      if (seen.has(next)) continue;
      seen.add(next);
      pending.push(next);
    }
  }
  return false;
}

/**
 * ⚠⚠ THE REFERENTIAL HALF OF THE RULE, EXPRESSED ONCE — *"which of these ids name no option here?"*
 *
 * Distinct from `isElementActive`, which answers *"does this element COUNT?"*. This answers the prior
 * question every AUTHORING door has to ask before it stores a selection: **a selection nobody can
 * resolve is not a selection.**
 *
 * ⚠ IT EXISTS BECAUSE THERE WERE TWO OF IT (found by Entry 83's sweep; Entry 82 measured the same shape
 * one level down). `core.createSchedule`/`updateSchedule` looked the ids up in `commands.ts`, and
 * `core.createView`/`updateView` looked them up AGAIN in `view.ts`'s own loop — two implementations of
 * one rule in two files, which is domain rule 10's *"one description, never two"* and the exact drift
 * `optionScopeOf` was extracted to stop one level up. `open_rulings.md`'s Q17 row had meanwhile been
 * quoting the check as *shared* through two entries, so the prose and the code had already parted.
 *
 * ⚠⚠ AND IT RETURNS THE MISSES RATHER THAN THROWING, WHICH IS THE WHOLE POINT OF THE SHAPE. The two
 * doors REFUSE DIFFERENTLY ON PURPOSE and each code is agent-visible surface that must not move:
 *   - the schedule door throws `NOT_FOUND` on the FIRST unresolved id;
 *   - the view door collects it with every other descriptor problem into one `REFUSED`.
 * Sharing the *throw* would have silently re-coded one of them. **Share the predicate, not the throw.**
 */
export function unresolvedDesignOptions(
  scene: OptionScopeSource,
  ids: readonly string[] | undefined,
): readonly DesignOptionId[] {
  return (ids ?? []).filter((id) => scene.designOptions?.[id] === undefined);
}

/**
 * The scene, narrowed to what `isElementActive` reads. `Scene` satisfies it structurally.
 */
export interface OptionScopeSource {
  readonly elements: Readonly<Record<ElementId, OptionedElement>>;
  readonly designOptions?: Readonly<Record<DesignOptionId, DesignOption>>;
}

/**
 * ⚠ BUILD THE SCOPE HERE, ONCE — the companion to `isElementActive`, and it exists for the same reason.
 *
 * Resolving the catalogue is three lines of ternary (`caller-supplied ?? scene.designOptions ?? absent`),
 * and by the time the pre-freeze sweep reached this file those three lines had been **copy-pasted into
 * `enumerate.ts` and `cleandelta.ts`**, with a third copy about to land in `room.ts` for the room-solver
 * fix. That is exactly the drift `isElementActive` was extracted to prevent, reappearing one level up: the
 * RULE was shared while the SCOPE THE RULE IS EVALUATED AGAINST was not, and a consumer that assembles the
 * scope slightly differently gets a slightly different answer from an identical rule (domain rule 10 —
 * "one description, never two"; §4f's "three products, one rule").
 *
 * `override` is the caller-supplied catalogue: `scene.designOptions` is RESERVED with no authoring verb in
 * v1.0.0, so a consumer that holds one (Planitor, Miqdar, a future view resolver) supplies it here.
 */
export function optionScopeOf(
  scene: OptionScopeSource,
  override?: Readonly<Record<DesignOptionId, DesignOption>>,
): OptionScope {
  const catalogue = override ?? scene.designOptions;
  return {
    elements: scene.elements,
    ...(catalogue === undefined ? {} : { designOptions: catalogue }),
  };
}
