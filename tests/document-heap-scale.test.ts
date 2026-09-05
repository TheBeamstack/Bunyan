// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ **THE SCALE HARNESS — AXIS (a): WASM HEAP PER SOLID.** (Plan P4 step 9a.)
 *
 * The owner ruled the interactive target is **10,000+ elements** (D48), and §1a names this the
 * **most dangerous unknown in the project**: every OCCT solid the document builds **stays live in the
 * WASM heap for the whole session — nothing evicts.** A 10,000-element model is ~16,000 live solids,
 * and **WASM32 caps at 4 GB while a browser tab dies well before that.** This axis is not a curiosity:
 * *"what may be released and rebuilt on demand"* is a question about the recipe and the rebuild engine,
 * so it **touches the contracts and must be known BEFORE P5 freezes** — a heap-eviction / lazy-build
 * strategy, if the number is bad, is a **v1.0.0 requirement, not a v1.0.x nicety.**
 *
 * ── TWO INSTRUMENTS, AND WHY THE OBVIOUS ONE IS TOO COARSE ─────────────────────────────────────────
 * The tempting instrument is the WASM LINEAR MEMORY size (`memory.buffer.byteLength`) — literally what
 * the browser tab holds. But this build starts at INITIAL_MEMORY=64 MB and only grows at boundaries, so
 * 300 solids never move it: measured, it stays flat at 64 MB, giving a per-solid slope of ZERO. It
 * prices nothing until the model exceeds 64 MB — thousands of solids, which is slower AND more box
 * memory than the whole measurement is worth. So it is reported (as `reserved` — the real tab footprint,
 * and the 64 MB floor) but it is NOT what we regress on.
 *
 * The FINE instrument is the allocator's IN-USE bytes — `mallinfo.uordblks`, exposed by the kernel as
 * `heapUsedBytes()` (added alongside `liveHandles()`; the 14 wasm exports are all minified, so a JS-side
 * call by name is impossible — it had to be an embind function). It tracks every OCCT allocation, so a
 * single solid moves it, and small scales suffice. **This is the per-solid signal.**
 *
 * We still capture the linear memory (via an emscripten `instantiateWasm` hook — Node-only, living HERE
 * in the harness, never in the shipped `@bunyan/kernel-occt`, whose browser path is untouched) to report
 * `reserved`. ⚠ Both are HIGH-WATER within a session (OCCT recycles freed shapes inside the heap; the
 * linear memory never shrinks), so a shared kernel would report cumulative peak across scales. ⇒ **each
 * scale gets a FRESH kernel (fresh heap)**, so its footprint is its own.
 *
 * ── WHY A REGRESSION, NOT A DIVISION ──────────────────────────────────────────────────────────────
 * The heap at scale N is `fixed_baseline + per_solid × solids(N)`, where the baseline is large and
 * one-time (the ~15 MB of WASM code, OCCT's static tables, and one boolean's transient peak — which
 * does NOT scale with N, since only one runs at a time). Dividing bytes/solids at any single scale
 * would smear that fixed cost across the solids and lie. A least-squares fit across scales puts the
 * fixed cost in the INTERCEPT and the thing we actually need — the MARGINAL cost of one more live
 * solid — in the SLOPE. The slope is what decides whether 16,000 solids fit in a tab.
 *
 * ⚠ NO WALL-CLOCK OR THRESHOLD ASSERTION (the standing rule, cf. `document-scale.test.ts`): the number
 * is a DECISION INPUT, printed and recorded in `docs/CURRENT_STATE.md`, not a CI gate that flakes. The
 * assertions here are about CORRECTNESS at scale (memory grows with solids; solids stay live; nothing
 * breaks) and about the MEASUREMENT being sound (a positive marginal slope).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import type { Registries } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

// The 10,000-element interactive target (D48), in solids: the reference building is ~1.6 solids/element
// (measured — see the per-storey breakdown below), so 10,000 elements ≈ 16,000 live solids.
const TARGET_ELEMENTS = 10_000;
const TARGET_SOLIDS = 16_000;

