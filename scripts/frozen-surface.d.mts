/**
 * Types for `frozen-surface.mjs`.
 *
 * ⚠ The implementation stays plain Node ESM on purpose: `pnpm state` and the migration tooling must
 * run with `node scripts/…` and no build step, on either machine, before anything is installed. The
 * declarations live here so `tests/freeze-boundary.test.ts` still typechecks under `strict`.
 */

/** `{ "<repo-relative file>": { "<kind> <name>": "<16-hex digest of the normalised text>" } }` */
export type FrozenSurface = Record<string, Record<string, string>>;

/** Repo-relative paths whose exported declarations freeze at P5. */
export declare const WATCHED: readonly string[];

/** Extract top-level exported declarations as `"<kind> <name>" -> normalised text`. */
export declare function extractDeclarations(source: string): Record<string, string>;

/** Hash every watched declaration in the repo rooted at `root`. */
export declare function buildSurface(root: string): FrozenSurface;

/**
 * The baseline object `pnpm state --rebaseline` writes. Every derived field is COMPUTED — `entry` is
 * the `current_state.md` §7 entry that authorises the rewrite, and it used to be inherited and stale
 * (Q15). `prev` survives only for the fields this function does not own (`_README`).
 */
export declare function baselineSnapshot(
  prev: Record<string, unknown>,
  surface: FrozenSurface,
  /**
   * ⚠ `at` is the AUTHORISING ENTRY's §7 date, never the clock, and `entry` is its `abstractKey` —
   * never `.n`, which is a §7 position for a five-seat entry (T-024).
   */
  meta: { entry: number | string; at: string },
): Record<string, unknown> & {
  _baselinedAt: string;
  _baselinedAtEntry: number | string;
  _declarationCount: number;
  surface: FrozenSurface;
};

/**
 * Every reason the committed baseline's audit fields are wrong. Empty ⇒ sound.
 *
 * ⚠ `abstracts` is `recordedAbstracts(root)` — §7 PLUS `docs/history.md` — never the §7 parse alone.
 * §7 is a rotating byte-capped window, so membership in it is not existence, and asking it for one
 * reddens the gate on the next turn by anyone (T-024's own defect). See the implementation's comment.
 */
export declare function baselineEntryIssues(
  snapshot: { _baselinedAtEntry: number | string; _baselinedAt: string },
  abstracts: readonly {
    n: number | null;
    date: string;
    key: number | string;
    scheme?: 'legacy' | 'T';
  }[],
): string[];

/** Compare a surface against a baseline. All entries are `"<file> :: <kind> <name>"`. */
export declare function diffSurface(
  baseline: FrozenSurface,
  current: FrozenSurface,
): { added: string[]; removed: string[]; changed: string[] };
