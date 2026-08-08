/**
 * DRAG-HANDLE tests (P4.5 §9). Headless and pure — the projection is injected, so the gizmo's behaviour
 * is asserted here and not left as a browser-only claim (the standing verification split).
 *
 * ⚠ WHAT THESE ARE HOSTILE TO, chosen from how a gizmo can be green and wrong:
 *   (a) **a handle drawn at z=0 for a first-floor wall** — a D52 baseline is 2D in the LEVEL plane, so
 *       the elevation is not decoration; two storeys would stack their gizmos on the ground;
 *   (b) **a world-space hit radius** — grabbable across the room, unmissable from inside the wall;
 *   (c) **a handle minted for an element with no baseline**, which is a control that lies;
 *   (d) **a handle behind the camera being grabbable**, which is a click landing on nothing visible.
 */

import { describe, expect, it } from 'vitest';

import type { Vec3 } from '@bunyan/protocol';
import type { ElementId } from '@bunyan/document';
import type { Project } from './snap';
import type { DragTarget } from './drag';
import { HANDLE_HIT_RADIUS_PX, baselineHandles, handleAt, type DragHandle } from './handles';

const id = (s: string): ElementId => s;

const wall = (
  name: string,
  start: [number, number],
  end: [number, number],
  containerId?: string,
): DragTarget => ({
  elementId: id(name),
  params: { start, end, height: 2800 },
  ...(containerId === undefined ? {} : { containerId }),
});

const opening = (name: string): DragTarget => ({
  elementId: id(name),
  hostId: id('w1'),
  params: { offsetU: 1000, offsetV: 0 },
});

const atGround = (): number => 0;

/** A projection that simply drops z — enough to assert the pixel test without a camera. */
const flat: Project = (p: Vec3) => [p[0], p[1]];

describe('baselineHandles — one handle per authored endpoint, and nothing invented', () => {
  it('mints start then end for each wall', () => {
    const handles = baselineHandles([wall('w1', [0, 0], [4000, 0])], atGround);
    expect(handles).toEqual([
      { elementId: 'w1', end: 'start', point: [0, 0, 0] },
      { elementId: 'w1', end: 'end', point: [4000, 0, 0] },
    ]);
  });

  /**
   * ⚠⚠ THE ELEVATION IS THE THIRD COORDINATE, and getting it wrong is the same defect the corner-drag's
   * peer match had: a D52 baseline carries x and y, and the Level carries z. Two storeys of the same
   * plan would otherwise draw both gizmos on the ground, on top of each other.
   */
  it('⚠⚠ takes z from the element’s LEVEL, not from the baseline', () => {
    const targets = [
      wall('g1', [0, 0], [4000, 0], 'level-0'),
      wall('u1', [0, 0], [4000, 0], 'level-1'),
    ];
    const elevation = (t: DragTarget): number => (t.containerId === 'level-1' ? 3000 : 0);
    expect(baselineHandles(targets, elevation).map((h) => h.point[2])).toEqual([0, 0, 3000, 3000]);
  });

  it('⚠ an element with NO readable baseline contributes no handle, rather than one at a guess', () => {
    expect(baselineHandles([opening('d1')], atGround)).toEqual([]);
    expect(baselineHandles([{ elementId: id('x1'), params: null }], atGround)).toEqual([]);
    // ⚠ And a half-authored baseline yields only the end it actually has.
    const half: DragTarget = { elementId: id('w9'), params: { start: [1, 2] } };
    expect(baselineHandles([half], atGround).map((h) => h.end)).toEqual(['start']);
  });

  it('⚠ only what it is GIVEN — the caller passes the selection, and this mints nothing else', () => {
    const handles = baselineHandles([wall('w1', [0, 0], [4000, 0])], atGround);
    expect(new Set(handles.map((h) => h.elementId))).toEqual(new Set(['w1']));
  });
});

describe('handleAt — the hit test is in PIXELS, and identity survives it', () => {
  const handles: readonly DragHandle[] = [
    { elementId: id('w1'), end: 'end', point: [4000, 0, 0] },
    { elementId: id('w2'), end: 'start', point: [4000, 3000, 0] },
  ];

  it('grabs the handle under the cursor and returns its identity intact', () => {
    const hit = handleAt(handles, flat, [4000, 0]);
    expect(hit).toEqual({ elementId: 'w1', end: 'end', point: [4000, 0, 0] });
  });

  it('⚠ NEAREST IN PIXELS wins — not first, and not nearest in world mm', () => {
    // Both are within tolerance of a cursor between them; w2 is 4 px away and w1 is 8 px.
    const near: readonly DragHandle[] = [
      { elementId: id('w1'), end: 'end', point: [0, 0, 0] },
      { elementId: id('w2'), end: 'start', point: [12, 0, 0] },
    ];
    expect(handleAt(near, flat, [8, 0])?.elementId).toBe('w2');
  });

  it('⚠ a cursor outside the tolerance grabs NOTHING — an empty drag must stay an orbit', () => {
    expect(handleAt(handles, flat, [4000 + HANDLE_HIT_RADIUS_PX + 1, 0])).toBeNull();
    expect(handleAt(handles, flat, [0, 0])).toBeNull();
  });

  /**
   * ⚠⚠ A HANDLE THE CAMERA CANNOT SEE MUST NOT BE GRABBABLE. `project` returns `null` for a point behind
   * the camera or past the far plane; a hit test that treated that as "distance unknown, allow it" would
   * let a click on empty space start dragging a wall the user cannot see, which is the worst kind of
   * gizmo bug because the model changes off-screen.
   */
  it('⚠⚠ ignores a handle the projection cannot see', () => {
    const behind: Project = () => null;
    expect(handleAt(handles, behind, [4000, 0])).toBeNull();
  });

  it('coincident handles resolve to one, deterministically — the same answer every frame', () => {
    const corner: readonly DragHandle[] = [
      { elementId: id('w1'), end: 'end', point: [4000, 0, 0] },
      { elementId: id('w2'), end: 'start', point: [4000, 0, 0] },
      { elementId: id('w3'), end: 'start', point: [4000, 0, 0] },
    ];
    const first = handleAt(corner, flat, [4000, 0]);
    expect(first?.elementId).toBe('w1');
    expect(handleAt(corner, flat, [4000, 0])).toEqual(first);
  });

  it('no handles at all is null, not a throw', () => {
    expect(handleAt([], flat, [0, 0])).toBeNull();
  });
});
