/**
 * ⚠⚠ D29 — THE GEOMETRY CACHE BODIES (`exportBrep` / `importBrep`). Real OCCT WASM, headless.
 *
 * **WHAT THIS FILE IS FOR, IN ONE SENTENCE:** the cache is the only place in Bunyan where a file a user
 * can be **sent** decides which face a window is hosted on — so every test here is either *"the token
 * landed on the SAME sub-shape"* or *"the refusal happened."* Nothing in between is useful.
 *
 * ⚠ THE OP PAIR WAS RESERVED SINCE P3 AND RULED **SHIP** ON 2026-07-14; only the shapes existed. §4j-2's
 * ruled design is what is implemented, with **step 1 corrected against a measurement** (`ops.ts`,
 * `cache.ts`): the resolver's canonical re-sort orders DERIVATIONS, which a cached shape does not have,
 * so binding is by the read shape's own sub-shape order **with the fingerprint pinning that order**.
 *
 * ⚠ MEASURED BEFORE ANY OF IT WAS WRITTEN (2026-07-30, native OCCT through `tools/oracle` + the real
 * WASM kernel through the document layer):
 *
 * ```
 *   a BRepTools round trip is NOT bit-exact on curves   848230016.4692444 -> ...448  (so: quantise)
 *   MapShapes order survives a round trip               box / holed wall / column: all preserved
 *   the default Write overload writes TRIANGULATION     round column 22,200 B vs 1,109 B  (20x)
 *   a solid's refs all derive from its nodeId?          wall+door: 18 of 34. frame: 8 of 34.  FALSE
 *   two sub-shapes sharing a quantised signature?       16 real solids, 18-34 subshapes each: ZERO
 *   `Curve2ds 999999999` in a 93-BYTE file              ~56 s of spin, then an ordinary null shape
 *   rebuild cost per solid (the number to beat)         plain wall 2.36 ms · wall+window 24.62 ms
 * ```
 *
 * ⚠ REVERT-VERIFY (§1b): each `it` below was run against the code with its own guard removed, and the
 * failures are recorded in the entry. The two that matter most: drop the fingerprint comparison and the
 * tampered-cache tests hand back a shape with 34 mis-attached tokens; drop the declared-count guard and
 * the hostile-file test takes ~56 s instead of failing in 0 ms.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { MAX_BREP_BYTES, fingerprintOf, refsInShapeOrder, sha256Hex } from '@bunyan/kernel-occt';
import { createMockKernelHost } from '@bunyan/kernel-mock';
import { RESERVED_OPS, decodeSubShapeRef } from '@bunyan/protocol';
import type { ExportBrepResult } from '@bunyan/protocol';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import { openingType, wallType } from '@bunyan/types';
// ⚠ The raw module, on purpose and only for the ATTRIBUTION measurement below: the cost being priced
// is the embind boundary itself, which no op can expose (the same reason this suite already reaches
// into `cache.ts` directly). Everything else in this file goes through the client.
import initBunyanKernel from '../packages/kernel-occt/wasm/bunyan-kernel.js';

const text = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const bytes = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('D29 — the geometry cache: a cached solid keeps its identities, or it is refused', () => {
  let kernel: OcctKernel;
  let client: KernelClient;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  }, 120_000);
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  /**
   * ⚠⚠ THE FIXTURE IS A WALL **CUT BY A DOOR**, NOT A PLAIN BOX — and that is not decoration.
   *
   * Entry 47's trap verbatim (a one-plain-wall fixture passes everything): a plain box's identities are
   * all PRIMITIVE and all its own, so it exercises neither `REL_INHERIT` nor a cut node — i.e. it cannot
   * see the very thing measured above, that **16 of a real wall's 34 identities belong to other nodes.**
   * A cache that dropped every foreign token would be green on a box.
   */
  const wallWithDoor = async (): Promise<{
    handle: string;
    refs: readonly string[];
    nodeId: string;
  }> => {
    const r = createRegistries();
    r.types.register(wallType);
    r.types.register(openingType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    const doc = new DocumentContext({ registries: r, geometry: client });

    const wall = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end: [5000, 0], thickness: 200, height: 3000 },
      })
    ).changes[0]!.id;
    const face = doc.partsOf(wall)![0]!.refs.find((x) => x.includes('/face/lateral.1'))!;
    await doc.execute('core.createElement', {
      typeId: 'core.opening',
      hostId: wall,
      hostRef: face,
      params: {
        width: 900,
        height: 2100,
        offsetU: 2500,
        offsetV: 0,
        leafThickness: 40,
        frameWidth: 50,
      },
    });
    const part = doc.partsOf(wall)![0]!;
    return { handle: part.handle, refs: part.refs, nodeId: part.nodeId };
  };

  const exported = async (): Promise<{
    source: { handle: string; refs: readonly string[]; nodeId: string };
    cache: ExportBrepResult;
  }> => {
    const source = await wallWithDoor();
    const cache = await client.request('exportBrep', { handle: source.handle });
    return { source, cache };
  };

  /* ============================================================================================
   * 1 — THE ROUND TRIP: every token comes back on the SAME sub-shape.
   * ========================================================================================= */

  it("⚠⚠ every one of a real wall's 34 identities re-attaches to the SAME sub-shape it named before", async () => {
    const { source, cache } = await exported();

    // The fixture is the measured one, so a change to the types that weakens it is visible here.
    expect(cache.refs.length).toBe(source.refs.length);
    expect(cache.refs.length).toBeGreaterThanOrEqual(34);
    const foreign = source.refs.filter((t) => decodeSubShapeRef(t)?.nodeId !== source.nodeId);
    expect(foreign.length, 'the fixture must carry identities from OTHER nodes').toBeGreaterThan(0);

    // Same SET of tokens, whatever the order.
    expect([...cache.refs].sort()).toEqual([...source.refs].sort());

    const restored = await client.request('importBrep', {
      nodeId: source.nodeId,
      brep: cache.brep,
      refs: cache.refs,
      fingerprint: cache.fingerprint,
    });
    expect([...restored.refs].sort()).toEqual([...source.refs].sort());

    // ⚠ THE ASSERTION THE WHOLE OP EXISTS FOR. For every token, ask the ORIGINAL and the RESTORED solid
    // what that named sub-shape measures and where it is. A mis-attached token is a different face, and
    // a different face has a different area and a different box — this is what "the same sub-shape"
    // means operationally, as opposed to "the same list of strings came back".
    for (const ref of source.refs) {
      const before = await client.request('measure', { handle: source.handle, ref });
      const after = await client.request('measure', { handle: restored.handle, ref });
      const boxBefore = await client.request('bounds', { handle: source.handle, ref });
      const boxAfter = await client.request('bounds', { handle: restored.handle, ref });

      // 1e-6 relative, not exact: an ASCII round trip is not bit-exact on curved geometry (measured).
      expect(after.area, ref).toBeCloseTo(before.area, 3);
      expect(after.edgeLength, ref).toBeCloseTo(before.edgeLength, 3);
      expect(boxAfter.bounds.min.map(Math.round), ref).toEqual(
        boxBefore.bounds.min.map(Math.round),
      );
      expect(boxAfter.bounds.max.map(Math.round), ref).toEqual(
        boxBefore.bounds.max.map(Math.round),
      );
    }

    // And the whole solid is the same solid.
    const whole = await client.request('measure', { handle: source.handle });
    const wholeAfter = await client.request('measure', { handle: restored.handle });
    expect(wholeAfter.volume / whole.volume).toBeCloseTo(1, 9);
    expect(wholeAfter.counts).toEqual(whole.counts);
  }, 240_000);

  it('a cached solid is still a live shape: it can be measured, bounded, and RELEASED without leaking', async () => {
    const { source, cache } = await exported();
    const before = kernel.wasmLiveHandles();
    const restored = await client.request('importBrep', {
      nodeId: source.nodeId,
      brep: cache.brep,
      refs: cache.refs,
      fingerprint: cache.fingerprint,
    });
    expect(kernel.wasmLiveHandles()).toBe(before + 1);
    await client.request('releaseShape', { handle: restored.handle });
    // The WASM side's OWN count — the leak canary (spec §6.2), asserted against the thing that frees.
    expect(kernel.wasmLiveHandles()).toBe(before);
  }, 120_000);

  /**
   * ⚠⚠ THE PROPERTY THE DOCUMENT-SIDE LOAD PATH WILL DEPEND ON, AND THE ONE THAT IS NOT OBVIOUS: a
   * restored solid is a FIRST-CLASS OPERAND, so the identities the cache brought back propagate through
   * the next operation exactly as freshly-built ones do.
   *
   * It works because of a decision in `kernel.cpp` that looks like a detail: an imported entry's
   * `NameRow`s are left BLANK (relation -1, which no resolver knows), while its `faceOcct`/`edgeOcct`
   * mapping is real. A later boolean reads only the mapping (`claimAll`), and names its own output
   * against the tokens TypeScript holds — so `REL_INHERIT` hands the cached wall's own token straight
   * through. Had the blank rows been filled with plausible PRIMITIVE rows instead, this would still pass
   * and the shape would be quietly re-identified; had the entry been left with no rows at all, an
   * accidental `getNaming` would report "no named sub-shapes" instead of refusing.
   */
  it('⚠⚠ a CACHED solid can be cut, and the restored identities pass through the boolean (REL_INHERIT)', async () => {
    const { source, cache } = await exported();
    const restored = await client.request('importBrep', {
      nodeId: source.nodeId,
      brep: cache.brep,
      refs: cache.refs,
      fingerprint: cache.fingerprint,
    });

    // A notch out of the cached wall — the shape of what the build path does to a base part.
    const notch = await client.request('makeBox', {
      nodeId: 'notch-1',
      dx: 400,
      dy: 400,
      dz: 400,
      at: [100, -100, 0],
    });
    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: restored.handle,
      b: notch.handle,
    });

    // The wall's untouched faces keep the tokens the CACHE restored — not new ones minted by the cut.
    const survived = cut.refs.filter((r) => source.refs.includes(r));
    expect(
      survived.length,
      'the cached identities must survive the next operation',
    ).toBeGreaterThan(5);
    // And the notch's own new faces belong to the cut, which is the node that created them.
    expect(cut.refs.some((r) => decodeSubShapeRef(r)?.nodeId === 'cut-1')).toBe(true);

    // The surviving tokens still name the same sub-shapes: ask the cut solid to measure one.
    const ref = survived.find((r) => decodeSubShapeRef(r)?.kind === 'face')!;
    const onCut = await client.request('measure', { handle: cut.handle, ref });
    expect(onCut.area).toBeGreaterThan(0);
  }, 240_000);

  it('the producer satisfies its own consumer: exported bytes pass the untrusted-input guard, and are ASCII', async () => {
    const { cache } = await exported();
    expect(cache.brep.length).toBeGreaterThan(0);
    expect(cache.brep.length).toBeLessThan(MAX_BREP_BYTES);
    expect([...cache.brep].every((b) => b <= 0x7e)).toBe(true);
    // ⚠ The magic is `CASCADE Topology V<n>`; OCCT's STREAM overload writes no `DBRep_DrawableShape`
    // line (its FILE overload does). The guard accepts both, and the first draft of it accepted only the
    // documented file form — i.e. it refused every cache this exporter writes.
    expect(text(cache.brep).trimStart().startsWith('CASCADE Topology V')).toBe(true);
    expect(cache.fingerprint.startsWith('bnn1:')).toBe(true);

    // ⚠ NO TRIANGULATION. The mesh is a disposable projection of the B-Rep (the one non-negotiable
    // invariant), and `BRepTools::Write`'s convenient overload writes it — 20x bigger on a round column.
    expect(text(cache.brep)).not.toContain('Triangulations 1');
  }, 120_000);

  /* ============================================================================================
   * 2 — THE REFUSALS. Every one costs a rebuild, which is free; a wrong name would not be.
   * ========================================================================================= */

  it('⚠⚠ a TAMPERED cache is refused with CACHE_STALE — never a shape with mis-attached tokens', async () => {
    const { source, cache } = await exported();
    const base = { nodeId: source.nodeId, refs: cache.refs, fingerprint: cache.fingerprint };

    // (a) the geometry was edited: one coordinate moved by a millimetre.
    const moved = text(cache.brep).replace('5000', '5001');
    expect(moved).not.toBe(text(cache.brep));
    await expect(
      client.request('importBrep', { ...base, brep: bytes(moved) }),
    ).rejects.toMatchObject({
      failure: { code: 'CACHE_STALE' },
    });

    // (b) the fingerprint belongs to another solid (a plain box).
    const box = await client.request('makeBox', { nodeId: 'other-1', dx: 100, dy: 100, dz: 100 });
    const boxCache = await client.request('exportBrep', { handle: box.handle });
    await expect(
      client.request('importBrep', {
        ...base,
        brep: cache.brep,
        fingerprint: boxCache.fingerprint,
      }),
    ).rejects.toMatchObject({ failure: { code: 'CACHE_STALE' } });

    // ⚠⚠ (c) THE TOKEN LIST WAS PERMUTED — two FACE tokens swapped. This is the case that found the
    // hole in §4j-2's ruled design, and it is the sharpest test in the file: the shape is untouched, so
    // a fingerprint over the geometry alone still matches; the count matches; both tokens name faces, so
    // the kind check is blind to it; nothing is duplicated. Every guard the ruling describes passes, and
    // the op would hand back a solid with two identities on the wrong faces. It is refused because the
    // digest covers the TOKEN SEQUENCE as well as the geometry.
    const swapped = [...cache.refs];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    expect(decodeSubShapeRef(swapped[0])?.kind).toBe('face');
    expect(decodeSubShapeRef(swapped[1])?.kind).toBe('face');
    await expect(
      client.request('importBrep', { ...base, brep: cache.brep, refs: swapped }),
    ).rejects.toMatchObject({ failure: { code: 'CACHE_STALE' } });

    // (d) one identity is missing.
    await expect(
      client.request('importBrep', { ...base, brep: cache.brep, refs: cache.refs.slice(1) }),
    ).rejects.toMatchObject({ failure: { code: 'CACHE_STALE' } });

    // (e) a face token where an edge belongs (the faces-first convention broken).
    const wrongKind = [...cache.refs];
    wrongKind[wrongKind.length - 1] = wrongKind[0]!;
    await expect(
      client.request('importBrep', { ...base, brep: cache.brep, refs: wrongKind }),
    ).rejects.toMatchObject({ failure: { code: 'CACHE_STALE' } });
  }, 240_000);

  it('⚠⚠ THE HOSTILE `.bnn` — a 93-BYTE file that costs OCCT ~56 SECONDS is refused in milliseconds', async () => {
    // MEASURED against native OCCT: `Curve2ds N` makes the reader loop N times (~57 ns each, linear,
    // no allocation) and then report an ordinary null shape. 999,999,999 of them is ~56 s of a worker,
    // out of 93 bytes — a denial of service on the load path of a file a user can be SENT.
    const bomb =
      'DBRep_DrawableShape\n\nCASCADE Topology V1, (c) Matra-Datavision\nLocations 0\nCurve2ds 999999999\n';
    const started = performance.now();
    await expect(
      client.request('importBrep', {
        nodeId: 'wall-1.core',
        brep: bytes(bomb),
        refs: ['wall-1.core/face/x-min#0'],
        fingerprint: 'bnn1:whatever',
      }),
    ).rejects.toMatchObject({ failure: { code: 'CACHE_STALE' } });
    const ms = performance.now() - started;
    // The guard is the point: it refuses BEFORE OCCT is entered, so this is bounded by string work.
    expect(
      ms,
      `refusal took ${ms.toFixed(0)} ms — the declared-count guard did not fire`,
    ).toBeLessThan(2000);
  }, 120_000);

  it('every other malformed cache is a TYPED refusal, not a crash, a hang, or a null shape', async () => {
    const base = {
      nodeId: 'wall-1.core',
      refs: ['wall-1.core/face/x-min#0'],
      fingerprint: 'bnn1:x',
    };
    const cases: Record<string, Uint8Array> = {
      empty: new Uint8Array(0),
      'garbage ascii': bytes('not a brep at all, at all\n'.repeat(10)),
      'no header': bytes('CASCADE Topology V1\nTShapes 0\n'),
      'nul bytes (binary, refused as not-text)': new Uint8Array([0x44, 0x42, 0x00, 0x00]),
      'high bytes (binary, refused as not-text)': new Uint8Array([0xff, 0xfe, 0xfd]),
      'absurd TShapes count': bytes(
        'DBRep_DrawableShape\n\nCASCADE Topology V1, (c) Matra-Datavision\nLocations 0\nCurve2ds 0\n' +
          'Curves 0\nPolygon3D 0\nPolygonOnTriangulations 0\nSurfaces 0\nTriangulations 0\n\nTShapes 999999999\n',
      ),
      'over the size bound': bytes(`DBRep_DrawableShape\n${'x'.repeat(MAX_BREP_BYTES)}`),
    };
    for (const [label, brep] of Object.entries(cases)) {
      await expect(client.request('importBrep', { ...base, brep }), label).rejects.toMatchObject({
        failure: { code: 'CACHE_STALE' },
      });
    }

    // ⚠⚠ THE REASON MATTERS, NOT ONLY THE CODE — and without this the ASCII guard would have NO test
    // that fails in its absence. Remove it and the binary cases above still refuse, because OCCT's
    // reader also rejects them: the code would be identical and the guard silently dead. What the guard
    // actually buys is that **the bytes are refused as not-text before they reach a parser**, and the
    // only way to assert that from out here is that the refusal says so.
    await expect(
      client.request('importBrep', { ...base, brep: new Uint8Array([0xff, 0xfe, 0xfd]) }),
    ).rejects.toMatchObject({ failure: { message: expect.stringContaining('not 7-bit ASCII') } });
    await expect(
      client.request('importBrep', { ...base, brep: bytes('not a brep at all\n') }),
    ).rejects.toMatchObject({ failure: { message: expect.stringContaining('BRep header') } });

    // ⚠ And a real BRep whose header is intact but which describes a shape that is not a solid: the
    // refusal must still be typed. (An empty TShape table reads as a null shape, not as an empty solid —
    // `BRepTools::Read` does not throw and does not return a status, so only the IsNull check separates
    // "nothing was read" from "an empty thing was read".)
    await expect(
      client.request('importBrep', {
        ...base,
        brep: bytes(
          'DBRep_DrawableShape\n\nCASCADE Topology V1, (c) Matra-Datavision\nLocations 0\nCurve2ds 0\n' +
            'Curves 0\nPolygon3D 0\nPolygonOnTriangulations 0\nSurfaces 0\nTriangulations 0\n\nTShapes 0\n\n',
        ),
      }),
    ).rejects.toMatchObject({ failure: { code: 'CACHE_STALE' } });
  }, 240_000);

  it('a payload that is not a cache at all is INVALID_PAYLOAD, and a dead handle is HANDLE_NOT_FOUND', async () => {
    await expect(
      client.request('importBrep', {
        nodeId: 'wall-1.core',
        brep: 'not bytes' as unknown as Uint8Array,
        refs: [],
        fingerprint: 'x',
      }),
    ).rejects.toMatchObject({ failure: { code: 'INVALID_PAYLOAD' } });

    await expect(
      client.request('importBrep', {
        nodeId: '',
        brep: bytes('DBRep_DrawableShape\n'),
        refs: [],
        fingerprint: 'x',
      }),
    ).rejects.toMatchObject({ failure: { code: 'INVALID_PAYLOAD' } });

    await expect(client.request('exportBrep', { handle: 'occt-999' })).rejects.toMatchObject({
      failure: { code: 'HANDLE_NOT_FOUND' },
    });
  }, 120_000);

  /* ============================================================================================
   * 3 — THE CONTRACT AROUND IT.
   * ========================================================================================= */

  it('⚠ the two ops have LEFT `RESERVED_OPS`, the real kernel advertises them, and the MOCK still does not', async () => {
    expect(RESERVED_OPS).toEqual(['sectionCut', 'importIfc', 'instantiate']);

    const { kernel: info } = await client.request('handshake', { clientProtocolVersion: 1 });
    expect(info.capabilities).toContain('exportBrep');
    expect(info.capabilities).toContain('importBrep');

    // The mock holds no B-Rep, so it cannot serialise one — and a mock that faked a cache would fake
    // exactly the thing the cache exists to verify. It refuses, and says so in `capabilities`.
    const mock = new KernelClient(new InProcessTransport(createMockKernelHost()));
    try {
      const { kernel: mockInfo } = await mock.request('handshake', { clientProtocolVersion: 1 });
      expect(mockInfo.capabilities).not.toContain('exportBrep');
      await expect(mock.request('exportBrep', { handle: 'mock-1' })).rejects.toMatchObject({
        failure: { code: 'UNKNOWN_OP' },
      });
    } finally {
      mock.dispose();
    }
  }, 120_000);

  /**
   * ⚠⚠ THE TWO REFUSALS NO SHIPPED SOLID CAN REACH — DRIVEN DIRECTLY, BECAUSE OTHERWISE THEY ARE
   * UNTESTED CODE THAT EVERYTHING ELSE RESTS ON.
   *
   * Every solid the shipped types build has a tie-free signature and names every sub-shape (measured: 16
   * solids, zero ties, zero unnamed), so neither branch can be reached through an op — which is exactly
   * the situation where a guard rots unnoticed. `fingerprintOf` and `refsInShapeOrder` are exported so
   * the tripwires can be pulled by hand.
   */
  it('⚠ a TIED signature is refused (D28 rule 4), and so is a sub-shape with no name', () => {
    const row = (measure: number, cx: number, canonical = 0) => ({
      canonical,
      measure,
      cx,
      cy: 0,
      cz: 0,
    });

    // Two faces, same quantised area AND same quantised centroid: the digest cannot tell them apart, so
    // their tokens could swap unseen. A fingerprint over this would verify a binding it cannot check.
    expect(() =>
      fingerprintOf({ faces: [row(100, 5, 0), row(100, 5, 1)], edges: [] }, ['a', 'b'], 'test'),
    ).toThrow(/share one quantised geometric signature/);
    // One millimetre apart is enough to be distinguishable — the mm grid is the unit everything is
    // authored in (D28 rule 2), and this is the boundary of what the cache will accept.
    expect(() =>
      fingerprintOf({ faces: [row(100, 5, 0), row(100, 6, 1)], edges: [] }, ['a', 'b'], 'test'),
    ).not.toThrow();
    // Edges are their own index space, so a face and an edge sharing a signature is not a tie.
    expect(() =>
      fingerprintOf({ faces: [row(100, 5, 0)], edges: [row(100, 5, 0)] }, ['a', 'b'], 'test'),
    ).not.toThrow();

    // A cache that restores 1 of 2 identities is not a faster load; it is a solid with a hole in its
    // naming, and the hole surfaces later as an UNRESOLVED_SUBSHAPE_REF on whatever was hosted there.
    expect(() =>
      refsInShapeOrder({ faces: [row(100, 5, 0), row(100, 6, -1)], edges: [] }, ['a'], [], 'test'),
    ).toThrow(/carries no identity/);
  });

  it('the digest is SHA-256 — verified against `node:crypto`, not trusted', () => {
    for (const sample of ['', 'abc', 'bnn1|F=6|E=12|', 'a'.repeat(1000), 'x;y,1,2,3']) {
      expect(sha256Hex(sample), sample.slice(0, 12)).toBe(
        createHash('sha256').update(sample, 'ascii').digest('hex'),
      );
    }
  });

  it('⚠ THE PRIZE, MEASURED: importing a cached solid vs rebuilding it from the recipe', async () => {
    const { source, cache } = await exported();
    const runs = 10;

    const t0 = performance.now();
    for (let i = 0; i < runs; i++) {
      const r = await client.request('importBrep', {
        nodeId: source.nodeId,
        brep: cache.brep,
        refs: cache.refs,
        fingerprint: cache.fingerprint,
      });
      await client.request('releaseShape', { handle: r.handle });
    }
    const importMs = (performance.now() - t0) / runs;

    const t1 = performance.now();
    for (let i = 0; i < runs; i++) {
      const built = await wallWithDoor();
      await client.request('releaseShape', { handle: built.handle });
    }
    const rebuildMs = (performance.now() - t1) / runs;

    // Recorded, not asserted as a threshold: a perf gate that fails on a slow shared box is a gate
    // nobody trusts. The ENTRY carries the numbers; this keeps them reproducible.
    console.log(
      `\n  D29 PRIZE — cached import ${importMs.toFixed(2)} ms/solid vs recipe rebuild ` +
        `${rebuildMs.toFixed(2)} ms/element (${(rebuildMs / importMs).toFixed(1)}x), ` +
        `cache ${String(cache.brep.length)} B for ${String(cache.refs.length)} identities\n`,
    );
    expect(importMs).toBeGreaterThan(0);
  }, 300_000);

  /* ============================================================================================
   * 8 — THE ATTRIBUTION. Where a cached import actually spends its time.
   * ========================================================================================= */

  /**
   * ⚠⚠ THIS TEST EXISTS TO STOP ONE WRONG NUMBER BEING ACTED ON AGAIN.
   *
   * Entry 71 closed with *"the rest is **170 embind boundary crossings per solid** to drain the
   * signature vector … the obvious next lever — a memory view, as `tessellate` already does"*, and that
   * sentence became a planned unit of work in `current_state.md` §5 and both prompt files. **It was
   * never measured.** It is a SUBTRACTION RESIDUE: a native breakdown was scaled ×3 for WASM, and
   * whatever the scaled parts failed to explain was attributed to the crossings.
   *
   * Measured here instead, on the real 34-sub-shape fixture: **a crossing costs ~0.1–0.5 µs**, so all
   * **345** of them cost **~0.03–0.15 ms** — under 1% of a ~12 ms import, and below the run-to-run noise
   * of the import itself. ⚠ **345, not 170:** the count is now OBSERVED below rather than assumed, and
   * both Entry 71's figure and this test's own first draft undercounted it ~2× by forgetting that
   * `drainDoubles` re-calls `size()` in the loop condition. It cuts the per-crossing cost in half and
   * leaves the total — the number the decision rests on — untouched.
   * The residue is not the boundary; it is `shapeSignature`'s own C++ work, which is
   * ~34 `GProp` integrations and is **the price of verification** — exactly what §1a already says
   * (*"re-measuring every sub-shape to prove the tokens belong to the shape is the price of shipping
   * identity in a file"*). A memory view would remove ~0.1 ms and add a global buffer with a
   * *"valid only until the next call"* lifetime to the one file where a wrong answer produces a
   * plausible wrong building. `tessellate`'s payoff is ~1.8 million crossings **per frame**; this one is
   * 345 **per solid, once**. Four orders of magnitude apart, which is why the same fix does not follow.
   *
   * ⚠ THE METHOD, because the first attempt at it was wrong too: subtracting two whole-call timings puts
   * a ~0.1 ms signal inside a ~10 ms measurement and returns noise (it returned a NEGATIVE drain cost).
   * So the compute is held OUT — one vector is built once and drained K times before being deleted.
   *
   * ⚠ WHAT IS ASSERTED IS A RATIO, NOT A DURATION. `THE PRIZE` above declines to gate on absolute time
   * because a shared box makes that untrustworthy, and that reasoning is not repealed here. A ratio
   * survives a loaded box, and the bounds below sit 10–40× off the measured values: they are tripwires
   * for *"the crossings became the cost after all"*, not thresholds.
   */
  it('⚠⚠ THE ATTRIBUTION: the embind crossings are NOT what a cached import costs — measured', async () => {
    const { cache } = await exported();
    const brepText = text(cache.brep);

    // A second, raw instance: the phases have to be timed individually, and the client deliberately
    // exposes no seam that would let that happen through an op.
    const wasm = await initBunyanKernel();
    const bench = (fn: () => void, runs: number): number => {
      const t = performance.now();
      for (let i = 0; i < runs; i++) fn();
      return (performance.now() - t) / runs;
    };

    const handle = wasm.importBrep(brepText);
    expect(handle, 'the fixture must import into the raw module').toBeGreaterThan(0);
    const probe = wasm.shapeSignature(handle);
    const numbers = probe.size();
    probe.delete();
    const subShapes = (numbers - 2) / 5;
    expect(subShapes, 'the fixture is the measured 34-sub-shape wall cut by a door').toBe(34);

    // (a) THE COMPUTE — `shapeSignature` and a single `delete`, nothing drained.
    const compute = (): void => {
      wasm.shapeSignature(handle).delete();
    };
    bench(compute, 20); // warm: JIT + embind binding resolution
    const computeMs = bench(compute, 200);

    // (b) THE CROSSINGS, with the compute held out — build ONE vector, drain it many times.
    const vector = wasm.shapeSignature(handle);
    const drainOnce = (): number => {
      let sum = 0;
      for (let i = 0; i < vector.size(); i++) sum += vector.get(i) ?? 0;
      return sum;
    };
    bench(drainOnce, 20);
    const drainMs = bench(drainOnce, 200);

    // ⚠⚠ COUNT the crossings; do not reason about them. Entry 71 said "170 per solid" and the first
    // draft of this test said `numbers + 1` — both counted only the reads and forgot that
    // `drainDoubles` (kernel.ts:277) re-calls `size()` in the LOOP CONDITION, i.e. once per
    // iteration plus once to terminate. The loop below is that production loop verbatim, run against
    // a counting wrapper, so the number here is observed rather than derived.
    const crossings = ((): number => {
      let n = 0;
      const spy = {
        size: (): number => {
          n++;
          return vector.size();
        },
        get: (i: number): number | undefined => {
          n++;
          return vector.get(i);
        },
      };
      const out: number[] = [];
      for (let i = 0; i < spy.size(); i++) out.push(spy.get(i) ?? 0);
      expect(out.length, 'the replicated drain must read the whole signature').toBe(numbers);
      return n;
    })();
    vector.delete();
    wasm.releaseShape(handle);

    expect(
      crossings,
      'a drain crosses the boundary 2N+1 times — N `get`s, and one `size` per iteration plus the ' +
        'terminating one. If this ever becomes N+1, `drainDoubles` has been hoisted and the ' +
        'per-crossing cost below doubles.',
    ).toBe(2 * numbers + 1);
    const perCrossingUs = (drainMs / crossings) * 1000;
    const drainShare = drainMs / (computeMs + drainMs);

    console.log(
      `\n  D29 ATTRIBUTION — ${String(subShapes)} sub-shapes, ${String(numbers)}-number signature\n` +
        `    shapeSignature C++ compute  ${computeMs.toFixed(3)} ms\n` +
        `    all ${String(crossings)} embind crossings    ${drainMs.toFixed(3)} ms  ` +
        `(${perCrossingUs.toFixed(2)} us each, ${(drainShare * 100).toFixed(1)}% of the call)\n` +
        `    ⇒ a memory view could remove ${drainMs.toFixed(3)} ms/solid, and no more.\n`,
    );

    // The finding, as a tripwire. Measured 0.19–0.91 µs and 0.6–2.7%.
    expect(
      perCrossingUs,
      'an embind crossing must stay microseconds, not tens of them',
    ).toBeLessThan(10);
    expect(
      drainShare,
      'draining the signature must stay a minority of the signature call — if this ever fails, the ' +
        'memory view IS worth building and this comment is out of date',
    ).toBeLessThan(0.25);
  }, 300_000);
});
