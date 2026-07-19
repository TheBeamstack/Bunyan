/**
 * THE ROOM-BOUNDING SOLVER (D50 §Space-extent Option B / D55, `P5_step1_room_bounding_design.md`).
 *
 * ⚠ These tests are PURE (no OCCT boot) — and that is faithful, not a shortcut: `roomMetrics` reads a
 * Space's seed + its walls' params + their style thicknesses; it NEVER reaches the kernel (Q2 — the solver
 * is document-layer 2D). A constructed `Scene` exercises the exact same footprint→solve→derive path a
 * command-built scene would, so standing up the real kernel would prove nothing extra here.
 *
 * The method (§1b): cut rooms nobody has cut — a rectangle, an L (non-convex), a room with a door, a
 * not-enclosed seed, an open plan closed by a separator — and cross-check each area against a closed form.
 */

import { describe, expect, it } from 'vitest';
import {
  DocumentContext,
  MockRoomSolver,
  PlanarRoomSolver,
  createRegistries,
  emptyScene,
  footprintOf,
  signedArea,
  verticalExtentOf,
} from '@bunyan/document';
import type {
  BoundarySegment,
  Element,
  ElementStyle,
  GeometryGateway,
  RoomMetrics,
  Scene,
  SpatialContainer,
  Vec2,
} from '@bunyan/document';

/* ---- a geometry gateway that must never be called: room bounding is pure (Q2) ------------------- */
const NO_KERNEL = {
  request: () => Promise.reject(new Error('room-bounding tests must not reach the kernel')),
} as unknown as GeometryGateway;

function areaOf(
  solver: PlanarRoomSolver,
  seed: Vec2,
  segments: readonly BoundarySegment[],
): number {
  const result = solver.solve({ seed, segments });
  if (!result.enclosed) throw new Error('expected an enclosed room');
  return Math.abs(signedArea(result.boundary));
}

/** A closed polyline → its boundary segments (the last point back to the first). */
function loop(...pts: Vec2[]): BoundarySegment[] {
  return pts.map((a, i) => ({ a, b: pts[(i + 1) % pts.length]! }));
}

/* ================================================================================================
 * 1. THE PURE SOLVER — the planar arrangement + face trace, on solver-neutral segments (Q3).
 * ============================================================================================= */

describe('PlanarRoomSolver — the 2D room-bounding core', () => {
  const solver = new PlanarRoomSolver();

  it('a rectangular room — area matches the closed form', () => {
    const area = areaOf(solver, [2000, 1500], loop([0, 0], [4000, 0], [4000, 3000], [0, 3000]));
    expect(area).toBeCloseTo(4000 * 3000, 3); // 12,000,000 mm²
  });

  it('an L-SHAPED (non-convex) room — proves face-tracing, not a bounding box', () => {
    const l = loop([0, 0], [6000, 0], [6000, 2000], [3000, 2000], [3000, 4000], [0, 4000]);
    const area = areaOf(solver, [1000, 1000], l);
    // 6000×4000 minus the missing 3000×2000 top-right notch = 24,000,000 − 6,000,000.
    expect(area).toBeCloseTo(18_000_000, 3);
    // ⚠ and the seed in the OTHER leg of the L resolves to the SAME room (one face, non-convex).
    expect(areaOf(solver, [1000, 3000], l)).toBeCloseTo(18_000_000, 3);
  });

  it('a NOT-ENCLOSED seed (a gap in the walls) → { enclosed: false } — never an area', () => {
    // Three sides of a rectangle; the left side is missing.
    const open: BoundarySegment[] = [
      { a: [0, 0], b: [4000, 0] },
      { a: [4000, 0], b: [4000, 3000] },
      { a: [4000, 3000], b: [0, 3000] },
    ];
    expect(solver.solve({ seed: [2000, 1500], segments: open }).enclosed).toBe(false);
  });

  it('a room separator CLOSES an open boundary — and it is load-bearing (revert-verified)', () => {
    const threeSides: BoundarySegment[] = [
      { a: [0, 0], b: [4000, 0] },
      { a: [4000, 0], b: [4000, 3000] },
      { a: [4000, 3000], b: [0, 3000] },
    ];
    // Without the fourth edge: not enclosed.
    expect(solver.solve({ seed: [2000, 1500], segments: threeSides }).enclosed).toBe(false);
    // Add a separator polyline edge along the open (left) side → a bounded room appears.
    const withSeparator = [...threeSides, { a: [0, 3000] as Vec2, b: [0, 0] as Vec2 }];
    const area = areaOf(solver, [2000, 1500], withSeparator);
    expect(area).toBeCloseTo(12_000_000, 3);
  });

  it('coincident duplicate segments (two walls on one line) do not break the trace', () => {
    const rect = loop([0, 0], [4000, 0], [4000, 3000], [0, 3000]);
    const withDup = [...rect, { a: [0, 0] as Vec2, b: [4000, 0] as Vec2 }]; // bottom edge twice
    expect(areaOf(solver, [2000, 1500], withDup)).toBeCloseTo(12_000_000, 3);
  });

  it('empty input → not enclosed (no throw — D10 discipline)', () => {
    expect(solver.solve({ seed: [0, 0], segments: [] }).enclosed).toBe(false);
  });
});

