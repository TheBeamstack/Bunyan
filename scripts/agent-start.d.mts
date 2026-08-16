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

export interface OpenPR {
  number: number;
  headRefName: string;
  title: string;
}

/** The open PR whose title names `taskId` (`gh pr list --json number,headRefName,title`), or `null`. */
export declare function findTaskPR(openPRs: OpenPR[], taskId: string): OpenPR | null;

/**
 * The two-step review routing decision (D88, T-014), pure. `labels` is the claimed PR's label names,
 * or `null` when unreadable. Returns `null` for a single-turn review, `1`/`2` for a two-step one, and
 * throws rather than guesses when `mineRisk` or `labels` could not be read.
 */
export declare function resolveReviewStep(
  mineId: string | undefined,
  mineRisk: string | undefined,
  labels: string[] | null,
  prNumber: number,
): number | null;

/**
 * The identity guard (D87, T-013): whether `gh`'s own authenticated login matches this seat's account.
 * `actualLogin` is `null` when it could not be resolved at all (gh missing/unauthenticated/offline) —
 * that is a refusal, never a skip. Comparison is case-insensitive.
 */
export declare function identityGate(
  seat: string,
  expectedAccount: string,
  actualLogin: string | null,
): { ok: boolean; reason?: string };
