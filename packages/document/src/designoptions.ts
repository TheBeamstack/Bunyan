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
 * ⇒ The invariant is NOT vacuous, the reservation is reachable, and the *"a future body surfaces it"*
 * half of `ownTagActive` was never written. `open_rulings.md` **Q17a/Q17b/Q17c**; the walk is
 * `docs/design/P5_step6D_design_options_crud_design.md`.
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
   * ⚠⚠ **IT IS NOT DORMANT, AND THIS COMMENT USED TO SAY IT WAS** (Entry 83's sweep). `isElementActive`
   * below WALKS it, and **two shipped verbs WRITE it** — `core.createElement` and
   * `core.setElementMetadata` — each validating that the id resolves. But the two walks disagree about
   * which edges are "belongs-to": `cascadeOf` (D39) cascades a delete over `hostId` ONLY, while this rule
   * excludes over `hostId` **and** `parentElementId`. ⇒ **delete a parent and its children survive in
   * `scene.elements` while vanishing from every enumerating consumer.** Measured: `modelElements()` 0 of
   * 1, a whole-model schedule 0 rows and 0 mm³ with `basis: 'exact'`, `brokenRefs()` and `unbuildable()`
   * both empty. Filed as `open_rulings.md` **Q19** — reconciling the two edge sets is a semantic ruling
   * (cascade, refuse, or surface), not a body decision.
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
  // include it: including it would double-count. Excluded, and a future body surfaces it (domain rule 3).
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
 */
export function isElementActive(
  element: OptionedElement,
  scope: OptionScope | undefined,
  active: ActiveOptions = {},
): boolean {
  const options = scope?.designOptions;
  const seen = new Set<ElementId>();
  // ⚠ An element may hang off BOTH edges at once — a window in a wall that is also a member of a group —
  // and ALL of its ancestors must be active. So this is a traversal, not a single chain walk: following
  // only one edge would silently ignore the other, which is the shape of the very defect D67 corrects.
  const pending: OptionedElement[] = [element];

  while (pending.length > 0) {
    const current = pending.pop()!;
    // A cycle in the host/parent edges is an authoring defect, not a question with an answer. Refuse it
    // the way every other hostile-document path refuses: predictably, and without spinning.
    if (seen.has(current.id)) continue;
    seen.add(current.id);

    if (!ownTagActive(current, options, active)) return false;

    for (const ancestorId of [current.hostId, current.parentElementId]) {
      if (ancestorId === undefined) continue;
      if (seen.has(ancestorId)) return false; // the edge closes a cycle — refuse, never spin
      const ancestor = scope?.elements[ancestorId];
      // ⚠ The ancestor is NAMED but ABSENT — a broken reference. Excluded, never counted (see above).
      if (ancestor === undefined) return false;
      pending.push(ancestor);
    }
  }
  return true; // every element in the belongs-to closure passed its own-tag test
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
