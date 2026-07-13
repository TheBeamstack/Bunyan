/**
 * PERSISTENT NAMING — REVOLVE. Identity, not millimetres. `golden-revolve.test.ts` proves the solid is
 * the right shape; this proves you can still find the same face on it tomorrow.
 *
 * ⚠ THE CONTRACT UNDER TEST (D26, and it is the same one `extrude` carries): **`lateral.k` is the face
 * swept from the segment THE AUTHOR DREW at index k** — never OCCT's traversal of the wire, and never
 * the face's position in space. So a user can drag a column's profile — change its radius, its height,
 * the shape of its moulding — and every reference into it survives, byte for byte.
 *
 * ⚠⚠ AND THE PART THAT IS *NOT* THE EXTRUDE'S, because a full 360° turn is not a prism (measured in
 * `probe.cpp`, Entry 14 — do not re-derive it from the docs):
 *
 *   * a full revolve has **no caps**, so `cap-start`/`cap-end` DO NOT EXIST on one — and OCCT's own cap
 *     accessors do not return null for it, they return a face that is not in the result;
 *   * every lateral face **closes on itself**, so its seam edge is bounded by ONE face and no face pair
 *     can name it — the seam is `lateral.k.seam`, and it IS the authored profile edge;
 *   * a segment **perpendicular to the axis** gets NO history from OCCT at all, though its face is
 *     right there — the flat bottom of every column. It is named from the circles its endpoints sweep.
 *
 * If any of those three were wrong, the shapes below would not build at all: the kernel refuses to
 * store a solid carrying a face it could not name.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernelHost } from '@bunyan/kernel-occt';
import type { Profile } from '@bunyan/protocol';

const Z_AXIS = { origin: [0, 0, 0], direction: [0, 0, 1] } as const;

/**
 * A column's meridian: a rectangle standing on the axis. Segment 0 is the base (radial), 1 is the
 * outer face, 2 is the top (radial), 3 closes back down THE AXIS ITSELF.
 */
const columnProfile = (radius: number, height: number): Profile => ({
  plane: { origin: [0, 0, 0], normal: [0, -1, 0], xAxis: [1, 0, 0] },
  start: [0, 0],
  segments: [
    { kind: 'line', to: [radius, 0] }, // 0 — the base disc
    { kind: 'line', to: [radius, height] }, // 1 — the cylindrical side
    { kind: 'line', to: [0, height] }, // 2 — the top disc
    { kind: 'line', to: [0, 0] }, // 3 — ON THE AXIS: sweeps into a line, not a face
  ],
});

