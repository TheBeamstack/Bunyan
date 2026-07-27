/**
 * THE CURTAIN WALL — the canonical D59 nesting probe (`core_logic.md` §9a), built end-to-end against the
 * real kernel to validate the composition contract (Freeze-Gate row Ⓑ, owner-ruled 2026-07-22, Model A).
 *
 * ⚠⚠ A CURTAIN WALL IS ELEMENTS-OF-ELEMENTS (rule 18), NOT ONE ELEMENT WITH MANY PARTS. Its panels and
 * mullions are first-class elements — each its own PEI, its own material, its own quantity — but GENERATED
 * from the parent's grid recipe, never stored `scene.elements` rows (Model A: recipe-is-truth, D30). The
 * engine builds them via `buildChildren` and gives each the DERIVED PEI `${parentId}:${slot}`.
 *
 * ⚠ IT IS GENUINELY TWO LEVELS DEEP — "hosting deeper than one level" (rule 18):
 *
 *     core.curtainwall            (composite: buildChildren → columns + mullions)
 *       ├─ column.c0              core.curtainwall.column  (composite: buildChildren → panels)
 *       │    ├─ panel.r0          core.curtainwall.panel   (leaf: one glazing solid)
 *       │    └─ panel.r1
 *       ├─ column.c1  → …
 *       ├─ mullion.v0             core.curtainwall.mullion (leaf: one bar solid)
 *       └─ mullion.h0  → …
 *
 * ⚠⚠ THE ANTI-FUSE RULE HOLDS BY CONSTRUCTION (rule 11, §4h): every panel and mullion is its OWN box; no
 * boolean ever runs between two children. A panel's face token depends only on its own recipe, so adding a
 * column leaves every existing panel's `SubShapeRef`s byte-identical (D26 — the gate, `tests/composition`).
 *
 * ⚠ The whole façade is axis-aligned in its own local frame (X = width, Z = height, Y = depth); the parent's
 * `placement` rides the whole subtree last (the engine's `placeTree`), so a rotated curtain wall is the same
 * curtain wall token-for-token (D25).
 */

import type { BimObjectType, BuildContext, BuiltChild, BuiltPart } from '@bunyan/document';

type Vec3 = readonly [number, number, number];

/* ================================================================================================
 * THE PARENT — core.curtainwall. A composite with NO own frame parts: its geometry IS its children.
 * ============================================================================================= */

export const curtainWallType: BimObjectType = {
  id: 'core.curtainwall',
  version: 1,
  label: 'Curtain Wall',
  description:
    'A grid of panel + mullion CHILD elements (rule 18, D59) — generated from the recipe, each its own PEI, never fused.',
  parameterSchema: {
    origin: {
      kind: 'array',
      label: 'Origin',
      required: true,
      description:
        '[x, y] min corner of the façade in the Level plane, mm. The wall runs +X, up +Z.',
      items: { kind: 'number', label: 'mm' },
    },
    width: { kind: 'number', label: 'Width', unit: 'mm', required: true, min: 1 },
    height: { kind: 'number', label: 'Height', unit: 'mm', required: true, min: 1 },
    rows: { kind: 'number', label: 'Rows', required: true, min: 1 },
    cols: { kind: 'number', label: 'Columns', required: true, min: 1 },
    depth: { kind: 'number', label: 'Frame depth (Y)', unit: 'mm', default: 100, min: 1 },
    mullionWidth: { kind: 'number', label: 'Mullion width', unit: 'mm', default: 50, min: 1 },
    panelThickness: { kind: 'number', label: 'Panel thickness', unit: 'mm', default: 24, min: 1 },
    panelMaterialId: { kind: 'ref', refTo: 'material', label: 'Panel (glazing) material' },
    mullionMaterialId: { kind: 'ref', refTo: 'material', label: 'Mullion material' },
  },
  defaultClassification: { ifcClass: 'IfcCurtainWall', loadBearing: false },
  defaultDiscipline: 'architectural',

  // ⚠ NO buildGeometry — a pure composite. `quantities(curtainWall)` has no own parts; the glass m² and
  // aluminium kg roll up from the CHILDREN (each queryable by its derived PEI). This deliberately exercises
  // the "composite parent with only children" case the freeze must carry.
  buildChildren(ctx: BuildContext): Promise<readonly BuiltChild[]> {
    const g = readGrid(ctx);
    const children: BuiltChild[] = [];

    // ---- COLUMN children (composite → panels). "Hosting deeper than one level" (rule 18). --------------
    for (let c = 0; c < g.cols; c++) {
      const x0 = g.ox + c * g.cellW + g.mullionWidth / 2; // panel band starts after the left mullion
      const bandW = g.cellW - g.mullionWidth;
      children.push({
        slot: `column.c${String(c)}`,
        typeId: 'core.curtainwall.column',
        name: `Column ${String(c + 1)}`,
        params: {
          x0,
          y: g.oy,
          z0: g.bz,
          bandWidth: bandW,
          height: g.height,
          rows: g.rows,
          depth: g.depth,
          mullionWidth: g.mullionWidth,
          panelThickness: g.panelThickness,
          panelMaterialId: g.panelMaterialId,
        },
      });
    }

    // ---- VERTICAL mullion children (leaf) — one at each of the cols+1 grid lines. -----------------------
    for (let c = 0; c <= g.cols; c++) {
      const x = g.ox + c * g.cellW - g.mullionWidth / 2;
      children.push(
        mullionChild(`mullion.v${String(c)}`, `Mullion V${String(c)}`, [x, g.oy, g.bz], {
          dx: g.mullionWidth,
          dy: g.depth,
          dz: g.height,
          materialId: g.mullionMaterialId,
        }),
      );
    }
    // ---- HORIZONTAL mullion children (leaf) — one at each of the rows+1 grid lines. ---------------------
    for (let r = 0; r <= g.rows; r++) {
      const z = g.bz + r * g.cellH - g.mullionWidth / 2;
      children.push(
        mullionChild(`mullion.h${String(r)}`, `Mullion H${String(r)}`, [g.ox, g.oy, z], {
          dx: g.width,
          dy: g.depth,
          dz: g.mullionWidth,
          materialId: g.mullionMaterialId,
        }),
      );
    }
    return Promise.resolve(children);
  },
};

