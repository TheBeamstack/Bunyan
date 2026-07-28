/**
 * ⚠⚠ DOMAIN RULE 15, THE SECOND HALF OF D72 — *"a quantity must also be the RIGHT MEASUREMENT."* Real
 * OCCT, headless.
 *
 * **WHAT THIS FILE CLOSES.** D72 (Entry 60) reserved `BuiltPart.exposedRefs?`, proved the mechanism on
 * `core.wall`, and recorded in writing that **every other shipped Type still owed its declaration** —
 * so until this file those parts reported the solid's **TOTAL ENCLOSING SURFACE**, the number that came
 * to 94.80 m² on a 15 m² paintable wall face. Measured before the fix (2026-07-27):
 *
 * ```
 *   part                          reported     exposed     over-report
 *   door leaf   800×2000×40        3.4240      3.2000        1.07×
 *   door frame  (lining)           2.9000      1.7000        1.71×
 *   curtain panel 1950×1450        5.8182      5.6550        2.06×   (vs one pane face)
 *   mullion     50×100×3000        0.9100      0.3000        3.03×
 * ```
 *
 * ⚠ **THE RULE IS ONE RULE (owner-ruled 2026-07-27): *exposed = every face that is a surface of the
 * assembled thing.*** Not a per-type convention — the same sentence that already governed `core.wall`
 * (both outer faces of the stack; buried inter-layer faces, end caps and top/bottom excluded), read
 * against each type's own geometry. The glazing case was the one that could have gone either way — a
 * QS bills glass by the single pane — and the owner chose the assembly rule, so a panel reports both
 * faces and pane supply stays derivable as half of it.
 *
 * ⚠ **REVERT-VERIFY (§1b):** delete an `exposedRefs:` line from `opening.ts` / `curtainwall.ts` and the
 * matching assertion here fails with the whole-solid number. Measured failing first — every `expect`
 * below was run against the undeclared code and reported the "reported" column above.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import type { Registries } from '@bunyan/document';
import {
  curtainWallColumnType,
  curtainWallMullionType,
  curtainWallPanelType,
  curtainWallType,
  openingType,
  wallType,
} from '@bunyan/types';

const M2 = 1e6;

/* Door (mm). Leaf = width − 2·frame by height − 2·frame; frame lines the wall's full 200 depth. */
const DW = 900;
const DH = 2100;
const FRAME = 50;
const LEAF_T = 40;
const LEAF_W = DW - 2 * FRAME; // 800
const LEAF_H = DH - 2 * FRAME; // 2000
const WALL_T = 200;

/* Curtain wall (mm). 6000 × 3000, 2 rows × 3 cols ⇒ cell 2000 × 1500. */
const CW_W = 6000;
const CW_H = 3000;
const ROWS = 2;
const COLS = 3;
const DEPTH = 100;
const MW = 50;
const PT = 24;
const PANEL_W = CW_W / COLS - MW; // 1950
const PANEL_H = CW_H / ROWS - MW; // 1450

describe('D72 — the OWED `exposedRefs` declarations: a door bills its door', () => {
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

  const doorInWall = async (): Promise<{ doc: DocumentContext; door: string; wall: string }> => {
    const r = createRegistries();
    r.types.register(wallType);
    r.types.register(openingType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    const doc = new DocumentContext({ registries: r, geometry: client });

    const wall = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end: [5000, 0], thickness: WALL_T, height: 3000 },
      })
    ).changes[0]!.id;
    const hostFace = doc.partsOf(wall)![0]!.refs.find((x) => x.includes('/face/lateral.1'))!;
    const door = (
      await doc.execute('core.createElement', {
        typeId: 'core.opening',
        hostId: wall,
        hostRef: hostFace,
        params: {
          width: DW,
          height: DH,
          offsetU: 2500,
          offsetV: 0,
          leafThickness: LEAF_T,
          frameWidth: FRAME,
        },
      })
    ).changes[0]!.id;
    return { doc, door, wall };
  };

  it('⚠⚠ a door LEAF bills its two faces — 3.20 m², not the 3.4240 m² that counted its four edges', async () => {
    const { doc, door } = await doorInWall();
    const q = await doc.quantities(door);
    const leaf = q.parts.find((p) => p.name === 'leaf')!;

    // The two large faces a painter rolls. Measured failing first at 3.4240 — the whole solid, which
    // added the four narrow edges that sit INSIDE the frame and are a surface of nothing.
    expect(leaf.area / M2).toBeCloseTo(((LEAF_W * LEAF_H) / M2) * 2, 6); // 3.2000
    expect(q.basis).toBe('exact');
  });

  it('⚠⚠ a door FRAME bills its reveal + its two visible rings — 1.70 m², not 2.9000 m²', async () => {
    const { doc, door } = await doorInWall();
    const frame = (await doc.quantities(door)).parts.find((p) => p.name === 'frame')!;

    // The lining you can see: the four faces of the reveal beside the leaf (inner perimeter × the wall's
    // depth) + the flat ring showing on each side of the wall. The frame's OUTER laterals are buried in
    // the wall's opening and are excluded — measured failing first at 2.9000, which billed all of them.
    const reveal = (2 * (LEAF_W + LEAF_H) * WALL_T) / M2; // 1.12
    const rings = ((DW * DH - LEAF_W * LEAF_H) / M2) * 2; // 0.58
    expect(frame.area / M2).toBeCloseTo(reveal + rings, 6); // 1.7000
  });

  it('⚠⚠ THE TRAP THE `node` QUALIFIER EXISTS FOR: the frame must not bill its BURIED laterals', async () => {
    const { doc, door } = await doorInWall();
    const frame = doc.partsOf(door)!.find((p) => p.name === 'frame')!;

    // A part built from two ops owns the SAME ROLE under two node ids — `frame:outer/face/lateral.0`
    // (buried in the wall) and `frame:inner/face/lateral.0` (the visible lining). Matching the role
    // alone returns whichever the canonical order put first, and would silently bill 1.20 m² of the
    // wrong surface. This asserts the declaration names the inner node, not merely the right count.
    expect(frame.exposedRefs).toBeDefined();
    for (const ref of frame.exposedRefs!) {
      expect(ref.includes('frame:outer/face/lateral.')).toBe(false);
    }
    expect(frame.exposedRefs!.filter((r) => r.includes('frame:inner/face/lateral.'))).toHaveLength(
      4,
    );
    expect(frame.exposedRefs!.filter((r) => r.includes('/face/cap-'))).toHaveLength(2);
  });
});

