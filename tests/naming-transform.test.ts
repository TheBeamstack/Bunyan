// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * TRANSFORM — the op that creates no identities.
 *
 * ⚠ THE PROPERTY UNDER TEST, AND IT IS AN IDENTITY PROPERTY, NOT A GEOMETRIC ONE:
 *
 *     A rotated wall is the SAME WALL.
 *
 * A rigid motion is a topological isomorphism — every face maps to exactly one face — so every
 * sub-shape of the result IS the sub-shape it came from, merely somewhere else. Its refs are the
 * operand's refs, token for token, in the same order. The window hosted on a wall's `y-min` face is
 * still hosted on it after the wall is rotated into place, and after it is mirrored to the other side
 * of the corridor.
 *
 * If that were not so, `transform` would be unusable in a BIM tool: placing a wall at an angle would
 * silently re-target every reference in the building that pointed at it. That is why this op could not
 * be a "new field on makeBox" — it is a new op, and its naming rule is the whole of its design.
 *
 * These assertions are about IDENTITY, not millimetres (core_logic §5 — a naming bug does not look
 * like a geometry bug). The millimetres are gated separately, in `golden-transform.test.ts`, against a
 * native OCCT reference — because a wrong transform is the rare naming-adjacent bug that WOULD look
 * like a geometry bug, and it needs both nets.
 *
 * The behaviour asserted here was MEASURED first, not assumed: `tools/kernel-build/probe.cpp`, cases
 * 7-11, re-runnable in ~60 s.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel, createOcctKernelHost } from '@bunyan/kernel-occt';

const WALL = { dx: 3000, dy: 200, dz: 2500 } as const;

