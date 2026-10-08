/**
 * Types for `pr-ready.mjs` — the PR title/mergeable check.
 *
 * ⚠ `main()` calls `process.exit()` on every failure path, exactly like the CLI it is. `mergeableState`
 * is pure apart from the `view` call it takes as a parameter, and is unit-tested by injecting one.
 */

/** `true` when a PR title carries a routable `T-nnn:` / `STEWARD:` prefix. */
export declare function titleRoutes(title: string | undefined): boolean;

export interface MergeableView {
  mergeable: string | null;
  mergeStateStatus: string | null;
}

export declare function mergeableState(
  root: string,
  pr: string | number,
  opts?: {
    attempts?: number;
    waitMs?: number;
    /** Injected in tests so the poll needs no network. */
    view?: (root: string, pr: string | number, fields: string[]) => MergeableView | null;
  },
): MergeableView;

export declare function main(argv?: string[]): void;
