/**
 * THREE HOLES ENTRY 13'S AUDIT FOUND, CLOSED — and the tests that keep them closed.
 *
 * They have nothing in common except that each was **cheap today and a contract amendment after P3**,
 * which is the only reason they were done now rather than later:
 *
 *   1. **`measure` could not answer a quantity question.** It measured whole solids only, so *"what is
 *      the AREA of that wall face?"* — the paint area, the formwork area, the cladding take-off — was
 *      not askable. That foreclosed **quantities**, a declared north-star that **domain rule 8 forbids
 *      foreclosing**; left **P5's `quantities` hook** on `BimObjectType` with nothing to call; and
 *      starved **Miqdar** of its entire input. `bounds` has taken a `ref` since Entry 9. The asymmetry
 *      was an oversight, not a design.
 *
 *   2. **`capabilities` was a hand-written list** — a second statement of what the handler map already
 *      says, and it had already drifted (`transform` shipped in Entry 11 and was missing from it for
 *      two sessions). It is now DERIVED. The test below is what makes that guarantee real.
 *
 *   3. **`INVALID_RESULT` was declared in the protocol and never emitted.** No op ever checked its own
 *      output, so an OCCT operation that "succeeds" while producing a topologically invalid solid was
 *      accepted and stored — and its meaningless volume would have been billed by a quantity schedule.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernelHost } from '@bunyan/kernel-occt';
import { createMockKernelHost } from '@bunyan/kernel-mock';
import { INFRASTRUCTURE_OPS, OP_NAMES, RESERVED_OPS } from '@bunyan/protocol';

describe('measure(ref) — the op that makes quantities possible', () => {
  let client: KernelClient;

  beforeAll(async () => {
    client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
  });
  afterAll(() => {
    client.dispose();
  });

  /**
   * A 3000 x 200 x 2500 wall. Its faces have known areas, so the answers are checked against arithmetic
   * a human can do in their head — not against the kernel's own opinion.
   */
  it('measures ONE named face: the paint area of a wall, by identity', async () => {
    const wall = await client.request('makeBox', {
      nodeId: 'wall-1',
      dx: 3000,
      dy: 200,
      dz: 2500,
    });

    const face = wall.refs.find((r) => r.endsWith('/face/y-min#0'));
    expect(face, 'the wall must expose its y-min face by identity').toBeDefined();

    const m = await client.request('measure', { handle: wall.handle, ref: face ?? '' });

    // The big face of the wall: 3000 x 2500 mm. THIS is the number a paint or formwork schedule wants.
    expect(m.area).toBeCloseTo(3000 * 2500, 6);
    // Its perimeter — 2 x (3000 + 2500).
    expect(m.edgeLength).toBeCloseTo(2 * (3000 + 2500), 6);
    // ⚠ AND ZERO VOLUME. A face encloses nothing. OCCT's VolumeProperties on an open shell returns a
    // plausible, meaningless number, and a quantity schedule would bill it without blinking.
    expect(m.volume).toBe(0);
    expect(m.counts.solids).toBe(0);
    expect(m.counts.faces).toBe(1);

    // The whole-shape form still answers for the whole shape — the `ref` is additive, not a change.
    const whole = await client.request('measure', { handle: wall.handle });
    expect(whole.volume).toBeCloseTo(3000 * 200 * 2500, 3);
    expect(whole.counts.faces).toBe(6);
  });

  it('measures ONE named edge: its length, and nothing it does not have', async () => {
    const wall = await client.request('makeBox', { nodeId: 'wall-2', dx: 3000, dy: 200, dz: 2500 });
    const edge = wall.refs.find((r) => r.includes('/edge/x-max|y-min'));
    expect(edge).toBeDefined();

    const m = await client.request('measure', { handle: wall.handle, ref: edge ?? '' });
    expect(m.edgeLength).toBeCloseTo(2500, 6); // the vertical edge where x-max meets y-min
    expect(m.area).toBe(0);
    expect(m.volume).toBe(0);
  });

  /**
   * ⚠ THE CASE THAT PROVES IT IS NOT DERIVED FROM THE MESH. A cylinder's lateral face is curved: a
   * tessellation under-reports its area by the chord error, so a quantities path built on triangles
   * would quietly under-bill the formwork for every circular column in the project.
   */
  it('is EXACT on a curved face — 2·π·r·h, not the tessellation’s polygon', async () => {
    const col = await client.request('makeCylinder', {
      nodeId: 'col-1',
      radius: 400,
      height: 3000,
    });
    const lateral = col.refs.find((r) => r.endsWith('/face/lateral#0'));
    expect(lateral).toBeDefined();

    const m = await client.request('measure', { handle: col.handle, ref: lateral ?? '' });
    expect(m.area).toBeCloseTo(2 * Math.PI * 400 * 3000, 3);
  });

  it('refuses a ref that names nothing on this shape, with a typed failure', async () => {
    const wall = await client.request('makeBox', { nodeId: 'wall-3', dx: 1000, dy: 200, dz: 2500 });
    await expect(
      client.request('measure', { handle: wall.handle, ref: 'wall-3/face/not-a-face#0' }),
    ).rejects.toMatchObject({ failure: { code: 'UNRESOLVED_SUBSHAPE_REF' } });
  });
});

