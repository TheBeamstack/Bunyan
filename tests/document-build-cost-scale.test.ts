/**
 * ⚠⚠ **THE SCALE HARNESS — BUILD COST PER ELEMENT (T-004).**
 *
 * `document-scale.test.ts` prices a cold load at **one** size (5 storeys, 195 elements) and divides
 * to get a per-element figure. A single division cannot say whether that figure **holds** at D48's
 * binding 10,000-element target: it reports the average at one size, and an average is flat by
 * construction. Entry 90 measured D66's lazy build on 54 elements and said so in as many words —
 * _"flatness at 54 is not flatness at 10,000."_ This file answers that question with a slope.
 *
 * ── THE INSTRUMENT ────────────────────────────────────────────────────────────────────────────────
 * The cost measured is **a cold load: `rebuildAll()` from `scene.json` with no cache present** — the
 * same act `document-scale.test.ts` times, and exactly what lazy build (D66 §3b) would defer. Whether
 * deferring 64.5% of the elements is worth anything at 10,000 depends entirely on whether the element
 * you defer costs what an element costs today, so this is the number the lazy-build decision turns on.
 *
 * ── WHY A REGRESSION, AND WHY ALSO FINITE DIFFERENCES ─────────────────────────────────────────────
 * Same reasoning as `document-heap-scale.test.ts`, whose least-squares approach this copies: the total
 * is `fixed + marginal × N`, and dividing at a single N smears the fixed cost across the elements. The
 * fit puts the fixed part in the INTERCEPT and the per-element cost in the SLOPE.
 *
 * ⚠ But a least-squares line has a slope whether or not the data is a line, so the fit alone cannot
 * decide flatness — a superlinear curve fits a line with a plausible slope and a bad residual. So the
 * flatness verdict is read off the **finite differences** between consecutive scales,
 * `Δcost / Δelements`, which is the marginal cost measured locally at four sizes. Flat marginals ⇒ the
 * slope extrapolates; rising marginals ⇒ it does not, and the projection is a floor rather than an
 * estimate. R² is reported alongside as the fit's own witness.
 *
 * ⚠ **Each scale gets a FRESH kernel.** The ShapeRegistry and the WASM heap are per-session and only
 * grow, so a shared kernel would have every later scale carrying the earlier ones' live shapes — the
 * measurement would then be of the harness's own history, not of the model's size.
 *
 * ⚠ NO WALL-CLOCK OR THRESHOLD ASSERTION (the standing rule this repo applies to every timing harness):
 * the number is a DECISION INPUT, printed and recorded in `current_state.md §1a`, not a CI gate that
 * flakes on a loaded box. The assertions are about CORRECTNESS at scale and about the MEASUREMENT being
 * sound (a positive marginal slope).
 *
 * ⚠ The measured range is 39–273 elements and the target is 10,000, so the projection is an
 * extrapolation of ~37×. That is stated with the number rather than hidden behind it; the finite
 * differences are what say whether the extrapolation is entitled.
 */

import { describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  createRegistries,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import type { Registries } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

// D48's binding interactive target.
const TARGET_ELEMENTS = 10_000;

// Per storey, the same building `document-scale.test.ts` and `document-heap-scale.test.ts` author:
// 1 L-slab (2 layers) + 12 columns (1) + 16 walls (3 layers) + 10 windows (voids) = 39 elements.
const WALLS_PER_STOREY = 16;
const COLUMNS_PER_STOREY = 12;
const WINDOWS_PER_STOREY = 10;
const ELEMENTS_PER_STOREY = 1 + WALLS_PER_STOREY + COLUMNS_PER_STOREY + WINDOWS_PER_STOREY;

// Four sizes spanning 39–273 elements. Spread wide enough that a curve separates from a line, and
// capped so the box is never strained: one kernel is live at a time and the largest holds ~434 solids.
const SCALES = [1, 3, 5, 7] as const;

function registriesWithFixtures(): Registries {
  const r = createRegistries();
  for (const type of FIXTURE_TYPES) r.types.register(type);
  for (const command of CORE_COMMANDS) r.commands.register(command);
  return r;
}

/** Seed the shared library (materials / sections / styles) and the Site → Tower spatial root. */
async function seedLibrary(doc: DocumentContext): Promise<void> {
  await doc.execute('core.createMaterial', {
    id: 'concrete',
    name: 'C25/30',
    category: 'concrete',
    density: 2400,
    structural: { f_ck: 25, E: 31000 },
  });
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
    id: 'eps',
    name: 'EPS',
    category: 'insulation',
    density: 20,
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
      { name: 'insulation', materialId: 'eps', thickness: 80, discipline: 'architectural' },
    ],
  });
  await doc.execute('core.createStyle', {
    id: 'SLAB-280',
    name: 'SLAB-280',
    typeId: 'core.slab.v1',
    layers: [
      { name: 'structure', materialId: 'concrete', thickness: 250, discipline: 'structural' },
      { name: 'finish.floor', materialId: 'plaster', thickness: 30, discipline: 'architectural' },
    ],
  });
  await doc.execute('core.createStyle', {
    id: 'COL-400',
    name: 'COL-400',
    typeId: 'core.linearMember.v1',
    sectionId: 'RECT-400x400',
    params: { materialId: 'concrete' },
  });
  await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
  await doc.execute('core.createContainer', {
    id: 'tower-a',
    kind: 'building',
    name: 'Tower A',
    parentId: 'site',
  });
}

