/**
 * Types for `agent-finish.mjs`'s directly-importable exports.
 *
 * ⚠ `main()` calls `process.exit()` on every refusal path, so it is exercised by SPAWNING the script
 * against a `--root` fixture — see `agent-start.d.mts` for the same split and the reason for it.
 */

/**
 * Rewrites a task's status cell in `docs/BACKLOG.md`, repadding it so the table's column keeps the
 * width `prettier` gave it. Exits the process if the task has no summary-table row.
 */
export declare function setRowStatus(backlogPath: string, taskId: string, next: string): void;

/**
 * Which seat the §0b baton's `builder` field should name after this finish (T-016). A `--review`
 * finish carries the prior baton's `builder` forward unchanged; a plain finish sets it to the
 * finishing seat. `priorBaton` is the baton parsed off the branch before this finish rewrites it, or
 * `null`/`undefined` when unreadable.
 */
export declare function resolveBuilder(
  review: boolean,
  priorBaton: Record<string, string> | null | undefined,
  seat: string,
): string;

/**
 * The closing message lines for a `--review` finish (T-026) — approval/merge stated as OWED, never as
 * already performed, since this script only prints the `gh pr review`/`gh pr merge` command rather
 * than running it. `prNumber` is `null` when the PR number could not be resolved.
 */
export declare function reviewClosingLines(args: {
  task: string;
  seat: string;
  role: string;
  machine: string;
  riskHighStep1: boolean;
  reviewContractTouching: boolean;
  prNumber: number | null;
}): string[];

export declare function main(argv?: string[]): void;
