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

/** Per-call knobs for a tessellation. */
export interface TessellateOptions {
  /** Chordal deviation override (mm). Defaults to `DISPLAY_DEFLECTION_MM`. */
  readonly deflection?: number;
  /**
   * ⚠ COALESCE KEY (P4 step 2d). During a drag the same part is re-tessellated every frame; passing a
   * per-node key (`render:tessellate:<nodeId>`) makes a newer tessellation SUPERSEDE the in-flight one
   * in the kernel client, so the kernel is not left computing meshes the `#frame` guard would only throw
   * away *after* the work was done. The document path already disciplines its rebuilds this way; this
   * gives the render path the same discipline. ⚠ Namespaced so it never collides with the document's
   * `rebuild:<elementId>` key on the shared client.
   */
  readonly coalesceKey?: string;
}

export interface RenderGateway {
  /**
   * Tessellate a built part's `ShapeHandle` into a mesh + its provenance map (which the viewport RETAINS
   * for sub-shape picking, P4 step 2c/4). ⚠ Never measure from this mesh — a tessellated curved solid
   * under-reports its true size by the chord error. Quantities come from `doc.quantities()`.
   */
  tessellate(handle: ShapeHandle, options?: TessellateOptions): Promise<MeshBuffers>;
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
    async tessellate(handle, options) {
      const deflection = options?.deflection ?? DISPLAY_DEFLECTION_MM;
      return kernel.request(
        'tessellate',
        { handle, deflection },
        options?.coalesceKey !== undefined ? { coalesceKey: options.coalesceKey } : undefined,
      );
    },
  };
}
