/**
 * The three.js scene manager — kernel meshes → `BufferGeometry`, orbit camera, grid, axes.
 *
 * ⚠ SCOPE (P4). This is the WebGL2 renderer. P4 step 1 wants `WebGPURenderer` with a WebGL2 fallback
 * and P4 step 7 wants TSL shading; both are follow-ups. The seam that matters is already right: this
 * class receives a `RenderGateway` and never a `KernelClient`.
 *
 * ⚠ AN ELEMENT IS ITS PARTS (D30). Each part is its own mesh with its own material colour — a wall is
 * three solids, not one. Quantities never come from these triangles (`doc.quantities()` reads the
 * B-Rep); this mesh is a disposable projection for the eyes.
 *
 * ⚠ THE REDRAW IS INCREMENTAL (P4 step 2b). `setScene` keeps a mesh cache keyed by each part's STABLE
 * `nodeId` and re-tessellates only the parts whose `handle` changed — an untouched element costs
 * nothing. See `reconcile.ts` for the plan and why the changed handle is a sufficient dirty signal.
 *
 * ⚠ THE PROVENANCE MAP IS RETAINED (P4 step 2c). `toBufferGeometry` used to read `positions`/`normals`/
 * `indices` and let `provenance`, `edgePositions` and `bounds` fall out of scope — so the model had NO
 * rendered edges (why it read as a 3D-viewer toy) and picking (step 4) had no substrate. Now each drawn
 * part keeps its `MeshProvenance` (triangle → face `SubShapeRef`) beside its mesh, renders its edge
 * polylines as `LineSegments`, and uses the kernel's tight `bounds` for the geometry's bounding volume.
 * The picking read that consumes the retained provenance is `pick()` (step 4).
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { isKernelFailureError, type MeshBuffers } from '@bunyan/protocol';
import type { ElementId } from '@bunyan/document';
import type { RenderGateway } from './RenderGateway';
import type { RenderPart } from './RenderPart';
import { planRedraw, type CachedPart } from './reconcile';
import { resolveFacePick, type PickResult } from './pick';

export type { RenderPart } from './RenderPart';
export type { PickResult } from './pick';

/**
 * A part currently on screen: what it was built from (`CachedPart`), its live three.js objects, and the
 * provenance/bounds retained from tessellation so a pick can be resolved without going back to the kernel.
 */
interface DrawnPart extends CachedPart {
  readonly elementId: ElementId;
  readonly nodeId: string;
  readonly partName: string;
  readonly mesh: THREE.Mesh;
  /** The part's edge polylines, or `null` for a solid the kernel returned no edges for. */
  readonly edges: THREE.LineSegments | null;
  /**
   * The `MeshBuffers` this part was drawn from — RETAINED (step 2c), where the foundation pass dropped
   * it. It carries the `provenance` map that `pick()` (step 4) maps a triangle back to a `SubShapeRef`
   * through. Its `positions`/`normals`/`indices` arrays are the very ones the `BufferGeometry` attributes
   * already reference, so holding them here costs no extra memory.
   */
  readonly buffers: MeshBuffers;
}

/**
 * Edge colour — near-black, so edges read as CAD linework over the shaded faces.
 *
 * ⚠ Exported for the SCALE HARNESS (`src/scale/harness.ts`, P4 step 9b) so it draws filler parts with
 * the exact same edge appearance the shipped viewport does — a faithful draw-call/frame-time number
 * depends on measuring the real per-part geometry (one face `Mesh` + one edge `LineSegments`), not a
 * lookalike.
 */
export const EDGE_COLOR = 0x11141a;

/**
 * The face material for one part (P4 step 2c). Extracted so the scale harness (step 9b) paints filler
 * meshes with the identical `MeshStandardMaterial` — same shading cost per fragment, same polygon-offset
 * that lifts the edge lines clear — as the real viewport, or its frame-time measurement would be a
 * measurement of a different material.
 */
export function createPartMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.0,
    // Push faces back a hair so the edge lines sit cleanly on top without z-fighting.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

export class Viewport {
  readonly #render: RenderGateway;
  readonly #renderer: THREE.WebGLRenderer;
  readonly #scene = new THREE.Scene();
  readonly #camera: THREE.PerspectiveCamera;
  readonly #controls: OrbitControls;
  /** Everything currently drawn. */
  readonly #sceneGroup = new THREE.Group();
  /** Mesh cache keyed by the STABLE part `nodeId` — the substrate of the incremental redraw (step 2b). */
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
   * Draw `parts`, reusing every mesh whose geometry did not change (P4 step 2b). Only parts with a new
   * or changed `handle` are tessellated; a part that merely changed colour swaps its material; a part
   * that left the scene is disposed. This replaces the old `setElement`, which re-tessellated the whole
   * model on every call — the dominant interactive cost the review measured (Entry 24).
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

    // Superseded while awaiting, or a newer frame started: drop it. No GPU geometry was built yet (it
    // happens in `#installPart` below), so there is nothing to dispose — the raw `MeshBuffers` are plain
    // typed arrays, GC'd.
    if (this.#disposed || frame !== this.#frame) return;

    for (const nodeId of plan.remove) this.#removePart(nodeId);
    for (const part of plan.recolor) this.#recolorPart(part);
    for (const result of built) {
      if (result !== null) this.#installPart(result.part, result.buffers);
    }
  }

