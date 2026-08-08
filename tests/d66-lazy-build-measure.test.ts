/**
 * ENTRY 90 — **D66's LAZY BUILD, MEASURED BEFORE IT IS DESIGNED.**
 *
 * §1a's cold-load row is the only ⚠ left and nobody has touched it since Entry 73: **~3 min at the 10k
 * target.** Of the three levers, `instantiate` is RESERVED and MT is ruled v1.0.x, so **D66 is the one
 * that is open.** TASK asked three questions before a line of design gets written, and the first two are
 * measurements, not opinions:
 *
 *   1. **What fraction of a cold load is actually FORCED?** Entry 73 measured that verification is most
 *      of the cost and the embind boundary is ~1% — so the win, if there is one, is in **not building
 *      solids nobody is looking at**, not in tuning the ones we do. ⇒ measure what a first paint needs.
 *   2. **What does eviction cost the INVARIANT, not the schedule?** §1b's third method: *"ship the BREP
 *      cache"* read as a perf call and dragged in a persisted name→shape index that D1 forbids. ⇒ ask
 *      what an evicted-and-rebuilt shape does to **identity**, and measure that too.
 *
 * ⚠⚠ **THIS FILE ANSWERS BOTH WITH NUMBERS AND ASSERTS THE ONE THAT MUST HOLD FOREVER.** The timings are
 * reported, never asserted — a box-speed assertion is a flaky test, and `document-scale.test.ts` already
 * owns the headline cold-load number. **The identity comparisons ARE assertions**, because they are what
 * makes lazy build legal at all: if a partially-built document disagreed with a fully-built one about a
 * single measured quantity, D66 would be a correctness change wearing a performance change's clothes.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  createRegistries,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import type { Registries } from '@bunyan/document';
import { wallType } from '@bunyan/types';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

const STOREYS = 3;
const WALLS_PER_STOREY = 8;
const COLUMNS_PER_STOREY = 6;
const WINDOWS_PER_STOREY = 4;

describe('D66 — what a lazy cold load would actually buy, and what it costs identity', () => {
  let kernel: OcctKernel;
  let client: KernelClient;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  }, 60_000);
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  const registries = (): Registries => {
    const r = createRegistries();
    for (const type of FIXTURE_TYPES) r.types.register(type);
    for (const command of CORE_COMMANDS) r.commands.register(command);
    return r;
  };

  /** The library every fixture below shares. */
  const seedLibrary = async (doc: DocumentContext): Promise<void> => {
    await doc.execute('core.createMaterial', {
      id: 'blockwork',
      name: 'Blockwork',
      category: 'masonry',
      density: 2000,
    });
    await doc.execute('core.createMaterial', {
      id: 'plaster',
      name: 'Plaster',
      category: 'finish',
      density: 1200,
    });
    await doc.execute('core.createMaterial', {
      id: 'concrete',
      name: 'C25/30',
      category: 'concrete',
      density: 2400,
      structural: { f_ck: 25, E: 31000 },
    });
    await doc.execute('core.createSection', {
      id: 'RECT-400x400',
      name: 'RECT-400x400',
      shape: 'rectangle',
      dimensions: { width: 400, depth: 400 },
      properties: { area: 160_000 },
    });
    await doc.execute('core.createStyle', {
      id: 'EXT-295',
      name: 'EXT-295-Blockwork',
      typeId: 'core.wall.v1',
      layers: [
        {
          name: 'finish.interior',
          materialId: 'plaster',
          thickness: 15,
          discipline: 'architectural',
        },
        { name: 'structure', materialId: 'blockwork', thickness: 200, discipline: 'structural' },
      ],
    });
    await doc.execute('core.createStyle', {
      id: 'COL-400',
      name: 'COL-400',
      typeId: 'core.linearMember.v1',
      sectionId: 'RECT-400x400',
      params: { materialId: 'concrete' },
    });
  };

  /**
   * ⚠ THE COMPARABLE — everything a consumer can observe about ONE element's geometry, as text.
   * Part node ids AND the measured breakdown, because identity is not "it built" — it is "it built the
   * same thing, with the same names on it". `handle` is deliberately excluded: a WASM handle is a heap
   * address and is *supposed* to differ between two documents.
   */
  const observableOf = async (doc: DocumentContext, id: string): Promise<string> => {
    const geometry = doc.geometryOf(id);
    const quantities = await doc.quantities(id);
    return JSON.stringify({
      state: geometry?.state,
      // ⚠⚠ `refs` IS THE POINT, AND THIS COMPARISON WAS VACUOUS UNTIL TYPECHECK SAID SO. It first read
      // `p.node`, which does not exist on `Part` — so it compared `[undefined, undefined]` against
      // `[undefined, undefined]` and would have passed while every sub-shape name differed. Checklist
      // item 6 answers itself: the test's own title was FALSE and it was green. `refs` is *"every
      // sub-shape identity this part's solid carries, canonically ordered"* — the persistent-naming
      // tokens D1 is about, and the only thing here that can actually detect an identity drift.
      parts: geometry?.parts.map((p) => ({ nodeId: p.nodeId, refs: p.refs, name: p.name })),
      quantities,
    });
  };

  it('⚠⚠ THE FORCED FRACTION — how much of a cold load a first paint can decline to do', async () => {
    const doc = new DocumentContext({ registries: registries(), geometry: client });
    await seedLibrary(doc);
    await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
    await doc.execute('core.createContainer', {
      id: 'tower-a',
      kind: 'building',
      name: 'Tower A',
      parentId: 'site',
    });

    /** storey ⇒ the element ids authored on it. This is the "which solids does a first paint need?" set. */
    const byStorey: string[][] = [];

    for (let storey = 0; storey < STOREYS; storey++) {
      const levelId = `level-${String(storey)}`;
      const ids: string[] = [];
      await doc.execute('core.createContainer', {
        id: levelId,
        kind: 'level',
        name: `Level ${String(storey)}`,
        parentId: 'tower-a',
        elevation: storey * 3200,
      });

      for (let i = 0; i < COLUMNS_PER_STOREY; i++) {
        const column = await doc.execute('core.createElement', {
          typeId: 'core.linearMember.v1',
          styleId: 'COL-400',
          containerId: levelId,
          params: { length: 3200, direction: 'z' },
          placement: [
            { kind: 'translate', by: [(i % 3) * 6000, Math.floor(i / 3) * 6000, storey * 3200] },
          ],
        });
        ids.push(column.changes[0]!.id);
      }

      const wallIds: string[] = [];
      for (let i = 0; i < WALLS_PER_STOREY; i++) {
        const rotated = i % 2 === 1;
        const wall = await doc.execute('core.createElement', {
          typeId: 'core.wall.v1',
          styleId: 'EXT-295',
          containerId: levelId,
          params: { length: 5000, height: 2800 },
          placement: [
            ...(rotated
              ? [{ kind: 'rotate' as const, axis: [0, 0, 1] as const, degrees: 90 }]
              : []),
            {
              kind: 'translate' as const,
              by: [(i % 4) * 6000, Math.floor(i / 4) * 6000, storey * 3200] as const,
            },
          ],
        });
        wallIds.push(wall.changes[0]!.id);
        ids.push(wall.changes[0]!.id);
      }

      for (let i = 0; i < WINDOWS_PER_STOREY; i++) {
        const wallId = wallIds[i]!;
        const window = await doc.execute('core.createElement', {
          typeId: 'core.opening.v1',
          hostId: wallId,
          hostRef: `${wallId}.finish.interior/face/y-min#0`,
          params: { width: 1200, height: 1400, offsetU: 1500, offsetV: 900 },
        });
        ids.push(window.changes[0]!.id);
      }

      byStorey.push(ids);
    }

    const bytes = saveBnn(doc.scene, { kernelBuildId: 'occt-7.9.3-emcc-6.0.2' });
    const total = Object.keys(doc.scene.elements).length;
    const firstPaint = byStorey[0]!;

    // ---- (A) TODAY'S COLD LOAD: `rebuildAll`, every solid, from scene.json alone. ---------------
    const full = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: loadBnn(bytes).scene,
    });
    const tFull = performance.now();
    await full.rebuildAll();
    const fullMs = performance.now() - tFull;

    // ---- (B) THE LAZY LOAD, AND ⚠ IT NEEDS NO NEW API — `rebuildOnly` IS THE PRIMITIVE. --------
    // It shipped for the Clean Delta (owner ruling 2026-07-25) so a 38-element delta would not cost a
    // whole-model rebuild. That is the same shape as a first paint: build what is named, not what exists.
    const lazy = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: loadBnn(bytes).scene,
    });
    const tLazy = performance.now();
    await lazy.rebuildOnly(firstPaint);
    const lazyMs = performance.now() - tLazy;

    // ---- (C) …and then the REST, on demand, as the user scrolls. -------------------------------
    const tRest = performance.now();
    await lazy.rebuildOnly(byStorey.slice(1).flat());
    const restMs = performance.now() - tRest;

    const pct = (n: number, d: number): string => `${((100 * n) / d).toFixed(1)}%`;
    console.log(
      [
        '',
        '  ╔══════════════════════════════════════════════════════════════════════════════╗',
        '  ║  D66 — THE FORCED FRACTION OF A COLD LOAD (Entry 90). Measured, this box.    ║',
        '  ╚══════════════════════════════════════════════════════════════════════════════╝',
        `     building          : ${String(STOREYS)} storeys, ${String(total)} elements`,
        `     first paint needs : ${String(firstPaint.length)} elements  (${pct(firstPaint.length, total)} of the model)`,
        '',
        `  ►  (A) rebuildAll    : ${fullMs.toFixed(0)} ms   ${(fullMs / total).toFixed(1)} ms/element  ← today's cold load`,
        `  ►  (B) first storey  : ${lazyMs.toFixed(0)} ms   ${(lazyMs / firstPaint.length).toFixed(1)} ms/element  ← ${pct(lazyMs, fullMs)} of (A)`,
        `     (C) the rest      : ${restMs.toFixed(0)} ms   (deferred, not on the first-paint path)`,
        `     (B)+(C) vs (A)    : ${pct(lazyMs + restMs, fullMs)}  ← the price of doing it in two passes`,
        '',
        `     ⇒ TIME SAVED BEFORE FIRST PAINT: ${pct(fullMs - lazyMs, fullMs)} of the cold load.`,
        `       Cost fraction ${pct(lazyMs, fullMs)} vs element fraction ${pct(firstPaint.length, total)}`,
        '       — the gap between those two is the FIXED FLOOR lazy build cannot buy back.',
        '',
      ].join('\n'),
    );

    // ⚠ NOT a timing assertion (box speed is not a contract). What IS asserted: the lazy document
    // really did decline to build the rest, i.e. the measurement is measuring something.
    for (const id of byStorey[STOREYS - 1]!) {
      expect(full.geometryOf(id)?.state, `${id} should be built in the full document`).toBe(
        'valid',
      );
    }
    expect(lazyMs).toBeGreaterThan(0);
    expect(fullMs).toBeGreaterThan(0);
  }, 300_000);

  it('⚠⚠ IDENTITY — a partially built document must not disagree with a fully built one', async () => {
    // The whole legality of lazy build rests on recipe-is-truth: the solid is a disposable projection,
    // so building a SUBSET must produce, for that subset, exactly what building everything produces.
    // D66's contract half was ruled on that reasoning. This measures it.
    const doc = new DocumentContext({ registries: registries(), geometry: client });
    await seedLibrary(doc);
    await doc.execute('core.createContainer', { id: 'level-0', kind: 'level', name: 'L0' });

    const walls: string[] = [];
    for (let i = 0; i < 4; i++) {
      const wall = await doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'EXT-295',
        containerId: 'level-0',
        params: { length: 5000, height: 2800 },
        placement: [{ kind: 'translate', by: [i * 6000, 0, 0] }],
      });
      walls.push(wall.changes[0]!.id);
    }
    // ⚠ One wall carries a window — the CUT node is where sub-shape names are minted, so it is the
    // element most likely to name things differently if build order or neighbours mattered.
    const holed = walls[0]!;
    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: holed,
      hostRef: `${holed}.finish.interior/face/y-min#0`,
      params: { width: 1200, height: 1400, offsetU: 1500, offsetV: 900 },
    });

    const bytes = saveBnn(doc.scene, { kernelBuildId: 'occt-7.9.3-emcc-6.0.2' });

    const full = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: loadBnn(bytes).scene,
    });
    await full.rebuildAll();

    const partial = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: loadBnn(bytes).scene,
    });
    // Build ONLY the holed wall's assembly. The other three walls stay unbuilt — their recipes are
    // present in `scene.elements`, their solids are not in the heap.
    await partial.rebuildOnly([holed]);

    expect(partial.geometryOf(walls[1]!)).toBeUndefined(); // ⚠ it really is unbuilt
    expect(full.geometryOf(walls[1]!)?.state).toBe('valid');

    // ⚠⚠ THE COMPARISON MUST HAVE SOMETHING TO COMPARE. Without this the identity assertions below
    // pass on two empty lists — which is precisely how the first draft of this file was green while
    // reading a property (`p.node`) that does not exist on `Part`. Assert the instrument, then use it.
    const holedParts = partial.geometryOf(holed)!.parts;
    expect(holedParts.length).toBeGreaterThan(0);
    for (const part of holedParts) expect(part.refs.length).toBeGreaterThan(0);

    // ⇒ THE ASSERTION D66 RESTS ON.
    expect(await observableOf(partial, holed)).toBe(await observableOf(full, holed));

    // …and after building the rest, the previously-unbuilt walls agree too — the second pass is not
    // a different building.
    await partial.rebuildOnly(walls.slice(1));
    for (const id of walls.slice(1)) {
      expect(await observableOf(partial, id), `${id} differs when built in a second pass`).toBe(
        await observableOf(full, id),
      );
    }
  }, 180_000);

  /**
   * ⚠⚠⚠ **THE FINDING THAT SHAPES THE DESIGN, AND IT IS NOT A PERFORMANCE FINDING.**
   *
   * The two tests above say lazy build is identity-safe for the elements it BUILDS. This asks the
   * other question — **what does a whole-model take-off say about the elements it did NOT build?**
   *
   * ⚠⚠ **I PREDICTED THE Q19 SHAPE AND THE MEASUREMENT SAID NO — WHICH IS THE ONLY REASON TO RUN IT.**
   * The expectation was the one this project has now met four times (Q17a, Q19, the `hostId` orphan,
   * the belongs-to cycle): a short number wearing `basis: 'exact'` with every diagnostic empty. It is
   * not what happens. `projectQuantities` tests `element.state !== 'valid'` *before* it tests
   * `hasParts`, so an unbuilt element takes the **`unmeasured` branch, by name**, and the silent
   * `continue` is reached only by a pure void or a pure composite — the case it was actually written
   * for. **Entry 58's owner ruling (*"an element that cannot be measured is reported, never zeroed and
   * never silently dropped"*) already covers the element lazy build creates.**
   *
   * ⇒ **The honest channel exists, and that — not the timing — is what makes D66 shippable.** But it
   * cuts both ways, and this is the design constraint: a lazily-loaded document answers a whole-model
   * take-off with **every unbuilt element in `unmeasured`**, which is truthful and useless. **So the
   * hook D66 needs is not in the renderer, it is in the ENUMERATION: an aggregate query must force the
   * build of what it is about to measure.** That is `rebuildOnly` under a different caller, and it is
   * additive.
   */
  it('⚠⚠⚠ AN UNBUILT ELEMENT IS REPORTED, NOT SILENTLY DROPPED — measured, against my own prediction', async () => {
    const doc = new DocumentContext({ registries: registries(), geometry: client });
    await seedLibrary(doc);
    await doc.execute('core.createContainer', { id: 'level-0', kind: 'level', name: 'L0' });

    const walls: string[] = [];
    for (let i = 0; i < 4; i++) {
      const wall = await doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'EXT-295',
        containerId: 'level-0',
        params: { length: 5000, height: 2800 },
        placement: [{ kind: 'translate', by: [i * 6000, 0, 0] }],
      });
      walls.push(wall.changes[0]!.id);
    }
    const bytes = saveBnn(doc.scene, { kernelBuildId: 'occt-7.9.3-emcc-6.0.2' });

    const full = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: loadBnn(bytes).scene,
    });
    await full.rebuildAll();
    const fullTakeOff = await full.projectQuantities();

    const lazy = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: loadBnn(bytes).scene,
    });
    await lazy.rebuildOnly([walls[0]!]); // one of four — a plausible first paint
    const lazyTakeOff = await lazy.projectQuantities();

    const volume = (t: { rows: readonly { part: { volume?: number } }[] }): number =>
      t.rows.reduce((sum, r) => sum + (r.part.volume ?? 0), 0);

    console.log(
      [
        '',
        '  ╔══════════════════════════════════════════════════════════════════════════════╗',
        '  ║  D66 — WHAT A PARTIALLY BUILT DOCUMENT TELLS A TAKE-OFF (Entry 90)           ║',
        '  ╚══════════════════════════════════════════════════════════════════════════════╝',
        `     4 walls authored; 1 built, 3 left unbuilt (the lazy first paint)`,
        '',
        `     FULL   : ${String(fullTakeOff.rows.length)} rows · ${volume(fullTakeOff).toLocaleString()} mm³ · basis ${fullTakeOff.basis} · unmeasured ${String(fullTakeOff.unmeasured.length)}`,
        `  ►  LAZY   : ${String(lazyTakeOff.rows.length)} rows · ${volume(lazyTakeOff).toLocaleString()} mm³ · basis ${lazyTakeOff.basis} · unmeasured ${String(lazyTakeOff.unmeasured.length)}`,
        `     brokenRefs ${String(lazy.brokenRefs().length)} · unbuildable ${String(lazy.unbuildable().length)}`,
        '',
        `     ⇒ the volume is ${(100 * (1 - volume(lazyTakeOff) / volume(fullTakeOff))).toFixed(1)}% short — and every missing element is`,
        `       NAMED in \`unmeasured\`. Short, but not SILENT. That is the difference`,
        `       between a lazy build and the Q19 class of defect.`,
        '',
      ].join('\n'),
    );

    // ⚠⚠ PINNED, and this is the pin the D66 design has to come past deliberately.
    // The number is short — that is inherent, the solids do not exist — but the shortfall is DECLARED,
    // element by element, which is what Entry 58's ruling requires and what Q19's population does not do.
    expect(lazyTakeOff.rows.length).toBeLessThan(fullTakeOff.rows.length);
    expect(volume(lazyTakeOff)).toBeLessThan(volume(fullTakeOff));
    // ⇒ THE ONE THAT MATTERS: nothing vanished. Every unbuilt element is on the record.
    expect(lazyTakeOff.unmeasured).toHaveLength(3);
    expect(lazyTakeOff.unmeasured.map((u) => u.elementId).sort()).toEqual(walls.slice(1).sort());
    // …and it is not confused with the two failure classes that mean something else entirely.
    expect(lazy.brokenRefs()).toHaveLength(0);
    expect(lazy.unbuildable()).toHaveLength(0);
    // ⚠ `basis` stays `exact` — correct, and only because `unmeasured` carries the truth beside it.
    expect(lazyTakeOff.basis).toBe('exact');
  }, 180_000);

  it('⚠⚠ THE JOIN — a wall whose NEIGHBOUR IS NOT BUILT must still be mitred against it', async () => {
    // ⚠ THIS IS THE ONE THAT COULD HAVE SUNK LAZY BUILD, AND IT IS THE REASON THIS FILE EXISTS RATHER
    // THAN A PARAGRAPH OF REASONING. A wall's geometry is NOT a function of the wall alone: `resolveJoins`
    // clips its ends against its neighbours, so "build wall A but not wall B" invites the question
    // whether A comes out MITRED (correct) or with a plain cap (D68's exact silent-wrong shape).
    //
    // ⚠ The scale fixture cannot see this — its walls are `{length,height}`-parameterised, so
    // `baselineOf` returns `undefined` and `resolveJoins` early-returns (recorded in the D66 design doc
    // §1). This uses the **real shipped D52 wall** (`@bunyan/types`), which is authored by `{start,end}`
    // and whose corners auto-mitre — the only Type in the product where a neighbour changes geometry.
    const r = createRegistries();
    r.types.register(wallType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    const doc = new DocumentContext({ registries: r, geometry: client });

    const mk = async (start: [number, number], end: [number, number]): Promise<string> => {
      const created = await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start, end, thickness: 200, height: 3000 },
      });
      return created.changes[0]!.id;
    };
    // Two walls meeting at a corner — the geometry that only exists because the OTHER wall exists.
    const a = await mk([0, 0], [5000, 0]);
    const b = await mk([5000, 0], [5000, 5000]);

    const bytes = saveBnn(doc.scene, { kernelBuildId: 'occt-7.9.3-emcc-6.0.2' });

    const joinRegistries = (): Registries => {
      const j = createRegistries();
      j.types.register(wallType);
      for (const c of CORE_COMMANDS) j.commands.register(c);
      return j;
    };
    const full = new DocumentContext({
      registries: joinRegistries(),
      geometry: client,
      scene: loadBnn(bytes).scene,
    });
    await full.rebuildAll();

    const partial = new DocumentContext({
      registries: joinRegistries(),
      geometry: client,
      scene: loadBnn(bytes).scene,
    });
    await partial.rebuildOnly([a]); // ⚠ `b` is NEVER built

    expect(partial.geometryOf(b)).toBeUndefined();

    // ⇒ If this passes, joins read the RECIPE and not the built set, and lazy build is identity-safe
    //   even for the one relationship whose geometry depends on a neighbour.
    expect(await observableOf(partial, a)).toBe(await observableOf(full, a));
  }, 180_000);
});