/* ================================================================================================
 * THE COLUMN — core.curtainwall.column. A composite CHILD: it owns the panel children of one column.
 * This is what makes the tree genuinely depth-2 (a child that is itself composite).
 * ============================================================================================= */

export const curtainWallColumnType: BimObjectType = {
  id: 'core.curtainwall.column',
  version: 1,
  label: 'Curtain Wall Column',
  description:
    'One column of a curtain wall — a composite child owning its panel children (rule 18).',
  parameterSchema: {
    x0: { kind: 'number', label: 'x0', unit: 'mm' },
    y: { kind: 'number', label: 'y', unit: 'mm' },
    z0: { kind: 'number', label: 'z0', unit: 'mm' },
    bandWidth: { kind: 'number', label: 'Band width', unit: 'mm' },
    height: { kind: 'number', label: 'Height', unit: 'mm' },
    rows: { kind: 'number', label: 'Rows' },
    depth: { kind: 'number', label: 'Depth', unit: 'mm' },
    mullionWidth: { kind: 'number', label: 'Mullion width', unit: 'mm' },
    panelThickness: { kind: 'number', label: 'Panel thickness', unit: 'mm' },
    panelMaterialId: { kind: 'ref', refTo: 'material', label: 'Panel material' },
  },
  defaultClassification: { ifcClass: 'IfcMember', loadBearing: false },
  defaultDiscipline: 'architectural',

  buildChildren(ctx: BuildContext): Promise<readonly BuiltChild[]> {
    const x0 = num(ctx.params['x0']);
    const y = num(ctx.params['y']);
    const z0 = num(ctx.params['z0']);
    const bandWidth = num(ctx.params['bandWidth']);
    const height = num(ctx.params['height']);
    const rows = Math.max(1, Math.round(num(ctx.params['rows'])));
    const depth = num(ctx.params['depth']);
    const mullionWidth = num(ctx.params['mullionWidth']);
    const panelThickness = num(ctx.params['panelThickness']);
    const materialId = str(ctx.params['panelMaterialId']);
    const cellH = height / rows;
    const panelY = y + (depth - panelThickness) / 2; // centre the glazing in the frame depth

    const panels: BuiltChild[] = [];
    for (let r = 0; r < rows; r++) {
      const z = z0 + r * cellH + mullionWidth / 2;
      panels.push({
        slot: `panel.r${String(r)}`,
        typeId: 'core.curtainwall.panel',
        name: `Panel R${String(r)}`,
        params: {
          at: [x0, panelY, z],
          dx: bandWidth,
          dy: panelThickness,
          dz: cellH - mullionWidth,
          materialId,
        },
      });
    }
    return Promise.resolve(panels);
  },
};

/* ================================================================================================
 * THE LEAVES — a panel and a mullion. Each is ONE axis-aligned box (`makeBox`); its own solid, never fused.
 * ============================================================================================= */

export const curtainWallPanelType: BimObjectType = {
  id: 'core.curtainwall.panel',
  version: 1,
  label: 'Curtain Panel',
  description:
    'A single glazed infill panel of a curtain wall — its own element, its own glass (rule 18).',
  parameterSchema: boxSchema('Glazing material'),
  defaultClassification: { ifcClass: 'IfcPlate', loadBearing: false },
  defaultDiscipline: 'architectural',
  buildGeometry: (ctx) => buildBox(ctx, 'glazing'),
};

