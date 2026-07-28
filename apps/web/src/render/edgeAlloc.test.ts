/**
 * THE EDGE-BUFFER ALLOCATOR (P4 step 9(b), the batching rewrite) — tested without a GL context.
 *
 * The batched edge buffer's correctness rests on this bookkeeping: offsets never overlap, freed blocks of
 * a matching size are reused (so a drag that re-tessellates the same-topology part does not fragment), and
 * a compaction packs the live slots to the front with moves that are safe to apply in order. The GPU
 * writes are exercised in the browser (the scale-harness precedent); this asserts the arithmetic.
 */

import { describe, expect, it } from 'vitest';
import { EdgeAllocator } from './edgeAlloc';

describe('EdgeAllocator — append, exact-size reuse, and growth signalling', () => {
  it('appends sequentially and tracks the high-water mark', () => {
    const a = new EdgeAllocator(100);
    expect(a.alloc(12)).toBe(0);
    expect(a.alloc(6)).toBe(12);
    expect(a.alloc(8)).toBe(18);
    expect(a.high).toBe(26);
    expect(a.wasteRatio).toBe(0);
  });

  it('reuses a freed block of the EXACT size before appending (the constant-topology drag case)', () => {
    const a = new EdgeAllocator(100);
    const first = a.alloc(12); // 0
    a.alloc(6); // 12
    a.free(first, 12);
    expect(a.wasteRatio).toBeGreaterThan(0);
    // A new 12-vert part reuses the hole, not the tail — no growth, no fragmentation.
    expect(a.alloc(12)).toBe(first);
    expect(a.wasteRatio).toBe(0);
    expect(a.high).toBe(18); // unchanged — the tail did not advance.
  });

  it('does not reuse a freed block of a DIFFERENT size — it appends and leaves the hole as waste', () => {
    const a = new EdgeAllocator(100);
    const first = a.alloc(12);
    a.alloc(6);
    a.free(first, 12);
    // A 10-vert request cannot use the 12-vert hole (exact match only) ⇒ appends at the high-water mark.
    expect(a.alloc(10)).toBe(18);
    expect(a.high).toBe(28);
  });

  it('signals growth only when appending would exceed capacity (a freed exact block never needs growth)', () => {
    const a = new EdgeAllocator(20);
    a.alloc(12); // high 12
    expect(a.needsGrow(6)).toBe(false); // 12 + 6 <= 20
    expect(a.needsGrow(10)).toBe(true); // 12 + 10 > 20
    a.free(0, 12);
    expect(a.needsGrow(12)).toBe(false); // an exact freed block satisfies it with no capacity
    a.grow(40);
    expect(a.capacity).toBe(40);
    expect(a.needsGrow(10)).toBe(false); // now 12 + 10 <= 40
  });
});

describe('EdgeAllocator.planPack — defragmentation', () => {
  it('packs live slots to the front, ordered by current offset, emitting only the moves that shift', () => {
    // Live slots after some frees: [offset 0,count 4], [offset 10,count 6] (a hole at 4..10).
    const plan = EdgeAllocator.planPack([
      { offset: 0, count: 4 },
      { offset: 10, count: 6 },
    ]);
    // The first slot is already at the front (no move); the second moves 10→4.
    expect(plan.moves).toEqual([{ from: 10, to: 4, count: 6 }]);
    expect(plan.newOffsets).toEqual([0, 4]);
    expect(plan.newHigh).toBe(10);
  });

  it('sorts by offset so moves apply front-to-back without clobbering (input order irrelevant)', () => {
    const plan = EdgeAllocator.planPack([
      { offset: 20, count: 2 },
      { offset: 4, count: 4 },
    ]);
    // Sorted: offset 4 (→0, moves), then offset 20 (→4, moves). Every destination precedes its source.
    expect(plan.moves).toEqual([
      { from: 4, to: 0, count: 4 },
      { from: 20, to: 4, count: 2 },
    ]);
    // newOffsets follows the INPUT order: slot 0 (offset 20) packs to 4, slot 1 (offset 4) packs to 0.
    expect(plan.newOffsets).toEqual([4, 0]);
    expect(plan.newHigh).toBe(6);
  });

  it('applyPack resets waste to zero and the high-water mark to the packed length', () => {
    const a = new EdgeAllocator(100);
    a.alloc(4);
    const mid = a.alloc(6);
    a.alloc(4);
    a.free(mid, 6); // a hole in the middle
    expect(a.wasteRatio).toBeGreaterThan(0);
    a.applyPack(8); // two 4-count slots packed
    expect(a.high).toBe(8);
    expect(a.wasteRatio).toBe(0);
  });
});