/* ================================================================================================
 * 2. THE FOOTPRINT PROVIDER (Q1 inner finish face / Q3 the wall seam).
 * ============================================================================================= */

function wallStyle(thickness: number): ElementStyle {
  return {
    id: 'style-wall',
    name: '200 blockwork',
    typeId: 'core.wall.v1',
    version: 1,
    layers: [{ name: 'structure', materialId: 'mat-block', thickness, discipline: 'structural' }],
  };
}

function wall(id: string, start: Vec2, end: Vec2, containerId = 'level-0'): Element {
  return {
    id,
    typeId: 'core.wall.v1',
    typeVersion: 1,
    styleId: 'style-wall',
    params: { start, end },
    containerId,
    classification: { ifcClass: 'IfcWall', loadBearing: true },
  };
}

describe('footprintOf — the only piece that knows what a wall is (Q3)', () => {
  it('a wall contributes its TWO face-lines, offset by ±half-thickness (Q1 inner finish face)', () => {
    const scene: Scene = { ...emptyScene(), styles: { 'style-wall': wallStyle(200) } };
    const fp = footprintOf(wall('w', [0, 0], [5000, 0]), scene);
    expect(fp).toHaveLength(2);
    // A horizontal wall (thickness 200) → face-lines at y = +100 and y = −100.
    const ys = fp.flatMap((s) => [s.a[1], s.b[1]]);
    expect(new Set(ys)).toEqual(new Set([100, -100]));
  });

  it('an element with no baseline (start/end) contributes nothing — e.g. an opening', () => {
    const opening: Element = {
      id: 'o-1',
      typeId: 'core.opening.v1',
      typeVersion: 1,
      params: { width: 900, height: 2100 },
      containerId: 'level-0',
      hostId: 'w',
      hostRef: 'w.structure/face',
      classification: { ifcClass: 'IfcDoor', loadBearing: false },
    };
    expect(footprintOf(opening, emptyScene())).toEqual([]);
  });

  it('a wall with no body (zero thickness) degrades to its centerline', () => {
    const fp = footprintOf(wall('w', [0, 0], [3000, 0]), emptyScene());
    expect(fp).toEqual([{ a: [0, 0], b: [3000, 0] }]);
  });
});

/* ================================================================================================
 * 3. DocumentContext.roomMetrics — the full query (assemble → solve → derive area/perimeter/volume).
 * ============================================================================================= */

