/**
 * Types for `seats.mjs` — the seat registry.
 *
 * ⚠ Plain Node ESM, no build step, same reasoning as `docs-state.d.mts`/`frozen-surface.d.mts`.
 */

export interface SeatRow {
  seat: string;
  role: 'steward' | 'builder' | 'reviewer';
  machine: 'box' | 'pc';
  account: string;
  prompt: string;
}

export declare function readRegistry(root?: string): SeatRow[];
export declare function roleOf(root: string, seat: string): SeatRow['role'];
export declare function machineOf(root: string, seat: string): SeatRow['machine'];
export declare function accountOf(root: string, seat: string): string;
export declare function promptOf(root: string, seat: string): string;

/** `T-nnn: ` / `STEWARD: ` — the only two routable PR-title prefixes (`AGENTS.md §1.3`). */
export declare const PR_TITLE_RE: RegExp;

/** `true` when a PR title carries a routable `T-nnn:` / `STEWARD:` prefix. */
export declare function titleRoutes(title: string | undefined): boolean;

/** The command/path of a real browser found on this machine, or `null`. */
export declare function browserCmd(env?: NodeJS.ProcessEnv): string | null;

export declare function taskBlock(backlogSrc: string, taskId: string): string;
export declare function taskField(
  backlogSrc: string,
  taskId: string,
  field: string,
): string | undefined;

/** A task's status cell from the BACKLOG's own summary table. */
export declare function rowStatus(backlogSrc: string, taskId: string): string | undefined;

/** The task ids a `depends-on:` field names — `[]` for none or the em-dash placeholder. */
export declare function dependsOn(backlogSrc: string, taskId: string): string[];

/** The label that routes a `risk: high` task's second D88 review turn (`T-014`). */
export declare const STEP1_LABEL: string;
export declare const STEP1_LABEL_COLOR: string;
export declare const STEP1_LABEL_DESCRIPTION: string;

/** Which of D88's two review turns a `risk: high` task is on, given the PR's own label names —
 * `null` for anything else (one ordinary review turn). */
export declare function reviewStepFor(risk: string | undefined, labelNames: string[]): 1 | 2 | null;

export interface StepGateVerdict {
  ok: boolean;
  reason?: string;
}
/** Whether `--review --step N` is legal for a task carrying `risk`. `step` is whatever `--step` parsed
 * to — including an out-of-range number, which this is what refuses it. */
export declare function reviewStepGate(
  risk: string | undefined,
  step: number | null,
): StepGateVerdict;

/** Whether a `--review` finish should flip the backlog row to `done` (D88, `T-014`). */
export declare function reviewFlipsToDone(
  risk: string | undefined,
  step: number | null,
  contractTouching: boolean,
): boolean;

export interface ClaimVerdict {
  ok: boolean;
  reason?: string;
}
export declare function canClaim(
  root: string,
  seat: string,
  taskId: string,
  env?: NodeJS.ProcessEnv,
): ClaimVerdict;

export declare function readyFor(root: string, seat: string, env?: NodeJS.ProcessEnv): string[];

export interface ReviewerVerdict {
  seat: string;
  /** `true` when this project registers no reviewer on the resolved machine (solo-mode fallback). */
  solo: boolean;
}
export declare function reviewerFor(
  root: string,
  taskOrMachine: string,
  finishingSeat?: string,
): ReviewerVerdict;

export interface BuilderVerdict {
  seat: string;
}
/** The seat that OWNS a task, derived from its `machine:` field alone — never the §0b baton. */
export declare function builderFor(
  root: string,
  taskId: string,
  finishingSeat?: string,
): BuilderVerdict;

/** The seat a branch's own `<seat>/…` prefix names, or `null` when it names no registered seat. */
export declare function seatFromBranchPrefix(root: string, branchName: string): string | null;

export interface BranchReviewerVerdict {
  /** `null` when the branch prefix names no registered seat — routes to nobody, explicitly. */
  seat: string | null;
  solo: boolean;
  reason: string | null;
}
/** Reviewer routing for a PR whose title carries no `T-nnn` (T-012) — derives the machine from the
 * branch's own seat prefix, never widens it. */
export declare function reviewerForBranch(
  root: string,
  branchName: string,
  finishingSeat?: string,
): BranchReviewerVerdict;
