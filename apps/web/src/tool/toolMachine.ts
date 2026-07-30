/**
 * THE TOOL STATE MACHINE — P4.5 design §2, and the code half of DOMAIN RULE 19.
 *
 * > **Rule 19: a tool collects input; only a command changes the model.** A tool gathers arguments — a
 * > point, a face, a length — and commits **exactly one `Command`**. It is never a second command layer,
 * > it never touches the kernel, and **an in-progress interaction is not model state**.
 *
 * ⚠⚠ THAT LAST CLAUSE IS WHAT THIS FILE ENFORCES, AND IT IS ENFORCED BY SHAPE RATHER THAN BY DISCIPLINE.
 * A `ToolSession` is a plain immutable value holding the points collected so far. It has no reference to
 * `DocumentContext`, no `Dispatch`, no kernel, and no way to reach any of them — so a half-drawn wall
 * **cannot** be written to the scene even by a caller who wants to. Cancelling is dropping the value.
 * *The alternative design — a session that "stages" its element and cleans up on Esc — is the
 * half-committed state D42 abolished, arriving through a new door.*
 *
 * ⚠ The commit is a PURE DESCRIPTION of one command (`{ commandId, args }`), not a dispatch. The caller
 * hands it to the same `Dispatch` the ribbon and the property panel use, which is why the P4 equivalence
 * test (§11 criterion 2) can run the identical edit through `window.bunyan` and get the identical
 * `UndoableEdit`. **A tool that dispatched for itself could not be proven not to have a private path.**
 *
 * Pure, so it is headless-verified in Node.
 */

import type { Params } from '@bunyan/document';
import type { Vec3 } from '@bunyan/protocol';
import type { SnapKind } from './snap';

/** One argument a tool collects from the viewport, in order. */
export interface InputSpec {
  /** Shown in the status line while this input is being collected ("Wall: pick the start point"). */
  readonly prompt: string;
  /** Which snap kinds are offered for this input. `null` ⇒ all of them. */
  readonly snapTo: readonly SnapKind[] | null;
  /**
   * Does numeric entry apply to this input? True for a point measured FROM the previous one (a wall's
   * end, where typing `5000` means "exactly 5 m along the current direction"); false for the first point,
   * which has nothing to be relative to (§6).
   */
  readonly numeric: boolean;
}

/** The one command a completed gesture becomes. A DESCRIPTION — the tool never dispatches it itself. */
export interface ToolCommit {
  readonly commandId: string;
  readonly args: Params;
}

export interface Tool {
  readonly id: string;
  readonly label: string;
  /** Ordered; the session is ready to commit when every one is satisfied. */
  readonly inputs: readonly InputSpec[];
  /**
   * Build the single command from the collected points. Called only with `inputs.length` points.
   * ⚠ Returning `null` means "these inputs do not describe a valid edit" (a zero-length wall) — the tool
   * declines rather than committing something the kernel would refuse and the banner would blame on the
   * user's mouse.
   */
  commit(points: readonly Vec3[]): ToolCommit | null;
}

/** An in-progress gesture. Immutable: every transition returns a new value. NEVER model state. */
export interface ToolSession {
  readonly toolId: string;
  readonly collected: readonly Vec3[];
}

export function beginSession(tool: Tool): ToolSession {
  return { toolId: tool.id, collected: [] };
}

/** What input is being collected right now, or `null` when the gesture is complete. */
export function currentInput(tool: Tool, session: ToolSession): InputSpec | null {
  return tool.inputs[session.collected.length] ?? null;
}

/** Has every declared input been satisfied? */
export function isComplete(tool: Tool, session: ToolSession): boolean {
  return session.collected.length >= tool.inputs.length;
}

/**
 * Accept one collected point. Returns the next session, and whether the gesture is now complete.
 *
 * ⚠ A point offered to an already-complete session is IGNORED rather than appended. A completed gesture
 * is committed and disposed by the controller in the same turn, so an extra pointer event arriving in
 * between must not silently grow the argument list — that is how a two-point wall becomes a three-point
 * one nobody asked for.
 */
export function acceptInput(
  tool: Tool,
  session: ToolSession,
  point: Vec3,
): { readonly session: ToolSession; readonly complete: boolean } {
  if (isComplete(tool, session)) return { session, complete: true };
  const next: ToolSession = { ...session, collected: [...session.collected, point] };
  return { session: next, complete: isComplete(tool, next) };
}

/**
 * The command a complete session describes, or `null` if it is incomplete or the tool declined.
 * ⚠ This is the ONLY thing that ever leaves the tool layer heading for the document.
 */
export function commitOf(tool: Tool, session: ToolSession): ToolCommit | null {
  if (!isComplete(tool, session)) return null;
  return tool.commit(session.collected);
}

/**
 * The preview anchor — the last collected point, which a rubber band is drawn FROM.
 * `null` before the first click, when there is nothing to rubber-band from.
 */
export function anchorOf(session: ToolSession): Vec3 | null {
  return session.collected.at(-1) ?? null;
}