  /**
   * Resolve a canvas-relative pointer (NDC in [-1, 1]) to the face it is over (P4 step 4). Raycasts the
   * drawn face meshes (never the edge lines or the helpers), takes the nearest hit, and maps its triangle
   * back to a `SubShapeRef` through the provenance retained in step 2c. Returns `null` on empty space.
   */
  pick(ndcX: number, ndcY: number): PickResult | null {
    if (this.#disposed) return null;
    this.#raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.#camera);
    const meshes = [...this.#drawn.values()].map((d) => d.mesh);
    const hits = this.#raycaster.intersectObjects(meshes, false);
    for (const hit of hits) {
      const nodeId = hit.object.userData['nodeId'] as string | undefined;
      if (nodeId === undefined || hit.faceIndex === undefined || hit.faceIndex === null) continue;
      const drawn = this.#drawn.get(nodeId);
      if (drawn === undefined) continue;
      const result = resolveFacePick(drawn, hit.faceIndex);
      if (result !== null) return result;
      // else: fall through to the next hit behind this triangle.
    }
    return null;
  }

  #installPart(part: RenderPart, buffers: MeshBuffers): void {
    this.#removePart(part.nodeId); // a rebuilt part replaces its old mesh + edges

    const geometry = toBufferGeometry(buffers);
    const material = createPartMaterial(part.color);
    const mesh = new THREE.Mesh(geometry, material);
    // Carry identity onto the object so a raycast hit (step 4) maps back to element + part.
    mesh.userData['nodeId'] = part.nodeId;
    mesh.userData['elementId'] = part.elementId;
    this.#sceneGroup.add(mesh);

    const edges = buildEdgeSegments(buffers);
    if (edges !== null) this.#sceneGroup.add(edges);

    this.#drawn.set(part.nodeId, {
      handle: part.handle,
      color: part.color,
      elementId: part.elementId,
      nodeId: part.nodeId,
      partName: part.partName,
      mesh,
      edges,
      buffers,
    });
  }

  #recolorPart(part: RenderPart): void {
    const existing = this.#drawn.get(part.nodeId);
    if (existing === undefined) return;
    const { material } = existing.mesh;
    if (material instanceof THREE.MeshStandardMaterial) material.color.setHex(part.color);
    this.#drawn.set(part.nodeId, { ...existing, color: part.color });
  }

  #removePart(nodeId: string): void {
    const existing = this.#drawn.get(nodeId);
    if (existing === undefined) return;
    this.#sceneGroup.remove(existing.mesh);
    disposeMesh(existing.mesh);
    if (existing.edges !== null) {
      this.#sceneGroup.remove(existing.edges);
      disposeMesh(existing.edges);
    }
    this.#drawn.delete(nodeId);
  }

  #clearAll(): void {
    for (const { mesh, edges } of this.#drawn.values()) {
      this.#sceneGroup.remove(mesh);
      disposeMesh(mesh);
      if (edges !== null) {
        this.#sceneGroup.remove(edges);
        disposeMesh(edges);
      }
    }
    this.#drawn.clear();
  }

  readonly #tick = (): void => {
    this.#controls.update();
    this.#renderer.render(this.#scene, this.#camera);
  };

  dispose(): void {
    this.#disposed = true;
    this.#renderer.setAnimationLoop(null);
    this.#clearAll();
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

interface Disposable {
  dispose(): void;
}

/**
 * Free a mesh's GPU resources. `instanceof THREE.Mesh` narrows to `Mesh<any, any, any>`, so we read the
 * two fields we know are there through a concrete structural type rather than touching `any`.
 */
function disposeMesh(child: THREE.Object3D): void {
  const { geometry, material } = child as unknown as {
    geometry: Disposable;
    material: Disposable | Disposable[];
  };
  geometry.dispose();
  for (const one of Array.isArray(material) ? material : [material]) one.dispose();
}

/**
 * `MeshBuffers` → a three.js face `BufferGeometry`. The tight kernel `bounds` become the geometry's
 * bounding volume directly — tighter than three's mesh-AABB and floating-point-stable across machines,
 * which keeps frustum culling and fit-to-view honest.
 */
export function toBufferGeometry(mesh: MeshBuffers): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

  const { min, max } = mesh.bounds;
  const box = new THREE.Box3(
    new THREE.Vector3(min[0], min[1], min[2]),
    new THREE.Vector3(max[0], max[1], max[2]),
  );
  geometry.boundingBox = box;
  geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  return geometry;
}

/**
 * The part's edge polylines → one `LineSegments` (P4 step 2c). Each `EdgePolyline` is a contiguous run
 * of `count` vertices in `edgePositions`; we expand it into consecutive segment pairs and index into the
 * shared position buffer, so no vertex data is duplicated. Returns `null` when the kernel gave no edges.
 *
 * ⚠ ONE `LineSegments` PER PART is fine at the foundation; batching edges by material is a step-9 (scale
 * harness) decision, alongside the same call for the face meshes — do not privately optimise it here.
 */
export function buildEdgeSegments(mesh: MeshBuffers): THREE.LineSegments | null {
  const { edgePositions, provenance } = mesh;
  if (edgePositions.length === 0 || provenance.edges.length === 0) return null;

  const indices: number[] = [];
  for (const edge of provenance.edges) {
    for (let i = 0; i < edge.count - 1; i++) {
      indices.push(edge.start + i, edge.start + i + 1);
    }
  }
  if (indices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
  geometry.setIndex(indices);
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: EDGE_COLOR }));
}
