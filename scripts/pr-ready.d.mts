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

/** The `gh pr view` fields the checks read; one `view` answers both the title read and the poll. */
export interface PrView {
  title?: string;
  headRefName?: string;
  author?: { login?: string; is_bot?: boolean };
  mergeable?: string | null;
  mergeStateStatus?: string | null;
}

/** `true` for a `dependabot/…` head opened by the `app/dependabot` bot — both halves required. */
export declare function dependabotRoutes(pr: PrView | null | undefined): boolean;

/** Both checks; `failures` is `null` when gh could not read the PR at all. */
export declare function checkPr(opts: {
  root: string;
  pr?: string | number;
  title?: string;
  view?: (root: string, pr: string | number, fields: string[]) => PrView | null;
  poll?: { attempts?: number; waitMs?: number };
}): { passes: string[]; failures: string[] | null };

export declare function main(argv?: string[]): void;
