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

/** Compare a surface against a baseline. All entries are `"<file> :: <kind> <name>"`. */
export declare function diffSurface(
  baseline: FrozenSurface,
  current: FrozenSurface,
): { added: string[]; removed: string[]; changed: string[] };
