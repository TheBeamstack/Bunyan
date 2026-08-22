/**
 * ⚠⚠ **THE LAZY-BUILD INSTRUMENT (D66, T-018).** The measurements
 * `docs/design/P5_step9_D66_lazy_build_design.md` is written from — it is a committed test file rather
 * than a one-off script precisely so the doc's numbers can be re-taken, and so its safety claim keeps
 * failing if the code stops honouring it.
 *
 * ── WHAT IT MEASURES ──────────────────────────────────────────────────────────────────────────────
 *  1. **The deferrable fraction of a cold load** (design §3b). Two cold `DocumentContext`s are built
 *     from the SAME `.bnn` bytes: one calls `rebuildAll()`, the other `rebuildOnly(keepLive)`. The
 *     fraction is reported in elements, in solids and in wall-clock.
 *  2. **Whether a partially built document AGREES with a fully built one** (design §2). Per element
 *     built in both, part for part: `nodeId`, the sub-shape identities, and the measured quantities.
 *     ⚠ Including ACROSS A JOIN — the keep-live set deliberately omits two of the four ring walls, so a
 *     built wall's corner partner is a wall this document has never built.
 *  3. **What the aggregates say about the elements that were skipped** (design §3c) — the DECLARE the
 *     enumeration makes, the FORCE `projectQuantities` runs (T-005), and whether `save` reads built
 *     state at all.
 *
 * ── WHY THE FIXTURE IS SHAPED THIS WAY ────────────────────────────────────────────────────────────
 * Baseline `{start,end}` walls (`@bunyan/types`' `core.wall`), never the `{length,height}` fixture the
 * other scale harnesses use: `baselineOf` returns `undefined` for those, `resolveJoins` early-returns,
 * and the join question — the one thing that could make lazy build unsafe — would never fire.
 *
 * ⚠ **Each storey's ring is offset in x.** `partnersAt` matches endpoints in PLAN with no level or
 * container scoping, so eight identically-placed rings would give every corner fifteen partners, the
 * ambiguity fallback would drop every miter, and the join measurement would be of nothing. (Recorded
 * as its own finding in `docs/BACKLOG.md ## Discovered`; here it is only fixture hygiene.)
 *
 * ⚠ **NO WALL-CLOCK THRESHOLD ASSERTION**, the standing rule for every timing harness in this repo: the
 * ratio is a decision input, printed and carried into the design doc, not a CI gate that flakes on a
 * loaded box. The assertions are about AGREEMENT — the property lazy build's safety rests on.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  affectedAssemblies,
  createRegistries,
  loadBnn,
  resolveJoins,
  saveBnn,
} from '@bunyan/document';
import type { Part, Registries, Scene } from '@bunyan/document';
import { openingType, wallType } from '@bunyan/types';

const LEVELS = 8;
const STOREY = 3200; // level-to-level rise, mm
const WALL_T = 200;
const WALL_H = 3000;
const RING_W = 8000;
const RING_D = 6000;
const LEVEL_DX = 60_000; // each storey's ring is offset in plan — see the header note on `partnersAt`
const PARTITIONS_PER_LEVEL = 4;
const DOORS = 3;

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';

/**
 * ⚠ THE IDENTITY UNDER COMPARISON, and it is `refs` — the sub-shape identities the kernel minted while
 * running the op DAG — never `nodeId`.
 *
 * `partNodeId` is `${elementId}.${partName}` (`geometry.ts`): a pure function of the recipe, computed
 * without a kernel call. A partial build and a full build therefore agree on every `nodeId` whatever the
 * kernel did, so an agreement check reading it is true by construction — the weak green `AGENTS.md §4.8`
 * names. The tripwire in the identity case below is what keeps this honest: it fails if this function
 * is changed to read `nodeId`.
 */
function identitiesOf(parts: readonly Part[]): readonly string[] {
  return parts.flatMap((p) => [...p.refs]);
}

function registriesWithTypes(): Registries {
  const r = createRegistries();
  r.types.register(wallType);
  r.types.register(openingType);
  for (const command of CORE_COMMANDS) r.commands.register(command);
  return r;
}

interface Authored {
  readonly scene: Scene;
  readonly bytes: Uint8Array;
  /** Level 0's four ring walls, in `[south, east, north, west]` order. */
  readonly ring: readonly string[];
  /** The doors hosted on level 0's south wall. */
  readonly doors: readonly string[];
  /** The keep-live set: level 0 MINUS its north and west ring walls. */
  readonly keepLive: readonly string[];
}