describe('capabilities are DERIVED from the handlers, never hand-written', () => {
  /**
   * ⚠ WHY THIS TEST EXISTS. `capabilities` and the handler map are two statements of the same fact, and
   * one of them was stale: `transform` was implemented in Entry 11 and left out of the OCCT kernel's
   * advertised list for two sessions. A kernel that misdescribes itself is worse than one that cannot do
   * the thing, because a caller *plans* around the advertisement.
   *
   * ⚠ AND THE SECOND HOLE IT CLOSES. `OpHandlers` is `Partial`, so an op declared in `OpMap` with NO
   * handler is not a compile error — it silently becomes `UNKNOWN_OP` at runtime. That optionality is
   * deliberate (it is how the mock honestly refuses a boolean it cannot fake), but nothing checked a
   * kernel for completeness. Deriving the advertisement from the implementation means a missing handler
   * can no longer be *misadvertised*: the kernel simply stops claiming it.
   */
  it('the REAL kernel advertises exactly the geometry ops it implements — and every one answers', async () => {
    const client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
    try {
      const { kernel } = await client.request('handshake', { clientProtocolVersion: 1 });

      // Every op in the protocol that is not plumbing and not RESERVED, and that the kernel does NOT
      // advertise, must genuinely be unimplemented — and every op it DOES advertise must genuinely
      // answer. The list and the implementation cannot disagree, because the list IS the implementation.
      const geometryOps = OP_NAMES.filter(
        (op) =>
          !(INFRASTRUCTURE_OPS as readonly string[]).includes(op) &&
          !(RESERVED_OPS as readonly string[]).includes(op),
      );
      expect(kernel.capabilities).toEqual(geometryOps);

      // The one that drifted, named explicitly so a regression is unmissable.
      expect(kernel.capabilities).toContain('transform');
      // The one added in Entry 14 — it would have been forgotten by the old hand-written list.
      expect(kernel.capabilities).toContain('revolve');
    } finally {
      client.dispose();
    }
  });

  /**
   * The mock's refusals are honest, and they are now stated ONCE — by not implementing the op. It says
   * so in `capabilities` because it does not implement it, not because someone remembered to write it
   * down.
   */
  it('the MOCK advertises only what it can do exactly — no booleans, no extrude, no revolve', async () => {
    const client = new KernelClient(new InProcessTransport(createMockKernelHost()));
    try {
      const { kernel } = await client.request('handshake', { clientProtocolVersion: 1 });

      expect(kernel.capabilities).toEqual([
        'makeBox',
        'measure',
        'bounds',
        'distance',
        'classifyPoint',
        'faceFrame',
        'tessellate',
      ]);

      // And an op it does not advertise really is refused — the advertisement is not a lie in either
      // direction.
      await expect(
        client.request('boolean', { nodeId: 'x', kind: 'cut', a: 'a', b: 'b' }),
      ).rejects.toMatchObject({ failure: { code: 'UNKNOWN_OP' } });
    } finally {
      client.dispose();
    }
  });

  /**
   * ⚠⚠ THE RESERVED OPS (D13, owner-ruled 2026-07-13) — AND WHAT "RESERVED" ACTUALLY MEANS.
   *
   * The protocol freezes at the end of P3. **P6 needs `sectionCut`** (the 2D plan and elevation — a
   * headline v1.0.0 deliverable, and the proof the kernel is the source of truth) **and IFC-import ops**
   * (D16, new C++ ops by construction). Neither existed and neither was scheduled before the freeze, so
   * **P6 would have opened by amending a frozen contract** — which makes the freeze theatre. Twelve
   * entries missed it; Entry 13's audit found it.
   *
   * The ruling reserved the SHAPES now, because the expensive thing to get wrong is the payload, not the
   * body. This test pins the two halves of what that means, so neither can rot:
   *
   *   1. the op is DECLARED (it is in `OpMap` and `OP_NAMES`, so its payload type is frozen with the
   *      rest of the protocol), and
   *   2. the op is HONESTLY UNIMPLEMENTED — no handler, so it is absent from `capabilities` and answers
   *      `UNKNOWN_OP`. It does not pretend, and it does not silently return an empty result.
   *
   * ⚠ When P6 implements one, `capabilities` picks it up **with no other edit** — because the list is
   * derived from the handler map. That is the whole design. **This test then fails, and it should:** the
   * op must be removed from `RESERVED_OPS` deliberately, by a human who knows what they are doing.
   */
  it('the RESERVED ops are declared, unimplemented, and honest about it (D13)', async () => {
    // ⚠ FIVE, AND EACH ONE IS RESERVED FOR THE SAME REASON: the expensive thing to get wrong is the
    // PAYLOAD SHAPE, not the body — and the protocol freezes at the end of P3, which is now.
    //
    //   sectionCut · importIfc  — P6's (the 2D drawing; the IFC door).            [Entry 15]
    //   instantiate             — the answer to the ~21 s style edit across 400 walls, and the ONE
    //                             lever that needed a protocol decision (§4j-3c).  [owner, 2026-07-14]
    //   exportBrep · importBrep — the geometry cache. ⚠ D29 was RULED **SHIP** (owner, 2026-07-14),
    //                             so these are not speculative: they are scheduled work whose shape had
    //                             to be agreed while the protocol was still soft. See `ops.ts` for why
    //                             a cache that carries identity tokens does NOT reintroduce a token map:
    //                             it binds by CANONICAL ORDER and VERIFIES, and refuses (CACHE_STALE)
    //                             rather than mis-name a face.
    expect(RESERVED_OPS, 'declared before the freeze; bodies come later').toEqual([
      'sectionCut',
      'importIfc',
      'instantiate',
      'exportBrep',
      'importBrep',
    ]);

    // Declared in the protocol — the payload shape is frozen even though the body is not written.
    for (const op of RESERVED_OPS) {
      expect(OP_NAMES, `${op} must be in the protocol`).toContain(op);
    }

    for (const host of [await createOcctKernelHost(), createMockKernelHost()]) {
      const client = new KernelClient(new InProcessTransport(host));
      try {
        const { kernel } = await client.request('handshake', { clientProtocolVersion: 1 });

        for (const op of RESERVED_OPS) {
          // Not advertised — because no handler exists, not because a list was maintained by hand.
          expect(kernel.capabilities, `${op} is reserved, not shipped`).not.toContain(op);

          // And genuinely refused. A reserved op that quietly returned `{ curves: [] }` would be far
          // worse than one that says it cannot do the job.
          await expect(
            client.request(op, {} as never),
            `${op} must answer UNKNOWN_OP until P6 implements it`,
          ).rejects.toMatchObject({ failure: { code: 'UNKNOWN_OP' } });
        }
      } finally {
        client.dispose();
      }
    }
  });
});

