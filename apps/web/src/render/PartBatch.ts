/**
 * THE PART BATCH (P4 step 9(b) — the batching rewrite; design `P4_step9_renderer_batching_design.md`).
 *
 * Entry 55 measured the one-`THREE.Mesh`-per-part renderer at ~30,700 draw calls / ~606 ms per frame at
 * the 10k-element target — ~20× over a 16 ms budget, the wall both interactive scale axes collapse to.
 * This collapses that: ALL opaque face parts into ONE `THREE.BatchedMesh` (per-instance colour, one
 * multi-draw call) and ALL edge segments into ONE `THREE.LineSegments` over a shared, sub-range-allocated
 * position buffer. End state: ~2 draw calls for the whole model.
 *
 * ⚠ IT PRESERVES EVERY INVARIANT THE PER-PART PATH HAD (design §4). A part is still individually
 * addressable — installed, recoloured, removed, and PICKED one at a time — because `BatchedMesh` keeps a
 * per-instance identity (`batchId`) and the edge buffer keeps a per-part slot. The incremental redraw
 * (2b) stays incremental: a rebuilt part rewrites only ITS instance (`setGeometryAt` in place, or
 * delete+re-add when the new tessellation outgrows its reserved space) and only its edge slot — O(changed),
 * never O(N). Picking (step 4) survives via `resolveHit` (design §5): a `BatchedMesh` raycast reports a
 * GLOBAL face index, which maps back to the part's LOCAL one through `getGeometryRangeAt`, then through the
 * UNCHANGED retained-provenance path.
 *
 * ⚠ THE THREE.JS IS HERE; THE ALLOCATION BOOKKEEPING IS PURE (`edgeAlloc.ts`, unit-tested in Node). The
 * batched RENDER can only be exercised in a real browser (the scale-harness precedent), so the logic that
 * decides offsets and compaction is factored out and asserted headlessly; this file is the GL glue.
 */

import * as THREE from 'three';

import type { MeshBuffers } from '@bunyan/protocol';
import { localFaceIndex } from './pick';
import { EdgeAllocator } from './edgeAlloc';
import {
  createBatchFaceMaterial,
  toBufferGeometry,
  expandEdgeSegments,
  EDGE_COLOR,
} from './tessellation';

/** A hit resolved back to a part: which part, and the LOCAL face index its provenance is keyed by. */
export interface BatchHit {
  readonly nodeId: string;
  readonly localFaceIndex: number;
}

/** The GL handles a batched part owns — a face instance/geometry pair and its edge buffer slot. */
interface BatchPart {
  geometryId: number;
  instanceId: number;
  /** The part's slice of the shared edge buffer (verts), or `null` when the kernel gave no edges. */
  edge: { offset: number; count: number } | null;
}

/** Initial batch capacities. Modest by default (a house is a few hundred parts); grows geometrically. */
export interface BatchCapacity {
  readonly instances?: number;
  readonly vertices?: number;
  readonly indices?: number;
  readonly edgeVertices?: number;
}

const DEFAULT_CAPACITY: Required<BatchCapacity> = {
  instances: 1024,
  vertices: 1024 * 36,
  indices: 1024 * 54,
  edgeVertices: 1024 * 48,
};

/** Compact the edge buffer once freed holes exceed this fraction of the used range. */
const EDGE_WASTE_THRESHOLD = 0.4;

export class PartBatch {
  readonly #faces: THREE.BatchedMesh;
  #maxInstances: number;
  #maxVerts: number;
  #maxIndices: number;
  /** Active instances — grows on a NEW part, shrinks on remove; drives instance-capacity growth. */
  #liveInstances = 0;

  /** The single shared edge buffer, its geometry, and the object drawn from it. */
  #edgePos: Float32Array;
  readonly #edgeGeom = new THREE.BufferGeometry();
  readonly #edges: THREE.LineSegments;
  readonly #edgeAlloc: EdgeAllocator;