/**
 * `LEVELS` storeys. Each is a closed rectangular ring of four baseline walls — so all eight wall ends
 * miter against exactly one partner — plus four free-standing partitions that touch nothing, as the
 * negative control for "a wall with no join is unaffected either way", plus three doors.
 */
async function author(doc: DocumentContext): Promise<Omit<Authored, 'bytes' | 'scene'>> {
  await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
  await doc.execute('core.createContainer', {
    id: 'block',
    kind: 'building',
    name: 'Block A',
    parentId: 'site',
  });

  let ring: string[] = [];
  const doors: string[] = [];
  for (let level = 0; level < LEVELS; level++) {
    const levelId = `level-${String(level)}`;
    await doc.execute('core.createContainer', {
      id: levelId,
      kind: 'level',
      name: `Level ${String(level)}`,
      parentId: 'block',
      elevation: level * STOREY,
    });

    const ox = level * LEVEL_DX;
    const corners: readonly (readonly [number, number])[] = [
      [ox, 0],
      [ox + RING_W, 0],
      [ox + RING_W, RING_D],
      [ox, RING_D],
    ];
    const built: string[] = [];
    for (let i = 0; i < corners.length; i++) {
      const edit = await doc.execute('core.createElement', {
        typeId: 'core.wall',
        containerId: levelId,
        params: {
          start: corners[i]!,
          end: corners[(i + 1) % corners.length]!,
          thickness: WALL_T,
          height: WALL_H,
        },
      });
      built.push(edit.changes[0]!.id);
    }
    if (level === 0) ring = built;

    // Free-standing partitions, well clear of the ring on every side: no shared endpoint (no miter) and
    // no point landing on a ring segment (no auto-butt).
    for (let i = 0; i < PARTITIONS_PER_LEVEL; i++) {
      const y = 2000 + i * 600;
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        containerId: levelId,
        params: {
          start: [ox + 2000, y],
          end: [ox + 3500, y],
          thickness: WALL_T,
          height: WALL_H,
        },
      });
    }

    // ⚠ EVERY storey carries doors, not just level 0. A hosted void is by far the most expensive
    // element here (a void extrude, a boolean through the host, and two leaf solids), so putting them
    // all on one storey would make every sweep point carry the same fixed lump of door work and leave
    // the marginal cost measuring plain walls alone.
    const south = built[0]!;
    const hostFace = doc.partsOf(south)![0]!.refs.find((r) => r.includes('/face/lateral.1'))!;
    for (let i = 0; i < DOORS; i++) {
      const edit = await doc.execute('core.createElement', {
        typeId: 'core.opening',
        hostId: south,
        hostRef: hostFace,
        params: { width: 900, height: 2100, offsetU: 1500 + i * 2000, offsetV: 0 },
      });
      if (level === 0) doors.push(edit.changes[0]!.id);
    }
  }

  const south = ring[0]!;

  // ⚠ THE KEEP-LIVE SET: level 0, minus the ring's NORTH and WEST walls. The headless stand-in for
  // design §3a's camera-derived set — a viewer standing south of the block sees the near half of one
  // storey. What makes it the right shape for this measurement is the corner it leaves open: the south
  // wall's `start` end meets the WEST wall, which this document will never build.
  const keepLive = Object.values(doc.scene.elements)
    .filter((e) => e.containerId === 'level-0' || e.hostId === south)
    .map((e) => e.id)
    .filter((id) => id !== ring[2] && id !== ring[3]);

  return { ring, doors, keepLive };
}

interface ColdLoad {
  readonly doc: DocumentContext;
  readonly ms: number;
  readonly kernel: OcctKernel;
  readonly client: KernelClient;
}

interface SweepPoint {
  readonly storeys: number;
  readonly elements: number;
  readonly ms: number;
}

