/**
 * THE SPATIAL-QUERY SEAM — Tier 2 of the P4.5 snap design (§4), and the seam the plan said was missing.
 *
 * ⚠⚠ WHY THIS EXISTS AT ALL. Every snap is a geometric question in world space, and before this file **no
 * actor in the app could ask one**. The three seams that already existed each refuse it *by design*: the
 * agent surface returns semantics rather than geometry, `RenderGateway` exposes `tessellate` and nothing
 * else, and `GeometryGateway` belongs to the document (it is how a Type AUTHORS). The kernel has had the
 * exact ops — `distance`, `bounds`, `classifyPoint`, `faceFrame` — live and tested since P3; nothing could
 * reach them.
 *
 * ⚠ WHY IT IS NOT A D19 VIOLATION, and the argument is `RenderGateway`'s verbatim. D19 says
 * `DocumentContext` is the only holder of a `KernelClient`, and the rule is about **authoring**: creating
 * solids no entity owns, minting `SubShapeRef`s no undo can remove. These four ops **mint nothing, own
 * nothing and change nothing** — they read the B-Rep and answer in millimetres. The bootstrap (the one
 * allowed holder) derives this narrow view and hands it down; a tool can ask "how far apart are these"
 * and cannot `makeBox`, cannot `boolean`, and has no client to reach past this interface for.
 * `tests/d19-boundary.test.ts` stays green because nothing here imports `@bunyan/kernel-client`.
 *
 * ⚠⚠ AND THE RULE THAT KEEPS IT HONEST (§4.4 — "approximate never commits silently"): **Tier 1 chooses the
 * target; Tier 2 records the coordinate.** The per-frame snap index is built from the display mesh, which
 * is a CHORD APPROXIMATION of the real surface — a snap that reports a point a millimetre off true
 * geometry is *"the snap that lied"*, and it corrupts a model in a way nobody sees. So a snapped value
 * that becomes a committed argument and whose exactness matters is resolved here, against the B-Rep,
 * before it is written. ⚠ This is emphatically NOT on the per-frame path: a kernel round-trip is ~100 ms,
 * which is a slideshow at 60 fps. Commit boundaries only.
 */

import type {
  BoundsResult,
  ClassifyPointResult,
  DistanceResult,
  FaceFrameResult,
  ShapeHandle,
  Vec3,
} from '@bunyan/protocol';

/**
 * Anything with a protocol `request` — a `KernelClient` structurally satisfies this.
 *
 * ⚠ The four ops are named EXPLICITLY rather than through a generic `request<R>(op: string, …)`, and that
 * is deliberate twice over: a `string` op would (a) not typecheck against `KernelClient`'s typed op map,
 * and (b) make this seam a hole through which any op at all could be called. **The overload list IS the
 * allowlist** — `makeBox` does not typecheck here, and that is the D19 argument made structural rather
 * than written in a comment.
 */
interface SpatialQuerier {
  request(op: 'faceFrame', payload: { handle: ShapeHandle; ref: string }): Promise<FaceFrameResult>;
  request(
    op: 'classifyPoint',
    payload: { handle: ShapeHandle; point: Vec3; tolerance?: number },
  ): Promise<ClassifyPointResult>;
  request(op: 'distance', payload: { a: ShapeHandle; b: ShapeHandle }): Promise<DistanceResult>;
  request(op: 'bounds', payload: { handle: ShapeHandle; ref?: string }): Promise<BoundsResult>;
}

export interface QueryGateway {
  /**
   * A face's exact local frame (origin on the surface, outward normal, two in-plane tangents), read from
   * the B-Rep surface and never from a bounding box. This is what turns a picked face into an exact
   * hosting datum — the "click a face to place a window" path (§4.2), and the reason no human ever types
   * a derivation token.
   */
  faceFrame(
    handle: ShapeHandle,
    ref: string,
  ): Promise<{
    readonly origin: Vec3;
    readonly normal: Vec3;
    readonly uAxis: Vec3;
    readonly vAxis: Vec3;
  }>;

  /** Is a world point inside / outside / on this solid? (mm tolerance defaults to the kernel's own.) */
  classifyPoint(
    handle: ShapeHandle,
    point: Vec3,
    tolerance?: number,
  ): Promise<'inside' | 'outside' | 'on'>;

  /** Minimum distance between two solids, and the two points that realise it. Zero ⇒ they touch. */
  distance(
    a: ShapeHandle,
    b: ShapeHandle,
  ): Promise<{ readonly distance: number; readonly pointA: Vec3; readonly pointB: Vec3 }>;

  /** Tight bounds of a solid, or of one named sub-shape when `ref` is given. */
  bounds(handle: ShapeHandle, ref?: string): Promise<{ readonly min: Vec3; readonly max: Vec3 }>;
}

/**
 * Derive the read-only query view of a kernel client. Called ONLY from `bootstrap.ts`.
 *
 * ⚠ The op list here is the whole security surface: four names, all of them queries. Adding a fifth is a
 * design decision, not a convenience — if the op AUTHORS anything it belongs behind a Command (D19), and
 * if it draws it belongs in `RenderGateway`.
 */
export function createQueryGateway(kernel: SpatialQuerier): QueryGateway {
  return {
    async faceFrame(handle, ref) {
      return kernel.request('faceFrame', { handle, ref });
    },
    async classifyPoint(handle, point, tolerance) {
      const result = await kernel.request('classifyPoint', {
        handle,
        point,
        ...(tolerance === undefined ? {} : { tolerance }),
      });
      return result.state;
    },
    async distance(a, b) {
      return kernel.request('distance', { a, b });
    },
    async bounds(handle, ref) {
      const result = await kernel.request('bounds', {
        handle,
        ...(ref === undefined ? {} : { ref }),
      });
      return result.bounds;
    },
  };
}