/** A building with two Levels (0 and 3000) and a rectangular room bounded by four 200-thick walls. */
function roomScene(options: {
  readonly walls: readonly Element[];
  readonly seed?: Vec2;
  readonly upperLevel?: boolean;
  readonly extraElements?: readonly Element[];
}): Scene {
  const containers: Record<string, SpatialContainer> = {
    bld: { id: 'bld', kind: 'building', name: 'B' },
    'level-0': { id: 'level-0', kind: 'level', name: 'L0', parentId: 'bld', elevation: 0 },
    'space-1': {
      id: 'space-1',
      kind: 'space',
      name: 'Room 1',
      parentId: 'level-0',
      location: options.seed ?? [2500, 2000],
    },
  };
  if (options.upperLevel !== false) {
    containers['level-1'] = {
      id: 'level-1',
      kind: 'level',
      name: 'L1',
      parentId: 'bld',
      elevation: 3000,
    };
  }
  const elements: Record<string, Element> = {};
  for (const w of [...options.walls, ...(options.extraElements ?? [])]) elements[w.id] = w;
  return {
    ...emptyScene(),
    containers,
    elements,
    styles: { 'style-wall': wallStyle(200) },
  };
}

/** The four walls of a 5000×4000 (centerline) rectangular room. */
function fourWalls(): Element[] {
  return [
    wall('w-b', [0, 0], [5000, 0]),
    wall('w-r', [5000, 0], [5000, 4000]),
    wall('w-t', [5000, 4000], [0, 4000]),
    wall('w-l', [0, 4000], [0, 0]),
  ];
}

function docFor(scene: Scene, roomSolver?: MockRoomSolver): DocumentContext {
  return new DocumentContext({
    registries: createRegistries(),
    geometry: NO_KERNEL,
    scene,
    ...(roomSolver === undefined ? {} : { roomSolver }),
  });
}

