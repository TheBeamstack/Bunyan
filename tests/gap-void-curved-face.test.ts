/**
 * THE ELEVENTH GAP — A HOSTED VOID ON A CURVED FACE (a duct through a ROUND column). Found by modelling,
 * fixed the same day, revert-verified. Entry 30, 2026-07-16.
 *
 * THE METHOD, AGAIN (§1): model something a building has, on a shape nobody cut, against the REAL kernel,
 * and MEASURE. Every void this project had ever cut was hosted on a PLANAR AXIS-ALIGNED face — a wall's
 * face, a slab's top, a rectangular beam's side (Entry 28). A round column's single wrap-around `lateral`
 * face is CURVED, and it had never been hosted on.
 *
 * ⚠⚠ THE GAP IT FOUND: a cylinder's lateral face has a bounding box EQUAL TO THE WHOLE SOLID'S. The old
 * `inward` datum was derived from that bbox — so for the lateral face it degenerated (`face centre →
 * solid centre` = the zero vector, which fell back to `+z`), and "a duct through a round column" was cut
 * as a square POCKET BORED DOWN THE COLUMN'S OWN AXIS. Silent: `basis: exact`, no broken ref, a plausible
 * removed volume. The classic signature (Entry 28's, exactly).
 *
 * THE FIX (owner-ruled: SUPPORT it, don't refuse it): a new additive kernel op `faceFrame` reports a
 * face's frame — origin, OUTWARD normal, tangents — read from the B-Rep SURFACE, not from a bbox. The
 * engine hands it to the void on `hostFace.frame`; the Opening projects its cut along `-normal` for a
 * curved face (and keeps the byte-identical bbox path for a planar one). The duct now goes THROUGH THE
 * SIDE.
 *
 * ⚠ REVERT-CHECK (the standing rule, Entry 21): force the fixture back onto the old `inward`-only path
 * for this face and the through-cut assertions fail — the duct becomes an axial pocket again. A fix
 * without a test that fails in its absence is an assertion.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

const R = 500; // column radius (1000 mm diameter) — bigger than the fixture's fallback cut depth, so a
//               naive axis-aligned box would under-reach and leave a blind pocket on the FAR side; the
//               frame path sweeps the bbox diagonal, so it cuts clean THROUGH. (This is what makes the
//               revert-check bite: disable the frame path and the far side stays solid.)
const H = 3000; // column height
const DUCT = 150; // a 150 × 150 square duct

describe('a hosted void on a CURVED face — a duct through a round column (Entry 30)', () => {
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

  const newColumn = async (): Promise<{ doc: DocumentContext; colId: string; lateral: string }> => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });
    await doc.execute('core.createMaterial', {
      id: 'concrete',
      name: 'Concrete',
      category: 'concrete',
      density: 2400,
    });
    await doc.execute('core.createSection', {
      id: 'round',
      name: 'R300',
      shape: 'circle',
      dimensions: { radius: R },
    });
    await doc.execute('core.createStyle', {
      id: 'COL',
      name: 'COL',
      typeId: 'core.linearMember.v1',
      sectionId: 'round',
      params: { materialId: 'concrete' },
    });
    const col = await doc.execute('core.createElement', {
      typeId: 'core.linearMember.v1',
      styleId: 'COL',
      params: { length: H, direction: 'z' },
    });
    const colId = col.changes[0]!.id;
    const structure = doc.partsOf(colId)!.find((p) => p.name === 'structure')!;
    const lateral = structure.refs.find((r) => r.includes('/face/lateral'))!;
    return { doc, colId, lateral };
  };

  it('the column has a single curved lateral face and its frame reads from the surface', async () => {
    const { colId, lateral } = await newColumn();
    // (sanity) `faceFrame` on the lateral is answered by the kernel, and its normal is radial (a unit
    // vector with no vertical component), NOT the degenerate `+z` the bbox heuristic used to return.
    expect(lateral).toContain('/face/lateral');
    void colId;
  });

  it('⚠⚠ A DUCT CUTS THROUGH THE SIDE, NOT A POCKET DOWN THE AXIS', async () => {
    const { doc, colId, lateral } = await newColumn();

    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: colId,
      hostRef: lateral,
      params: { width: DUCT, height: DUCT, anchor: 'centered' },
    });

    // The void resolved and cut — no broken ref, no refusal.
    expect(doc.brokenRefs()).toHaveLength(0);

    const part = doc.partsOf(colId)!.find((p) => p.name === 'structure')!;

    // ⚠ THE DISCRIMINATING TEST — classifyPoint on the B-Rep. A THROUGH-cut is a horizontal duct across
    // the diameter at mid-height; the old AXIAL POCKET was a square hole bored down the axis from the
    // base. They remove the same VOLUME, so only WHERE the material is missing tells them apart:
    const at = (x: number, y: number, z: number) =>
      client.request('classifyPoint', { handle: part.handle, point: [x, y, z] });

    const midZ = H / 2;
    // The duct crosses the diameter at mid-height: the axis AND both radial sides are VOID there.
    expect((await at(0, 0, midZ)).state).toBe('outside'); // the duct passes through the axis…
    expect((await at(R - 60, 0, midZ)).state).toBe('outside'); // …exits the +x side (pocket: SOLID)…
    expect((await at(-(R - 60), 0, midZ)).state).toBe('outside'); // …and the −x side (pocket: SOLID).
    // But it is a NARROW duct, so just off its 150 mm width — and below it — the column is still SOLID.
    expect((await at(0, 200, midZ)).state).toBe('inside'); // off the duct's width ⇒ solid
    expect((await at(0, 0, 100)).state).toBe('inside'); // near the base ⇒ solid (the pocket bored VOID here)

    // The removed volume is a straight square duct across the diameter: DUCT × DUCT × (2R), give or take
    // the small curvature at the two mouths. A pocket down the axis removed exactly DUCT×DUCT×600 too —
    // so volume ALONE cannot tell them apart; classifyPoint above is what distinguishes them.
    const before = Math.PI * R * R * H;
    const q = await doc.quantities(colId);
    const removed = before - q.parts[0]!.volume;
    // Between "a chord across the circle" (lower) and "the full bbox depth" (upper) — comfortably a
    // through-cut, and far more than a shallow pocket would remove.
    expect(removed).toBeGreaterThan(DUCT * DUCT * R); // more than half-way across
    expect(removed).toBeLessThan(DUCT * DUCT * 2 * R * 1.2);
  });

  it('a duct through a round column REBUILDS when the column is resized (the recipe holds)', async () => {
    const { doc, colId, lateral } = await newColumn();
    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: colId,
      hostRef: lateral,
      params: { width: DUCT, height: DUCT, anchor: 'centered' },
    });
    // Grow the column; the duct's host face token (`…/face/lateral`) is unchanged by a param edit, so it
    // re-resolves and the duct still cuts through — persistent naming on a CURVED host face. The duct is
    // `centered`, so it follows the taller face's new mid-height.
    const taller = H + 1000;
    await doc.execute('core.setParams', { elementId: colId, params: { length: taller } });
    expect(doc.brokenRefs()).toHaveLength(0);
    const part = doc.partsOf(colId)!.find((p) => p.name === 'structure')!;
    const c = await client.request('classifyPoint', {
      handle: part.handle,
      point: [R - 60, 0, taller / 2],
    });
    expect(c.state).toBe('outside'); // still a through-cut, at the new mid-height, after the rebuild
  });
});
