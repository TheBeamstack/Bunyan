// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

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
 * ⚠ It is deliberately NOT `all of OpMap`. `tessellate` is absent — and now the TYPE enforces that,
 * not just this comment (P4 step 12): `Exclude<OpName, 'tessellate'>` makes `g.request('tessellate', …)`
 * a compile error. The document model is the *parametric truth*, and triangles are a disposable
 * projection for the renderer; a document-layer call that wanted a mesh would be a document layer that
 * had started rendering. The renderer reaches `tessellate` through its own `RenderGateway`, off the same
 * client, which is the one narrow view of the kernel that IS allowed to render (see `apps/web`).
 */
export type DocumentOpName = Exclude<OpName, 'tessellate'>;

export interface GeometryGateway {
  request<Op extends DocumentOpName>(
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
 * The DERIVED PEI of a GENERATED CHILD element (D59 composition, Model A — owner-ruled 2026-07-22).
 *
 * ⚠ A curtain wall's panels/mullions are DERIVED from the parent's recipe, exactly as Parts are — so
 * they are NOT stored `scene.elements` rows; they are regenerated each rebuild. Their identity is derived
 * from `parentId` + a stable SLOT key, the same discipline as `partNodeId`/`lateral.k` (D26) promoted one
 * level.
 *
 * ⚠⚠ THE SEPARATOR IS `:`, AND IT IS NOT ARBITRARY (found by building — the D59 probe). A child PEI flows
 * into its parts' nodeIds (`${childPei}.${partName}`), and a nodeId is a `SubShapeRef` component: the ref
 * grammar reserves `/` (`TOKEN_SEP`) and `#` (`OCCURRENCE_SEP`), so a nodeId containing either FAILS to
 * encode (`subshape.ts`). `:` is reserved by neither, never appears in an authored PEI (a `[a-z]+-` prefix
 * + Crockford base32 ULID), and never in a part name — so `${parentId}:${slot}` is an unambiguous, encodable
 * derived identity. A tag/schedule binds to it; a vanished slot is a broken-ref (the D1 story, one level up).
 */
export function childElementId(parentId: string, slot: string): string {
  return `${parentId}:${slot}`;
}

/**
 * ⚠ THE SEPARATOR IS `:`, AND SEVEN DOC SITES SAID `/` UNTIL ENTRY 60's RULE-13 SWEEP.
 *
 * The code here was always right; `build.ts`, `entities.ts`, `types.ts`, `families.ts` and
 * `curtainwall.ts` all described the derived PEI as `${parentId}/${slot}`. That is not a cosmetic slip:
 * **`/` is a `SubShapeRef` separator** — `commands.ts` refuses it in a part name for exactly that reason
 * — and a child PEI is embedded in its parts' nodeIds, so a `/`-joined child id would be ambiguous the
 * moment it entered a ref. The docs described a format that could not work, beside code that does.
 *
 * ⚠ It is exported so the fact has ONE home (domain rule 10). Rule 13 makes identity the ecosystem's
 * contract, and a wrong doc about an identity format is how a downstream consumer gets written wrong.
 * ⚠⚠ Ids are OPAQUE (D44) — this exists to keep the *documentation* honest and to let a test assert the
 * grammar. **It is not an invitation to parse a PEI**; recovering meaning by splitting an id is the
 * "identify after the fact" the whole naming design refuses.
 */
export const DERIVED_PEI_SEPARATOR = ':';

/** True for a DERIVED child PEI (D59). Authored PEIs never contain `:`; a generated child always does. */
export function isDerivedChildId(id: string): boolean {
  return id.includes(':');
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
