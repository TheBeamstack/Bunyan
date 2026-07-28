/**
 * The three.js scene manager — kernel meshes → a BATCHED scene, orbit camera, grid, axes.
 *
 * ⚠ SCOPE (P4). This is the WebGL2 renderer. P4 step 1 wants `WebGPURenderer` with a WebGL2 fallback
 * and P4 step 7 wants TSL shading; both are follow-ups. The seam that matters is already right: this
 * class receives a `RenderGateway` and never a `KernelClient`.
 *
 * ⚠ AN ELEMENT IS ITS PARTS (D30). Each part is a distinct instance with its own colour — a wall is
 * three solids, not one. Quantities never come from these triangles (`doc.quantities()` reads the
 * B-Rep); this mesh is a disposable projection for the eyes.
 *
 * ⚠ THE REDRAW IS INCREMENTAL (P4 step 2b). `setScene` keeps a cache keyed by each part's STABLE
 * `nodeId` and re-tessellates only the parts whose `handle` changed — an untouched element costs
 * nothing. See `reconcile.ts` for the plan and why the changed handle is a sufficient dirty signal.
 *
 * ⚠ THE PROVENANCE MAP IS RETAINED (P4 step 2c). Each drawn part keeps its `MeshProvenance` (triangle →
 * face `SubShapeRef`) in `#drawn` beside the batch, so a pick (step 4) resolves without going back to the
 * kernel, and uses the kernel's tight `bounds` for the geometry's bounding volume.
 *
 * ⚠ THE SCENE IS BATCHED (P4 step 9(b) — the Entry-55 scale unlock; `PartBatch`). Every opaque face part
 * lives in ONE `THREE.BatchedMesh` (per-instance colour, one multi-draw call) and every edge in ONE
 * `THREE.LineSegments` — ~2 draw calls for the whole model, down from the ~30k Entry 55 measured. The
 * per-part identity that picking and the incremental redraw depend on is preserved by the batch, not the
 * scene graph (design `P4_step9_renderer_batching_design.md`).
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { isKernelFailureError, type MeshBuffers } from '@bunyan/protocol';
import type { ElementId } from '@bunyan/document';
import type { RenderGateway } from './RenderGateway';
import type { RenderPart } from './RenderPart';
import { planRedraw, type CachedPart } from './reconcile';
import { resolveFacePick, type PickResult } from './pick';
import { PartBatch } from './PartBatch';

export type { RenderPart } from './RenderPart';
export type { PickResult } from './pick';
// Re-exported for the scale harness (`src/scale/harness.ts`), which draws faithful filler parts through
// the exact same helpers the viewport uses. They now live in `tessellation.ts` (to avoid an import cycle
// with `PartBatch`); this keeps the harness's `from '../render/Viewport'` imports working unchanged.
export {
  EDGE_COLOR,
  createPartMaterial,
  toBufferGeometry,
  buildEdgeSegments,
} from './tessellation';

/**
 * A part currently on screen: the fields the incremental redraw compares (`CachedPart`), its identity,
 * and the `MeshBuffers` retained from tessellation (step 2c) so a pick resolves through its provenance
 * without the kernel. The part's GPU geometry lives in the `PartBatch`, keyed by the same `nodeId`.
 */
interface DrawnPart extends CachedPart {
  readonly elementId: ElementId;
  readonly nodeId: string;
  readonly partName: string;
  readonly buffers: MeshBuffers;
}

export class Viewport {
  readonly #render: RenderGateway;
  readonly #renderer: THREE.WebGLRenderer;
  readonly #scene = new THREE.Scene();
  readonly #camera: THREE.PerspectiveCamera;
  readonly #controls: OrbitControls;
  /** Everything currently drawn — the two batch objects (faces + edges). */
  readonly #sceneGroup = new THREE.Group();
  /** The batch that turns per-part geometry into ~2 draw calls (P4 step 9(b)). */
  readonly #batch = new PartBatch();
  /** Per-part cache keyed by the STABLE `nodeId` — the incremental-redraw substrate + retained provenance. */
  readonly #drawn = new Map<string, DrawnPart>();
  readonly #raycaster = new THREE.Raycaster();
  #frame = 0;
  #disposed = false;

  constructor(canvas: HTMLCanvasElement, render: RenderGateway) {
    this.#render = render;

    this.#renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.#renderer.setPixelRatio(window.devicePixelRatio);

    this.#scene.background = new THREE.Color(0x1a1d21);

    // World is millimetres (spec §6). A near/far spanning a building at mm scale.
    this.#camera = new THREE.PerspectiveCamera(50, 1, 10, 500_000);
    this.#camera.position.set(6000, 5000, 8000);
    this.#camera.up.set(0, 0, 1); // Z is up in Bunyan's world.

    this.#controls = new OrbitControls(this.#camera, canvas);
    this.#controls.target.set(2000, 500, 1400);
    this.#controls.update();

    this.#scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5000, 10000, 8000);
    this.#scene.add(key);

    const grid = new THREE.GridHelper(20_000, 20, 0x445566, 0x2a2f36);
    grid.rotation.x = Math.PI / 2; // three's grid is XZ; ours is the XY ground plane.
    this.#scene.add(grid);
    this.#scene.add(new THREE.AxesHelper(2000));

    this.#sceneGroup.add(this.#batch.faceObject);
    this.#sceneGroup.add(this.#batch.edgeObject);
    this.#scene.add(this.#sceneGroup);

    this.#renderer.setAnimationLoop(this.#tick);
  }

