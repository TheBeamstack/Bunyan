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

/**
 * The service duct — and ⚠ ITS AXIS IS ALONG **Y**, WHICH IS NOT A DETAIL.
 *
 * OCCT puts a revolved/cylindrical face's SEAM on the +X meridian. A duct driven along **X** therefore
 * exits straight through the seam, which SPLITS the entry rim into two halves and leaves THREE rim
 * edges instead of two — a different topology, and not the one the ruling is about. Along **Y** the
 * duct misses the seam entirely, so the result is the clean case: **exactly two rims, genuinely
 * symmetric**, which is what D28 orders. (Both build. Only this one isolates the tie.)
 */
const DUCT = {
  radius: 80,
  height: 1600, // far longer than the column is wide: in one side and out the other
  at: [0, -800, 1500],
  axis: [0, 1, 0],
} as const;

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
   * ⚠⚠ THE BOUNDED POSITIONAL KEY (D28). THIS TEST USED TO PIN A REFUSAL; IT NOW PINS THE FIX.
   *
   * A duct drilled CLEAN THROUGH a round column is the case spec §4.5 reserved the key for, and it is
   * the case that fired. A round column has ONE lateral face that wraps all the way around, so the duct
   * enters and leaves through **the same face**: the two rims share a derivation, bound the same two
   * faces, and have identical endpoint signatures. They are *genuinely topologically symmetric* — no
   * adjacency, endpoint or neighbour rule reaches them, and Entry 11's structural tie-break (which
   * saved the groove) does not apply. The kernel refused the whole operation, so a service penetration
   * through a circular column — which every building has — was unmodellable.
   *
   * The owner ruled the key IN on 2026-07-13. It orders the two rims by their **mm-rounded centroid**,
   * and it does so ONLY here: after derivation and structural signature have both tied. It never
   * *identifies* a sub-shape; it only breaks a tie between two the kernel has already proven
   * interchangeable. See `kernel.cpp`, `centroidKey` — and the four rules above it.
   */
  it('D28: a duct cuts CLEAN THROUGH a round column, and the two rims get distinct identities', async () => {
    const col = await revolve('col-5', columnProfile(400, 3000));
    const cut = await client.request('boolean', {
      nodeId: 'cut-through',
      kind: 'cut',
      a: col.handle,
      b: (await client.request('makeCylinder', { nodeId: 'duct-through', ...DUCT })).handle,
    });

    // ⚠ THE PAIR THE KEY EXISTS FOR, SELECTED BY ITS DERIVATION rather than by position in the list:
    // the two edges GENERATED by (the column's lateral face × the duct's lateral face). Those are the
    // rims. They share one derivation, they bound the same two faces, their endpoints carry the same
    // signature — and before D28 the kernel refused the whole operation rather than name them.
    const rims = cut.refs.filter(
      (r) => r.includes('/edge/') && r.includes('lateral') && r.includes('+'),
    );
    expect(rims.length, 'the duct enters and leaves ⇒ exactly two rims').toBe(2);
    expect(new Set(rims.map((r) => r.split('#')[0])).size, 'ONE derivation between them').toBe(1);
    expect(new Set(rims).size, 'but TWO identities — that is the whole ruling').toBe(2);
    expect(rims.map((r) => r.split('#')[1]).sort(), 'ordered by the key: #0 then #1').toEqual([
      '0',
      '1',
    ]);

    // ⚠ It really is a THROUGH hole, not a blind pocket: the duct is far longer than the column is
    // wide. A boolean that quietly cut nothing — or cut only one side — would still name cleanly, so
    // the identities above prove nothing on their own. `golden-hard-geometry.test.ts` gates the
    // millimetres against native OCCT *and* an exact closed form; this is the cheap guard.
    const m = await client.request('measure', { handle: cut.handle });
    const solid = Math.PI * 400 ** 2 * 3000;
    expect(m.volume).toBeLessThan(solid); // material was removed
    expect(m.volume).toBeGreaterThan(solid * 0.97); // but only the duct's worth
    expect(m.counts.faces, 'lateral + 2 flat ends + the hole wall').toBe(4);
  });

  /**
   * ⚠⚠ THE PROPERTY THE RULING RESTS ON — AND THE ONE THE OWNER WAS ASKED TO ACCEPT A RISK AGAINST.
   *
   * The stated hazard of a positional key is: *"a rebuild that moves the geometry can reorder the tie,
   * so a ref into one rim could land on the other."* This test pins the boundary of that hazard, so
   * nobody has to reason about it from memory.
   *
   * **What is SAFE — and it is most of what a building does.** Re-authoring the column (fatter, taller)
   * does not move the duct, so the rims keep their occurrences and every ref is byte-identical. And
   * MOVING THE WHOLE COLUMN IN THE WORLD is safe *by construction*, not by luck: `transform` is pure
   * INHERIT and mints no identities at all, so the key is computed in the element's own build frame and
   * a rotated or translated column is still the same column, rim for rim.
   *
   * **What is NOT safe, and is inherent to D28:** re-authoring the recipe so the duct itself crosses to
   * the other side of the column would swap which rim sorts first. That is the bounded risk the ruling
   * accepted, it is why the key is a last resort rather than a naming rule, and it is written down here
   * rather than discovered later.
   */
  it('D28 is stable under the edits a building actually makes', async () => {
    const drill = async (colHandle: string) => {
      const duct = await client.request('makeCylinder', { nodeId: 'duct-through', ...DUCT });
      return client.request('boolean', {
        nodeId: 'cut-through',
        kind: 'cut',
        a: colHandle,
        b: duct.handle,
      });
    };

    const slim = await drill((await revolve('col-6', columnProfile(400, 3000))).handle);

    // (1) The column is re-authored FATTER and TALLER. Every coordinate of every face moves; the duct
    //     does not. Identity must not move either.
    const fat = await drill((await revolve('col-6', columnProfile(500, 4000))).handle);
    expect(fat.refs, 'a re-authored column keeps every ref, rims included').toEqual(slim.refs);

    // (2) The column is ROTATED and TRANSLATED across the site. Safe BY CONSTRUCTION: a rigid motion is
    //     a topological isomorphism, so it mints no identities and cannot re-rank a tie.
    const moved = await client.request('transform', {
      handle: slim.handle,
      motions: [
        { kind: 'rotate', axis: [0, 0, 1], degrees: 37 },
        { kind: 'translate', by: [12000, -3400, 0] },
      ],
    });
    expect(moved.refs, 'a moved column is the same column — the key never even runs').toEqual(
      slim.refs,
    );
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
