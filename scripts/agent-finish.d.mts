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

export declare function main(argv?: string[]): void;