describe('D72 — the OWED `exposedRefs` declarations: a curtain wall bills its façade', () => {
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

  const newRegistries = (): Registries => {
    const r = createRegistries();
    r.types.register(curtainWallType);
    r.types.register(curtainWallColumnType);
    r.types.register(curtainWallPanelType);
    r.types.register(curtainWallMullionType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    return r;
  };

  const facade = async (): Promise<{ doc: DocumentContext; cw: string }> => {
    const doc = new DocumentContext({ registries: newRegistries(), geometry: client });
    const cw = (
      await doc.execute('core.createElement', {
        typeId: 'core.curtainwall',
        params: {
          origin: [0, 0],
          width: CW_W,
          height: CW_H,
          rows: ROWS,
          cols: COLS,
          depth: DEPTH,
          mullionWidth: MW,
          panelThickness: PT,
        },
      })
    ).changes[0]!.id;
    return { doc, cw };
  };

  it('⚠⚠ a glazed PANEL bills both pane faces — 5.6550 m², not the 5.8182 m² that counted its edges', async () => {
    const { doc, cw } = await facade();
    const q = await doc.quantities(`${cw}:column.c1:panel.r1`);

    // Owner-ruled: the assembly rule, same as `core.wall` — both faces, buried edges excluded. Pane
    // supply is half of it. Measured failing first at 5.8182, which billed the four edges the mullions
    // clamp.
    expect(q.parts[0]!.area / M2).toBeCloseTo(((PANEL_W * PANEL_H) / M2) * 2, 6); // 5.6550
  });

  it('⚠⚠ a MULLION bills only the two faces not against glass — 0.30 m², not 0.9100 m² (3.03×)', async () => {
    const { doc, cw } = await facade();
    const vertical = (await doc.quantities(`${cw}:mullion.v1`)).parts[0]!;

    // A vertical mullion's `x` faces hold the glazing on either side and its `z` faces butt the transoms
    // it crosses; what you see from outside and inside is the `y` pair. Measured failing first at 0.9100.
    expect(vertical.area / M2).toBeCloseTo(((MW * CW_H) / M2) * 2, 6); // 0.3000
  });

  it('a HORIZONTAL transom follows the SAME declaration — one rule, both orientations', async () => {
    const { doc, cw } = await facade();
    const horizontal = (await doc.quantities(`${cw}:mullion.h1`)).parts[0]!;

    // The façade's local frame is X-along / Y-depth / Z-up for every bar, so "the faces you see" is the
    // same `y` pair whichever way the bar runs. A transom is 6000 long × 50 deep on the face.
    expect(horizontal.area / M2).toBeCloseTo(((CW_W * MW) / M2) * 2, 6); // 0.6000
  });

  it('⚠⚠ the whole façade rolls up to a billable area, not 1.19× of one', async () => {
    const { doc, cw } = await facade();

    const tree = doc.geometryOf(cw)!;
    let total = 0;
    const walk = async (node: {
      elementId: string;
      children?: readonly unknown[];
    }): Promise<void> => {
      const parts = doc.partsOf(node.elementId) ?? [];
      if (parts.length > 0) {
        for (const p of (await doc.quantities(node.elementId)).parts) total += p.area;
      }
      for (const child of (node.children ?? []) as { elementId: string }[]) await walk(child);
    };
    for (const child of tree.children ?? []) await walk(child);

    // 6 panels + 4 verticals + 3 horizontals, each measured on the faces it actually shows.
    const panels = ROWS * COLS * ((PANEL_W * PANEL_H) / M2) * 2; // 33.9300
    const verticals = (COLS + 1) * ((MW * CW_H) / M2) * 2; // 1.2000
    const horizontals = (ROWS + 1) * ((CW_W * MW) / M2) * 2; // 1.8000
    expect(total / M2).toBeCloseTo(panels + verticals + horizontals, 4); // 36.9300

    // ⚠ Measured failing first at 43.9792 m² — 1.19× the truth. Note how MUCH SMALLER the roll-up error
    // is than any single part's (3.03× on a mullion): the panels dominate the sum and they were the
    // least wrong. A total that looks plausible is exactly how a per-part defect survives inspection.
    expect(total / M2).toBeLessThan(40);
  });
});
