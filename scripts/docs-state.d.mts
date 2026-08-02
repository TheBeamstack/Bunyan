/**
 * Types for `docs-state.mjs` — the shared handoff-doc model.
 *
 * ⚠ The implementation stays plain Node ESM so `pnpm state` runs with no build step; these
 * declarations exist so `tests/docs-budget.test.ts` typechecks under `strict`.
 */

export declare const BUDGET: {
  currentState: number;
  section7: number;
  maxAbstracts: number;
  decisions: number;
  history: number;
};

/** The eight mandatory fields of a §7 entry abstract. */
export declare const ABSTRACT_FIELDS: readonly string[];

export declare const MARKERS: {
  state: { begin: string; end: string };
  fresh: { begin: string; end: string };
};

/** One parsed §7 abstract. */
export interface EntryAbstract {
  n: number;
  date: string;
  agent: string;
  headline: string;
  /** Each field's FIRST PHYSICAL LINE only — what the schema checks live on. */
  fields: Record<string, string>;
  /**
   * Each field's COMPLETE text, prettier's continuation lines joined back on.
   *
   * ⚠⚠ Any check that SEARCHES a field for a marker must read this, never `fields`. These docs are
   * prettier-formatted at `printWidth: 100`, so the line break is placed by sentence length rather
   * than by the author — see `parseAbstracts` in `docs-state.mjs`.
   */
  fieldsFull: Record<string, string>;
  raw: string;
}

export declare function readCurrentState(root: string): string;
export declare function section7(src: string): string;
export declare function parseAbstracts(src: string): EntryAbstract[];
export declare function entryBodies(root: string): string[];
export declare function generatedBlock(
  src: string,
  begin: string,
  end: string,
): { start: number; end: number; body: string } | null;
