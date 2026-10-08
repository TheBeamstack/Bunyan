// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE KEEP-LIVE SET AND THE LAZY FIRST PAINT (D66 §3a/§3b, T-006,
 * `docs/design/P5_step9_D66_lazy_build_design.md`).
 *
 * ⚠⚠ THE SET IS RUNTIME STATE AND IS NEVER PERSISTED. It is computed here from the camera, the selection
 * and the viewport, held by `App` in React state, and handed to `rebuildOnly` — it never reaches
 * `scene.json`, for the same reason a mesh never does (recipe-is-truth).
 *
 * ⚠ It must be decided from the RECIPE, because the elements in question have no geometry yet. Where the
 * recipe cannot place an element (no baseline, no host), it is KEPT LIVE: a set that skips something the
 * camera can see is a wrong picture, while one that builds something it cannot see only costs time.
 *
 * Pure, so it is asserted headlessly (`keepLive.test.ts`); the frustum itself is the viewport's.
 */

import { baselineOf, elevationOf, totalWallThickness } from '@bunyan/document';
import type { DocumentContext, Element, ElementId, Scene } from '@bunyan/document';

/** An axis-aligned box in world millimetres. */
export interface Bounds {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

/** What the camera sees, as the keep-live set needs it. `Viewport.view()` produces one. */
export interface CameraView {
  /** Does any part of `box` fall inside the view frustum? */
  sees(box: Bounds): boolean;
  /** The orbit target — the point the camera looks at, which decides "the camera's level". */
  readonly target: readonly [number, number, number];
}

/**
 * Where the recipe puts an element, or `undefined` when it cannot say.
 *
 * A baseline element with no `placement` spans its baseline padded by its full thickness (a miter runs
 * past the endpoint), from its level's elevation up by its `height`. A hosted element is placed by its host, because
 * `rebuildOnly` builds it with its host anyway (`affectedAssemblies`).
 */
export function recipeBounds(scene: Scene, element: Element): Bounds | undefined {
  const seen = new Set<ElementId>();
  let cursor: Element | undefined = element;
  while (cursor?.hostId !== undefined && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    cursor = scene.elements[cursor.hostId];
  }
  if (cursor === undefined || cursor.hostId !== undefined) return undefined;
  // A `placement` moves the finished parts after the build; the baseline no longer says where they are.
  if ((cursor.placement?.length ?? 0) > 0) return undefined;

  const baseline = baselineOf(cursor);
  const height = cursor.params['height'];
  if (baseline === undefined || typeof height !== 'number') return undefined;
  const pad = Math.max(totalWallThickness(cursor, scene), 1);
  const z = elevationOf(scene, cursor.containerId);
  return {
    min: [
      Math.min(baseline.start[0], baseline.end[0]) - pad,
      Math.min(baseline.start[1], baseline.end[1]) - pad,
      Math.min(z, z + height),
    ],
    max: [
      Math.max(baseline.start[0], baseline.end[0]) + pad,
      Math.max(baseline.start[1], baseline.end[1]) + pad,
      Math.max(z, z + height),
    ],
  };
}

/**
 * The keep-live set: every element the camera can see, plus the selection, plus every element whose
 * failure only a build can surface — an unregistered Type (D43: an unbuildable element must not be
 * invisible) and a host that does not exist (domain rule 3). Both fail fast; neither is deferred.
 */
export function keepLiveSet(
  scene: Scene,
  view: CameraView,
  selection: Iterable<ElementId>,
  isRegistered: (typeId: string) => boolean,
): readonly ElementId[] {
  const out = new Set<ElementId>();
  for (const id of selection) if (scene.elements[id] !== undefined) out.add(id);
  for (const element of Object.values(scene.elements)) {
    if (!isRegistered(element.typeId)) out.add(element.id);
    else if (element.hostId !== undefined && scene.elements[element.hostId] === undefined) {
      out.add(element.id);
    } else {
      const box = recipeBounds(scene, element);
      if (box === undefined || view.sees(box)) out.add(element.id);
    }
  }
  return [...out];
}

/** The elevation an element is built at — its host's, for a hosted element. */
function elevationOfElement(scene: Scene, element: Element): number {
  let cursor: Element = element;
  const seen = new Set<ElementId>();
  while (cursor.hostId !== undefined && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    const host = scene.elements[cursor.hostId];
    if (host === undefined) break;
    cursor = host;
  }
  return elevationOf(scene, cursor.containerId);
}

/**
 * Order `ids` by container for the first paint: the camera's level first, then outward (§3b).
 *
 * The camera's level is the highest elevation present at or below the orbit target, else the lowest
 * present. Batches are one per elevation, sorted by distance from it; a tie goes to the level below,
 * which is what a viewer standing on a floor sees next.
 */
export function orderByContainer(
  scene: Scene,
  ids: Iterable<ElementId>,
  targetZ: number,
): readonly (readonly ElementId[])[] {
  const byElevation = new Map<number, ElementId[]>();
  for (const id of ids) {
    const element = scene.elements[id];
    if (element === undefined) continue;
    const z = elevationOfElement(scene, element);
    const batch = byElevation.get(z);
    if (batch === undefined) byElevation.set(z, [id]);
    else batch.push(id);
  }
  const elevations = [...byElevation.keys()].sort((a, b) => a - b);
  if (elevations.length === 0) return [];
  const below = elevations.filter((z) => z <= targetZ);
  const home = below.length > 0 ? below[below.length - 1]! : elevations[0]!;
  elevations.sort((a, b) => Math.abs(a - home) - Math.abs(b - home) || a - b);
  return elevations.map((z) => byElevation.get(z)!);
}

/**
 * Build the keep-live set's unbuilt elements, one container batch at a time, calling `painted` after
 * each so the caller can draw it. The first batch is the first paint. Only `rebuildOnly` is called —
 * no new document API (design §4).
 */
export async function buildKeepLive(
  doc: DocumentContext,
  view: CameraView,
  selection: Iterable<ElementId>,
  painted: (batch: readonly ElementId[]) => void,
): Promise<number> {
  const scene = doc.scene;
  const live = keepLiveSet(
    scene,
    view,
    selection,
    (t) => doc.registries.types.get(t) !== undefined,
  );
  const deferred = live.filter((id) => doc.geometryOf(id) === undefined);
  const batches = orderByContainer(scene, deferred, view.target[2]);
  for (const batch of batches) {
    await doc.rebuildOnly(batch);
    painted(batch);
  }
  return deferred.length;
}
