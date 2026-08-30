// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * VIEW FILTER — selection-adjacent visibility state (P4.5 design §7).
 *
 * ⚠ WHY THIS IS APP-LAYER AND TOUCHES NO CONTRACT. Hide / isolate / view-filter are pure UI concerns:
 * they decide *what the viewport draws*, never *what the model is*. Nothing here is persisted, nothing
 * reaches `DocumentContext`, and nothing frozen moves — a hidden element is still in the scene, still
 * saved, still built. The filter rides the identity the renderer already carries (`elementId` per part,
 * `discipline` per part — D45) and filters on what the model already knows (`typeId`, `discipline`).
 * This is the non-gating half of P4.5: it needs none of the owner rulings the tool state machine + snap
 * seam wait on, so it can land while those are decided.
 *
 * The logic lives here, PURE, so it is asserted headlessly in Node (the standing verification split:
 * GL-only code is browser-verified; anything with logic in it is headless-verified). `App` holds the
 * `ViewFilter` in React state and feeds every candidate part through `isPartVisible`.
 */

import type { ElementId } from '@bunyan/document';

/**
 * What the viewport shows. Element-level gates (`hidden` / `isolated` / `types`) decide whether an
 * element appears at all; the part-level gate (`disciplines`) can further hide individual parts of a
 * visible element — because a discipline is a property of the PART, not the element (D45): one wall's
 * blockwork is structure and its plaster is finishes, and "show only structure" must be able to drop the
 * plaster while keeping the wall.
 */
export interface ViewFilter {
  /** Elements the user explicitly hid. Ignored while `isolated` is set. */
  readonly hidden: ReadonlySet<ElementId>;
  /** When set, show ONLY this element (isolate) — overrides `hidden` and `types`, but not `disciplines`. */
  readonly isolated: ElementId | null;
  /** `null` ⇒ every type renders; otherwise only elements whose `typeId` is in the set. */
  readonly types: ReadonlySet<string> | null;
  /** `null` ⇒ every discipline renders; otherwise only parts whose `discipline` is in the set. */
  readonly disciplines: ReadonlySet<string> | null;
}

/** The default: everything visible, nothing filtered. */
export const EMPTY_FILTER: ViewFilter = {
  hidden: new Set(),
  isolated: null,
  types: null,
  disciplines: null,
};

/** Is nothing being filtered? (Drives the "Show all" button's disabled state, and the "N hidden" hint.) */
export function isPristine(filter: ViewFilter): boolean {
  return (
    filter.hidden.size === 0 &&
    filter.isolated === null &&
    filter.types === null &&
    filter.disciplines === null
  );
}

/**
 * Is this ELEMENT shown at all? (Type + hide/isolate. Discipline is per-part — see `isPartVisible`.)
 * `isolated` wins: while one element is isolated, only it is visible regardless of `hidden`/`types`.
 */
export function isElementVisible(
  filter: ViewFilter,
  elementId: ElementId,
  typeId: string,
): boolean {
  if (filter.isolated !== null) return elementId === filter.isolated;
  if (filter.hidden.has(elementId)) return false;
  if (filter.types !== null && !filter.types.has(typeId)) return false;
  return true;
}

/**
 * Is this PART shown? Its element must be visible AND its discipline must pass the discipline filter.
 * This is the predicate the render-flattening loop calls for every candidate part.
 */
export function isPartVisible(
  filter: ViewFilter,
  elementId: ElementId,
  typeId: string,
  discipline: string,
): boolean {
  if (!isElementVisible(filter, elementId, typeId)) return false;
  if (filter.disciplines !== null && !filter.disciplines.has(discipline)) return false;
  return true;
}

/** Toggle an element's membership in `hidden` — the "Hide"/"Show" action on the selected element. */
export function toggleHidden(filter: ViewFilter, elementId: ElementId): ViewFilter {
  const hidden = new Set(filter.hidden);
  if (hidden.has(elementId)) hidden.delete(elementId);
  else hidden.add(elementId);
  return { ...filter, hidden };
}

/** Toggle a value's membership in a nullable filter set (null ⇔ "all"). Adding the only-excluded value
 *  back returns to `null` (all), so an all-checked filter is indistinguishable from no filter. */
export function toggleInSet(
  current: ReadonlySet<string> | null,
  value: string,
  universe: readonly string[],
): ReadonlySet<string> | null {
  // Start from the explicit set, or from "everything" when the filter was null (all shown).
  const next = new Set(current ?? universe);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  // Every member of the universe checked ⇒ collapse back to null ("all"), the pristine state.
  if (next.size === universe.length && universe.every((u) => next.has(u))) return null;
  return next;
}