  /** Fit the canvas backing store to its CSS box. Call on mount and on resize. */
  resize(width: number, height: number): void {
    if (this.#disposed || width === 0 || height === 0) return;
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
  }

  /**
   * Draw `parts`, reusing every part whose geometry did not change (P4 step 2b). Only parts with a new
   * or changed `handle` are tessellated; a part that merely changed colour swaps its instance colour; a
   * part that left the scene is removed from the batch. This replaces the old `setElement`, which
   * re-tessellated the whole model on every call — the dominant interactive cost the review measured.
   */
  async setScene(parts: readonly RenderPart[]): Promise<void> {
    // A newer setScene may supersede this one while we await the kernel; tag it and bail if so.
    const frame = ++this.#frame;
    const plan = planRedraw(this.#drawn, parts);

    // Tessellate ONLY the dirty parts, in parallel — each keyed per-node so a newer frame's tessellation
    // SUPERSEDES this one's in the kernel client rather than racing it (step 2d). A superseded (or, on
    // teardown, cancelled) part resolves to `null`: a newer setScene is already redrawing it, and this
    // whole frame is by definition stale, so the `#frame` guard below drops it.
    const built = await Promise.all(
      plan.tessellate.map(async (part) => {
        try {
          return {
            part,
            buffers: await this.#render.tessellate(part.handle, {
              coalesceKey: renderKey(part.nodeId),
            }),
          };
        } catch (error) {
          if (isSupersededOrCancelled(error)) return null;
          throw error;
        }
      }),
    );

    // Superseded while awaiting, or a newer frame started: drop it. No GPU geometry was written yet (it
    // happens in `#installPart` below), so there is nothing to undo — the raw `MeshBuffers` are plain
    // typed arrays, GC'd.
    if (this.#disposed || frame !== this.#frame) return;

    for (const nodeId of plan.remove) this.#removePart(nodeId);
    for (const part of plan.recolor) this.#recolorPart(part);
    for (const result of built) {
      if (result !== null) this.#installPart(result.part, result.buffers);
    }
    // A removal frees space in both batch buffers; reclaim it once per frame, not per part.
    if (plan.remove.length > 0) this.#batch.maybeCompact();
  }

  /**
   * Resolve a canvas-relative pointer (NDC in [-1, 1]) to the face it is over (P4 step 4). Raycasts the
   * ONE batched face mesh (never the edges or helpers), takes the nearest hit, and maps its (batch,
   * triangle) back to a `SubShapeRef` through the provenance retained in step 2c. Returns `null` on empty
   * space. (Design §5: the batch reports a global face index; `resolveHit` makes it local.)
   */
  pick(ndcX: number, ndcY: number): PickResult | null {
    if (this.#disposed) return null;
    this.#raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.#camera);
    const hits = this.#raycaster.intersectObject(this.#batch.faceObject, false);
    for (const hit of hits) {
      if (hit.batchId === undefined || hit.faceIndex === undefined || hit.faceIndex === null)
        continue;
      const resolved = this.#batch.resolveHit(hit.batchId, hit.faceIndex);
      if (resolved === null) continue;
      const drawn = this.#drawn.get(resolved.nodeId);
      if (drawn === undefined) continue;
      const result = resolveFacePick(drawn, resolved.localFaceIndex);
      if (result !== null) return result;
      // else: fall through to the next hit behind this triangle.
    }
    return null;
  }

  #installPart(part: RenderPart, buffers: MeshBuffers): void {
    this.#batch.set(part.nodeId, buffers, part.color);
    this.#drawn.set(part.nodeId, {
      handle: part.handle,
      color: part.color,
      elementId: part.elementId,
      nodeId: part.nodeId,
      partName: part.partName,
      buffers,
    });
  }

  #recolorPart(part: RenderPart): void {
    const existing = this.#drawn.get(part.nodeId);
    if (existing === undefined) return;
    this.#batch.recolor(part.nodeId, part.color);
    this.#drawn.set(part.nodeId, { ...existing, color: part.color });
  }

  #removePart(nodeId: string): void {
    if (!this.#drawn.has(nodeId)) return;
    this.#batch.remove(nodeId);
    this.#drawn.delete(nodeId);
  }

  readonly #tick = (): void => {
    this.#controls.update();
    this.#renderer.render(this.#scene, this.#camera);
  };

  dispose(): void {
    this.#disposed = true;
    this.#renderer.setAnimationLoop(null);
    this.#batch.dispose();
    this.#drawn.clear();
    this.#controls.dispose();
    this.#renderer.dispose();
  }
}

/** The per-node coalesce key for a tessellation (step 2d) — namespaced off the document's `rebuild:` key. */
function renderKey(nodeId: string): string {
  return `render:tessellate:${nodeId}`;
}

/**
 * True for the two failures a stale render frame EXPECTS: `SUPERSEDED` (a newer tessellation of the same
 * node coalesced this one away — step 2d) and `CANCELLED` (the client was disposed mid-flight). Any other
 * failure is a real problem and propagates.
 */
function isSupersededOrCancelled(error: unknown): boolean {
  return (
    isKernelFailureError(error) &&
    (error.failure.code === 'SUPERSEDED' || error.failure.code === 'CANCELLED')
  );
}
