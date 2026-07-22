/**
 * D59 — ELEMENT COMPOSITION / NESTING (Freeze-Gate row Ⓑ, owner-ruled 2026-07-22 Model A) — against the
 * REAL OCCT kernel, headless. The design: `P5_step5B_composition_nesting_design.md`.
 *
 * ⚠⚠ THE HEADLINE (§1–§2): the real `core.curtainwall` builds elements-of-elements (rule 18) — a grid of
 * PANEL and MULLION child elements, each a first-class element with its OWN derived PEI (`${parent}/${slot}`),
 * its own material, its own measured quantity — GENERATED from the recipe, never a stored scene row (Model A,
 * recipe-is-truth D30). `quantities()` reaches a panel by its derived PEI and rolls the tree up to glass m² +
 * aluminium kg. Before D59 an element had Parts but not child ELEMENTS, and a curtain wall was impossible.
 *
 * §3 the ANTI-FUSE rule (rule 11) holds — every child is its own box, no sibling boolean, tokens stable across
 * a grid change. §4 nesting is DEEPER THAN ONE LEVEL (a panel lives under a column under the wall). §5 the
 * parent's placement rides the whole subtree. §6 the heap discipline covers the subtree (rebuild, vanish, and
 * delete all free correctly). §7 a self-nesting type is REFUSED (never a hang) and the wall round-trips from one
 * authored row.
 *
 * ⚠ REVERT-VERIFY (per §1b): §4/§2 fail if the recursive child build is removed from `build.ts`; §6-rebuild
 * fails if the child-subtree supersede is removed from `document.ts::#stage`; §6-delete fails if the deleted-
 * parent subtree sweep is removed from `document.ts::#commit`.
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
import type { BimObjectType, BuiltChild, ElementGeometry } from '@bunyan/document';
import {
  curtainWallColumnType,
  curtainWallMullionType,
  curtainWallPanelType,
  curtainWallType,
} from '@bunyan/types';

// A 3-column, 2-row curtain wall, axis-aligned in its own frame (X = width, Z = height, Y = depth).
const W = 3000;
const H = 2400;
const COLS = 3;
const ROWS = 2;
const MW = 50; // mullion width
const DEPTH = 100; // frame depth (Y)
const PT = 24; // panel thickness (Y)
const CELL_W = W / COLS; // 1000
const CELL_H = H / ROWS; // 1200

// Derived box dimensions:
const PANEL_DX = CELL_W - MW; // 950
const PANEL_DZ = CELL_H - MW; // 1150
const PANEL_VOL = PANEL_DX * PT * PANEL_DZ; // one glazing box
const VMULL_VOL = MW * DEPTH * H; // a vertical mullion box
const HMULL_VOL = W * DEPTH * MW; // a horizontal mullion box

const GLASS_RHO = 2500; // kg/m³
const ALU_RHO = 2700;

describe('D59 — a curtain wall is elements-of-elements (rule 18), generated + never fused', () => {
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

  const registerCurtainWall = (r: ReturnType<typeof createRegistries>): void => {
    r.types.register(curtainWallType);
    r.types.register(curtainWallColumnType);
    r.types.register(curtainWallPanelType);
    r.types.register(curtainWallMullionType);
  };

  const newDoc = (extraTypes: readonly BimObjectType[] = []): DocumentContext => {
    const registries = createRegistries();
    registerCurtainWall(registries);
    for (const t of extraTypes) registries.types.register(t);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({ registries, geometry: client });
  };

  const makeWall = async (
    doc: DocumentContext,
    params: Record<string, unknown> = {},
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
    await doc.execute('core.createMaterial', {
      id: 'glass',
      name: 'Glass',
      category: 'other',
      density: GLASS_RHO,
    });
    await doc.execute('core.createMaterial', {
      id: 'alu',
      name: 'Aluminium',
      category: 'steel',
      density: ALU_RHO,
    });
    return (
      await doc.execute('core.createElement', {
        typeId: 'core.curtainwall',
        params: {
          origin: [0, 0],
          width: W,
          height: H,
          rows: ROWS,
          cols: COLS,
          depth: DEPTH,
          mullionWidth: MW,
          panelThickness: PT,
          panelMaterialId: 'glass',
          mullionMaterialId: 'alu',
          ...params,
        },
        ...extra,
      })
    ).changes[0]!.id;
  };

  /* ============================================================================================
   * §1 — THE STRUCTURE: a composite parent with NO own parts, owning generated child elements.
   * ========================================================================================= */

  it('⚠⚠ generates panel + mullion + column CHILD elements, each with its own DERIVED PEI', async () => {
    const doc = newDoc();
    const cw = await makeWall(doc);
    expect(doc.brokenRefs()).toHaveLength(0);

    // The parent is a PURE COMPOSITE — its geometry IS its children, so it has no own parts.
    expect(doc.partsOf(cw)).toEqual([]);

    const tree = doc.geometryOf(cw)!;
    // Direct children: COLS columns + (COLS+1) vertical mullions + (ROWS+1) horizontal mullions.
    const slots = tree.children!.map((c) => c.elementId.slice(cw.length + 1));
    expect(slots).toContain('column.c0');
    expect(slots).toContain('mullion.v0');
    expect(slots).toContain(`mullion.v${String(COLS)}`); // the far edge line
    expect(slots).toContain('mullion.h0');
    expect(tree.children).toHaveLength(COLS + (COLS + 1) + (ROWS + 1)); // 3 + 4 + 3 = 10

    // A panel is a first-class child element addressable by its DERIVED PEI, one level deeper.
    const panel = doc.geometryOf(`${cw}:column.c0:panel.r0`);
    expect(panel).toBeDefined();
    expect(panel!.parts.map((p) => p.name)).toEqual(['glazing']);
  });

  /* ============================================================================================
   * §2 — QUANTITIES: measured per child, per material, and rolled up over the tree.
   * ========================================================================================= */

  it('⚠⚠ measures each child per material and rolls the tree up to glass + aluminium totals', async () => {
    const doc = newDoc();
    const cw = await makeWall(doc);

    // One panel — its own glass box, its own mass from glass density (D30/D45, never a hole).
    const q = await doc.quantities(`${cw}:column.c1:panel.r1`);
    expect(q.parts).toHaveLength(1);
    expect(q.parts[0]!.name).toBe('glazing');
    expect(q.parts[0]!.materialName).toBe('Glass');
    expect(q.parts[0]!.volume).toBeCloseTo(PANEL_VOL, 1);
    expect(q.parts[0]!.mass).toBeCloseTo((PANEL_VOL / 1e9) * GLASS_RHO, 6);

    // Roll the whole tree up — the moat quantity a monolithic curtain wall could never answer.
    const totals = await rollUp(doc, cw);
    const panelCount = ROWS * COLS; // 6
    const mullionCount = COLS + 1 + (ROWS + 1); // 4 + 3 = 7
    expect(totals.count).toBe(panelCount + mullionCount);
    expect(totals.glassVolume).toBeCloseTo(panelCount * PANEL_VOL, 0);
    expect(totals.aluVolume).toBeCloseTo((COLS + 1) * VMULL_VOL + (ROWS + 1) * HMULL_VOL, 0);
    // The two materials come out as two distinct measured masses — the schedule Planitor binds to.
    expect(totals.glassMass).toBeCloseTo(((panelCount * PANEL_VOL) / 1e9) * GLASS_RHO, 3);
  });

  /* ============================================================================================
   * §3 — THE ANTI-FUSE RULE (rule 11): each child its own solid; sibling change moves no token.
   * ========================================================================================= */

  it('⚠⚠ a panel token is byte-identical when a COLUMN is added — no sibling fuse (the gate)', async () => {
    const doc = newDoc();
    const cw = await makeWall(doc, { cols: 2 });
    const before = doc.geometryOf(`${cw}:column.c0:panel.r0`)!.parts[0]!;
    const beforeRefs = [...before.refs];
    const beforeHandle = before.handle;

    // Widen the grid to 3 columns. column.c0:panel.r0 is a stable slot; adding column.c2 must not touch it.
    await doc.execute('core.setParams', { elementId: cw, params: { cols: 3 } });
    const after = doc.geometryOf(`${cw}:column.c0:panel.r0`)!.parts[0]!;

    // The tokens (derived from the stable slot's nodeId) are byte-identical — the anti-fuse property (D26).
    expect(after.refs).toEqual(beforeRefs);
    // It IS a real rebuild (a new solid), not a stale cache — the handle changed, the identity did not.
    expect(after.handle).not.toBe(beforeHandle);
    // Every child is a DISTINCT solid — no two share a handle, so nothing was fused.
    const handles = flatten(doc.geometryOf(cw)!).flatMap((g) => g.parts.map((p) => p.handle));
    expect(new Set(handles).size).toBe(handles.length);
  });

  /* ============================================================================================
   * §4 — NESTING IS DEEPER THAN ONE LEVEL (rule 18): panel ⊂ column ⊂ curtain wall.
   * ========================================================================================= */

  it('⚠ a panel is nested under a COLUMN under the wall — depth 2, the tree carries the ownership', async () => {
    const doc = newDoc();
    const cw = await makeWall(doc);
    const column = doc.geometryOf(cw)!.children!.find((c) => c.elementId === `${cw}:column.c0`)!;
    // The column is ITSELF composite — it owns panel children (a child that is a parent).
    expect(column.children!.map((c) => c.elementId)).toContain(`${cw}:column.c0:panel.r0`);
    expect(column.children).toHaveLength(ROWS);
    // The depth-2 panel measures — the recursive build reached it.
    const q = await doc.quantities(`${cw}:column.c0:panel.r1`);
    expect(q.parts[0]!.volume).toBeCloseTo(PANEL_VOL, 1);
  });

  /* ============================================================================================
   * §5 — THE PARENT'S PLACEMENT RIDES THE WHOLE SUBTREE (D25 — a placed panel is the same panel).
   * ========================================================================================= */

  it('⚠ a placed curtain wall moves every generated child with it (placeTree)', async () => {
    const doc = newDoc();
    const cw = await makeWall(doc, {}, { placement: [{ kind: 'translate', by: [10000, 0, 0] }] });
    const panel = doc.partsOf(`${cw}:column.c0:panel.r0`)![0]!;
    const bounds = (await client.request('bounds', { handle: panel.handle })).bounds;
    // The unplaced panel r0 c0 spans x ∈ [25, 975]; the +10000 translate shifts it there.
    expect(bounds.min[0]).toBeCloseTo(10000 + MW / 2, 1);
    expect(bounds.max[0]).toBeCloseTo(10000 + MW / 2 + PANEL_DX, 1);
  });

  /* ============================================================================================
   * §6 — HEAP DISCIPLINE over the subtree: rebuild frees the old set, a vanished slot frees, delete sweeps.
   * ========================================================================================= */

  it('⚠⚠ rebuilding the wall leaks no child solids on the WASM heap (subtree supersede)', async () => {
    const doc = newDoc();
    const cw = await makeWall(doc);
    await doc.execute('core.setParams', { elementId: cw, params: { width: W } });
    const before = kernel.wasmLiveHandles();
    for (let i = 0; i < 5; i++) {
      await doc.execute('core.setParams', { elementId: cw, params: { width: W + (i % 2) } });
    }
    await doc.execute('core.setParams', { elementId: cw, params: { width: W } });
    expect(kernel.wasmLiveHandles(), 'a rebuilt curtain wall leaked its old children').toBe(before);
  });

  it('⚠⚠ shrinking the grid FREES the vanished slots and deleting the wall sweeps the subtree', async () => {
    const doc = newDoc();
    const empty = kernel.wasmLiveHandles();
    const cw = await makeWall(doc);
    const full = kernel.wasmLiveHandles();
    expect(full).toBeGreaterThan(empty);

    // Shrink 3 → 2 columns: column.c2 + its panels + mullion.v3 vanish. Their solids must be freed, and the
    // stale geometry entries dropped — not left dangling (a vanished slot is gone, not a broken-ref here).
    await doc.execute('core.setParams', { elementId: cw, params: { cols: 2 } });
    expect(doc.geometryOf(`${cw}:column.c2`)).toBeUndefined();
    expect(kernel.wasmLiveHandles()).toBeLessThan(full);

    // Delete the whole wall — every remaining panel + mullion is swept with it (the #commit subtree sweep).
    await doc.execute('core.deleteElement', { elementId: cw });
    expect(doc.geometryOf(cw)).toBeUndefined();
    expect(doc.geometryOf(`${cw}:column.c0:panel.r0`)).toBeUndefined();
    expect(kernel.wasmLiveHandles(), 'deleting the wall leaked its subtree').toBe(empty);
  });

  /* ============================================================================================
   * §7 — a self-nesting TYPE is refused (never a hang); the wall round-trips from ONE authored row.
   * ========================================================================================= */

  it('⚠ a composition CYCLE is refused (a geometry failure, D42), not an infinite recursion', async () => {
    const cyclic: BimObjectType = {
      id: 'test.cycle',
      version: 1,
      label: 'Cycle',
      parameterSchema: {},
      defaultClassification: { ifcClass: 'IfcBuildingElementProxy', loadBearing: false },
      defaultDiscipline: 'other',
      buildChildren: (): Promise<readonly BuiltChild[]> =>
        Promise.resolve([{ slot: 'self', typeId: 'test.cycle', params: {} }]),
    };
    const doc = newDoc([cyclic]);
    await expect(
      doc.execute('core.createElement', { typeId: 'test.cycle', params: {} }),
    ).rejects.toThrow(/cycle|nests itself/i);
  });

  it('⚠ round-trips from a single authored row — the children regenerate, byte for byte', async () => {
    const doc = newDoc();
    const cw = await makeWall(doc);
    const beforeTotals = await rollUp(doc, cw);

    // The scene stores ONE element (the curtain wall) — NOT its panels (Model A: derived, never stored).
    expect(Object.keys(doc.scene.elements)).toEqual([cw]);

    const loaded = loadBnn(saveBnn(doc.scene, { kernelBuildId: 'test' }));
    // Rebuild from the loaded scene ALONE (the primary load path) and re-roll — children regenerate.
    const r2 = new DocumentContext({
      registries: (() => {
        const reg = createRegistries();
        registerCurtainWall(reg);
        for (const c of CORE_COMMANDS) reg.commands.register(c);
        return reg;
      })(),
      geometry: client,
      scene: loaded.scene,
    });
    await r2.rebuildAll();
    expect(Object.keys(r2.scene.elements)).toEqual([cw]);
    const afterTotals = await rollUp(r2, cw);
    expect(afterTotals.glassVolume).toBeCloseTo(beforeTotals.glassVolume, 0);
    expect(afterTotals.count).toBe(beforeTotals.count);
  });
});

