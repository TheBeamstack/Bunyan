/**
 * Types for `reserved-classes.mjs` — the three owner-gated classes (`AGENTS.md §5`).
 *
 * ⚠ Plain Node ESM, no build step, same reasoning as `seats.d.mts`/`docs-state.d.mts`.
 */

export type ReservedClassId = 'contract-touching' | 'legal-figure' | 'freeze';

export interface ReservedClass {
  id: ReservedClassId;
  /** The GitHub label this class writes onto the PR. */
  label: string;
  color: string;
  description: string;
}

export declare const RESERVED_CLASSES: ReservedClass[];

export interface ReservedScan {
  /** The ref the diff was measured against. */
  base: string;
  /** Every class this diff falls into — empty means additive (the ordinary case). */
  classes: ReservedClassId[];
  /** Per-class, the sentence a human needs to see. */
  detail: Partial<Record<ReservedClassId, string>>;
}

export declare function detectReservedClasses(
  root?: string,
  opts?: { base?: string },
): ReservedScan;

/** Makes the PR's `needs-operator/*` labels equal `want` exactly. Throws when `gh` cannot apply it. */
export declare function syncLabels(
  root: string,
  pr: string | number,
  want: string[],
): { add: string[]; remove: string[] };

export declare function main(argv?: string[]): void;
