// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ **THE D29 MEASUREMENT.** The owner deferred the `geometry-cache.brep` ship/drop call to *this*
 * moment — "**decide at P3 step 4, WITH the measured rebuild cost of a real model in hand**" — because
 * the only thing the cache buys is **load time on a real building**, and that number could not exist
 * until the document model did.
 *
 * It now does. So this file builds a realistic building and times the thing the cache would replace:
 *
 *     A COLD LOAD THAT REBUILDS EVERY SOLID FROM `scene.json`, WITH NO CACHE PRESENT.
 *
 * That is the whole decision:
 *   - **fast enough to hide behind a splash ⇒ DROP THE CACHE.** It deletes the serializer, the
 *     staleness path, AND an entire attack surface (a `.bnn` is a file a user can be *sent*, and the
 *     `.brep` is the one part fed as binary into OCCT's deserializer).
 *   - **not fast enough ⇒ BUILD IT** (`BRepTools::Write`/`Read`) and own the hostile-BREP hardening.
 *
 * ⚠ It is also a second stakeholder's problem, and that is new evidence: **Miqdar writes `.bnn` and
 * has a solver, not an OCCT kernel — it CANNOT produce a geometry cache even in principle.** So "the
 * loader must work with no cache present" is not merely Bunyan's internal invariant; it is a hard
 * requirement from a second product, and it is an argument for never building the thing at all.
 *
 * ⚠ NOTE THERE IS NO TIMING ASSERTION HERE. A wall-clock threshold in CI is a flake generator, and the
 * number this file exists to produce is a **decision input**, not a gate. The assertions are about
 * CORRECTNESS at scale; the timing is printed, and recorded in `current_state.md` where the ruling is.
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
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

const STOREYS = 5;
const WALLS_PER_STOREY = 16;
const COLUMNS_PER_STOREY = 12;
const WINDOWS_PER_STOREY = 10;

describe('a realistic building — the D29 measurement', () => {
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

  it('⚠⚠ A FIVE-STOREY BUILDING REBUILDS FROM scene.json ALONE — and here is what it costs (D29)', async () => {
    const doc = new DocumentContext({ registries: registries(), geometry: client });

    // ---- The library: materials, sections, styles. -------------------------------------------
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

    // ---- The spatial tree (D35): Site → Tower A → five levels. -------------------------------
    await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
    await doc.execute('core.createContainer', {
      id: 'tower-a',
      kind: 'building',
      name: 'Tower A',
      parentId: 'site',
    });

    const authoring = performance.now();

    for (let storey = 0; storey < STOREYS; storey++) {
      const levelId = `level-${String(storey)}`;
      await doc.execute('core.createContainer', {
        id: levelId,
        kind: 'level',
        name: `Level ${String(storey)}`,
        parentId: 'tower-a',
        elevation: storey * 3200,
      });

      // The floor plate: an L-shaped slab — because a real one is, and a box cannot be one.
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
        // Half the walls are rotated — a building is not axis-aligned, and `transform` is the op
        // that says so. Openings are still cut in each wall's OWN frame (D25).
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

    const authoringMs = performance.now() - authoring;

    const elements = Object.keys(doc.scene.elements).length;
    const parts = Object.keys(doc.scene.elements).reduce(
      (total, id) => total + (doc.partsOf(id)?.length ?? 0),
      0,
    );
    expect(elements).toBe(
      STOREYS * (1 + COLUMNS_PER_STOREY + WALLS_PER_STOREY + WINDOWS_PER_STOREY),
    );
    expect(doc.brokenRefs()).toHaveLength(0);

    // ---- SAVE. This is the whole building, as text. -------------------------------------------
    const bytes = saveBnn(doc.scene, { kernelBuildId: 'occt-7.9.3-emcc-6.0.2' });

    // ---- ⚠⚠ THE MEASUREMENT: A COLD LOAD, NO CACHE, EVERY SOLID REBUILT FROM THE RECIPE. -----
    const loaded = loadBnn(bytes);
    const cold = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: loaded.scene,
    });

    const started = performance.now();
    await cold.rebuildAll();
    const coldLoadMs = performance.now() - started;

    // ---- It came back. Every element, every part, every reference. ---------------------------
    expect(Object.keys(cold.scene.elements)).toHaveLength(elements);
    expect(cold.brokenRefs()).toHaveLength(0);
    for (const id of Object.keys(cold.scene.elements)) {
      const geometry = cold.geometryOf(id);
      expect(geometry?.state, `element ${id} did not rebuild`).not.toBe('failed');
    }

    console.log(
      [
        '',
        '  ╔══════════════════════════════════════════════════════════════════════════╗',
        '  ║  D29 — THE MEASUREMENT (P3 step 4). Recorded in current_state.md.        ║',
        '  ╚══════════════════════════════════════════════════════════════════════════╝',
        `     building        : ${String(STOREYS)} storeys, ${String(elements)} elements, ${String(parts)} solids (parts)`,
        `     .bnn size       : ${(bytes.length / 1024).toFixed(1)} KB zipped`,
        `     authoring       : ${authoringMs.toFixed(0)} ms  (incremental, one rebuild per command)`,
        `  ►  COLD LOAD       : ${coldLoadMs.toFixed(0)} ms  ← EVERY SOLID REBUILT FROM scene.json, NO CACHE`,
        `     per element     : ${(coldLoadMs / elements).toFixed(1)} ms`,
        '',
      ].join('\n'),
    );

    expect(coldLoadMs).toBeGreaterThan(0);
  }, 180_000);
});
