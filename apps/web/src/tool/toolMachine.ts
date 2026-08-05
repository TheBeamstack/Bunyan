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

import type { ElementId, Params } from '@bunyan/document';
import type { Vec3 } from '@bunyan/protocol';
import type { SnapKind } from './snap';

/**
 * ONE COLLECTED ARGUMENT — a point, PLUS WHAT IT WAS ON (Entry 80).
 *
 * ⚠⚠ IT USED TO BE A BARE `Vec3`, AND THAT IS WHY THE OPENING TOOL COULD NOT BE WRITTEN. Rule 19's
 * own sentence is *"a tool gathers arguments — a point, **a face**, a length"*, but the session could
 * only ever hold the point: a click that resolved a `SubShapeRef` threw the ref away one line later,
 * so the one input a hosted element needs — its host's identity — could not survive to `commit`. The
 * wall tool never noticed, because two clicked points are the whole of a baseline.
 *
 * ⚠ Both extras are OPTIONAL and the wall tool ignores them. A click on empty ground has no ref and
 * no element, and that is a legitimate input, not a degraded one — `commit` decides whether the
 * absence matters.
 */
export interface CollectedInput {
  readonly point: Vec3;
  /** The ENCODED `SubShapeRef` the click landed on, when it landed on a named sub-shape. */
  readonly ref?: string;
  /** The element that sub-shape belongs to — a hosted void's `hostId`, never typed by a human. */
  readonly elementId?: ElementId;
}

/**
 * What a tool may READ about the document while interpreting a gesture — and the boundary is the
 * point of the type (Entry 80).
 *
 * ⚠⚠ THIS IS NOT A HOLE IN RULE 19. A tool still commits exactly one command and still cannot write:
 * this hands it the AUTHORED PARAMETERS of an element the user has already clicked, so that "here on
 * this wall" can be turned into the numbers the command's own schema asks for (`offsetU` is measured
 * from the wall's start — you cannot compute it without knowing where the wall starts). It is a pure
 * function of the scene, injected, so the tools stay headless-testable with a two-line fake.
 *
 * ⚠ It reads `params`, not the scene, and deliberately: a tool that could reach `Element` could reach
 * its `hostId`, its children and its style, and would slowly become a second query layer. Widening
 * this is a design decision, exactly as widening `QueryGateway`'s four ops is.
 */
export interface ToolContext {
  /** The authored params of an element, or `null` if it is not in the scene. */
  paramsOf(elementId: ElementId): Params | null;
}

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
   * Build the single command from the collected inputs. Called only with `inputs.length` of them.
   * ⚠ Returning `null` means "these inputs do not describe a valid edit" (a zero-length wall, a door
   * wider than the wall it was dropped on) — the tool declines rather than committing something the
   * kernel would refuse and the banner would blame on the user's mouse.
   */
  commit(inputs: readonly CollectedInput[], ctx: ToolContext): ToolCommit | null;
}

/** An in-progress gesture. Immutable: every transition returns a new value. NEVER model state. */
export interface ToolSession {
  readonly toolId: string;
  readonly collected: readonly CollectedInput[];
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
  input: CollectedInput,
): { readonly session: ToolSession; readonly complete: boolean } {
  if (isComplete(tool, session)) return { session, complete: true };
  const next: ToolSession = { ...session, collected: [...session.collected, input] };
  return { session: next, complete: isComplete(tool, next) };
}

/**
 * The command a complete session describes, or `null` if it is incomplete or the tool declined.
 * ⚠ This is the ONLY thing that ever leaves the tool layer heading for the document.
 */
export function commitOf(tool: Tool, session: ToolSession, ctx: ToolContext): ToolCommit | null {
  if (!isComplete(tool, session)) return null;
  return tool.commit(session.collected, ctx);
}

/**
 * The preview anchor — the last collected point, which a rubber band is drawn FROM.
 * `null` before the first click, when there is nothing to rubber-band from.
 */
export function anchorOf(session: ToolSession): Vec3 | null {
  return session.collected.at(-1)?.point ?? null;
}