export const curtainWallMullionType: BimObjectType = {
  id: 'core.curtainwall.mullion',
  version: 1,
  label: 'Mullion',
  description:
    'A single mullion bar of a curtain wall — its own element, its own aluminium (rule 18).',
  parameterSchema: boxSchema('Mullion material'),
  defaultClassification: { ifcClass: 'IfcMember', loadBearing: false },
  defaultDiscipline: 'architectural',
  buildGeometry: (ctx) => buildBox(ctx, 'bar'),
};

/* ------------------------------------------------------------------------------------------------
 * Helpers — a Type is a pure function of its context.
 * ---------------------------------------------------------------------------------------------- */

interface Grid {
  readonly ox: number;
  readonly oy: number;
  readonly bz: number;
  readonly width: number;
  readonly height: number;
  readonly rows: number;
  readonly cols: number;
  readonly cellW: number;
  readonly cellH: number;
  readonly depth: number;
  readonly mullionWidth: number;
  readonly panelThickness: number;
  readonly panelMaterialId: string;
  readonly mullionMaterialId: string;
}

function readGrid(ctx: BuildContext): Grid {
  const origin = readVec2(ctx.params['origin']);
  if (origin === undefined) {
    throw new Error(`curtain wall "${ctx.element.id}" needs an [x,y] origin`);
  }
  const width = num(ctx.params['width']);
  const height = num(ctx.params['height']);
  const cols = Math.max(1, Math.round(num(ctx.params['cols'])));
  const rows = Math.max(1, Math.round(num(ctx.params['rows'])));
  if (width <= 0 || height <= 0) {
    throw new Error(`curtain wall "${ctx.element.id}" needs a positive width and height`);
  }
  return {
    ox: origin[0],
    oy: origin[1],
    bz: ctx.elevation, // the façade base sits on the element's Level (0 if it has none)
    width,
    height,
    rows,
    cols,
    cellW: width / cols,
    cellH: height / rows,
    depth: num(ctx.params['depth'], 100),
    mullionWidth: num(ctx.params['mullionWidth'], 50),
    panelThickness: num(ctx.params['panelThickness'], 24),
    panelMaterialId: str(ctx.params['panelMaterialId']),
    mullionMaterialId: str(ctx.params['mullionMaterialId']),
  };
}

function mullionChild(
  slot: string,
  name: string,
  at: Vec3,
  box: {
    readonly dx: number;
    readonly dy: number;
    readonly dz: number;
    readonly materialId: string;
  },
): BuiltChild {
  return {
    slot,
    typeId: 'core.curtainwall.mullion',
    name,
    params: { at: [...at], dx: box.dx, dy: box.dy, dz: box.dz, materialId: box.materialId },
  };
}

/** One axis-aligned box part from `{at,dx,dy,dz,materialId}` — the leaf builder shared by panel + mullion. */
async function buildBox(ctx: BuildContext, partName: string): Promise<readonly BuiltPart[]> {
  const at = readVec3(ctx.params['at']);
  const dx = num(ctx.params['dx']);
  const dy = num(ctx.params['dy']);
  const dz = num(ctx.params['dz']);
  if (at === undefined || dx <= 0 || dy <= 0 || dz <= 0) {
    throw new Error(`"${ctx.element.id}" needs a positive box (at,dx,dy,dz)`);
  }
  const nodeId = ctx.nodeId(partName);
  const solid = await ctx.geometry.request('makeBox', { nodeId, dx, dy, dz, at: [...at] });
  return [
    {
      name: partName,
      materialId: str(ctx.params['materialId']),
      discipline: ctx.defaultDiscipline,
      nodeId,
      handle: solid.handle,
      refs: solid.refs,
    },
  ];
}

function boxSchema(materialLabel: string): BimObjectType['parameterSchema'] {
  return {
    at: { kind: 'array', label: 'Min corner', items: { kind: 'number', label: 'mm' } },
    dx: { kind: 'number', label: 'dx', unit: 'mm' },
    dy: { kind: 'number', label: 'dy', unit: 'mm' },
    dz: { kind: 'number', label: 'dz', unit: 'mm' },
    materialId: { kind: 'ref', refTo: 'material', label: materialLabel },
  };
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readVec2(value: unknown): readonly [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const x: unknown = value[0];
  const y: unknown = value[1];
  return typeof x === 'number' && typeof y === 'number' ? [x, y] : undefined;
}

function readVec3(value: unknown): Vec3 | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const [x, y, z] = value as unknown[];
  return typeof x === 'number' && typeof y === 'number' && typeof z === 'number'
    ? [x, y, z]
    : undefined;
}