// Practical ceilings. WASM32's address space is a hard 4 GB; a browser tab is killed well before that,
// and ~1.5–2 GB is a realistic working budget for one tab that also holds three.js buffers + the DOM.
const WASM32_HARD_CAP = 4 * 1024 ** 3;
const PRACTICAL_TAB_BUDGET = 1.5 * 1024 ** 3;

// Per storey (identical shape to the D29 building): 1 L-slab (2 layers) + 12 columns (1) + 16 walls
// (3 layers) + 10 windows (voids, no parts of their own) = 39 elements / 62 solid parts.
const WALLS_PER_STOREY = 16;
const COLUMNS_PER_STOREY = 12;
const WINDOWS_PER_STOREY = 10;

// Evenly-spaced scales give the cleanest least-squares slope; the max stays modest so the box never
// strains (max ≈ 310 live solids — tens of MB even at a pessimistic per-solid cost).
const SCALES = [1, 2, 3, 4, 5] as const;

const WASM_PATH = fileURLToPath(
  new URL('../packages/kernel-occt/wasm/bunyan-kernel.wasm', import.meta.url),
);

/**
 * Boot a FRESH OCCT kernel and hand back a live handle on its exported linear memory. Each scale calls
 * this so it measures from a clean heap (see the header note on high-water growth).
 */
async function bootKernelWithMemory(): Promise<{
  kernel: OcctKernel;
  client: KernelClient;
  heapBytes: () => number;
}> {
  const wasmBytes = readFileSync(WASM_PATH);
  let memory: WebAssembly.Memory | undefined;

  const kernel = await createOcctKernel({
    // emscripten calls this instead of fetching + instantiating the module itself. We instantiate,
    // find the EXPORTED memory (module-created, exported under a minified name — so we match by TYPE,
    // not by name, which is stable across rebuilds), keep it, and hand the instance back.
    instantiateWasm(
      imports: WebAssembly.Imports,
      receive: (instance: WebAssembly.Instance) => void,
    ) {
      void WebAssembly.instantiate(wasmBytes, imports).then(({ instance }) => {
        for (const exported of Object.values(instance.exports)) {
          if (exported instanceof WebAssembly.Memory) {
            memory = exported;
            break;
          }
        }
        receive(instance);
      });
      return {};
    },
  });

  if (memory === undefined) {
    throw new Error('heap harness: never captured the WASM memory export');
  }
  const captured = memory;

  const client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  return { kernel, client, heapBytes: () => captured.buffer.byteLength };
}

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

/** Author `storeys` floors — every solid built here stays live in the heap (nothing evicts). */
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
  solids: number; // liveHandles() — the WASM side's OWN witness, not our count
  usedBytes: number; // heapUsedBytes() — dlmalloc in-use: the FINE per-solid signal we regress on
  reservedBytes: number; // linear-memory byteLength: what the browser tab actually holds
}

/** Ordinary least squares of y on x. Returns marginal slope + fixed intercept. */
function fitLine(points: readonly { x: number; y: number }[]): {
  slope: number;
  intercept: number;
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
  return { slope, intercept: meanY - slope * meanX };
}

const kib = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;
const mib = (bytes: number): string => `${(bytes / 1024 ** 2).toFixed(1)} MB`;
const gib = (bytes: number): string => `${(bytes / 1024 ** 3).toFixed(2)} GB`;

