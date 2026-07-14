/**
 * The RENDER seam — how the renderer turns a part's `ShapeHandle` into triangles, and the ONLY kernel
 * op the browser hot path is allowed to reach for.
 *
 * ⚠ WHY THIS IS NOT A D19 VIOLATION. D19 says `DocumentContext` is the only holder of a `KernelClient`,
 * and no component drives the kernel. That rule is about *authoring* geometry — creating solids no
 * entity owns, minting `SubShapeRef`s no undo can remove. **Tessellation is the exact opposite**: it
 * mints nothing, owns nothing, and produces a disposable projection for the eyes. `GeometryGateway`
 * deliberately omits `tessellate` because the *document* must never render; the *renderer* must.
 *
 * So the bootstrap — the one place a `KernelClient` exists — derives this narrow, READ-ONLY view of it
 * and hands it to the viewport. The viewport can ask "draw this handle" and nothing else. It cannot
 * `makeBox`, it cannot `boolean`, it cannot mint an identity. A component that wanted to do any of
 * those would have to reach past this interface, and it has no `KernelClient` to reach for.
 */

import type { MeshBuffers, ShapeHandle } from '@bunyan/protocol';

/** Chordal deviation for display meshes, in mm. Coarser than a quantities-grade mesh — this is for eyes. */
export const DISPLAY_DEFLECTION_MM = 5;

export interface RenderGateway {
  /**
   * Tessellate a built part's `ShapeHandle` into a mesh + its provenance map (the substrate for
   * sub-shape picking, P4 step 4). ⚠ Never measure from this mesh — a tessellated curved solid
   * under-reports its true size by the chord error. Quantities come from `doc.quantities()`.
   */
  tessellate(handle: ShapeHandle, deflection?: number): Promise<MeshBuffers>;
}

/** Anything with a protocol `request` — a `KernelClient` structurally satisfies this. */
interface Tessellator {
  request(
    op: 'tessellate',
    payload: { readonly handle: ShapeHandle; readonly deflection: number },
    options?: { readonly coalesceKey?: string; readonly timeoutMs?: number },
  ): Promise<MeshBuffers>;
}

export function createRenderGateway(kernel: Tessellator): RenderGateway {
  return {
    async tessellate(handle, deflection = DISPLAY_DEFLECTION_MM) {
      return kernel.request('tessellate', { handle, deflection });
    },
  };
}
