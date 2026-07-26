/**
 * ⚠⚠ THE ROOM SOLVER AND THE DESIGN-OPTION EXCLUSION INVARIANT (D65/D67, row Ⓕ/Ⓖ).
 *
 * Found by the pre-freeze sweep of *"which asserted behaviours have no test that would fail without
 * them?"* — the standing question Entry 58 raised and the owner authorised.
 *
 * D65 wrote the exclusion invariant INTO THE FROZEN CONTRACT (`designoptions.ts`, the ⓥ precedent) so
 * that Bunyan, Planitor and Miqdar would implement ONE rule:
 *
 *   > every consumer that AGGREGATES or PUBLISHES elements — `quantities()`, the project-wide roll-up,
 *   > the Clean Delta exporter, ANY SCHEDULE — MUST resolve an active option set and EXCLUDE every
 *   > element whose `designOptionId` names a non-active option.
 *
 * `assembleRoomInput` walked `Object.values(scene.elements)` and applied no such filter. ⚠ And the
 * failure is WORSE in kind than the double-count D65 predicted: a non-active wall does not merely add
 * itself to a total, it RE-BOUNDS A ROOM THAT IS ENTIRELY MAIN-MODEL — so the corrupted number belongs
 * to an element that is in no option at all, and it is *smaller* than the truth, which is the direction
 * no one audits. A floor area is what paint, ceilings and screed are billed against (D55's own words:
 * "architecture's most-scheduled quantity").
 *
 * ⚠ THE CHRONOLOGY IS THE LESSON (§1c-7, FIFTH occurrence): the room solver was built Entry 41
 * (2026-07-18); the invariant landed Entry 53 (07-23) and cascaded in Entry 57 (07-25). The rule arrived
 * AFTER the code and nobody read it back against it. Entry 58's sweep fixed `enumerate.ts` and
 * `cleandelta.ts` — the two consumers that existed when the rule was written. This one was never swept.
 *
 * PURE (no OCCT): `roomMetrics` never reaches the kernel (D55 Q2), exactly as `room-bounding.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { DocumentContext, createRegistries, emptyScene } from '@bunyan/document';
import type {
  DesignOption,
  Element,
  ElementStyle,
  GeometryGateway,
  Scene,
  SpatialContainer,
  Vec2,
} from '@bunyan/document';

const NO_KERNEL = {
  request: () => Promise.reject(new Error('room bounding must not reach the kernel')),
} as unknown as GeometryGateway;

function wallStyle(thickness: number): ElementStyle {
  return {
    id: 'style-wall',
    name: '200 blockwork',
    typeId: 'core.wall.v1',
    version: 1,
    layers: [{ name: 'structure', materialId: 'mat-block', thickness, discipline: 'structural' }],
  };
}

function wall(id: string, start: Vec2, end: Vec2, designOptionId?: string): Element {
  return {
    id,
    typeId: 'core.wall.v1',
    typeVersion: 1,
    styleId: 'style-wall',
    params: { start, end },
    containerId: 'level-0',
    classification: { ifcClass: 'IfcWall', loadBearing: true },
    ...(designOptionId === undefined ? {} : { designOptionId }),
  };
}

/** The four walls of a 5000×4000 (centerline) room — inner finish 4800×3800 = 18,240,000 mm². */
function fourWalls(): Element[] {
  return [
    wall('w-b', [0, 0], [5000, 0]),
    wall('w-r', [5000, 0], [5000, 4000]),
    wall('w-t', [5000, 4000], [0, 4000]),
    wall('w-l', [0, 4000], [0, 0]),
  ];
}

const TRUE_AREA = 4800 * 3800; // 18,240,000 mm² — the room as it will actually be built.

/**
 * A partition at x = 3000 (200 thick ⇒ faces at 2900/3100) splitting the room. With the seed at
 * [2500, 2000] the LEFT region is 2800 × 3800 = 10,640,000 mm² — 42% short of the truth.
 */
const SPLIT_AREA = 2800 * 3800;

/** Two mutually-exclusive facade schemes; Option A is primary, so Option B is NOT active by default. */
const OPTIONS: Record<string, DesignOption> = {
  'option-a': { id: 'option-a', setName: 'Lobby scheme', name: 'Option A', isPrimary: true },
  'option-b': { id: 'option-b', setName: 'Lobby scheme', name: 'Option B', isPrimary: false },
};

function roomScene(walls: readonly Element[], designOptions?: Record<string, DesignOption>): Scene {
  const containers: Record<string, SpatialContainer> = {
    bld: { id: 'bld', kind: 'building', name: 'B' },
    'level-0': { id: 'level-0', kind: 'level', name: 'L0', parentId: 'bld', elevation: 0 },
    'level-1': { id: 'level-1', kind: 'level', name: 'L1', parentId: 'bld', elevation: 3000 },
    'space-1': {
      id: 'space-1',
      kind: 'space',
      name: 'Room 1',
      parentId: 'level-0',
      location: [2500, 2000],
    },
  };
  const elements: Record<string, Element> = {};
  for (const w of walls) elements[w.id] = w;
  return {
    ...emptyScene(),
    containers,
    elements,
    styles: { 'style-wall': wallStyle(200) },
    ...(designOptions === undefined ? {} : { designOptions }),
  };
}

function areaOf(scene: Scene): number {
  const doc = new DocumentContext({
    registries: createRegistries(),
    geometry: NO_KERNEL,
    scene,
  });
  const metrics = doc.roomMetrics('space-1');
  if (!metrics.enclosed) throw new Error('expected an enclosed room');
  return metrics.area;
}

describe('roomMetrics obeys the design-option exclusion invariant (D65/D67)', () => {
  it('the baseline — a four-wall main-model room measures its true inner area', () => {
    expect(areaOf(roomScene(fourWalls()))).toBeCloseTo(TRUE_AREA, 3);
  });

  it('⚠⚠ A WALL IN A NON-ACTIVE OPTION MUST NOT RE-BOUND THE ROOM', () => {
    const scene = roomScene(
      [...fourWalls(), wall('w-opt-b', [3000, 0], [3000, 4000], 'option-b')],
      OPTIONS,
    );
    // Option A is primary and no selection is passed ⇒ option-b is NOT active ⇒ its partition is not
    // real, and the room is the whole 4800 × 3800. Before the fix this returned SPLIT_AREA.
    expect(areaOf(scene)).toBeCloseTo(TRUE_AREA, 3);
    expect(areaOf(scene)).not.toBeCloseTo(SPLIT_AREA, 3);
  });

  it('the ACTIVE option DOES bound the room — the rule excludes, it does not ignore options', () => {
    const scene = roomScene(
      [...fourWalls(), wall('w-opt-a', [3000, 0], [3000, 4000], 'option-a')],
      OPTIONS,
    );
    // option-a IS the primary ⇒ its partition is real ⇒ the room really is the left half.
    expect(areaOf(scene)).toBeCloseTo(SPLIT_AREA, 3);
  });

  it('an element naming an option the document does not define is excluded (broken-ref precedent)', () => {
    // Same partition, but `designOptions` is absent ⇒ the tag resolves to nothing ⇒ excluded.
    const scene = roomScene([...fourWalls(), wall('w-ghost', [3000, 0], [3000, 4000], 'option-x')]);
    expect(areaOf(scene)).toBeCloseTo(TRUE_AREA, 3);
  });

  it('main-model walls (no designOptionId) always bound the room, options present or not', () => {
    const scene = roomScene([...fourWalls(), wall('w-main', [3000, 0], [3000, 4000])], OPTIONS);
    expect(areaOf(scene)).toBeCloseTo(SPLIT_AREA, 3);
  });
});