/** Author `storeys` floors of the reference building. */
async function authorStoreys(doc: DocumentContext, storeys: number): Promise<void> {
  for (let storey = 0; storey < storeys; storey++) {
    const levelId = `level-${String(storey)}`;
    await doc.execute('core.createContainer', {
      id: levelId,
      kind: 'level',
      name: `Level ${String(storey)}`,
      parentId: 'tower-a',
      elevation: storey * 3200,
    });

    await doc.execute('core.createElement', {
      typeId: 'core.slab.v1',
      styleId: 'SLAB-280',
      containerId: levelId,
      params: {
        boundary: [
          [0, 0],
          [24_000, 0],
          [24_000, 12_000],
          [12_000, 12_000],
          [12_000, 18_000],
          [0, 18_000],
        ],
      },
    });

    for (let i = 0; i < COLUMNS_PER_STOREY; i++) {
      await doc.execute('core.createElement', {
        typeId: 'core.linearMember.v1',
        styleId: 'COL-400',
        containerId: levelId,
        params: { length: 3200, direction: 'z' },
        placement: [
          { kind: 'translate', by: [(i % 4) * 6000, Math.floor(i / 4) * 6000, storey * 3200] },
        ],
      });
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
          ...(rotated ? [{ kind: 'rotate' as const, axis: [0, 0, 1] as const, degrees: 90 }] : []),
          {
            kind: 'translate' as const,
            by: [(i % 4) * 6000, Math.floor(i / 4) * 6000, storey * 3200] as const,
          },
        ],
      });
      wallIds.push(wall.changes[0]!.id);
    }

    for (let i = 0; i < WINDOWS_PER_STOREY; i++) {
      const wallId = wallIds[i]!;
      await doc.execute('core.createElement', {
        typeId: 'core.opening.v1',
        hostId: wallId,
        hostRef: `${wallId}.finish.interior/face/y-min#0`,
        params: { width: 1200, height: 1400, offsetU: 1500, offsetV: 900 },
      });
    }
  }
}

interface ScalePoint {
  storeys: number;
  elements: number;
  solids: number;
  authoringMs: number;
  coldMs: number;
}

/** Ordinary least squares of y on x, plus the fit's own R². */
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
 * Build one scale end to end on a kernel of its own: author, save, then time a cold `rebuildAll()`
 * from `scene.json` alone.
 */
async function measureScale(storeys: number): Promise<ScalePoint> {
  const kernel = await createOcctKernel();
  const client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  try {
    const doc = new DocumentContext({ registries: registriesWithFixtures(), geometry: client });
    await seedLibrary(doc);

    const authoringStarted = performance.now();
    await authorStoreys(doc, storeys);
    const authoringMs = performance.now() - authoringStarted;

    const elements = Object.keys(doc.scene.elements).length;
    const solids = Object.keys(doc.scene.elements).reduce(
      (total, id) => total + (doc.partsOf(id)?.length ?? 0),
      0,
    );
    expect(elements, `scale ${String(storeys)}: element count`).toBe(storeys * ELEMENTS_PER_STOREY);
    expect(doc.brokenRefs(), `scale ${String(storeys)}: broken refs after authoring`).toHaveLength(
      0,
    );

    const bytes = saveBnn(doc.scene, { kernelBuildId: 'occt-7.9.3-emcc-6.0.2' });
    const cold = new DocumentContext({
      registries: registriesWithFixtures(),
      geometry: client,
      scene: loadBnn(bytes).scene,
    });

    const started = performance.now();
    await cold.rebuildAll();
    const coldMs = performance.now() - started;

    // The cost is only comparable across scales if every scale actually built the whole building.
    expect(Object.keys(cold.scene.elements), `scale ${String(storeys)}: reloaded`).toHaveLength(
      elements,
    );
    expect(cold.brokenRefs(), `scale ${String(storeys)}: broken refs after cold load`).toHaveLength(
      0,
    );
    // ⚠ COUNT THE SOLIDS THE COLD CONTEXT ACTUALLY BUILT, and require the authored count. A
    // per-element `state !== 'failed'` check cannot do this job: `geometryOf` returns `undefined`
    // for an element that was never built at all, and `undefined !== 'failed'` passes — so a cold
    // load that built NOTHING satisfied it, leaving the sign of a noise-level slope as the only
    // thing standing between this harness and timing an empty measurement.
    const coldSolids = Object.keys(cold.scene.elements).reduce(
      (total, id) => total + (cold.partsOf(id)?.length ?? 0),
      0,
    );
    expect(coldSolids, `scale ${String(storeys)}: solids built by the cold load`).toBe(solids);
    for (const id of Object.keys(cold.scene.elements)) {
      expect(
        cold.geometryOf(id)?.state,
        `scale ${String(storeys)}: ${id} did not rebuild`,
      ).not.toBe('failed');
    }

    return { storeys, elements, solids, authoringMs, coldMs };
  } finally {
    client.dispose();
    kernel.dispose?.();
  }
}

