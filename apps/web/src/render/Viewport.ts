// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

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

import { isKernelFailureError, type MeshBuffers, type Vec3 } from '@bunyan/protocol';
import type { ElementId } from '@bunyan/document';
import type { RenderGateway } from './RenderGateway';
import type { RenderPart } from './RenderPart';
import { planRedraw, type CachedPart } from './reconcile';
import { resolveFacePick, type PickResult } from './pick';
import { PartBatch } from './PartBatch';
import {
  SnapIndex,
  chooseSnap,
  edgeCandidates,
  gridCandidates,
  type SnapCandidate,
  type SnapHit,
  type SnapKind,
} from '../tool/snap';
import {
  GUIDE_SNAP_KIND,
  LINE_INTERSECTION_SNAP_KIND,
  PERPENDICULAR_SNAP_KIND,
  alignmentGuides,
  lineIntersections,
  perpendicularFeet,
  referenceEdges,
  referencePoints,
  type AlignmentGuide,
  type LineIntersection,
  type PerpendicularFoot,
} from '../tool/align';

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

  /* ---- P4.5: the preview overlay + the Tier-1 snap index (design §4/§5). ---------------------- */

  /**
   * The PREVIEW LAYER (design §5) — a three.js group holding the rubber band and the snap marker.
   *
   * ⚠⚠ IT IS NOT IN `#sceneGroup` AND THAT IS THE POINT, NOT AN ORGANISATIONAL CHOICE. Picking raycasts
   * `#batch.faceObject` alone and the snap index is built from `#drawn` alone, so overlay geometry is
   * structurally excluded from both: **a preview can never be picked, and can never be snapped to.** A
   * preview that was snappable would let a half-drawn wall attract the very cursor drawing it.
   */
  readonly #preview = new THREE.Group();
  readonly #previewLine: THREE.Line;
  readonly #snapMarker: THREE.Mesh;
  /** The dashed alignment guides (design §4.3) — one `LineSegments` for however many are showing. */
  readonly #guideLines: THREE.LineSegments;

  /** Lazily-built Tier-1 index over `#drawn`; dropped whenever the drawn set changes. */
  #snapIndex: SnapIndex | null = null;
  /** Canvas CSS size, kept for the world→pixel projection the snap query needs. */
  #widthPx = 1;
  #heightPx = 1;

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

    // The preview overlay (design §5). `depthTest: false` so the rubber band stays visible through the
    // model — a guide line hidden inside the wall it is being drawn against is not a guide.
    this.#previewLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0x4aa3ff, depthTest: false, transparent: true }),
    );
    this.#previewLine.renderOrder = 999;
    this.#previewLine.visible = false;
    this.#previewLine.frustumCulled = false;

    this.#snapMarker = new THREE.Mesh(
      new THREE.SphereGeometry(45, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd166, depthTest: false, transparent: true }),
    );
    this.#snapMarker.renderOrder = 1000;
    this.#snapMarker.visible = false;

    // ⚠ THE GUIDES ARE DASHED, AND THAT IS SEMANTIC RATHER THAN DECORATIVE (design §4.3 says "dashed").
    // A solid line in this scene is geometry — a wall edge, or the rubber band that will BECOME one. A
    // guide is neither: it is an inference the app is offering, it exists only while the cursor holds
    // it, and nothing is authored along it. Drawing it solid would make the viewport claim there is an
    // edge where there is not one.
    // ⚠ `LineDashedMaterial` needs `computeLineDistances()` on the geometry, which `setGuideLines` does
    // on every update — without it the dashes silently render solid, which is the failure that looks
    // like success.
    this.#guideLines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({
        color: 0x7fe08a,
        dashSize: 120,
        gapSize: 80,
        depthTest: false,
        transparent: true,
        opacity: 0.85,
      }),
    );
    this.#guideLines.renderOrder = 998;
    this.#guideLines.visible = false;
    this.#guideLines.frustumCulled = false;

    this.#preview.add(this.#guideLines);
    this.#preview.add(this.#previewLine);
    this.#preview.add(this.#snapMarker);
    this.#scene.add(this.#preview);

    this.#renderer.setAnimationLoop(this.#tick);
  }

  /** Fit the canvas backing store to its CSS box. Call on mount and on resize. */
  resize(width: number, height: number): void {
    if (this.#disposed || width === 0 || height === 0) return;
    this.#widthPx = width;
    this.#heightPx = height;
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

    // ⚠ Drop the Tier-1 snap index whenever the drawn set changes shape. A RECOLOUR alone cannot move a
    // vertex (it is an instance-colour swap — selection, hover), so it does not invalidate; installing or
    // removing a part does. Dropping rather than patching means a stale candidate is unreachable rather
    // than merely unlikely — the same argument D73 used for keying its join index on the Scene object.
    if (plan.remove.length > 0 || built.some((r) => r !== null)) this.#snapIndex = null;
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
      // ⚠ `hit.point` is the ray/triangle intersection in WORLD mm — the batch is not transformed, so
      // no basis change is needed here. It is Tier 1 (see `PickResult.point`), and it is what lets a
      // click POSITION a hosted element and not merely host one.
      const result = resolveFacePick(drawn, resolved.localFaceIndex, [
        hit.point.x,
        hit.point.y,
        hit.point.z,
      ]);
      if (result !== null) return result;
      // else: fall through to the next hit behind this triangle.
    }
    return null;
  }

  /* ================================================================================================
   * P4.5 — the tool layer's view of the viewport. All READ-ONLY except the preview, which draws
   * overlay geometry and never touches the model (design §4/§5, domain rule 19).
   * ============================================================================================= */

  /**
   * World millimetres → canvas CSS pixels, or `null` when the point is behind the camera.
   *
   * This is the `Project` the pure snap module takes as an argument — the ONE piece of snapping that
   * genuinely needs the camera, which is why everything else in `tool/snap.ts` is headless.
   */
  readonly project = (point: Vec3): readonly [number, number] | null => {
    const v = new THREE.Vector3(point[0], point[1], point[2]).project(this.#camera);
    // `project` returns NDC; z outside [-1, 1] is outside the frustum (behind the camera or past far).
    if (v.z < -1 || v.z > 1) return null;
    return [((v.x + 1) / 2) * this.#widthPx, ((1 - v.y) / 2) * this.#heightPx];
  };

  /**
   * The best Tier-1 snap for a cursor position (canvas CSS pixels), or `null` if nothing is close.
   *
   * ⚠ The index is built lazily from the SAME retained `MeshBuffers` picking resolves through, and it is
   * dropped whenever `setScene` changes what is drawn — so a snap can never point at a part that has been
   * removed or rebuilt. It is rebuilt on the next query, not on the edit, so a burst of edits costs one
   * rebuild rather than one per edit.
   */
  snapAt(
    cursorPx: readonly [number, number],
    tolerancePx = 12,
    /**
     * Candidates that are not in the index because they are not fixed places — today, exactly the
     * `'face'` candidate built from the ray hit under the cursor (`tool/snap.ts` `faceCandidate`).
     * They go through the SAME `chooseSnap`, so the ruled priority order decides between them and the
     * indexed ones rather than either side special-casing the other.
     */
    live: readonly SnapCandidate[] = [],
    /** The active input's `snapTo` — `null` ⇒ every kind. See `chooseSnap` for why it is applied here. */
    allow: readonly SnapKind[] | null = null,
  ): SnapHit | null {
    if (this.#disposed) return null;
    const index = this.#ensureSnapIndex();
    // Prune in world space first: unproject the cursor to the ground plane and take a generous sphere.
    // A screen tolerance has no world radius, so this is deliberately loose — `chooseSnap` then applies
    // the real pixel test to the survivors.
    const around = this.groundPointAt(cursorPx) ?? [0, 0, 0];
    const candidates = index.near(around, SNAP_SEARCH_RADIUS_MM);
    return chooseSnap([...candidates, ...live], this.project, cursorPx, tolerancePx, allow);
  }

  /**
   * The alignment guides live at this cursor position (design §4.3) — the dashed lines to draw, and the
   * candidates to feed back into `snapAt`.
   *
   * ⚠⚠ IT IS A SEPARATE CALL FROM `snapAt` ON PURPOSE, AND THE ORDER IS LOAD-BEARING — the same shape
   * Entry 80 gave the face candidate. A guide's foot is a snap CANDIDATE, so it must exist before the
   * snap is chosen; feeding it through `snapAt`'s `live` array is what makes `SNAP_PRIORITY` decide
   * between *"the corner you have lined up with"* and *"the face you are over"* in ONE ruled comparison,
   * instead of two answers the tool would then have to reconcile.
   *
   * ⚠⚠ AND IT TAKES `allow` FOR A REASON THAT IS NOT PERFORMANCE: **a guide the active input cannot
   * snap to must not be DRAWN.** The opening tool declares `snapTo: ['face']`, so a dashed line offered
   * to it would be an overlay promising a landing the click cannot make — the renderer lying about what
   * the tool will do. One filter, applied where the guides are made, keeps the drawing and the snapping
   * answering the same question.
   *
   * ⚠ THE STATED BOUND: references come from the index within `GUIDE_REFERENCE_RADIUS_MM` of the cursor
   * (plus whatever the caller passes, which is how the gesture's own anchor gets in). A corner further
   * away than that produces no guide. That is a limit, not a bug, and it is written down here rather
   * than discovered — the alternative is projecting every endpoint in the model on every pointer move.
   */
  guidesAt(
    cursorPx: readonly [number, number],
    tolerancePx = 12,
    allow: readonly SnapKind[] | null = null,
    /** Extra references the index does not hold — today, the in-progress gesture's anchor. */
    extraReferences: readonly Vec3[] = [],
  ): AlignmentGuide[] {
    if (this.#disposed) return [];
    if (allow !== null && !allow.includes(GUIDE_SNAP_KIND)) return [];
    const cursor = this.groundPointAt(cursorPx);
    if (cursor === null) return [];

    const near = this.#ensureSnapIndex().near(cursor, GUIDE_REFERENCE_RADIUS_MM);
    return alignmentGuides({
      cursor,
      cursorPx,
      references: [...extraReferences, ...referencePoints(near)],
      project: this.project,
      tolerancePx,
    });
  }

  /**
   * The perpendicular feet from `anchor` onto nearby reference edges (design §4.3's other derived kind,
   * T-001) — the candidates to feed back into `snapAt`, and the right-angle indicators to draw.
   *
   * ⚠ Reference edges come from the SAME index `guidesAt` reads, gathered around the ANCHOR rather than
   * the cursor: a perpendicular is a relationship between the anchor and an edge, so the edge has to be
   * near the point the tool is drawing FROM, not near wherever the cursor has since wandered.
   *
   * ⚠ `anchor === null` ⇒ `[]` outright: with no gesture in progress there is no "from" point, and a
   * perpendicular to nothing is not a candidate.
   */
  perpendicularAt(
    cursorPx: readonly [number, number],
    tolerancePx = 12,
    allow: readonly SnapKind[] | null = null,
    anchor: Vec3 | null = null,
  ): PerpendicularFoot[] {
    if (this.#disposed) return [];
    if (anchor === null) return [];
    if (allow !== null && !allow.includes(PERPENDICULAR_SNAP_KIND)) return [];

    const near = this.#ensureSnapIndex().near(anchor, GUIDE_REFERENCE_RADIUS_MM);
    return perpendicularFeet({
      anchor,
      cursorPx,
      edges: referenceEdges(near),
      project: this.project,
      tolerancePx,
    });
  }

  /**
   * The line-line intersections near the cursor (design §4.3's third derived kind, T-002) — the
   * candidates to feed back into `snapAt`. Unlike the perpendicular foot, there is no gesture anchor
   * here: a crossing is a relationship between two edges alone, so the reference edges are gathered
   * around the CURSOR's own ground point, the same place `guidesAt` looks.
   *
   * ⚠ No new overlay line is drawn for this kind (unlike a guide or a perpendicular foot): both lines a
   * crossing is built from are already-drawn model edges, so a second dashed copy would be redundant —
   * `setSnapMarker` already shows the crossing itself once it wins.
   */
  intersectionsAt(
    cursorPx: readonly [number, number],
    tolerancePx = 12,
    allow: readonly SnapKind[] | null = null,
  ): LineIntersection[] {
    if (this.#disposed) return [];
    if (allow !== null && !allow.includes(LINE_INTERSECTION_SNAP_KIND)) return [];
    const cursor = this.groundPointAt(cursorPx);
    if (cursor === null) return [];

    const near = this.#ensureSnapIndex().near(cursor, GUIDE_REFERENCE_RADIUS_MM);
    return lineIntersections({
      cursorPx,
      lines: referenceEdges(near),
      project: this.project,
      tolerancePx,
    });
  }

  /** Draw these dashed guides, or clear them with `null`/an empty list. Overlay only. */
  setGuideLines(lines: readonly (readonly [Vec3, Vec3])[] | null): void {
    if (this.#disposed) return;
    if (lines === null || lines.length === 0) {
      this.#guideLines.visible = false;
      return;
    }
    const xyz = new Float32Array(lines.length * 6);
    lines.forEach((line, i) => {
      xyz.set([...line[0], ...line[1]], i * 6);
    });
    this.#guideLines.geometry.dispose();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(xyz, 3));
    // ⚠ WITHOUT THIS THE DASHES RENDER SOLID and nothing errors — `LineDashedMaterial` reads a
    // `lineDistance` attribute this call computes, and an absent one is read as zero everywhere.
    this.#guideLines.geometry = geometry;
    this.#guideLines.computeLineDistances();
    this.#guideLines.visible = true;
  }

  /**
   * Where a cursor ray meets the Z=0 ground plane — the FREE point, used when nothing snaps.
   *
   * ⚠ Without this a tool could only ever author on top of existing geometry: the very first wall in an
   * empty document has nothing to snap to, and must still be drawable. Returns `null` when the ray is
   * parallel to the plane or points away from it (the camera looking at the horizon).
   */
  groundPointAt(cursorPx: readonly [number, number], z = 0): Vec3 | null {
    const ndcX = (cursorPx[0] / this.#widthPx) * 2 - 1;
    const ndcY = -(cursorPx[1] / this.#heightPx) * 2 + 1;
    this.#raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.#camera);
    const target = new THREE.Vector3();
    const hit = this.#raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -z),
      target,
    );
    return hit === null ? null : [target.x, target.y, target.z];
  }

  /** Draw the rubber band through these world points, or clear it with `null`. Overlay only. */
  setPreviewLine(points: readonly Vec3[] | null): void {
    if (this.#disposed) return;
    if (points === null || points.length < 2) {
      this.#previewLine.visible = false;
      return;
    }
    this.#previewLine.geometry.setFromPoints(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    this.#previewLine.geometry.computeBoundingSphere();
    this.#previewLine.visible = true;
  }

  /** Show the snap marker at a world point, or hide it with `null`. Overlay only. */
  setSnapMarker(point: Vec3 | null): void {
    if (this.#disposed) return;
    if (point === null) {
      this.#snapMarker.visible = false;
      return;
    }
    this.#snapMarker.position.set(point[0], point[1], point[2]);
    this.#snapMarker.visible = true;
  }

  #ensureSnapIndex(): SnapIndex {
    if (this.#snapIndex !== null) return this.#snapIndex;
    const index = new SnapIndex();
    for (const drawn of this.#drawn.values()) {
      index.addAll(
        edgeCandidates(drawn.buffers, { elementId: drawn.elementId, nodeId: drawn.nodeId }),
      );
    }
    // The world grid the `GridHelper` above draws: 20 m across, 20 divisions ⇒ 1 m spacing. Exact by
    // construction (§4.4) — a point snapped here needs no Tier-2 confirmation.
    index.addAll(gridCandidates({ spacingMm: 1000, extentMm: 10_000 }));
    this.#snapIndex = index;
    return index;
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
    this.#previewLine.geometry.dispose();
    (this.#previewLine.material as THREE.Material).dispose();
    this.#guideLines.geometry.dispose();
    (this.#guideLines.material as THREE.Material).dispose();
    this.#snapMarker.geometry.dispose();
    (this.#snapMarker.material as THREE.Material).dispose();
    this.#snapIndex = null;
    this.#drawn.clear();
    this.#controls.dispose();
    this.#renderer.dispose();
  }
}

/**
 * World-space prune radius for a snap query (mm). Deliberately generous: a screen-pixel tolerance has no
 * fixed world size (it grows as the camera pulls back), so the hash prunes loosely and `chooseSnap`
 * applies the real pixel test. Too small and a zoomed-out snap silently stops finding anything — the
 * failure mode is a snap that just "doesn't work sometimes", which is the hardest kind to report.
 */
const SNAP_SEARCH_RADIUS_MM = 3000;

/**
 * World-space radius for gathering ALIGNMENT references (mm) — and it is deliberately five times the
 * snap radius, because the two answer different questions.
 *
 * A snap asks *"what is under my cursor?"*, so 3 m of slack around the cursor is already generous. An
 * alignment asks *"what am I lined up WITH?"*, and the whole value of the feature is that the thing you
 * are lined up with is somewhere ELSE — the far corner of the room, not the one you are standing on. A
 * radius tuned for snapping would make guides fire only when the reference was nearly under the cursor,
 * which is exactly when you no longer need one.
 *
 * ⚠ 15 m is three quarters of the drawn grid's half-extent (`GridHelper(20_000, …)`), so it covers a
 * building-sized view and stops there. Beyond it there is no guide — a STATED bound, not a silent one.
 */
const GUIDE_REFERENCE_RADIUS_MM = 15_000;

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