describe('transform — a rotated wall is the same wall', () => {
  let client: KernelClient;

  beforeAll(async () => {
    client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
  });
  afterAll(() => {
    client.dispose();
  });

  const wall = async (nodeId = 'wall-1') => client.request('makeBox', { nodeId, ...WALL });

  // -------------------------------------------------------------------------------------------
  // 1. THE CORE CLAIM: the refs pass through, byte for byte.
  // -------------------------------------------------------------------------------------------

  it('a ROTATION preserves every ref, byte for byte and in the same order', async () => {
    const before = await wall();
    const after = await client.request('transform', {
      handle: before.handle,
      motions: [{ kind: 'rotate', axis: [0, 0, 1], degrees: 30 }],
    });

    // Not "mostly the same", not "resolvable by nearest match" — IDENTICAL, and in order.
    expect(after.refs).toEqual(before.refs);
    expect(after.refs).toHaveLength(18); // 6 faces + 12 edges
    expect(after.handle).not.toBe(before.handle); // a new solid, the same identities
  });

  it('a MIRROR preserves every ref too — the negative transform is not a special case', async () => {
    const before = await wall();
    const after = await client.request('transform', {
      handle: before.handle,
      motions: [{ kind: 'mirror', normal: [1, 0, 0] }],
    });

    expect(after.refs).toEqual(before.refs);
  });

  /**
   * ⚠ The role in a ref is a DERIVATION PATH, not a coordinate claim — and a mirror is what makes that
   * distinction bite. After mirroring, the face still called `y-min` may well sit at larger y than the
   * face called `y-max`. That is not a bug and must never be "fixed": the role means *"the face that
   * MakeBox called y-min when it built wall-1"*, which is a fact about the recipe and stays true no
   * matter where the solid ends up. The moment a role is treated as a location, identity is being
   * recovered from geometry — the exact thirty-year-old failure D1 exists to prevent (spec §4.5).
   */
  it('a ref survives a mirror even though its ROLE no longer describes where it is', async () => {
    const before = await wall();
    const yMin = 'wall-1/face/y-min#0';
    expect(before.refs).toContain(yMin);

    const mirrored = await client.request('transform', {
      handle: before.handle,
      // Mirror in the XZ plane (y = 0): what was at y in [0, 200] lands at y in [-200, 0].
      motions: [{ kind: 'mirror', normal: [0, 1, 0] }],
    });
    expect(mirrored.refs).toContain(yMin);

    // The ref still RESOLVES — and it resolves to a face that is now on the far side of the origin.
    const { bounds } = await client.request('bounds', { handle: mirrored.handle, ref: yMin });
    expect(bounds.min[1]).toBeCloseTo(0, 6);
    expect(bounds.max[1]).toBeCloseTo(0, 6);

    // ...while the face called `y-max` is now the one at NEGATIVE y. The names are stable; only the
    // geometry moved. This assertion looks perverse and is the entire point.
    const yMax = await client.request('bounds', {
      handle: mirrored.handle,
      ref: 'wall-1/face/y-max#0',
    });
    expect(yMax.bounds.min[1]).toBeCloseTo(-200, 6);
  });

  // -------------------------------------------------------------------------------------------
  // 2. THE REAL LIFE OF A WALL: it has a window in it BEFORE it is placed.
  // -------------------------------------------------------------------------------------------

  /**
   * ⚠⚠ IF ONLY ONE TEST IN THIS FILE SURVIVES, KEEP THIS ONE.
   *
   * A wall is not built in place. It is built, cut, and *then* rotated into position — and the refs the
   * boolean handed out (the window's reveals, the section edges) have to survive that rotation, or the
   * opening is re-targeted the moment the wall is placed at an angle. This is the composition that
   * makes `transform` either safe or worthless, and it is exactly the case a "rotate is just a field on
   * makeBox" design would have got wrong.
   */
  it('a wall THAT ALREADY HAS A WINDOW keeps every ref through a rotation — including the boolean&apos;s own', async () => {
    const host = await wall();
    const tool = await client.request('makeBox', {
      nodeId: 'opening-1',
      dx: 1000,
      dy: 200,
      dz: 1400,
      at: [800, 0, 900],
    });
    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: host.handle,
      b: tool.handle,
    });

    // ⚠ MEASURED, and worth knowing before you write an assertion about it: a FLUSH cut — an opening
    // exactly as thick as the wall — creates NO new identities. Every face of the result is a
    // pass-through: the wall's six faces stay the wall's, and the window's four REVEALS *are* the
    // opening's own side faces, inherited. So the refs here are `wall-1/*` and `opening-1/*`, and
    // `cut-1` owns nothing at all. (The groove test below is the case that does force the boolean to
    // own refs — a genuinely SPLIT face.)
    expect(cut.refs.some((r) => r.startsWith('wall-1/'))).toBe(true);
    expect(cut.refs.some((r) => r.startsWith('opening-1/'))).toBe(true);

    const placed = await client.request('transform', {
      handle: cut.handle,
      motions: [
        { kind: 'rotate', axis: [0, 0, 1], degrees: 30 },
        { kind: 'translate', by: [5000, 1000, 0] },
      ],
    });

    // EVERY ref — the wall's, and the ones the boolean created — comes through untouched.
    expect(placed.refs).toEqual(cut.refs);

    // And the volume is unchanged: a rigid motion moved the solid, it did not reshape it.
    const before = await client.request('measure', { handle: cut.handle });
    const after = await client.request('measure', { handle: placed.handle });
    expect(after.volume).toBeCloseTo(before.volume, 6);
    expect(after.counts).toEqual(before.counts);
  });

  /**
   * The case that forces the boolean to OWN identities, so that we can prove those survive too.
   *
   * A groove cut across the wall's front face SPLITS that face in two — one piece above the groove, one
   * below. Neither piece "is" the original face any more, so neither can inherit its token: the cut
   * node owns them, distinguished by an occurrence index. Those are the refs a `transform` has never
   * been asked to carry until now, and they are the ones with the most to lose — an occurrence index
   * is exactly the kind of thing a re-derivation could quietly renumber.
   */
  it('refs the BOOLEAN itself owns — a split face, occurrence and all — survive a rotation', async () => {
    const host = await wall();
    const groove = await client.request('makeBox', {
      nodeId: 'groove-1',
      dx: 3000,
      dy: 50,
      dz: 200,
      at: [0, 0, 1000], // a horizontal groove across the full width of the y-min face
    });
    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: host.handle,
      b: groove.handle,
    });

    // The wall's y-min face is gone as a single face: it is now two, both owned by the cut, and they
    // are told apart by their occurrence — not by where they are.
    const owned = cut.refs.filter((r) => r.startsWith('cut-1/'));
    expect(owned.length, 'a split face must be owned by the cut').toBeGreaterThan(0);
    expect(owned.some((r) => r.endsWith('#0'))).toBe(true);
    expect(owned.some((r) => r.endsWith('#1'))).toBe(true);

    const placed = await client.request('transform', {
      handle: cut.handle,
      motions: [
        { kind: 'rotate', axis: [0, 0, 1], degrees: 30 },
        { kind: 'translate', by: [5000, 0, 0] },
      ],
    });

    // Every ref — including the split face's occurrence-indexed pair — comes through unchanged.
    expect(placed.refs).toEqual(cut.refs);
    for (const ref of owned) {
      // ...and each still RESOLVES on the placed solid. A ref that survives as a string but no longer
      // addresses anything would be worse than one that vanished.
      const { bounds } = await client.request('bounds', { handle: placed.handle, ref });
      expect(Number.isFinite(bounds.min[0]), `${ref} no longer resolves after placement`).toBe(
        true,
      );
    }
  });

  it('a transformed shape can still be cut — the refs it carried remain addressable', async () => {
    const base = await wall();
    const placed = await client.request('transform', {
      handle: base.handle,
      motions: [{ kind: 'rotate', axis: [0, 0, 1], degrees: 90 }],
    });

    // After a 90 deg rotation about Z the wall occupies x in [-200, 0], y in [0, 3000]. Cut a window
    // through it, and address the result by the identities the ROTATED wall still carries.
    const tool = await client.request('makeBox', {
      nodeId: 'opening-1',
      dx: 300,
      dy: 1000,
      dz: 1400,
      at: [-250, 800, 900],
    });
    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: placed.handle,
      b: tool.handle,
    });

    // The wall's own faces are still the wall's — the rotation did not orphan them, and the boolean
    // did not re-own them.
    expect(cut.refs).toContain('wall-1/face/z-min#0');
    expect(cut.refs).toContain('wall-1/face/z-max#0');

    // The tool is 300 deep but the wall is only 200 thick, so it OVERHANGS and the cut removes 200 —
    // the wall's thickness, not the tool's. (Cutting with a tool that pierces clean through is the
    // normal way to make an opening: it is what guarantees no sliver of wall is left behind.)
    const m = await client.request('measure', { handle: cut.handle });
    expect(m.volume).toBeCloseTo(3000 * 200 * 2500 - 200 * 1000 * 1400, 3);
  });

  // -------------------------------------------------------------------------------------------
  // 3. ORDER MATTERS, AND THE CONTRACT SAYS WHICH.
  // -------------------------------------------------------------------------------------------

  it('motions apply IN ORDER — rotate-then-translate is not translate-then-rotate', async () => {
    const a = await client.request('transform', {
      handle: (await wall('w-a')).handle,
      motions: [
        { kind: 'rotate', axis: [0, 0, 1], degrees: 90 },
        { kind: 'translate', by: [1000, 0, 0] },
      ],
    });
    const b = await client.request('transform', {
      handle: (await wall('w-b')).handle,
      motions: [
        { kind: 'translate', by: [1000, 0, 0] },
        { kind: 'rotate', axis: [0, 0, 1], degrees: 90 },
      ],
    });

    // Rotate first: the wall lands at x in [-200, 0], then shifts to x in [800, 1000].
    expect(a.bounds.min[0]).toBeCloseTo(800, 6);
    // Translate first: the wall sits at x in [1000, 4000], and rotating THAT about the origin swings
    // it into y. The two are different solids, which is the whole reason the order is specified.
    expect(b.bounds.min[1]).toBeCloseTo(1000, 6);
    expect(a.bounds.min[0]).not.toBeCloseTo(b.bounds.min[0] ?? 0, 3);
  });

  it('a rotation about a non-origin point rotates about THAT point', async () => {
    const base = await wall();
    const spun = await client.request('transform', {
      handle: base.handle,
      // 180 deg about the vertical axis through the wall's far end.
      motions: [{ kind: 'rotate', axis: [0, 0, 1], origin: [3000, 0, 0], degrees: 180 }],
    });
    // The wall pivots about x = 3000, landing at x in [3000, 6000].
    expect(spun.bounds.min[0]).toBeCloseTo(3000, 6);
    expect(spun.bounds.max[0]).toBeCloseTo(6000, 6);
  });

  // -------------------------------------------------------------------------------------------
  // 4. ⚠⚠ THE BOUNDARY: THE "GENUINELY SYMMETRIC SPLIT" (spec §4.5).
  // -------------------------------------------------------------------------------------------

  /**
   * ⚠⚠ THIS TEST IS THE ANSWER TO THE QUESTION `transform` WAS SUPPOSED TO FORCE.
   *
   * Spec §4.5 reserves a *bounded positional key* for a "genuinely symmetric split" — the case where
   * two sub-shapes are structurally indistinguishable and only geometry could tell them apart. That key
   * is deliberately NOT implemented, because an untested geometric rule sitting on the identity path is
   * a liability that fires by accident on a case nobody looked at. A mirror was the prime suspect for
   * forcing it. **It does not — and here is the precise reason, tested rather than argued.**
   *
   * A mirror on its own is a bijection: no ambiguity, no split, pure INHERIT (the tests above).
   * The symmetric split appears only if you FUSE a shape with a transform OF ITSELF: both operands then
   * carry THE SAME TOKENS, and the two halves of the result are structurally identical twins.
   *
   * And that request is INCOHERENT, not merely hard. It asks for one wall to be in two places inside a
   * single solid. An element instance is in one place; a mirrored copy of a wall is a SECOND WALL — a
   * new element, with its own nodeId, which the document layer creates and transforms (P3). Given
   * distinct nodeIds there is no collision and never was.
   *
   * So the kernel REFUSES, loudly and by type, rather than handing out a ref that names two faces. The
   * refusal is the correct answer to a malformed question — and it means the positional key stays
   * unbuilt ON PURPOSE, with this test as the record of exactly which case would force it.
   *
   * ⚠ DO NOT "FIX" THIS TEST BY LOOSENING THE RESOLVER. If a real model ever needs a symmetric fuse of
   * one node's output with itself, the answer is to build the bounded positional key DELIBERATELY —
   * not to let the resolver start guessing.
   */
  it('REFUSES to fuse a shape with a transform of ITSELF — the symmetric split, and it is refused by name', async () => {
    const base = await wall();
    const mirrored = await client.request('transform', {
      handle: base.handle,
      motions: [{ kind: 'mirror', normal: [1, 0, 0] }],
    });

    // Both operands carry byte-identical refs. That is not a bug in the mirror — it is the mirror
    // being correct (a rotated/mirrored wall is the same wall). It is the FUSE that is now impossible.
    expect(mirrored.refs).toEqual(base.refs);

    await expect(
      client.request('boolean', {
        nodeId: 'symmetric-1',
        kind: 'fuse',
        a: base.handle,
        b: mirrored.handle,
      }),
      'fusing a shape with its own mirror MUST be refused',
    ).rejects.toMatchObject({
      failure: {
        code: 'UNRESOLVED_SUBSHAPE_REF',
        // It says WHY, in terms of identity — not "boolean failed".
        message: expect.stringMatching(/SAME identity|names two things/i) as unknown as string,
      },
    });
  });

  it('...but the SAME symmetric shape builds fine when the mirrored half is its own element', async () => {
    // The document layer's answer, and the reason the refusal above costs nothing: a mirrored copy is
    // a second element. Two nodeIds, two sets of tokens, no collision — and the fuse just works.
    const left = await client.request('makeBox', {
      nodeId: 'pad-left',
      dx: 1000,
      dy: 1000,
      dz: 300,
    });
    const rightBase = await client.request('makeBox', {
      nodeId: 'pad-right',
      dx: 1000,
      dy: 1000,
      dz: 300,
    });
    const right = await client.request('transform', {
      handle: rightBase.handle,
      motions: [{ kind: 'mirror', normal: [1, 0, 0] }],
    });

    const pad = await client.request('boolean', {
      nodeId: 'pad-1',
      kind: 'fuse',
      a: left.handle,
      b: right.handle,
    });

    // A symmetric solid, 2 m across, with every sub-shape named exactly once.
    const m = await client.request('measure', { handle: pad.handle });
    expect(m.volume).toBeCloseTo(2 * 1000 * 1000 * 300, 3);
    expect(new Set(pad.refs).size).toBe(pad.refs.length);
    expect(pad.refs.some((r) => r.startsWith('pad-left/'))).toBe(true);
    expect(pad.refs.some((r) => r.startsWith('pad-right/'))).toBe(true);
  });

  // -------------------------------------------------------------------------------------------
  // 5. THE FAILURE CONTRACT (D10) — it refuses by type, and stays usable afterwards.
  // -------------------------------------------------------------------------------------------

  it('refuses an empty motion list, a zero-length axis, and a dead handle — all as typed failures', async () => {
    const base = await wall();

    await expect(
      client.request('transform', { handle: base.handle, motions: [] }),
    ).rejects.toMatchObject({ failure: { code: 'INVALID_PAYLOAD' } });

    await expect(
      client.request('transform', {
        handle: base.handle,
        motions: [{ kind: 'rotate', axis: [0, 0, 0], degrees: 30 }],
      }),
    ).rejects.toMatchObject({ failure: { code: 'INVALID_PAYLOAD' } });

    await expect(
      client.request('transform', {
        handle: base.handle,
        motions: [{ kind: 'mirror', normal: [0, 0, 0] }],
      }),
    ).rejects.toMatchObject({ failure: { code: 'INVALID_PAYLOAD' } });

    await expect(
      client.request('transform', {
        handle: 'occt:does-not-exist',
        motions: [{ kind: 'translate', by: [1, 2, 3] }],
      }),
    ).rejects.toMatchObject({ failure: { code: 'HANDLE_NOT_FOUND' } });

    // And the kernel is still perfectly usable after all four refusals.
    const ok = await client.request('transform', {
      handle: base.handle,
      motions: [{ kind: 'translate', by: [1, 2, 3] }],
    });
    expect(ok.refs).toEqual(base.refs);
  });

  /**
   * ⚠ A REFUSAL MUST NOT LEAK. OCCT built a perfectly good solid for that doomed fuse before the
   * naming layer refused to name it — and an OCCT solid is not garbage-collected, it lives on the
   * Emscripten heap until something frees it (spec §6.2). If the refusal path forgot, every rejected
   * edit in a long session would leak one dead solid.
   *
   * `wasmLiveHandles()` is the WASM side's OWN count — the independent witness. A registry agreeing
   * with itself would prove nothing.
   */
  it('a REFUSED operation leaks no WASM solid — the count comes back from the other side of the boundary', async () => {
    const kernel = await createOcctKernel();
    const local = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
    try {
      const base = await local.request('makeBox', { nodeId: 'wall-1', ...WALL });
      const mirrored = await local.request('transform', {
        handle: base.handle,
        motions: [{ kind: 'mirror', normal: [1, 0, 0] }],
      });
      const before = kernel.wasmLiveHandles();
      expect(before).toBe(2); // the wall, and its mirror

      await expect(
        local.request('boolean', {
          nodeId: 'symmetric-1',
          kind: 'fuse',
          a: base.handle,
          b: mirrored.handle,
        }),
      ).rejects.toMatchObject({ failure: { code: 'UNRESOLVED_SUBSHAPE_REF' } });

      // The fused solid EXISTED — OCCT built it — and then the naming refused it. It must be gone.
      expect(kernel.wasmLiveHandles(), 'the refused fuse leaked its solid').toBe(before);

      await local.request('releaseShape', { handle: mirrored.handle });
      await local.request('releaseShape', { handle: base.handle });
      expect(kernel.wasmLiveHandles()).toBe(0);
    } finally {
      local.dispose();
      kernel.dispose?.();
    }
  });
});
