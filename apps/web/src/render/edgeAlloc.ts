// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE EDGE-BUFFER ALLOCATOR — pure, and therefore measurable headlessly (P4 step 9(b), the batching
 * rewrite; design in `P4_step9_renderer_batching_design.md` §7).
 *
 * ⚠ WHY IT EXISTS. `BatchedMesh` batches the FACE meshes into one draw call, but it is triangle-only —
 * the edge `LineSegments` are the OTHER half of the ~30k draw calls Entry 55 measured. So all edges go
 * into ONE `THREE.LineSegments` over a single shared position buffer, and this allocator hands out the
 * per-part sub-ranges of that buffer (like `BatchedMesh` does internally for faces, minus the
 * matrix/colour/visibility bookkeeping — edges are positions-only and one colour).
 *
 * ⚠ THE THREE.JS WRITES LIVE IN `PartBatch`; THE BOOKKEEPING LIVES HERE. This module never touches a
 * `Float32Array` or a GPU buffer — it only decides offsets, tracks fragmentation, and plans compaction.
 * That split is the `reconcile.ts` discipline: the allocation logic is a pure function of the
 * allocations, so it is unit-tested by asserting offsets in Node, and only the data movement is exercised
 * in a browser.
 *
 * ⚠ SEGMENT ALIGNMENT. A `LineSegments` draws vertices in consecutive PAIRS (vertices 2k, 2k+1 form
 * segment k). Every part's edge run is an expansion into segment pairs, so every `count` is EVEN; the
 * allocator only ever appends/reuses even-sized blocks, so a part's vertices never straddle another's and
 * a freed (zeroed) hole renders as zero-length segments — i.e. nothing. This invariant is the caller's to
 * uphold (it always passes even counts); the allocator preserves it because it moves whole blocks only.
 */

/** A move to defragment the buffer: copy `count` verts from `from` to `to`. */
export interface EdgeMove {
  readonly from: number;
  readonly to: number;
  readonly count: number;
}

/** The result of planning a compaction: how each live slot relocates, and the new high-water mark. */
export interface EdgePackPlan {
  /** The data moves to execute against the position buffer, in an order safe to apply front-to-back. */
  readonly moves: readonly EdgeMove[];
  /** `newOffsets[i]` is the packed offset of `live[i]` (same index as the input array). */
  readonly newOffsets: readonly number[];
  /** The high-water mark after packing — the new draw-range length. */
  readonly newHigh: number;
}

export class EdgeAllocator {
  /** Buffer capacity in VERTICES (advisory — `PartBatch` owns the actual `Float32Array`). */
  #capacity: number;
  /** High-water mark: the first never-allocated vertex. Draw range is `[0, high)`. */
  #high = 0;
  /** Freed blocks available for exact-size reuse: vertex-count → list of offsets. */
  readonly #free = new Map<number, number[]>();
  /** Vertices sitting in freed blocks — the fragmentation the compaction threshold watches. */
  #waste = 0;

  constructor(capacity: number) {
    this.#capacity = capacity;
  }

  /** The first never-used vertex — the live draw-range length (holes inside it are zeroed). */
  get high(): number {
    return this.#high;
  }

  get capacity(): number {
    return this.#capacity;
  }

  /** Fraction of the used range sitting in freed holes — the compaction trigger. */
  get wasteRatio(): number {
    return this.#high === 0 ? 0 : this.#waste / this.#high;
  }

  /**
   * Allocate `count` vertices and return the offset. Reuses an EXACT-size freed block when one exists
   * (same-typed parts share edge counts, so exact reuse is the common case and avoids fragmentation),
   * otherwise bumps the high-water mark. ⚠ Call `needsGrow(count)` first — this does not check capacity.
   */
  alloc(count: number): number {
    const bucket = this.#free.get(count);
    if (bucket !== undefined && bucket.length > 0) {
      this.#waste -= count;
      return bucket.pop()!;
    }
    const offset = this.#high;
    this.#high += count;
    return offset;
  }

  /**
   * Would allocating `count` verts require growing the buffer? False when an exact-size freed block can
   * satisfy it (no capacity needed); true when appending would exceed capacity.
   */
  needsGrow(count: number): boolean {
    const bucket = this.#free.get(count);
    if (bucket !== undefined && bucket.length > 0) return false;
    return this.#high + count > this.#capacity;
  }

  /** Record a larger backing buffer (after `PartBatch` reallocates the `Float32Array`). */
  grow(newCapacity: number): void {
    if (newCapacity > this.#capacity) this.#capacity = newCapacity;
  }

  /** Free a block, making it available for exact-size reuse and counting it as waste until compacted. */
  free(offset: number, count: number): void {
    if (count === 0) return;
    let bucket = this.#free.get(count);
    if (bucket === undefined) {
      bucket = [];
      this.#free.set(count, bucket);
    }
    bucket.push(offset);
    this.#waste += count;
  }

  /**
   * Plan a defragmentation that packs the given live slots (in ANY current order) to the front of the
   * buffer with no holes. Pure: returns the moves and each slot's new offset; the caller applies the moves
   * to the position buffer and then calls `applyPack(plan.newHigh)`. Sorted by current offset so the moves
   * are safe to apply in order (every destination is at or before its source ⇒ no overlap clobber).
   */
  static planPack(
    live: readonly { readonly offset: number; readonly count: number }[],
  ): EdgePackPlan {
    const order = live
      .map((slot, i) => ({ slot, i }))
      .sort((a, b) => a.slot.offset - b.slot.offset);
    const moves: EdgeMove[] = [];
    const newOffsets = new Array<number>(live.length);
    let cursor = 0;
    for (const { slot, i } of order) {
      if (slot.offset !== cursor) moves.push({ from: slot.offset, to: cursor, count: slot.count });
      newOffsets[i] = cursor;
      cursor += slot.count;
    }
    return { moves, newOffsets, newHigh: cursor };
  }

  /** Reset the free list and high-water mark after a compaction packed the buffer to `newHigh`. */
  applyPack(newHigh: number): void {
    this.#high = newHigh;
    this.#free.clear();
    this.#waste = 0;
  }
}
