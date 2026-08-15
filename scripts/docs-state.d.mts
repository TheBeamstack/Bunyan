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
  /** Legacy entries: the bare number as written (`"88"`). New-scheme: `"T-091"` or `"STEWARD-<slug>"`. */
  id: string;
  /**
   * A comparable sort key — legacy entries keep their real number; new-scheme entries (which carry no
   * comparable number of their own) get a synthetic one assigned from §7's own newest-first array
   * order, always higher than any legacy number that can coexist with them. Never render this to a
   * human — render `id`.
   */
  n: number;
  /** `'legacy' | 'T'` — which heading form produced this entry. */
  scheme: 'legacy' | 'T';
  date: string;
  /** Alias of `seat`, kept for every pre-existing call site that reads `.agent`. */
  agent: string;
  seat: string;
  headline: string;
  /** Each field's FIRST PHYSICAL LINE only — what the schema checks live on. */
  fields: Record<string, string>;
  /**
   * Each field's COMPLETE text, indented continuation lines joined back on.
   *
   * ⚠⚠ Any check that SEARCHES a field for a marker must read this, never `fields`. A marker written
   * after any lead-in lands on line 2, where `fields` cannot see it.
   *
   * ⚠ THE OLD REASON GIVEN HERE WAS FALSE, and Entry 76's correction missed this fourth copy of it
   * (found Entry 80). It said these docs are "prettier-formatted at `printWidth: 100`, so the line
   * break is placed by sentence length rather than by the author" — but `current_state.md`, the only
   * file this parser opens, is in `.prettierignore`. The wrapping is placed BY HAND, which makes
   * `fieldsFull` more necessary rather than less: nothing maintains those breaks and no gate watches
   * them. See `parseAbstracts` in `docs-state.mjs`.
   */
  fieldsFull: Record<string, string>;
  raw: string;
}

export declare function readCurrentState(root: string): string;
export declare function section7(src: string): string;
export declare function parseAbstracts(src: string): EntryAbstract[];
/**
 * The highest-numbered abstract. **Throws** on an empty array rather than returning `null` — see the
 * implementation for why a silent default is the dangerous answer here.
 */
export declare function newestAbstract(abstracts: EntryAbstract[]): EntryAbstract;
/**
 * The frozen-surface verdict a reviewer routes on (Q15).
 *
 * `risk` is the routing value (*additive ⇒ the reviewing agent merges; contract-touching ⇒ the OWNER
 * merges*); `label` is what §8 prints and always STARTS with `risk`; `detail` names what moved.
 * ⚠ `rebaselined` is a QUALIFIER on the measured diff, never an answer that replaces it — passing it
 * cannot turn a contract-touching verdict into an additive one.
 */
export declare function riskVerdict(
  moved: readonly string[],
  rebaselined?: boolean,
): { risk: 'additive' | 'contract-touching'; label: string; detail: string };
export declare function entryBodies(root: string): string[];
export declare function generatedBlock(
  src: string,
  begin: string,
  end: string,
): { start: number; end: number; body: string } | null;