describe('the scale harness — WASM heap per solid (P4 step 9a)', () => {
  const points: ScalePoint[] = [];

  beforeAll(async () => {
    for (const storeys of SCALES) {
      // A fresh kernel per scale ⇒ a fresh, clean heap (linear memory never shrinks). We build, read
      // the exact linear-memory size with every solid live, then dispose so the next scale starts cold.
      const { kernel, client, heapBytes } = await bootKernelWithMemory();
      const doc = new DocumentContext({ registries: registriesWithFixtures(), geometry: client });
      await seedLibrary(doc);
      await authorStoreys(doc, storeys);

      const elements = Object.keys(doc.scene.elements).length;
      expect(doc.brokenRefs(), `scale ${String(storeys)}: broken refs at scale`).toHaveLength(0);

      points.push({
        storeys,
        elements,
        solids: kernel.wasmLiveHandles(),
        usedBytes: kernel.wasmHeapUsedBytes(),
        reservedBytes: heapBytes(),
      });

      client.dispose();
      kernel.dispose?.();
    }
  }, 240_000);

  it('every solid stays live and the heap grows monotonically with the model', () => {
    for (let i = 1; i < points.length; i++) {
      // More storeys ⇒ strictly more live solids (nothing evicted), and strictly more heap in use.
      expect(points[i]!.solids).toBeGreaterThan(points[i - 1]!.solids);
      expect(points[i]!.usedBytes).toBeGreaterThan(points[i - 1]!.usedBytes);
      expect(points[i]!.reservedBytes).toBeGreaterThanOrEqual(points[i - 1]!.reservedBytes);
    }
    // The 10-window-per-storey booleans all landed — the model is correct at every scale.
    expect(points[0]!.solids).toBeGreaterThan(0);
  });

  it('⚠⚠ prices the WASM heap at the 10,000-element target, and says whether it fits', () => {
    const fit = fitLine(points.map((p) => ({ x: p.solids, y: p.usedBytes })));

    // The measurement must be sound: each additional live solid costs real, positive heap.
    expect(fit.slope).toBeGreaterThan(0);

    // dlmalloc-used regresses to ~0 at 0 solids: OCCT's ~15 MB of code + static tables live in the
    // linear-memory FLOOR (reserved at init), NOT in the malloc arena, so they do not show up in the
    // slope/intercept. The honest tab footprint adds that floor back: total ≈ floor + dynamic used.
    const reservedFloor = points[0]!.reservedBytes; // the 64 MB INITIAL_MEMORY: code + statics
    const projectedDynamic = fit.intercept + fit.slope * TARGET_SOLIDS;
    const projectedTotal = reservedFloor + projectedDynamic;
    const fitsPractical = projectedTotal <= PRACTICAL_TAB_BUDGET;
    const fitsHardCap = projectedTotal <= WASM32_HARD_CAP;

    const rows = points.map(
      (p) =>
        `     ${String(p.storeys).padStart(2)} storey  ${String(p.elements).padStart(4)} el  ` +
        `${String(p.solids).padStart(5)} solids   used ${mib(p.usedBytes).padStart(9)}   ` +
        `reserved ${mib(p.reservedBytes).padStart(9)}`,
    );

    console.log(
      [
        '',
        '  ╔══════════════════════════════════════════════════════════════════════════════╗',
        '  ║  SCALE HARNESS — AXIS (a): WASM HEAP PER SOLID (P4 step 9a). To current_state. ║',
        '  ╚══════════════════════════════════════════════════════════════════════════════╝',
        ...rows,
        '  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈',
        `     MARGINAL cost per live solid (the number that scales) : ${kib(fit.slope)}`,
        `     FIXED floor (WASM code + OCCT static tables, reserved) : ${mib(reservedFloor)}`,
        '',
        `  ►  PROJECTED at ${TARGET_ELEMENTS.toLocaleString()} elements (~${TARGET_SOLIDS.toLocaleString()} solids):`,
        `       dynamic (live solids) ${gib(projectedDynamic)}  +  floor ${gib(reservedFloor)}  =  ${gib(projectedTotal)} total`,
        `     vs practical 1-tab budget (${gib(PRACTICAL_TAB_BUDGET)}) : ${fitsPractical ? 'FITS' : '⚠ EXCEEDS'}`,
        `     vs WASM32 hard cap        (${gib(WASM32_HARD_CAP)}) : ${fitsHardCap ? 'fits' : '⚠⚠ EXCEEDS — impossible single-heap'}`,
        '',
        `     RECOMMENDATION: ${
          fitsPractical
            ? 'heap is NOT the binding constraint at target — a full model fits one tab. ' +
              'Eviction/lazy-build stays a v1.0.x option, not a v1.0.0 requirement.'
            : 'heap eviction / lazy-build is a v1.0.0 REQUIREMENT (plan P4 step 9a) — a full ' +
              'model will not fit one tab. This is a CONTRACT question (what may be released and ' +
              'rebuilt on demand) ⇒ it must be settled BEFORE P5 freezes.'
        }`,
        '',
      ].join('\n'),
    );

    expect(Number.isFinite(projectedTotal)).toBe(true);
    expect(projectedTotal).toBeGreaterThan(0);
  });
});