describe('persistent naming — revolve', () => {
  let client: KernelClient;

  beforeAll(async () => {
    client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
  });
  afterAll(() => {
    client.dispose();
  });

  const revolve = async (nodeId: string, profile: Profile, angle = 360) =>
    client.request('revolve', { nodeId, profile, axis: Z_AXIS, angle });

  /**
   * ⚠ THE TEST THE WHOLE OP EXISTS FOR. A column is drawn, and then made FATTER and TALLER — every
   * coordinate of every face changes. Its references must not.
   *
   * This is what `lateral.k` buys: `k` is the author's segment index, so it is invariant under any edit
   * that moves the boundary without reordering it. If the kernel named faces by OCCT's traversal, or by
   * position, or by area, this test would fail the moment the radius changed — and a window hosted on
   * the column, a beam framing into it, a dimension anchored to it, would all silently re-target.
   */
  it('a column rebuilt FATTER and TALLER keeps every ref, byte for byte', async () => {
    const slim = await revolve('col-1', columnProfile(150, 3000));
    const fat = await revolve('col-1', columnProfile(400, 4200));

    expect(fat.refs, 'a resized column is the same column').toEqual(slim.refs);

    // And it really did change shape — otherwise the assertion above is vacuous.
    const a = await client.request('measure', { handle: slim.handle });
    const b = await client.request('measure', { handle: fat.handle });
    expect(b.volume).toBeGreaterThan(a.volume * 9);
  });

  /**
   * The refs of a full revolve, spelled out — so that a change to the naming rule has to say so here,
   * out loud, rather than quietly re-target every reference in every project.
   *
   * ⚠ Note what is ABSENT: there is no `cap-start` and no `cap-end`. A full turn has no caps. The two
   * flat ends are `lateral.0` and `lateral.2` — the faces swept from the two RADIAL segments, which are
   * exactly the ones OCCT reports no history for.
   */
  it('a full revolve is named entirely from AUTHORED segments — and has NO caps', async () => {
    const col = await revolve('col-2', columnProfile(150, 3000));
    const faces = col.refs
      .filter((r) => r.includes('/face/'))
      .map((r) => r.split('/face/')[1] ?? '');

    expect(faces.sort()).toEqual(['lateral.0#0', 'lateral.1#0', 'lateral.2#0']);
    expect(col.refs.some((r) => r.includes('cap-start') || r.includes('cap-end'))).toBe(false);

    // Segment 3 lies ON THE AXIS. It sweeps into a line, so it has NO face — and the kernel must not
    // mistake that for a face it failed to find.
    expect(faces.some((f) => f.startsWith('lateral.3'))).toBe(false);

    // The cylindrical side closes on itself ⇒ exactly one seam, and it belongs to segment 1. The two
    // flat ends are planes: a plane does not close on itself, so they have none.
    const seams = col.refs.filter((r) => r.includes('.seam'));
    expect(seams).toHaveLength(1);
    expect(seams[0]).toContain('lateral.1.seam');
  });

  /**
   * ⚠ THE ONE A BUILDING ACTUALLY NEEDS. A window is not hosted on a column — but a *pocket* is (an
   * anchor socket, a recess, a rebate), and so is anything a downstream op addresses BY IDENTITY. The
   * column is cut, then re-authored at a different radius: the cut is expressed in terms of the
   * column's refs, so if the revolve renamed anything, the recipe would re-target or fail outright.
   *
   * It is the revolve's version of the wall-with-two-windows test (Entry 9).
   */
  it('a pocket cut into a revolved column survives the column being re-authored', async () => {
    const pocket = async (nodeId: string, colHandle: string) => {
      const tool = await client.request('makeCylinder', {
        nodeId: 'socket-tool',
        radius: 80,
        height: 300,
        at: [-600, 0, 1500],
        axis: [1, 0, 0],
      });
      return client.request('boolean', { nodeId, kind: 'cut', a: colHandle, b: tool.handle });
    };

    const col = await revolve('col-3', columnProfile(400, 3000));
    const side = col.refs.find((r) => r.endsWith('/face/lateral.1#0'));
    expect(side, 'the column must expose its cylindrical face by identity').toBeDefined();

    const cut = await pocket('cut-1', col.handle);
    // The column's own faces survive the cut with THEIR OWN refs — the boolean owns only what it made.
    expect(cut.refs.some((r) => r === side)).toBe(true);

    // Re-author the column WIDER. Every ref it hands back is unchanged, so the recipe above still
    // resolves — and running it again yields the same identities, token for token.
    const wider = await revolve('col-3', columnProfile(500, 3000));
    expect(wider.refs).toEqual(col.refs);

    const cut2 = await pocket('cut-1', wider.handle);
    expect(cut2.refs, 'the same recipe on a re-authored column yields the same identities').toEqual(
      cut.refs,
    );
  });

  /**
   * ⚠⚠ A KNOWN, DELIBERATE REFUSAL — PINNED HERE SO IT IS VISIBLE IN CI RATHER THAN FOLKLORE.
   *
   * **Drilling a duct CLEAN THROUGH a round column does not build today.** It is refused, loudly, with
   * `UNRESOLVED_SUBSHAPE_REF` — and that refusal is correct behaviour, not a bug in this op. It has
   * nothing to do with `revolve`: the identical failure occurs on a plain `makeCylinder` column, and it
   * has been reachable since Entry 9. It went unnoticed because **every boolean ever tested here cut a
   * BOX**, where a duct enters through `y-min` and leaves through `y-max` — two different faces, two
   * different derivations, nothing to disambiguate.
   *
   * A round column has ONE lateral face that wraps all the way around, so the duct enters and leaves
   * through **the same face**. Measured (`probe.cpp`, case `cut_round_column_by_duct`): the two rims
   * have the **same derivation** (generated by the same face pair), bound the **same two faces**, and
   * run between endpoints with the **same signature**. They are *genuinely topologically symmetric* —
   * no adjacency, endpoint or neighbour rule can separate them, and Entry 11's structural tie-break
   * (which saved the groove) does not reach here.
   *
   * ⇒ This is exactly the case **spec §4.5 reserved the bounded positional key for**, and whose own
   * words are: *"If a real model ever hits a genuinely symmetric tie, that refusal is the signal to
   * implement the key **deliberately**."* A duct through a column is that real model. Implementing it
   * puts **geometry on the identity path** — the invariant the entire product rests on — so it is an
   * **Architect decision**, not an agent's. It is on the table for the owner (Entry 14).
   *
   * **When the positional key lands, this test flips**, and that is the point of writing it down.
   */
  it('KNOWN LIMITATION: a duct clean THROUGH a round column is refused (spec §4.5 symmetric tie)', async () => {
    const col = await revolve('col-5', columnProfile(400, 3000));
    const duct = await client.request('makeCylinder', {
      nodeId: 'duct-through',
      radius: 80,
      height: 1200, // longer than the column is wide: it goes in one side and out the other
      at: [-600, 0, 1500],
      axis: [1, 0, 0],
    });

    await expect(
      client.request('boolean', {
        nodeId: 'cut-through',
        kind: 'cut',
        a: col.handle,
        b: duct.handle,
      }),
    ).rejects.toMatchObject({ failure: { code: 'UNRESOLVED_SUBSHAPE_REF' } });
  });

  /**
   * A profile whose boundary is EDITED (a vertex moved) keeps its refs; a profile whose segments are
   * REORDERED does not, and the type says so. This pins the difference, because it is the one thing a
   * document-level command must never do silently (ops.ts states it in the `Profile` type).
   */
  it('moving a profile vertex is safe; the segment INDEX is what identity rests on', async () => {
    const a = await revolve('col-4', columnProfile(300, 2000));

    // A moulded column: the same four authored segments, but the side bows out into an arc. Same
    // indices, same names — and the shape is genuinely different.
    const moulded: Profile = {
      plane: { origin: [0, 0, 0], normal: [0, -1, 0], xAxis: [1, 0, 0] },
      start: [0, 0],
      segments: [
        { kind: 'line', to: [300, 0] },
        { kind: 'arc', via: [380, 1000], to: [300, 2000] }, // segment 1, now curved
        { kind: 'line', to: [0, 2000] },
        { kind: 'line', to: [0, 0] },
      ],
    };
    const b = await revolve('col-4', moulded);

    expect(
      b.refs,
      'segment 1 is still segment 1 — a straight side and a bowed one are both lateral.1',
    ).toEqual(a.refs);

    const ma = await client.request('measure', { handle: a.handle });
    const mb = await client.request('measure', { handle: b.handle });
    expect(mb.volume).toBeGreaterThan(ma.volume); // the bulge really is there
  });
});
