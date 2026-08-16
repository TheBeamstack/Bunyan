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
