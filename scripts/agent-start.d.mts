/**
 * Types for `agent-start.mjs`'s pure, directly-importable exports.
 *
 * ⚠ `main()` itself calls `process.exit()` on every refusal path, exactly like the CLI it is — it is
 * exercised from tests by SPAWNING the script as a child process (`execFileSync('node', [...])` against
 * a `--root` fixture, mirroring how mdo tests `agent-start.sh`), never by importing and calling it
 * in-process. `parseBaton`/`renderBaton`/`writeBaton` are pure and safe to import directly.
 */

export interface Baton {
  seat: string;
  role: string;
  machine: string;
  task: string;
  branch: string;
  claimedAt: string;
  status: string;
}

/** Parses a §0b BATON block's rows, or `null` for the empty-claim placeholder / a missing block. */
export declare function parseBaton(currentStateSrc: string): Record<string, string> | null;

/** Renders a full `<!-- BEGIN BATON -->…<!-- END BATON -->` block from a claim's fields. */
export declare function renderBaton(claim: Baton): string;

/** Splices `block` into `current_state.md`'s §0b markers and writes the file. */
export declare function writeBaton(currentStateMdPath: string, block: string): void;

export declare function main(argv?: string[]): void;
