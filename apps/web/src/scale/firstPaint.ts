// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ THE LAZY FIRST-PAINT INSTRUMENT (D66 §3b, T-006) — `first-paint.html`, in a real browser.
 *
 * Time-to-first-pixel of an opened `.bnn`, two ways, from the SAME bytes on a fresh kernel each:
 *   • `all`  — `rebuildAll()`, then draw everything (what `bootstrap()` did before T-006);
 *   • `lazy` — `buildKeepLive` (what `App` does now), stopping the clock when its first batch is drawn.
 * The camera is the real `Viewport`'s default, and the set is computed from its real frustum.
 *
 * The fixture is T-018's (`tests/d66-lazy-build-measure.test.ts`): 8 storeys × (a 4-wall ring, 4 free
 * partitions, 3 doors) = 88 elements, each storey's ring offset 60 m in plan. Each cold load first runs
 * one throwaway create+undo, so neither mode pays the kernel's warm-up, which is T-018's method too.
 *
 * Results are printed and parked on `window.__firstPaintResults`. The fixture is also written to the
 * app's store as `doc/d66-fixture.bnn`, so the real app can open it. No wall-clock assertion anywhere.
 */

import { loadBnn, saveBnn } from '@bunyan/document';
import type { DocumentContext } from '@bunyan/document';

import { bootstrap } from '../bootstrap';
import type { BunyanApp } from '../bootstrap';
import { Viewport } from '../render/Viewport';
import type { RenderPart } from '../render/RenderPart';
import { buildKeepLive } from '../view/keepLive';
import { createStore, docKey } from '../storage/documentStorage';

const LEVELS = 8;
const STOREY = 3200;
const LEVEL_DX = 60_000;
const REPS = 3;

interface Run {
  readonly mode: 'all' | 'lazy';
  readonly firstPaintMs: number;
  readonly elementsBuilt: number;
  readonly solidsBuilt: number;
}

async function author(doc: DocumentContext): Promise<void> {
  await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
  await doc.execute('core.createContainer', {
    id: 'block',
    kind: 'building',
    name: 'Block A',
    parentId: 'site',
  });
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
      [ox + 8000, 0],
      [ox + 8000, 6000],
      [ox, 6000],
    ];
    const ring: string[] = [];
    for (let i = 0; i < 4; i++) {
      const edit = await doc.execute('core.createElement', {
        typeId: 'core.wall',
        containerId: levelId,
        params: {
          start: corners[i]!,
          end: corners[(i + 1) % 4]!,
          thickness: 200,
          height: 3000,
        },
      });
      ring.push(edit.changes[0]!.id);
    }
    for (let i = 0; i < 4; i++) {
      const y = 2000 + i * 600;
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        containerId: levelId,
        params: { start: [ox + 2000, y], end: [ox + 3500, y], thickness: 200, height: 3000 },
      });
    }
    const hostFace = doc.partsOf(ring[0]!)![0]!.refs.find((r) => r.includes('/face/lateral.1'))!;
    for (let i = 0; i < 3; i++) {
      await doc.execute('core.createElement', {
        typeId: 'core.opening',
        hostId: ring[0]!,
        hostRef: hostFace,
        params: { width: 900, height: 2100, offsetU: 1500 + i * 2000, offsetV: 0 },
      });
    }
  }
}

function partsOf(doc: DocumentContext): RenderPart[] {
  const out: RenderPart[] = [];
  for (const id of Object.keys(doc.scene.elements)) {
    for (const part of doc.partsOf(id) ?? []) {
      out.push({
        elementId: id,
        nodeId: part.nodeId,
        partName: part.name,
        handle: part.handle,
        color: 0x9aa5b1,
      });
    }
  }
  return out;
}

const frame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });

async function coldRun(bytes: Uint8Array, mode: Run['mode'], host: HTMLElement): Promise<Run> {
  const app: BunyanApp = await bootstrap({ scene: loadBnn(bytes).scene });
  const canvas = document.createElement('canvas');
  canvas.style.width = '1280px';
  canvas.style.height = '800px';
  host.replaceChildren(canvas);
  const viewport = new Viewport(canvas, app.render);
  viewport.resize(1280, 800);
  try {
    // Warm-up: one throwaway element far from the model, created and undone.
    await app.doc.execute('core.createElement', {
      typeId: 'core.wall',
      params: { start: [-90_000, 0], end: [-89_000, 0], thickness: 100, height: 1000 },
    });
    await app.doc.undo();

    const started = performance.now();
    let firstPaintMs: number;
    if (mode === 'all') {
      await app.doc.rebuildAll();
      await viewport.setScene(partsOf(app.doc));
      await frame();
      firstPaintMs = performance.now() - started;
    } else {
      let painted: Promise<number> | undefined;
      await buildKeepLive(app.doc, viewport.view(), [], () => {
        painted ??= viewport
          .setScene(partsOf(app.doc))
          .then(frame)
          .then(() => performance.now() - started);
      });
      firstPaintMs = await (painted ?? Promise.resolve(Number.NaN));
    }
    const built = Object.keys(app.doc.scene.elements).filter((id) => app.doc.partsOf(id));
    return {
      mode,
      firstPaintMs,
      elementsBuilt: built.length,
      solidsBuilt: built.reduce((n, id) => n + (app.doc.partsOf(id)?.length ?? 0), 0),
    };
  } finally {
    viewport.dispose();
    app.dispose();
  }
}

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};

export async function measureFirstPaint(
  host: HTMLElement,
  log: (line: string) => void,
): Promise<unknown> {
  const seed = await bootstrap();
  let bytes: Uint8Array;
  let elements: number;
  try {
    await author(seed.doc);
    elements = Object.keys(seed.doc.scene.elements).length;
    bytes = saveBnn(seed.doc.scene, { kernelBuildId: seed.kernel.buildId });
  } finally {
    seed.dispose();
  }
  await createStore().write(docKey('d66-fixture'), bytes);
  log(`fixture: ${String(elements)} elements, ${String(bytes.byteLength)} bytes`);

  const runs: Run[] = [];
  for (let rep = 0; rep < REPS; rep++) {
    for (const mode of rep % 2 === 0 ? (['all', 'lazy'] as const) : (['lazy', 'all'] as const)) {
      const run = await coldRun(bytes, mode, host);
      runs.push(run);
      log(
        `${mode}: first paint ${run.firstPaintMs.toFixed(0)} ms, ` +
          `${String(run.elementsBuilt)} elements / ${String(run.solidsBuilt)} solids built`,
      );
    }
  }
  const all = median(runs.filter((r) => r.mode === 'all').map((r) => r.firstPaintMs));
  const lazy = median(runs.filter((r) => r.mode === 'lazy').map((r) => r.firstPaintMs));
  const lazyBuilt = runs.find((r) => r.mode === 'lazy')!.elementsBuilt;
  const results = {
    elements,
    runs,
    medianAllMs: all,
    medianLazyMs: lazy,
    firstPaintRemoved: 1 - lazy / all,
    elementsDeferred: 1 - lazyBuilt / elements,
    userAgent: navigator.userAgent,
  };
  log(
    `median first paint: all ${all.toFixed(0)} ms, lazy ${lazy.toFixed(0)} ms ⇒ ` +
      `${(results.firstPaintRemoved * 100).toFixed(1)} % removed; ` +
      `${(results.elementsDeferred * 100).toFixed(1)} % of elements deferred`,
  );
  return results;
}
