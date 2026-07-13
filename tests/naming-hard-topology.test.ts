/**
 * PERSISTENT NAMING ON HARD TOPOLOGY — the #1 risk in the project, under test.
 *
 * `golden-box.test.ts` gates the numbers. This file gates the NAMES, on the shapes where naming
 * actually gets hard: a curved primitive with a seam, a boolean, and a fillet on an edge that a
 * boolean created (the case spec §4.5 calls the resolver's hardest).
 *
 * ⚠ WHY THIS FILE LOOKS THE WAY IT DOES — the rule, from `core_logic.md` §5:
 *
 *     A NAMING BUG DOES NOT LOOK LIKE A GEOMETRY BUG.
 *
 * It cannot be caught by measuring a volume. When four of a box's six faces were mislabelled (Entry
 * 7), every number in the suite was still exact — the geometry was perfect and only the *names* were
 * lies. So these tests do not check that the geometry is right. They check that **the names refer to
 * what they claim to refer to**, and that they **survive** the edits that are supposed to preserve
 * them. Every assertion below is about identity, not about millimetres.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import { decodeSubShapeRef, faceRefForTriangle, triangleCount } from '@bunyan/protocol';
import type { MeshBuffers } from '@bunyan/protocol';
import type { OcctKernel } from '@bunyan/kernel-occt';

const WALL = { nodeId: 'wall-1', dx: 3000, dy: 200, dz: 2500 } as const;

describe('persistent naming on hard topology', () => {
  let kernel: OcctKernel;
  let client: KernelClient;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  });
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  const wall = () => client.request('makeBox', WALL);

  /**
   * A 1000 x 1400 window, cut CLEAN THROUGH the middle of the wall. The canonical BIM boolean, and the
   * one the whole product is for.
   *
   * ⚠ It is placed, and it has to be: a tool at the origin could only ever bite a corner off the wall.
   * The hole in the middle is the topologically interesting case — it leaves the wall's front face as a
   * single face WITH A HOLE IN IT (an inner wire), which is exactly the face an already-placed window
   * would be hosted on, and exactly the one that must not be re-targeted.
   */
  const window = async (nodeId = 'opening-1') =>
    client.request('makeBox', {
      nodeId,
      at: [800, -50, 900], // through the wall's 200 mm thickness, with margin on both sides
      dx: 1000,
      dy: 300,
      dz: 1400,
    });

  /** Where each named face actually sits — the only honest way to ask "does this name tell the truth?" */
  const faceExtents = (mesh: MeshBuffers): Map<string, { lo: number[]; hi: number[] }> => {
    const extent = new Map<string, { lo: number[]; hi: number[] }>();
    for (let t = 0; t < triangleCount(mesh); t++) {
      const ref = faceRefForTriangle(mesh, t, decodeSubShapeRef);
      expect(ref, `triangle ${String(t)} has no face ref`).toBeDefined();
      const token = mesh.provenance.refs[mesh.provenance.triangleToRef[t] ?? 0] ?? '';

      const box = extent.get(token) ?? {
        lo: [Infinity, Infinity, Infinity],
        hi: [-Infinity, -Infinity, -Infinity],
      };
      for (let v = 0; v < 3; v++) {
        const vertex = mesh.indices[t * 3 + v] ?? 0;
        for (let axis = 0; axis < 3; axis++) {
          const value = mesh.positions[vertex * 3 + axis] ?? 0;
          box.lo[axis] = Math.min(box.lo[axis] ?? Infinity, value);
          box.hi[axis] = Math.max(box.hi[axis] ?? -Infinity, value);
        }
      }
      extent.set(token, box);
    }
    return extent;
  };

  // ---- THE CURVED PRIMITIVE ---------------------------------------------------------------------

  /**
   * The wall the old kernel hit BEFORE any boolean.
   *
   * A full cylinder's lateral surface closes on itself, so its SEAM edge is bounded by ONE face (the
   * lateral face, on both sides) rather than two. The face-pair rule — which named every edge of a box
   * — cannot name it, and the previous kernel therefore REFUSED to build a cylinder at all. That
   * refusal was correct: it is what "never invent an identity" means. The fix is not to relax the rule
   * but to let the OPERATION name what only the operation knows.
   */
  it('a cylinder is nameable — including the seam edge, which no face pair can name', async () => {
    const column = await client.request('makeCylinder', {
      nodeId: 'column-1',
      radius: 150,
      height: 3000,
    });

    // 3 faces + 3 edges. The seam is one of them, and it must be named, not skipped.
    const roles = column.refs.map((token) => decodeSubShapeRef(token));
    const faces = roles.filter((r) => r?.kind === 'face').map((r) => r?.role);
    const edges = roles.filter((r) => r?.kind === 'edge').map((r) => r?.role);

    expect(faces).toEqual(['lateral', 'z-min', 'z-max']);
    // Two circular edges, each named by the pair of faces that generate it — exactly as a box's edges
    // are. And the seam, named by the operation, because nothing else could name it.
    expect(edges).toContain('lateral.seam');
    expect(edges).toContain('lateral|z-min');
    expect(edges).toContain('lateral|z-max');
    expect(new Set(column.refs).size).toBe(6);
  });

  it("a cylinder's names are honest: `lateral` is the curved face, `z-max` is the top cap", async () => {
    const column = await client.request('makeCylinder', {
      nodeId: 'column-1',
      radius: 150,
      height: 3000,
    });
    const mesh = await client.request('tessellate', { handle: column.handle, deflection: 0.5 });
    const extent = faceExtents(mesh);

    const at = (role: string) => extent.get(`column-1/face/${role}#0`);

    // The caps are planar and at the ends; the lateral face spans the whole height. A label that lied
    // would pass every volume check in the suite and fail here — which is the entire point.
    expect(at('z-min')?.lo[2]).toBeCloseTo(0, 6);
    expect(at('z-min')?.hi[2]).toBeCloseTo(0, 6);
    expect(at('z-max')?.lo[2]).toBeCloseTo(3000, 6);
    expect(at('z-max')?.hi[2]).toBeCloseTo(3000, 6);
    expect(at('lateral')?.lo[2]).toBeCloseTo(0, 6);
    expect(at('lateral')?.hi[2]).toBeCloseTo(3000, 6);
  });

  // ---- PLACEMENT MUST NOT RENAME ANYTHING -------------------------------------------------------

  /**
   * ⚠ THE PROPERTY THAT SEPARATES THIS DESIGN FROM THE ONE THAT FAILS.
   *
   * If identity came from geometry — "the face at x = 0" — then MOVING a wall would silently re-target
   * every reference on it, and the model would break the day someone shifted the site grid. Identity
   * comes from the operation instead, so a wall modelled at the origin and the same wall modelled 12 m
   * east emit BYTE-IDENTICAL refs.
   *
   * This test is cheap and it is the canary for the entire naming model. If it ever fails, someone has
   * put a coordinate on the identity path.
   */
  it('MOVING a solid does not rename a single one of its sub-shapes', async () => {
    const here = await client.request('makeBox', WALL);
    const there = await client.request('makeBox', { ...WALL, at: [12000, -4000, 3000] });

    expect(there.refs).toEqual(here.refs);

    // And the geometry really did move — so this is not two identical boxes agreeing trivially.
    expect(there.bounds.min).toEqual([12000, -4000, 3000]);
    expect(here.bounds.min).toEqual([0, 0, 0]);
  });

  // ---- THE BOOLEAN ------------------------------------------------------------------------------

  /**
   * ⚠⚠ THE ASSERTION THIS WHOLE SUBSYSTEM EXISTS FOR.
   *
   * A window is hosted on the wall's y-min face. Cut ANOTHER window into the same wall. The first
   * window's host must still be the same face, under the same name — or every opening in the project
   * silently re-targets the day a second one is added, and no geometric check would ever notice.
   */
  it('cutting a window does NOT re-target the faces a previous window was hosted on', async () => {
    const box = await wall();
    const before = box.refs.filter((r) => decodeSubShapeRef(r)?.kind === 'face');

    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: box.handle,
      b: (await window()).handle,
    });

    // Every face the wall had is still there, under its ORIGINAL token — including the y-min face the
    // window was cut through, which OCCT reports as `Modified` but which is still ONE face and so is
    // still THAT face.
    for (const token of before) {
      expect(cut.refs, `the wall's ${token} was re-targeted by the cut`).toContain(token);
    }

    // And the cut's own creations — the reveal faces and the section edges — belong to the cut node,
    // not to the wall. They are new; nobody owned them before.
    const created = cut.refs.filter((r) => decodeSubShapeRef(r)?.nodeId === 'cut-1');
    expect(created.length).toBeGreaterThan(0);
  });

  /**
   * ⚠⚠⚠ THE TEST THIS ENTIRE SUBSYSTEM IS FOR. If only one test in the repo survives, keep this one.
   *
   * It is the actual life of a wall in a real project, in six calls:
   *   1. build a wall;
   *   2. cut a window into it;
   *   3. cut a SECOND window into the result;
   *   4. then go back and RESIZE the wall AND both openings, and rebuild the whole recipe.
   *
   * Every reference must come back pointing at the same thing. This is what "the parametric recipe is
   * the source of truth" MEANS: the model is re-derived from scratch on every parameter change, and if
   * identity were recovered by matching geometry afterwards, step 4 would silently re-target references
   * across the entire building. It is the failure that has plagued parametric CAD for thirty years
   * (spec §4.5), and it is the one thing we cannot ship without.
   */
  it('a wall survives two windows AND a resize: every ref rebuilds to the same identity', async () => {
    const build = async (dx: number, dy: number, dz: number, openingDy: number) => {
      const box = await client.request('makeBox', { nodeId: 'wall-1', dx, dy, dz });
      const first = await client.request('makeBox', {
        nodeId: 'op-1',
        at: [500, -50, 900],
        dx: 1000,
        dy: openingDy,
        dz: 1400,
      });
      const cut1 = await client.request('boolean', {
        nodeId: 'cut-1',
        kind: 'cut',
        a: box.handle,
        b: first.handle,
      });

      // The second window is cut into the RESULT of the first — identity has to chain, not just survive
      // one hop.
      const second = await client.request('makeBox', {
        nodeId: 'op-2',
        at: [3000, -50, 900],
        dx: 1000,
        dy: openingDy,
        dz: 1400,
      });
      const cut2 = await client.request('boolean', {
        nodeId: 'cut-2',
        kind: 'cut',
        a: cut1.handle,
        b: second.handle,
      });
      return { cut1, cut2 };
    };

    const HOST = 'wall-1/face/y-min#0'; // the face a window would be hosted on

    const original = await build(5000, 200, 2500, 300);
    expect(original.cut1.refs).toContain(HOST);

    // The second window did not steal the first one's host face…
    expect(original.cut2.refs).toContain(HOST);
    // …nor re-target the first cut's own section edges.
    for (const edge of original.cut1.refs.filter((r) => r.startsWith('cut-1/edge'))) {
      expect(original.cut2.refs).toContain(edge);
    }

    // Now change the wall's dimensions AND the openings' depth, and rebuild the entire recipe from
    // scratch — a different solid, in every measurable respect.
    const rebuilt = await build(8000, 300, 3000, 400);

    // Identical identities. Not "mostly", not "resolvable with a nearest-match" — identical.
    expect([...rebuilt.cut2.refs].sort()).toEqual([...original.cut2.refs].sort());
    expect(rebuilt.cut2.refs).toContain(HOST);
  });

  it('a boolean names every sub-shape it produces, and never twice', async () => {
    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: (await wall()).handle,
      b: (await window()).handle,
    });
    const m = await client.request('measure', { handle: cut.handle });

    // Every face and every edge of the result carries an identity. No sub-shape is anonymous, and no
    // identity names two sub-shapes.
    expect(cut.refs.length).toBe(m.counts.faces + m.counts.edges);
    expect(new Set(cut.refs).size).toBe(cut.refs.length);
    for (const token of cut.refs) expect(decodeSubShapeRef(token)).toBeDefined();
  });

  it('the section edges are named from the two faces that made them — one from each operand', async () => {
    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: (await wall()).handle,
      b: (await window()).handle,
    });

    // A section edge exists in NEITHER operand, so it is owned by the cut. Its role names the two
    // faces whose intersection created it — which is a derivation, not a location.
    const sections = cut.refs
      .map((t) => decodeSubShapeRef(t))
      .filter((r) => r?.kind === 'edge' && r.nodeId === 'cut-1');

    expect(sections.length).toBeGreaterThan(0);
    for (const edge of sections) {
      // Both ancestors are named in the role, and they come from different nodes (the wall and the
      // opening) — which is precisely why the edge could not inherit either one's identity.
      expect(edge?.role).toContain('wall-1');
      expect(edge?.role).toContain('opening-1');
    }
  });

  it('a fuse across two walls tells its coplanar merges apart from its splits', async () => {
    const a = await client.request('makeBox', { nodeId: 'wall-a', dx: 3000, dy: 200, dz: 2500 });
    const b = await client.request('makeBox', { nodeId: 'wall-b', dx: 200, dy: 3000, dz: 2500 });

    const fused = await client.request('boolean', {
      nodeId: 'fuse-1',
      kind: 'fuse',
      a: a.handle,
      b: b.handle,
    });
    const m = await client.request('measure', { handle: fused.handle });

    // A fuse SPLITS faces (one wall's face becomes two) and MERGES coplanar ones (the two bottom faces
    // become one). Both are N↔1 maps, and the naming has to survive them: every sub-shape named, no
    // collisions. If two split children collided, the resolver would have refused rather than hand out
    // a ref that names two faces.
    expect(fused.refs.length).toBe(m.counts.faces + m.counts.edges);
    expect(new Set(fused.refs).size).toBe(fused.refs.length);
  });

  // ---- THE FILLET, AND THE HARDEST CASE OF ALL ---------------------------------------------------

  /**
   * A fillet rebuilds the edges AROUND the one it rounds — as new objects, with no history. Measured:
   * 4 of a box's edges come back with no ancestry at all. They are re-derived from the two faces that
   * bound them, and because both faces still belong to the wall, the edge comes back with THE WALL'S
   * OWN TOKEN — byte for byte the token it had before the fillet existed.
   */
  it('a fillet does not re-target the edges it merely rebuilt', async () => {
    const box = await wall();
    const target = `wall-1/edge/x-max|y-min#0`;
    expect(box.refs).toContain(target);

    const rounded = await client.request('fillet', {
      nodeId: 'fillet-1',
      handle: box.handle,
      edge: target,
      radius: 50,
    });

    // The filleted edge is GONE — it was replaced by a face, and pretending otherwise would be a lie.
    expect(rounded.refs).not.toContain(target);

    // But the edges it did not touch keep their identities, even though OCCT rebuilt several of them
    // from scratch and reported no history for them whatsoever.
    expect(rounded.refs).toContain('wall-1/edge/x-min|y-min#0');
    expect(rounded.refs).toContain('wall-1/edge/y-max|z-max#0');

    // The fillet's own face is named from the EDGE it rounded — the derivation, not the position.
    const created = rounded.refs
      .map((t) => decodeSubShapeRef(t))
      .filter((r) => r?.nodeId === 'fillet-1' && r.kind === 'face');
    expect(created.length).toBe(1);
    expect(created[0]?.role).toContain('x-max|y-min');
  });

  /**
   * ⚠ THE CASE THE SPEC SINGLES OUT AS THE HARDEST: a fillet on an edge a BOOLEAN created.
   *
   * The chain is the whole test. The boolean must give the section edge a derivable identity; that
   * identity must survive being handed back in as an argument; and the fillet must then name its new
   * face from it. If any link fails, the op refuses — which is why "it did not throw" is itself a
   * meaningful assertion here.
   */
  it('a fillet on an edge a BOOLEAN created — the spec’s hardest case — names everything it makes', async () => {
    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: (await wall()).handle,
      b: (await window()).handle,
    });

    // Pick the target the way the resolver must: BY ITS IDENTITY. A section edge is one the cut owns —
    // it existed in neither operand. We are not looking for it in space.
    const section = cut.refs.find((t) => {
      const ref = decodeSubShapeRef(t);
      return ref?.kind === 'edge' && ref.nodeId === 'cut-1';
    });
    expect(section, 'the cut produced no edge of its own to fillet').toBeDefined();

    const rounded = await client.request('fillet', {
      nodeId: 'fillet-1',
      handle: cut.handle,
      edge: section ?? '',
      radius: 30,
    });
    const m = await client.request('measure', { handle: rounded.handle });

    // Everything named, nothing named twice — through a boolean AND a fillet, on an edge that did not
    // exist in either original solid.
    expect(rounded.refs.length).toBe(m.counts.faces + m.counts.edges);
    expect(new Set(rounded.refs).size).toBe(rounded.refs.length);

    // The fillet's face is derived from the section edge, which is itself derived from the wall and the
    // opening. The derivation path is visible IN THE NAME — that is what makes it a path and not a
    // label.
    const face = rounded.refs
      .map((t) => decodeSubShapeRef(t))
      .find((r) => r?.nodeId === 'fillet-1' && r.kind === 'face');
    expect(face?.role).toContain('cut-1');

    // And the wall's own faces are STILL the wall's, two operations later.
    expect(rounded.refs).toContain('wall-1/face/x-min#0');
  });

  // ---- THE REFUSALS -----------------------------------------------------------------------------

  /**
   * The naming layer must refuse what it cannot derive — loudly, as a typed failure. These tests exist
   * because the failure mode we are defending against is a name that is WRONG rather than absent.
   */
  it('refuses to fillet an edge that is not a named edge of the shape', async () => {
    const box = await wall();

    // A face ref, where an edge is required.
    await expect(
      client.request('fillet', {
        nodeId: 'f',
        handle: box.handle,
        edge: 'wall-1/face/x-min#0',
        radius: 10,
      }),
    ).rejects.toMatchObject({ failure: { code: 'UNRESOLVED_SUBSHAPE_REF' } });

    // An edge of some OTHER shape — the reference does not resolve here, and it must not be silently
    // reattached to whichever edge happens to be nearby (spec §4.5: never reattach, mark broken).
    await expect(
      client.request('fillet', {
        nodeId: 'f',
        handle: box.handle,
        edge: 'some-other-wall/edge/x-min|y-min#0',
        radius: 10,
      }),
    ).rejects.toMatchObject({ failure: { code: 'UNRESOLVED_SUBSHAPE_REF' } });
  });

  it('a boolean that produces nothing is a typed failure, not an empty solid', async () => {
    const box = await wall();
    const same = await client.request('makeBox', { ...WALL, nodeId: 'tool' });

    // Cutting a solid with itself leaves nothing at all. Silently returning an empty shape would put a
    // ghost element in the model; the protocol has a code for exactly this.
    await expect(
      client.request('boolean', {
        nodeId: 'cut-1',
        kind: 'cut',
        a: box.handle,
        b: same.handle,
      }),
    ).rejects.toMatchObject({ failure: { code: 'EMPTY_BOOLEAN_RESULT' } });

    // And the kernel is still healthy afterwards.
    const { kernel: info } = await client.handshake();
    expect(info.name).toBe('occt');
  });

  it('a fillet radius the geometry cannot take fails as FILLET_RADIUS_TOO_LARGE', async () => {
    const box = await wall();
    await expect(
      client.request('fillet', {
        nodeId: 'f',
        handle: box.handle,
        // The wall is only 200 mm thick; a 5 m radius cannot be built on it.
        edge: 'wall-1/edge/x-max|y-min#0',
        radius: 5000,
      }),
    ).rejects.toMatchObject({ failure: { code: 'FILLET_RADIUS_TOO_LARGE' } });
  });

  /**
   * ⚠⚠ THE SPLIT FACE — the hole Entry 9 left, and the second-hardest case in the resolver.
   *
   * A groove across a wall — a chase, a rebate, a shadow gap, a recessed band — SPLITS the wall's front
   * face into two. Both halves have an IDENTICAL derivation: same parent face, same operand, same
   * relation. History cannot tell them apart, and until now the kernel REFUSED the whole operation, so
   * **a wall with a chase in it could not be modelled at all.** Entry 9's probe never cut a groove, so
   * nothing caught it; a `transform` test did, by accident, which is the argument for writing tests
   * that use the API the way a building does.
   *
   * They are told apart STRUCTURALLY, not geometrically: the half below the groove touches the wall's
   * z-min face, the half above touches z-max (MEASURED — probe.cpp case 6b, the `touches` field). That
   * is the same class of rule the edges have always used, and it holds nothing but topology.
   *
   * ⚠ NAMING THEM IS NOT THE TEST. **PERSISTENCE is the test.** An occurrence index that renumbers when
   * the wall is resized would be worse than a refusal — it would silently re-target whatever was hosted
   * on the half it renamed. So this rebuilds the whole recipe with a different wall AND a different
   * groove, and demands the identities come back byte for byte.
   */
  it('a GROOVE splits a face — and both halves keep their identity through a resize', async () => {
    const build = async (wallHeight: number, grooveAt: number) => {
      const host = await client.request('makeBox', {
        nodeId: 'wall-1',
        dx: 3000,
        dy: 200,
        dz: wallHeight,
      });
      const groove = await client.request('makeBox', {
        nodeId: 'groove-1',
        dx: 3000,
        dy: 50,
        dz: 200,
        at: [0, 0, grooveAt],
      });
      return await client.request('boolean', {
        nodeId: 'cut-1',
        kind: 'cut',
        a: host.handle,
        b: groove.handle,
      });
    };

    const first = await build(2500, 1000);

    // The split halves exist, are owned by the cut, and are distinguished by an OCCURRENCE index —
    // not by a coordinate.
    const split = first.refs.filter((r) => r.startsWith('cut-1/face/'));
    expect(split, 'the groove must split the wall face into two named halves').toHaveLength(2);
    expect(split.some((r) => r.endsWith('#0'))).toBe(true);
    expect(split.some((r) => r.endsWith('#1'))).toBe(true);
    expect(new Set(first.refs).size).toBe(first.refs.length);

    // ⚠ THE REBUILD. A taller wall, and the groove at a different height — the parametric recipe
    // re-derived from scratch, which is what happens on every parameter change (spec §4.5). If identity
    // were recovered by matching geometry, THIS is where it would silently re-target.
    const rebuilt = await build(3200, 1400);
    expect(rebuilt.refs).toEqual(first.refs);

    // And each half still resolves — to a face that has genuinely moved.
    for (const ref of split) {
      const { bounds } = await client.request('bounds', { handle: rebuilt.handle, ref });
      expect(Number.isFinite(bounds.min[2]), `${ref} no longer resolves after the rebuild`).toBe(
        true,
      );
    }

    // The lower half must still be the LOWER half. If the occurrence index had flipped, the refs would
    // still all be present and unique — and every assertion above would still pass — while the thing
    // hosted on the lower half had silently moved to the upper one. This is the assertion that catches
    // that, and it is the only one here that would.
    const zOf = async (ref: string) =>
      (await client.request('bounds', { handle: rebuilt.handle, ref })).bounds.min[2] ?? 0;
    const sorted = [...split].sort();
    const lower = await zOf(sorted[0] ?? '');
    const upper = await zOf(sorted[1] ?? '');
    expect(lower).toBeLessThan(upper);
    expect(lower).toBeCloseTo(0, 6); // the half below the groove still starts at the wall's base
  });

  it('the WASM heap does not leak through a boolean chain', async () => {
    const before = kernel.wasmLiveHandles();

    const box = await wall();
    const tool = await window();
    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: box.handle,
      b: tool.handle,
    });

    // Three live solids: the two operands and the result. OCCT shapes are not garbage-collected, so a
    // long editing session leaks until the tab dies unless every one of them is released (spec §6.2).
    expect(kernel.wasmLiveHandles()).toBe(before + 3);

    for (const handle of [box.handle, tool.handle, cut.handle]) {
      await client.request('releaseShape', { handle });
    }
    expect(kernel.wasmLiveHandles()).toBe(before);
  });
});