const ms = (value: number): string => `${value.toFixed(0)} ms`;

describe('the scale harness — build cost per element (T-004)', () => {
  it('⚠⚠ prices ONE MORE ELEMENT, and says whether that price holds at the 10,000 target', async () => {
    const points: ScalePoint[] = [];
    for (const storeys of SCALES) points.push(await measureScale(storeys));

    // Correctness at scale: more storeys ⇒ strictly more elements, more solids, and more work.
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.elements).toBeGreaterThan(points[i - 1]!.elements);
      expect(points[i]!.solids).toBeGreaterThan(points[i - 1]!.solids);
    }

    const fit = fitLine(points.map((p) => ({ x: p.elements, y: p.coldMs })));

    // The measurement must be sound: one more element costs real, positive time.
    expect(fit.slope).toBeGreaterThan(0);

    // The flatness verdict — the marginal cost measured LOCALLY between consecutive scales, which is
    // what a line fitted to a curve cannot tell you.
    const marginals = points.slice(1).map((p, i) => {
      const previous = points[i]!;
      return {
        from: previous.elements,
        to: p.elements,
        msPerElement: (p.coldMs - previous.coldMs) / (p.elements - previous.elements),
      };
    });
    const lowest = Math.min(...marginals.map((m) => m.msPerElement));
    const highest = Math.max(...marginals.map((m) => m.msPerElement));
    // Spread of the local marginals, as a fraction of the smallest. Flat data keeps this small; a
    // superlinear curve blows it up, because the last interval prices far above the first.
    const spread = highest / lowest - 1;

    const projectedMs = fit.intercept + fit.slope * TARGET_ELEMENTS;

    const rows = points.map(
      (p) =>
        `     ${String(p.storeys).padStart(2)} storey  ${String(p.elements).padStart(4)} el  ` +
        `${String(p.solids).padStart(4)} solids   authoring ${ms(p.authoringMs).padStart(9)}   ` +
        `COLD ${ms(p.coldMs).padStart(9)}   ${(p.coldMs / p.elements).toFixed(1)} ms/el (avg)`,
    );
    const marginalRows = marginals.map(
      (m) =>
        `     ${String(m.from).padStart(4)} → ${String(m.to).padStart(4)} el : ` +
        `${m.msPerElement.toFixed(2)} ms per additional element`,
    );

    console.log(
      [
        '',
        '  ╔══════════════════════════════════════════════════════════════════════════════╗',
        '  ║  SCALE HARNESS — BUILD COST PER ELEMENT (T-004). To current_state.md §1a.    ║',
        '  ╚══════════════════════════════════════════════════════════════════════════════╝',
        ...rows,
        '  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈',
        '     LOCAL MARGINALS (the flatness verdict — a fitted line cannot give this):',
        ...marginalRows,
        `     spread across the intervals : ${(spread * 100).toFixed(1)}%  ⇒  ${
          spread <= 0.25 ? 'FLAT' : '⚠ NOT FLAT — the cost per element RISES with model size'
        }`,
        '  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈',
        `     LEAST-SQUARES FIT of cold-load ms on element count (${String(points.length)} points):`,
        `       marginal cost per element (the SLOPE)      : ${fit.slope.toFixed(2)} ms`,
        `       fixed cost (the INTERCEPT)                 : ${ms(fit.intercept)}`,
        `       R²                                          : ${fit.r2.toFixed(4)}`,
        '',
        `  ►  PROJECTED cold load at ${TARGET_ELEMENTS.toLocaleString()} elements:`,
        `       ${ms(projectedMs)}  =  ${(projectedMs / 60_000).toFixed(2)} min`,
        `     ⚠ measured 39–${String(points[points.length - 1]!.elements)} elements, projected to ` +
          `${TARGET_ELEMENTS.toLocaleString()} — an extrapolation of ` +
          `${(TARGET_ELEMENTS / points[points.length - 1]!.elements).toFixed(0)}×. The local ` +
          `marginals above are what entitle it.`,
        '',
      ].join('\n'),
    );

    expect(Number.isFinite(projectedMs)).toBe(true);
    expect(projectedMs).toBeGreaterThan(0);
  }, 600_000);
});