describe('DocumentContext.roomMetrics — the measured Space extent (D55)', () => {
  it('a four-wall room → area on the INNER FINISH FACE, perimeter, and prismatic volume', () => {
    const metrics = docFor(roomScene({ walls: fourWalls() })).roomMetrics('space-1');
    expect(metrics.enclosed).toBe(true);
    if (!metrics.enclosed) return;
    // Centerlines 5000×4000, walls 200 thick ⇒ inner finish rectangle 4800×3800.
    expect(metrics.area).toBeCloseTo(4800 * 3800, 3); // 18,240,000 mm²
    expect(metrics.perimeter).toBeCloseTo(2 * (4800 + 3800), 3); // 17,200 mm
    expect(metrics.height).toBeCloseTo(3000, 6); // L0 → L1
    expect(metrics.volume).toBeCloseTo(4800 * 3800 * 3000, 0);
  });

  it('⚠ A DOOR DOES NOT LEAK THE ROOM (Freeze-Gate ⓞ) — an opening leaves the area byte-identical', () => {
    const bare = docFor(roomScene({ walls: fourWalls() })).roomMetrics('space-1');
    const door: Element = {
      id: 'door-1',
      typeId: 'core.opening.v1',
      typeVersion: 1,
      params: { width: 900, height: 2100 },
      containerId: 'level-0',
      hostId: 'w-b',
      hostRef: 'w-b.structure/face',
      classification: { ifcClass: 'IfcDoor', loadBearing: false },
    };
    const withDoor = docFor(roomScene({ walls: fourWalls(), extraElements: [door] })).roomMetrics(
      'space-1',
    );
    expect(withDoor).toEqual(bare); // openings are not boundary events — the footprint stays continuous
  });

  it('ASSOCIATIVITY — move a bounding wall and the area follows (derived, never stored)', () => {
    const before = docFor(roomScene({ walls: fourWalls() })).roomMetrics('space-1');
    // Push the right side out from x=5000 to x=6000 — the corner is shared, so the two adjoining walls
    // move with it (inner width grows 4800 → 5800). This is the associativity a wall JOIN will formalise.
    const moved: Element[] = [
      wall('w-b', [0, 0], [6000, 0]),
      wall('w-r', [6000, 0], [6000, 4000]),
      wall('w-t', [6000, 4000], [0, 4000]),
      wall('w-l', [0, 4000], [0, 0]),
    ];
    // ⚠ the seed must stay inside the (now wider) room.
    const after = docFor(roomScene({ walls: moved, seed: [3000, 2000] })).roomMetrics('space-1');
    expect(before.enclosed && after.enclosed).toBe(true);
    if (!before.enclosed || !after.enclosed) return;
    expect(before.area).toBeCloseTo(4800 * 3800, 3);
    expect(after.area).toBeCloseTo(5800 * 3800, 3); // the metric tracked the wall — no rebuild, no cache
  });

  it('a NOT-ENCLOSED room (a wall removed) → { enclosed: false }, area UNAVAILABLE not 0 (D45)', () => {
    const threeWalls = fourWalls().filter((w) => w.id !== 'w-l');
    const metrics: RoomMetrics = docFor(roomScene({ walls: threeWalls })).roomMetrics('space-1');
    expect(metrics.enclosed).toBe(false);
    expect(metrics).not.toHaveProperty('area'); // no zero wearing the "exact" badge
  });

  it('no derivable top (no upper Level) → volume OMITTED, area still reported (D45)', () => {
    const metrics = docFor(roomScene({ walls: fourWalls(), upperLevel: false })).roomMetrics(
      'space-1',
    );
    expect(metrics.enclosed).toBe(true);
    if (!metrics.enclosed) return;
    expect(metrics.area).toBeCloseTo(4800 * 3800, 3);
    expect(metrics.height).toBeUndefined();
    expect(metrics.volume).toBeUndefined();
  });

  it('a non-space container, or a Space with no seed, has no room to solve → not enclosed', () => {
    const scene = roomScene({ walls: fourWalls() });
    expect(docFor(scene).roomMetrics('level-0').enclosed).toBe(false); // not a space
    // A Space with NO seed (location omitted) — exactOptionalPropertyTypes: build it without the key.
    const seedless: SpatialContainer = {
      id: 'space-1',
      kind: 'space',
      name: 'Room 1',
      parentId: 'level-0',
    };
    const noSeed: Scene = { ...scene, containers: { ...scene.containers, 'space-1': seedless } };
    expect(docFor(noSeed).roomMetrics('space-1').enclosed).toBe(false);
  });

  it('the solver is INJECTABLE (D19 seam) — MockRoomSolver never claims a room', () => {
    const metrics = docFor(roomScene({ walls: fourWalls() }), new MockRoomSolver()).roomMetrics(
      'space-1',
    );
    expect(metrics.enclosed).toBe(false); // proves the injected solver, not the default, was used
  });
});

/* ================================================================================================
 * 4. verticalExtentOf — the derived height (Q5), from the 0g-frozen Space inputs.
 * ============================================================================================= */

describe('verticalExtentOf — height derived, never stored (D52 rule)', () => {
  it('defaults to the next Level up; honours baseOffset / limitOffset', () => {
    const scene = roomScene({ walls: [] });
    expect(verticalExtentOf(scene, scene.containers['space-1']!)).toEqual({ base: 0, top: 3000 });

    const withOffsets: SpatialContainer = {
      ...scene.containers['space-1']!,
      baseOffset: 100,
      limitOffset: -200,
    };
    expect(verticalExtentOf(scene, withOffsets)).toEqual({ base: 100, top: 2800 });
  });

  it('an explicit upperLevelId overrides the next-Level default', () => {
    const scene = roomScene({ walls: [] });
    const withUpper: SpatialContainer = {
      ...scene.containers['space-1']!,
      upperLevelId: 'level-1',
    };
    expect(verticalExtentOf(scene, withUpper)).toEqual({ base: 0, top: 3000 });
  });

  it('no Level above and no upperLevelId → undefined (volume then omitted, not guessed)', () => {
    const scene = roomScene({ walls: [], upperLevel: false });
    expect(verticalExtentOf(scene, scene.containers['space-1']!)).toBeUndefined();
  });
});
