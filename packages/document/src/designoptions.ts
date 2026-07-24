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
 * ⚠ NO BODY READS ANY OF THIS IN v1.0.0 — no element carries a `designOptionId`, so the invariant is
 * vacuously satisfied today. The reservation exists so Parity-F is a BUILD, not an amendment.
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
 * ⚠ RESERVED HELPER — the invariant, expressed once, as code rather than as prose a consumer may not read.
 * Nothing calls it in v1.0.0; it exists so the three consumers implement the SAME rule instead of three
 * slightly different ones (the "one description, never two" discipline, domain rule 10).
 *
 * `true` ⇒ this element counts toward quantities / the Clean Delta / a schedule under `active`.
 * Main-model elements (no `designOptionId`) always count. An optioned element counts only when its option
 * is the one chosen for its set — or, when the set is unlisted, only when it is that set's primary.
 */
export function isElementActive(
  element: { readonly id: ElementId; readonly designOptionId?: DesignOptionId },
  options: Readonly<Record<DesignOptionId, DesignOption>> | undefined,
  active: ActiveOptions = {},
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