/* ------------------------------------------------------------------------------------------------
 * Helpers.
 * ---------------------------------------------------------------------------------------------- */

interface Totals {
  count: number;
  glassVolume: number;
  aluVolume: number;
  glassMass: number;
}

/** Flatten a geometry tree to every node (root + all descendants). */
function flatten(node: ElementGeometry): ElementGeometry[] {
  const out = [node];
  for (const child of node.children ?? []) out.push(...flatten(child));
  return out;
}

/** Walk the tree and sum each LEAF child's quantities by material — the roll-up a consumer performs. */
async function rollUp(doc: DocumentContext, rootId: string): Promise<Totals> {
  const totals: Totals = { count: 0, glassVolume: 0, aluVolume: 0, glassMass: 0 };
  for (const node of flatten(doc.geometryOf(rootId)!)) {
    if (node.parts.length === 0) continue; // a pure-composite node (the wall, a column) has no own parts
    const q = await doc.quantities(node.elementId);
    totals.count += 1;
    for (const part of q.parts) {
      if (part.materialName === 'Glass') {
        totals.glassVolume += part.volume;
        totals.glassMass += part.mass ?? 0;
      } else if (part.materialName === 'Aluminium') {
        totals.aluVolume += part.volume;
      }
    }
  }
  return totals;
}
