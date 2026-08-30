// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * One part to draw — and its IDENTITY (P4 step 2a).
 *
 * ⚠ WHY THIS CARRIES MORE THAN `{ handle, color }`. The foundation pass drew a part as a bare handle and
 * a colour, which is enough to paint triangles and nothing else. That one narrow shape is what blocked
 * everything the renderer still owes at once: sub-shape picking (step 4) needs to map a hit back to an
 * element and a part; the incremental redraw (step 2b) needs a key that SURVIVES a rebuild to cache a
 * mesh against; hover/selection need to know which element a triangle belongs to.
 *
 * The two fields that matter are:
 *   • `nodeId`  — the part's node in the operation DAG (`wall-1.structure`). It is STABLE across rebuilds
 *                 by construction (element id + part name, neither of which a rebuild changes), so it is
 *                 the natural cache key. ⚠ Never derive it in the app — it is `part.nodeId` verbatim.
 *   • `handle`  — the built solid. It is minted FRESH by every rebuild (a `ShapeHandle` is a string id
 *                 into the kernel's registry), so for a given `nodeId` a CHANGED handle *is* the signal
 *                 that this part's geometry is dirty and must be re-tessellated. An unedited element is
 *                 not rebuilt, so its parts keep their handles — and the redraw skips them for free.
 */

import type { ShapeHandle } from '@bunyan/protocol';
import type { ElementId } from '@bunyan/document';

export interface RenderPart {
  /** The element this part belongs to — for picking, hover and selection (step 4). */
  readonly elementId: ElementId;
  /** The DAG node that owns this solid's identities. Stable across rebuilds ⇒ the mesh-cache key. */
  readonly nodeId: string;
  /** The part's layer name (`structure`), e.g. for a picking read-out. */
  readonly partName: string;
  /** The built solid. CHANGES on every rebuild ⇒ a changed handle for a `nodeId` means "dirty". */
  readonly handle: ShapeHandle;
  /** Display colour (foundation-pass placeholder for real material appearance). */
  readonly color: number;
}