  readonly #parts = new Map<string, BatchPart>();
  /** `batchId` (instance id) → `nodeId`, for resolving a raycast hit (design §5). */
  readonly #instanceToNode = new Map<number, string>();

  readonly #scratchColor = new THREE.Color();

  constructor(capacity: BatchCapacity = {}) {
    const cap = { ...DEFAULT_CAPACITY, ...capacity };
    this.#maxInstances = cap.instances;
    this.#maxVerts = cap.vertices;
    this.#maxIndices = cap.indices;

    this.#faces = new THREE.BatchedMesh(
      this.#maxInstances,
      this.#maxVerts,
      this.#maxIndices,
      createBatchFaceMaterial(),
    );
    // Per-object frustum culling is the batch's free third lever (the flat Group never had it).
    this.#faces.perObjectFrustumCulled = true;
    this.#faces.sortObjects = false; // opaque parts; skip the per-frame depth sort.

    this.#edgeAlloc = new EdgeAllocator(cap.edgeVertices);
    this.#edgePos = new Float32Array(cap.edgeVertices * 3);
    this.#edgeGeom.setAttribute('position', new THREE.BufferAttribute(this.#edgePos, 3));
    this.#edgeGeom.setDrawRange(0, 0);
    this.#edges = new THREE.LineSegments(
      this.#edgeGeom,
      new THREE.LineBasicMaterial({ color: EDGE_COLOR }),
    );
    this.#edges.frustumCulled = false; // one object spanning the whole model — never cull it wholesale.
  }

  /** The two objects to add to the scene — one face batch, one edge batch. */
  get faceObject(): THREE.BatchedMesh {
    return this.#faces;
  }

  get edgeObject(): THREE.LineSegments {
    return this.#edges;
  }

  get partCount(): number {
    return this.#parts.size;
  }

  has(nodeId: string): boolean {
    return this.#parts.has(nodeId);
  }

  /**
   * Install or re-install a part. A NEW part adds a face geometry+instance and an edge slot; a REBUILT
   * part (2b) rewrites its instance in place (`setGeometryAt`) when the new tessellation fits its reserved
   * space, else deletes and re-adds — and rewrites its edge slot in place when the vertex count matches,
   * else frees and re-allocates. Either way it is O(this part), never O(model).
   */
  set(nodeId: string, buffers: MeshBuffers, color: number): void {
    const existing = this.#parts.get(nodeId);
    if (existing === undefined) {
      this.#insert(nodeId, buffers, color);
    } else {
      this.#update(nodeId, existing, buffers, color);
    }
  }

  #insert(nodeId: string, buffers: MeshBuffers, color: number): void {
    const geometry = toBufferGeometry(buffers);
    const vertCount = buffers.positions.length / 3;
    const indexCount = buffers.indices.length;

    this.#ensureFaceSpace(vertCount, indexCount);
    this.#ensureInstanceSlot();

    const geometryId = this.#faces.addGeometry(geometry);
    const instanceId = this.#faces.addInstance(geometryId);
    this.#faces.setColorAt(instanceId, this.#scratchColor.setHex(color));
    this.#liveInstances++;
    this.#instanceToNode.set(instanceId, nodeId);
    geometry.dispose(); // data is copied into the batch buffers (addGeometry) — the temp is done.

    const edge = this.#allocEdge(buffers);
    this.#parts.set(nodeId, { geometryId, instanceId, edge });
  }

  #update(nodeId: string, part: BatchPart, buffers: MeshBuffers, color: number): void {
    const geometry = toBufferGeometry(buffers);
    const vertCount = buffers.positions.length / 3;
    const indexCount = buffers.indices.length;

    const range = this.#faces.getGeometryRangeAt(part.geometryId);
    const fitsInPlace =
      range !== null &&
      vertCount <= range.reservedVertexCount &&
      indexCount <= range.reservedIndexCount;

    if (fitsInPlace) {
      this.#faces.setGeometryAt(part.geometryId, geometry);
    } else {
      // Outgrew its reserved space (a curved part, or an opening changed topology) — re-add and remap.
      // ⚠ `deleteGeometry` ALSO deletes every instance referencing that geometry (three cascades it), so
      // deleting the instance FIRST would make that cascade re-delete an already-dead instance and throw
      // `Invalid instanceId` — call `deleteGeometry` alone (found by removing 16k parts, step-9(b) harness).
      this.#faces.deleteGeometry(part.geometryId);
      this.#instanceToNode.delete(part.instanceId);
      this.#ensureFaceSpace(vertCount, indexCount);
      part.geometryId = this.#faces.addGeometry(geometry);
      part.instanceId = this.#faces.addInstance(part.geometryId);
      this.#instanceToNode.set(part.instanceId, nodeId);
    }
    this.#faces.setColorAt(part.instanceId, this.#scratchColor.setHex(color));
    geometry.dispose();

    // Edges: rewrite in place when the vertex count matches (the constant-topology drag case), else
    // free and re-allocate.
    const expanded = expandEdgeSegments(buffers);
    if (part.edge !== null && (expanded === null || expanded.length / 3 !== part.edge.count)) {
      this.#freeEdge(part.edge);
      part.edge = null;
    }
    if (expanded !== null) {
      if (part.edge !== null) {
        this.#writeEdge(part.edge.offset, expanded); // same size ⇒ in place.
      } else {
        part.edge = this.#allocEdgeFrom(expanded);
      }
    }
  }

  /** Swap a part's colour only — no re-tessellation (a material re-assignment, reconcile `recolor`). */
  recolor(nodeId: string, color: number): void {
    const part = this.#parts.get(nodeId);
    if (part === undefined) return;
    this.#faces.setColorAt(part.instanceId, this.#scratchColor.setHex(color));
  }

  /** Remove a part: delete its face geometry (which cascades to its instance) and free its edge slot. */
  remove(nodeId: string): void {
    const part = this.#parts.get(nodeId);
    if (part === undefined) return;
    // `deleteGeometry` cascades to delete the single instance that references it — do NOT also call
    // `deleteInstance` (that double-delete throws `Invalid instanceId`; step-9(b) harness, 16k-part teardown).
    this.#faces.deleteGeometry(part.geometryId);
    this.#instanceToNode.delete(part.instanceId);
    this.#liveInstances--;
    if (part.edge !== null) this.#freeEdge(part.edge);
    this.#parts.delete(nodeId);
  }

  /**
   * Resolve a raycast hit back to a part + its local face index (design §5). `batchId` is the instance,
   * `globalFaceIndex` is the triangle index into the MERGED buffer; the part's geometry range start turns
   * it local, and the retained provenance (in the caller) turns THAT into a `SubShapeRef`.
   */
  resolveHit(batchId: number, globalFaceIndex: number): BatchHit | null {
    const nodeId = this.#instanceToNode.get(batchId);
    if (nodeId === undefined) return null;
    const part = this.#parts.get(nodeId);
    if (part === undefined) return null;
    const range = this.#faces.getGeometryRangeAt(part.geometryId);
    if (range === null) return null;
    return { nodeId, localFaceIndex: localFaceIndex(globalFaceIndex, range.start) };
  }

  /** After removals, reclaim fragmented space: optimise the face buffer and compact the edge buffer. */
  maybeCompact(): void {
    this.#faces.optimize();
    if (this.#edgeAlloc.wasteRatio <= EDGE_WASTE_THRESHOLD) return;

    const nodes = [...this.#parts.entries()].filter(([, p]) => p.edge !== null);
    const live = nodes.map(([, p]) => p.edge!);
    const plan = EdgeAllocator.planPack(live);
    for (const move of plan.moves) {
      this.#edgePos.copyWithin(move.to * 3, move.from * 3, (move.from + move.count) * 3);
    }
    // Zero the now-unused tail so nothing stale draws, then record the new offsets.
    this.#edgePos.fill(0, plan.newHigh * 3, this.#edgeAlloc.high * 3);
    nodes.forEach(([, p], i) => {
      p.edge = { offset: plan.newOffsets[i]!, count: p.edge!.count };
    });
    this.#edgeAlloc.applyPack(plan.newHigh);
    this.#edgePosAttr().needsUpdate = true;
    this.#edgeGeom.setDrawRange(0, this.#edgeAlloc.high);
  }

  dispose(): void {
    this.#faces.dispose();
    this.#edgeGeom.dispose();
    (this.#edges.material as THREE.Material).dispose();
    this.#parts.clear();
    this.#instanceToNode.clear();
  }

  // ── faces capacity ────────────────────────────────────────────────────────────────────────────────

  #ensureFaceSpace(vertCount: number, indexCount: number): void {
    if (vertCount <= this.#faces.unusedVertexCount && indexCount <= this.#faces.unusedIndexCount)
      return;
    // Reclaim freed-but-not-compacted space first — a churn of edits can fragment without needing growth.
    this.#faces.optimize();
    if (vertCount <= this.#faces.unusedVertexCount && indexCount <= this.#faces.unusedIndexCount)
      return;
    // Still short ⇒ grow both buffers geometrically until this add fits (`used` is capacity − unused).
    const usedVerts = this.#maxVerts - this.#faces.unusedVertexCount;
    const usedIndices = this.#maxIndices - this.#faces.unusedIndexCount;
    while (this.#maxVerts - usedVerts < vertCount) this.#maxVerts *= 2;
    while (this.#maxIndices - usedIndices < indexCount) this.#maxIndices *= 2;
    this.#faces.setGeometrySize(this.#maxVerts, this.#maxIndices);
  }

  #ensureInstanceSlot(): void {
    if (this.#liveInstances < this.#maxInstances) return;
    this.#maxInstances *= 2;
    this.#faces.setInstanceCount(this.#maxInstances);
  }

  // ── edges ─────────────────────────────────────────────────────────────────────────────────────────

  #allocEdge(buffers: MeshBuffers): { offset: number; count: number } | null {
    const expanded = expandEdgeSegments(buffers);
    if (expanded === null) return null;
    return this.#allocEdgeFrom(expanded);
  }

  #allocEdgeFrom(expanded: Float32Array): { offset: number; count: number } {
    const count = expanded.length / 3;
    if (this.#edgeAlloc.needsGrow(count)) this.#growEdgeBuffer(count);
    const offset = this.#edgeAlloc.alloc(count);
    this.#writeEdge(offset, expanded);
    this.#edgeGeom.setDrawRange(0, this.#edgeAlloc.high);
    return { offset, count };
  }

  #writeEdge(offset: number, expanded: Float32Array): void {
    this.#edgePos.set(expanded, offset * 3);
    const attr = this.#edgePosAttr();
    attr.needsUpdate = true;
    attr.addUpdateRange(offset * 3, expanded.length);
  }

  #freeEdge(edge: { offset: number; count: number }): void {
    // Zero the block so it draws as zero-length (invisible) segments until reused or compacted.
    this.#edgePos.fill(0, edge.offset * 3, (edge.offset + edge.count) * 3);
    const attr = this.#edgePosAttr();
    attr.needsUpdate = true;
    attr.addUpdateRange(edge.offset * 3, edge.count * 3);
    this.#edgeAlloc.free(edge.offset, edge.count);
  }

  #growEdgeBuffer(extra: number): void {
    let newCap = this.#edgeAlloc.capacity;
    while (this.#edgeAlloc.high + extra > newCap) newCap *= 2;
    const next = new Float32Array(newCap * 3);
    next.set(this.#edgePos.subarray(0, this.#edgeAlloc.high * 3));
    this.#edgePos = next;
    this.#edgeGeom.setAttribute('position', new THREE.BufferAttribute(this.#edgePos, 3));
    this.#edgeAlloc.grow(newCap);
  }

  #edgePosAttr(): THREE.BufferAttribute {
    return this.#edgeGeom.getAttribute('position') as THREE.BufferAttribute;
  }
}