describe('INVALID_RESULT — an op that "succeeds" with a broken solid is refused, not stored', () => {
  /**
   * ⚠ THE CODE THE PROTOCOL RESERVED AND NEVER EMITTED (Entry 13 §4). `BRepCheck_Analyzer` now gates the
   * output of every op that can produce an invalid solid — boolean, fillet, chamfer, revolve.
   *
   * The failure mode it closes is the quiet one: OCCT reports `IsDone()`, hands back a shape whose faces
   * self-intersect, and the shape renders perfectly while its volume is meaningless. Everything
   * downstream — the next boolean, the quantity schedule, the export — inherits that silently.
   *
   * ⚠ A NOTE ON WHAT THIS TEST *CANNOT* DO, because it matters more than the assertion. A fillet with an
   * impossible radius is caught EARLIER, by OCCT's own `IsDone()` (⇒ `FILLET_RADIUS_TOO_LARGE`), which
   * is the correct and more precise code. So the assertion below accepts either: the point is that a
   * broken result NEVER reaches the registry, whichever gate catches it. `INVALID_RESULT` is the net
   * under the net.
   */
  it('a fillet larger than the geometry allows never yields a stored shape', async () => {
    const client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
    try {
      const wall = await client.request('makeBox', { nodeId: 'w', dx: 3000, dy: 200, dz: 2500 });
      const edge = wall.refs.find((r) => r.includes('/edge/x-max|y-min'));

      // A 500 mm radius on a 200 mm-thick wall: the rounded face cannot fit.
      const attempt = client.request('fillet', {
        nodeId: 'f',
        handle: wall.handle,
        edge: edge ?? '',
        radius: 500,
      });

      await expect(attempt).rejects.toMatchObject({
        failure: { code: expect.stringMatching(/FILLET_RADIUS_TOO_LARGE|INVALID_RESULT/) as never },
      });

      // ⚠ AND THE KERNEL IS STILL USABLE — a refusal is not a poisoned kernel (D10).
      const after = await client.request('measure', { handle: wall.handle });
      expect(after.volume).toBeCloseTo(3000 * 200 * 2500, 3);
    } finally {
      client.dispose();
    }
  });
});
