/**
 * `GeometryGateway` — the ONLY way anything in the document layer reaches the kernel (decision D19).
 *
 * ⚠⚠ READ THIS BEFORE YOU ADD A KERNEL CALL ANYWHERE ELSE.
 *
 * D19: **there is one command layer, and humans and AI agents both act through it.** `DocumentContext`
 * is the only holder of a `KernelClient`. No React component, no command, no agent, ever calls a kernel
 * op directly. The reason is not stylistic:
 *
 *     EVERY CAPABILITY REACHABLE ONLY THROUGH THE UI IS A CAPABILITY AN AGENT CAN NEVER HAVE
 *
 * — and nobody discovers the gap until an agent is asked to use it, a year later.
 *
 * ⚠ **THIS PACKAGE DOES NOT DEPEND ON `@bunyan/kernel-client` AT ALL.** That is deliberate, and it is
 * stronger than the lint rule the plan asked for: a rule you can turn off is a convention, whereas a
 * package that does not have the dependency **cannot import it, even by accident, even under a
 * deadline**. `DocumentContext` accepts this interface; a `KernelClient` satisfies it structurally.
 * The app's bootstrap constructs the client and hands it over — and that is the only place in the
 * product where the two ever meet.
 *
 * (`tests/d19-boundary.test.ts` proves this by grep, so the rule holds for `apps/` too, where the
 * package boundary alone would not reach.)
 */

import type { OpName, OpPayload, OpResult } from '@bunyan/protocol';

/** Requests sharing a key supersede one another (a drag). ⚠ Agent commands opt OUT of this — D23. */
export interface GeometryRequestOptions {
  readonly coalesceKey?: string;
  readonly timeoutMs?: number;
}

/**
 * The kernel ops the document layer is allowed to reach for. Structurally a subset of `KernelClient`.
 *
 * ⚠ It is deliberately NOT `all of OpMap`. `tessellate` is absent: the document model is the
 * *parametric truth*, and triangles are a disposable projection for the renderer. A document-layer
 * call that wanted a mesh would be a document layer that had started rendering.
 */
export interface GeometryGateway {
  request<Op extends OpName>(
    op: Op,
    payload: OpPayload<Op>,
    options?: GeometryRequestOptions,
  ): Promise<OpResult<Op>>;
}

/**
 * A part's node in the operation DAG. **This is the whole of D30's kernel cost, and it is zero.**
 *
 * `nodeId` is an opaque string in the protocol, so a part is simply its own node: `wall-1.structure`.
 * Stable across rebuilds by construction — it is derived from the element id and the part name, and a
 * rebuild changes neither.
 */
export function partNodeId(elementId: string, partName: string): string {
  return `${elementId}.${partName}`;
}

/**
 * The node that owns the identities a HOSTED VOID creates when it cuts a part — the reveal faces of a
 * window, and the section edges around them.
 *
 * ⚠ They belong to the CUT, not to the wall, and that is correct: nobody owned them before the cut
 * existed. The wall's own faces keep their own tokens through the boolean (measured, Entry 9), which
 * is why an already-placed window does not re-target when a second one is added next to it.
 */
export function cutNodeId(partNode: string, voidElementId: string): string {
  return `${partNode}~${voidElementId}`;
}