/** Ordinary least squares of y on x, plus the fit's own R² — the same instrument T-004 uses. */
function fitLine(points: readonly { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - meanX) ** 2;
    sxy += (p.x - meanX) * (p.y - meanY);
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  let ssRes = 0;
  let ssTot = 0;
  for (const p of points) {
    ssRes += (p.y - (intercept + slope * p.x)) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  return { slope, intercept, r2: ssTot === 0 ? 1 : 1 - ssRes / ssTot };
}

/**
 * ⚠⚠ ONE THROWAWAY ELEMENT, BUILT AND FREED BEFORE THE CLOCK STARTS — and without it this harness
 * measures the wrong thing.
 *
 * A kernel's FIRST op pays for the WASM module's own warm-up, and the process's first document build
 * pays for V8 compiling the whole build path. Measured: a four-point sweep on cold kernels produced a
 * NEGATIVE marginal cost, because each later load was warmer than the one before by more than the extra
 * elements cost. That fixed cost is also not part of a real cold load — in the app the kernel is
 * constructed once at bootstrap and is long warm by the time a `.bnn` is opened.
 */
async function warmUp(client: KernelClient): Promise<void> {
  const doc = new DocumentContext({ registries: registriesWithTypes(), geometry: client });
  await doc.execute('core.createElement', {
    typeId: 'core.wall',
    params: { start: [0, 0], end: [1000, 0], thickness: 100, height: 1000 },
  });
  await doc.dispose();
}

/** A cold `DocumentContext` from `scene.json` alone, on a warm kernel of its own, and its build time. */
async function coldLoad(
  bytes: Uint8Array,
  build: (doc: DocumentContext) => Promise<void>,
): Promise<ColdLoad> {
  const kernel = await createOcctKernel();
  const client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  await warmUp(client);
  const doc = new DocumentContext({
    registries: registriesWithTypes(),
    geometry: client,
    scene: loadBnn(bytes).scene,
  });
  const started = performance.now();
  await build(doc);
  return { doc, ms: performance.now() - started, kernel, client };
}

const builtElementIds = (doc: DocumentContext): readonly string[] =>
  Object.keys(doc.scene.elements).filter((id) => (doc.partsOf(id)?.length ?? 0) > 0);

const solidCount = (doc: DocumentContext): number =>
  Object.keys(doc.scene.elements).reduce((total, id) => total + (doc.partsOf(id)?.length ?? 0), 0);

let authored: Authored;
let full: ColdLoad;
let partial: ColdLoad;
const sweep: SweepPoint[] = [];

describe('D66 lazy build — the instrument the design doc is written from (T-018)', () => {
  beforeAll(async () => {
    const kernel = await createOcctKernel();
    const client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
    let seed: Omit<Authored, 'bytes' | 'scene'>;
    let scene: Scene;
    let bytes: Uint8Array;
    try {
      const doc = new DocumentContext({ registries: registriesWithTypes(), geometry: client });
      seed = await author(doc);
      scene = doc.scene;
      bytes = saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID });
      expect(doc.brokenRefs(), 'the authored fixture is clean').toHaveLength(0);
    } finally {
      // Freed before either cold load starts: the measurement is of a load, not of three live kernels.
      client.dispose();
      kernel.dispose?.();
    }
    authored = { ...seed, scene, bytes };

    // ⚠ THE SWEEP, and it is why this harness does not stop at one ratio. A single partial-vs-full pair
    // gives an elements-deferred fraction and a wall-clock fraction that DISAGREE, and with two points
    // there is no way to say which part of the cost is fixed. Four `rebuildOnly` sizes let the fit put
    // the per-load fixed cost in the INTERCEPT and the deferrable per-element cost in the SLOPE — the
    // same reasoning `document-build-cost-scale.test.ts` (T-004) applies to model size.
    for (const storeys of [2, 4, 6, 8]) {
      const levels = new Set(Array.from({ length: storeys }, (_, i) => `level-${String(i)}`));
      const ids = Object.values(scene.elements)
        .filter(
          (e) =>
            (e.containerId !== undefined && levels.has(e.containerId)) ||
            (e.hostId !== undefined && levels.has(scene.elements[e.hostId]?.containerId ?? '')),
        )
        .map((e) => e.id);
      const load = await coldLoad(bytes, (doc) => doc.rebuildOnly(ids));
      sweep.push({ storeys, elements: builtElementIds(load.doc).length, ms: load.ms });
      load.client.dispose();
      load.kernel.dispose?.();
    }

    full = await coldLoad(bytes, (doc) => doc.rebuildAll());
    partial = await coldLoad(bytes, (doc) => doc.rebuildOnly(authored.keepLive));
  }, 900_000);

  afterAll(() => {
    full?.client.dispose();
    full?.kernel.dispose?.();
    partial?.client.dispose();
    partial?.kernel.dispose?.();
  });

  /* ============================================================================================
   * §3a / §3b — HOW MUCH OF A COLD LOAD IS FORCED, AND HOW MUCH IS DEFERRABLE
   * ========================================================================================= */

  it('⚠⚠ prices the deferrable fraction of a cold load — the number §3b turns on', () => {
    const elements = Object.keys(authored.scene.elements).length;
    const fullBuilt = builtElementIds(full.doc).length;
    const partialBuilt = builtElementIds(partial.doc).length;
    const fullSolids = solidCount(full.doc);
    const partialSolids = solidCount(partial.doc);

    // The full load is the denominator, so it has to have actually built the building.
    expect(fullBuilt, 'the full cold load built every element').toBe(elements);
    expect(partialBuilt).toBeLessThan(fullBuilt);
    expect(partialSolids).toBeLessThan(fullSolids);

    const deferrableElements = 1 - partialBuilt / fullBuilt;
    const deferrableSolids = 1 - partialSolids / fullSolids;
    const timeRatio = partial.ms / full.ms;

    const fit = fitLine(sweep.map((p) => ({ x: p.elements, y: p.ms })));
    // The measurement must be sound: one more element built costs real, positive time.
    expect(fit.slope, 'the sweep must price an element').toBeGreaterThan(0);
    // ⚠ The top sweep point must BE the whole model, or the `rebuildOnly` vs `rebuildAll` line below
    // is comparing two different amounts of work.
    expect(sweep[sweep.length - 1]!.elements, 'the top sweep point is the whole model').toBe(
      elements,
    );
    // The fixed part of a cold load — the part deferral cannot touch, whatever the keep-live set is.
    const fixedShareOfFull = fit.intercept / full.ms;

    console.log(
      [
        '',
        '  ╔══════════════════════════════════════════════════════════════════════════════╗',
        '  ║  D66 LAZY BUILD (T-018) — THE DEFERRABLE FRACTION OF A COLD LOAD             ║',
        '  ╚══════════════════════════════════════════════════════════════════════════════╝',
        `     model                          : ${String(elements)} elements · ${String(fullSolids)} solids · ${String(LEVELS)} storeys`,
        `     keep-live set (requested)      : ${String(authored.keepLive.length)} elements`,
        `     assembly roots it closes to    : ${String(affectedAssemblies(authored.scene, authored.keepLive).length)}`,
        '  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈',
        `     FULL   rebuildAll()            : ${full.ms.toFixed(0)} ms · ${String(fullBuilt)} elements built · ${String(fullSolids)} solids`,
        `     PARTIAL rebuildOnly(keepLive)  : ${partial.ms.toFixed(0)} ms · ${String(partialBuilt)} elements built · ${String(partialSolids)} solids`,
        '  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈',
        `     DEFERRED, by element           : ${(deferrableElements * 100).toFixed(1)}%`,
        `     DEFERRED, by solid             : ${(deferrableSolids * 100).toFixed(1)}%`,
        `     ⚠ but the WALL-CLOCK still spent : ${(timeRatio * 100).toFixed(1)}% of the full load`,
        '  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈',
        `     THE SWEEP — rebuildOnly() at ${String(sweep.length)} keep-live sizes, fresh kernel each:`,
        ...sweep.map(
          (p) =>
            `       ${String(p.storeys)} storey  ${String(p.elements).padStart(3)} elements built : ${p.ms.toFixed(0).padStart(5)} ms`,
        ),
        `       marginal cost per element (SLOPE)     : ${fit.slope.toFixed(2)} ms  ⇐ THE DEFERRABLE PART`,
        `       fixed cost per cold load (INTERCEPT)  : ${fit.intercept.toFixed(0)} ms  ⇐ deferral cannot touch it`,
        `       R²                                    : ${fit.r2.toFixed(4)}`,
        `       fixed cost as a share of the full load: ${(fixedShareOfFull * 100).toFixed(1)}%`,
        `     ⚠ the top sweep point IS the whole model, so it prices rebuildOnly(everything) against`,
        `       rebuildAll(): ${sweep[sweep.length - 1]!.ms.toFixed(0)} ms vs ${full.ms.toFixed(0)} ms — the bounded path carries no penalty.`,
        '',
        `  ►  Deferring ${(deferrableElements * 100).toFixed(1)}% of the elements removed ${((1 - timeRatio) * 100).toFixed(1)}% of the cold load. What is left is`,
        `     the keep-live set's own build plus a ${(fixedShareOfFull * 100).toFixed(1)}% per-load fixed cost that deferral cannot reach.`,
        `     ⚠ Projecting the slope to D48's 10,000: ${((fit.slope * 10_000) / 1000).toFixed(0)} s — an extrapolation of`,
        `     ${(10_000 / (sweep[sweep.length - 1]?.elements ?? 1)).toFixed(0)}×, and on a cheaper fixture than T-004's (41.9–43.8 ms/element). T-004 is the`,
        `     instrument for the per-element cost at scale; this one is for the FRACTION deferral removes.`,
        '',
      ].join('\n'),
    );

    expect(deferrableElements).toBeGreaterThan(0);
    expect(Number.isFinite(timeRatio)).toBe(true);
  });

  it('⚠ the keep-live set is not free-form — a door forces the wall it is a hole in', () => {
    const door = authored.doors[0]!;
    const roots = affectedAssemblies(authored.scene, [door]);
    // `rebuildOnly` builds ASSEMBLIES, so naming a door alone still costs its whole host wall. That is
    // the floor under any camera-derived keep-live set, and §3a states it rather than discovering it.
    expect(roots).toEqual([authored.ring[0]]);
  });

  /* ============================================================================================
   * §2 — DOES A PARTIALLY BUILT DOCUMENT AGREE WITH A FULLY BUILT ONE?
   * ========================================================================================= */

  it('⚠⚠ every element built in BOTH carries byte-identical sub-shape identities', () => {
    const common = builtElementIds(partial.doc);
    expect(common.length).toBeGreaterThan(0);

    let comparedParts = 0;
    for (const id of common) {
      const a = partial.doc.partsOf(id)!;
      const b = full.doc.partsOf(id)!;
      expect(
        a.map((p) => p.name),
        `${id}: part names`,
      ).toEqual(b.map((p) => p.name));
      expect(
        a.map((p) => p.nodeId),
        `${id}: node ids`,
      ).toEqual(b.map((p) => p.nodeId));
      expect(identitiesOf(a), `${id}: sub-shape identities`).toEqual(identitiesOf(b));
      comparedParts += a.length;
    }

    // ⚠⚠ THE TRIPWIRE. `nodeId` is derived from the recipe and never from a kernel call, so an agreement
    // check reading it would pass whatever the geometry did — including if the partial build had
    // produced the wrong solids. This assertion says the identities actually compared carry more than
    // the node names do, and it is what goes RED if `identitiesOf` is changed to read `p.nodeId`.
    const parts = common.flatMap((id) => partial.doc.partsOf(id)!);
    expect(
      new Set(identitiesOf(parts)).size,
      'the identity signature must carry more than the recipe-derived node ids',
    ).toBeGreaterThan(new Set(parts.map((p) => p.nodeId)).size);

    expect(comparedParts).toBeGreaterThan(0);
  });

  it('⚠⚠ ACROSS A JOIN: a wall keeps its miter although its corner partner was never built', async () => {
    const [south, , north, west] = authored.ring as readonly [string, string, string, string];

    // The premise: the partner really is absent from the partial document.
    expect(
      partial.doc.partsOf(west),
      'the west wall must be deferred for this to test anything',
    ).toBe(undefined);
    expect(partial.doc.partsOf(north)).toBe(undefined);
    expect(full.doc.partsOf(west)?.length).toBeGreaterThan(0);

    // `resolveJoins` is a pure function of the SCENE — the recipe — so both documents resolve the same
    // two mitered ends. If it ever read the built set instead, the partial document would resolve one.
    expect(resolveJoins(partial.doc.scene, south).map((j) => j.end)).toEqual(['start', 'end']);
    expect(resolveJoins(full.doc.scene, south).map((j) => j.end)).toEqual(['start', 'end']);

    // And the geometry follows: the miter at the corner the west wall makes is present in both.
    // ⚠ MEASURED ON THE B-REP, not on the ref list — a miter moves the cap's shape while leaving every
    // sub-shape token byte-identical (measured on T-011), so `refs` cannot see it and `bounds` can.
    const boundsOf = async (load: ColdLoad, id: string): Promise<readonly number[]> => {
      const part = load.doc.partsOf(id)![0]!;
      const { bounds } = await load.client.request('bounds', { handle: part.handle });
      return [...bounds.min, ...bounds.max];
    };
    const partialBounds = await boundsOf(partial, south);
    const fullBounds = await boundsOf(full, south);
    console.log(
      `\n     §2 — south wall bounds, [min…max]:\n` +
        `         partial (west wall never built) : ${JSON.stringify(partialBounds.map((v) => Number(v.toFixed(3))))}\n` +
        `         full                            : ${JSON.stringify(fullBounds.map((v) => Number(v.toFixed(3))))}\n`,
    );
    for (let i = 0; i < fullBounds.length; i++) {
      expect(partialBounds[i]!, `south wall bounds[${String(i)}]`).toBeCloseTo(fullBounds[i]!, 6);
    }
    // The miter really is in there: a jointless cap would start exactly on the baseline.
    expect(
      fullBounds[0]!,
      'the south wall reaches past its baseline start — it is mitered',
    ).toBeLessThan(-1);
  });

  it('⚠ quantities agree part for part, including the wall the doors are cut through', async () => {
    for (const id of builtElementIds(partial.doc)) {
      const a = await partial.doc.quantities(id);
      const b = await full.doc.quantities(id);
      expect(a.parts.length, `${id}: part count`).toBe(b.parts.length);
      for (const [i, part] of a.parts.entries()) {
        expect(part.volume, `${id}/${part.name}: volume`).toBeCloseTo(b.parts[i]!.volume, 6);
        expect(part.area, `${id}/${part.name}: area`).toBeCloseTo(b.parts[i]!.area, 6);
      }
    }
  });

  /* ============================================================================================
   * §3c — WHAT THE AGGREGATES SAY ABOUT THE ELEMENTS NOBODY BUILT
   * ========================================================================================= */

  it('⚠ `save` does not read built state — the two documents write the same scene', () => {
    // `saveBnn(scene, options)` takes a `Scene`, never a `DocumentContext`: there is no built state in
    // its reach, and this is the measurement behind that type-level fact. A `.bnn` written from a
    // document that built 9 elements is the same file as one written from a document that built 43.
    expect(JSON.stringify(partial.doc.scene)).toBe(JSON.stringify(full.doc.scene));
    expect(
      saveBnn(partial.doc.scene, { kernelBuildId: KERNEL_BUILD_ID }).length,
      'the same bytes, from either document',
    ).toBe(saveBnn(full.doc.scene, { kernelBuildId: KERNEL_BUILD_ID }).length);
  });

  it('⚠ a partially built document manufactures no broken references', () => {
    expect(partial.doc.brokenRefs()).toHaveLength(0);
    expect(full.doc.brokenRefs()).toHaveLength(0);
  });

  // ⚠⚠ LAST, AND THAT IS LOAD-BEARING: `projectQuantities` FORCES (T-005), so this case leaves
  // `partial.doc` fully built and every case above it nothing to defer.
  it('⚠⚠ §3c — the enumeration DECLARES the deferred elements `stale`; `projectQuantities` FORCES', async () => {
    // The DECLARE half, read before anything forces. `stale` is *recipe present, solid not built*;
    // reporting these as `failed`/`unbuildable` said a Type had refused them (T-005).
    const enumerated = partial.doc.modelElements();
    const deferred = enumerated.filter((e) => e.state === 'stale');
    expect(deferred.length, 'the elements the keep-live set skipped').toBeGreaterThan(0);
    expect(
      deferred.filter((e) => e.failure !== undefined),
      'nothing failed',
    ).toHaveLength(0);
    expect(
      enumerated.filter((e) => e.failure === 'unbuildable'),
      'no Type refused anything in this fixture',
    ).toHaveLength(0);

    // The FORCE half: the take-off builds what it is about to report, so a partial document answers
    // exactly as a full one.
    const fullTakeoff = await full.doc.projectQuantities();
    const partialTakeoff = await partial.doc.projectQuantities();
    console.log(
      `\n     §3c — ${String(deferred.length)} of ${String(enumerated.length)} enumerated elements ` +
        `DECLARED \`stale\` before the take-off\n` +
        `            take-off after FORCE: ${String(partialTakeoff.rows.length)} rows, ` +
        `${String(partialTakeoff.unmeasured.length)} unmeasured (full: ` +
        `${String(fullTakeoff.rows.length)} rows)\n`,
    );
    expect(fullTakeoff.unmeasured, 'a full load leaves nothing unmeasured').toHaveLength(0);
    expect(partialTakeoff.unmeasured, 'and neither does a forced one').toHaveLength(0);
    expect(partialTakeoff.rows.length, 'row for row').toBe(fullTakeoff.rows.length);
    // ⚠ EXPLICIT TIMEOUT, because this case BUILDS: FORCE (T-005) makes `projectQuantities` a whole-model
    // rebuild of everything the keep-live set skipped, which is real OCCT work and not the pure read the
    // 5 s default assumes. Measured red on the CI runner at the default and green on the box — a fixture
    // this size sits either side of 5 s depending on the machine, which is the worst place for it to sit.
  }, 120_000);
});
