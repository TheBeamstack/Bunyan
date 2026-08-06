/**
 * THE VIEW BODY — a drawing is a PROJECTION of the B-Rep, and this file is where that becomes true.
 *
 * ⚠⚠ WHAT THIS MODULE IS FOR, IN ONE SENTENCE: it turns a stored `ViewDescriptor` (a recipe — a plane,
 * a scale, a clip) into `ViewCurve`s carrying the SAME sub-shape identities the 3D model carries, so a
 * dimension anchored in plan is anchored to the wall's face and survives the wall being edited. A
 * drawing that returned anonymous polylines would be a picture, and pictures go stale.
 *
 * ⚠ D81/Q1 — v1.0.0 PROJECTS THE CUT ONLY. Ruled 2026-08-03 against two measurements from Entry 69:
 * a cut curve attributes perfectly (`Generated()` gives 4/4, 1/1, 8/8, zero orphans) at flat cost
 * (1.28–1.31 ms/solid), while the projected half cannot attribute AT ALL (HLR shares 0 of 4
 * `IsSame()` with its input) and rises ≈N^1.5 against D48's binding 10,000-element target. So every
 * curve this file emits carries a real `ref`. `cut+projection` is an additive `mode` the frozen
 * payload already provides for.
 *
 * ⚠⚠ AND THE ARCHITECTURAL DECISION, WHICH IS THE SCHEDULES ONE AGAIN (D78): THIS MODULE HAS NO
 * ENUMERATION LOOP OF ITS OWN. It consumes `modelElements()`. Every defect Entry 65 measured against a
 * hand-rolled walk — a curtain wall contributing 0 of its 17 real elements, a throw on the pure
 * composite, a non-active design option double-drawn — is a defect a DRAWING has in exactly the same
 * way a schedule does, and they close by the same one decision. ⚠ A plan that silently omits every
 * curtain-wall panel is D78's empty-table failure mode with a worse consumer, because a drawing is
 * what gets BUILT FROM.
 *
 * ⚠ Entry 65's rule, verbatim: EVERY RESULT TYPE LIVES WITH THE BODY, never in `documentation.ts`. So
 * `documentation.ts` keeps the stored `ViewDescriptor`, and `ViewCurve`/`ViewResult` live here — which
 * makes stored-vs-derived legible from the file a type is in, and greppable.
 */
import type { SectionCurve } from '@bunyan/protocol';
import { unresolvedDesignOptions } from './designoptions.js';
import type { ContainerId, ElementId, SpatialContainer } from './entities.js';
import type { Scene } from './scene.js';
import type { ViewDescriptor } from './documentation.js';
import type { ModelElement } from './enumerate.js';

/** A world-mm vector, as every descriptor and the `sectionCut` payload express one. */
export type Vec3 = readonly [number, number, number];

/**
 * The cutting plane a descriptor resolves to, in the exact shape `sectionCut` takes.
 *
 * ⚠ `xAxis` is not decoration — it FIXES THE 2D FRAME the resulting coordinates are expressed in.
 * Two runs that pick different x-axes for the same plane produce the same drawing rotated, and a
 * dimension stored against one would read wrong against the other. It is derived deterministically
 * from the normal below, never chosen per-call.
 */
export interface CutPlane {
  readonly origin: Vec3;
  readonly normal: Vec3;
  readonly xAxis: Vec3;
}

/**
 * One curve in the drawing — a `SectionCurve` plus the element it belongs to.
 *
 * ⚠ THE `elementId` IS NOT REDUNDANT WITH `ref`. A `SubShapeRef` names a FACE of a PART; a consumer
 * that wants "which wall is this line" would otherwise have to reverse the token, which is exactly the
 * kind of re-derivation D74 says to stop doing at the consumer. The one walk that knows already knows.
 */
export interface ViewCurve {
  readonly elementId: ElementId;
  /** The authored `scene.elements` row this belongs to — itself, when this element IS one (D59). */
  readonly rootId: ElementId;
  readonly curve: SectionCurve;
}

/**
 * An element the drawing could not project.
 *
 * ⚠⚠ IT EXISTS BECAUSE ONE REFUSAL COSTS ITS ELEMENT, NEVER THE DRAWING (domain rule 4 / D75, the
 * `projectQuantities` discipline one artifact along). An element whose section fails is reported HERE,
 * beside the curves — never dropped silently. A plausible, short drawing is exactly what nobody audits,
 * and a drawing is the artifact people build from.
 */
export interface UnprojectedElement {
  readonly elementId: ElementId;
  readonly reason: string;
}

export interface ViewResult {
  readonly viewId: string;
  readonly kind: ViewDescriptor['kind'];
  /** The plane actually cut — echoed so a consumer can place annotations in the same 2D frame. */
  readonly plane: CutPlane;
  readonly curves: readonly ViewCurve[];
  /** Elements that failed to project. Empty is the normal case; non-empty is never silent. */
  readonly unprojected: readonly UnprojectedElement[];
}

/* ================================================================================================
 * THE VALIDATOR — and it lives HERE, beside the grammar it validates, never in `commands.ts`.
 *
 * ⚠ Entry 68's Q1 discipline: the grammar has exactly ONE home, and `commands.ts` only turns these
 * issues into a typed `CommandFailure`. A validator in the command layer is a second home for the
 * grammar, and two homes drift.
 * ============================================================================================= */

const KINDS: readonly string[] = ['plan', 'section', 'elevation', '3d'];

function isZeroVector(v: Vec3 | undefined): boolean {
  return v === undefined || (v[0] === 0 && v[1] === 0 && v[2] === 0);
}

/**
 * Every reason a descriptor may not be authored. Empty ⇒ it may.
 *
 * ⚠⚠ THE VERBS CARRY THE REFUSAL THE BODY WILL NOT, AND THAT ASYMMETRY IS DELIBERATE. A projection
 * must never deny a builder his drawing (rule 17), so `projectView` DEGRADES — it returns what it can
 * and reports what it could not. That makes the authoring door the ONLY place a malformed descriptor
 * can be stopped, which is why each line below is here rather than in the projector.
 */
export function viewDescriptorIssues(descriptor: ViewDescriptor, scene: Scene): readonly string[] {
  const issues: string[] = [];

  // ⚠ CHECKED BEFORE THE SWITCH, not as a `default` inside it — `schedule.ts`'s measured lesson. The
  // union makes an unknown `kind` impossible to TypeScript and entirely possible at runtime: a
  // descriptor arrives from an agent's args or a hand-edited `.bnn`, neither of which the compiler saw.
  if (!KINDS.includes(descriptor.kind)) {
    issues.push(`view kind "${descriptor.kind}" is not one of ${KINDS.join(', ')}`);
    return issues;
  }

  // A blank name is a plausible empty artifact in the sheet list — the D78 failure mode again.
  if (descriptor.name.trim() === '') issues.push('a view needs a name');

  // `scale` divides annotation sizing. Zero or negative is a division by zero or a mirrored drawing.
  if (!(descriptor.scale > 0)) {
    issues.push(`a view's scale must be greater than 0, and it is ${descriptor.scale}`);
  }

  // ⚠ A clip whose min exceeds its max on ANY axis encloses nothing, and an empty drawing looks
  // exactly like "nothing is on this line" — D78's empty-table failure mode on a new artifact.
  if (descriptor.clip !== undefined) {
    const [min, max] = descriptor.clip;
    for (let axis = 0; axis < 3; axis += 1) {
      if ((min[axis] ?? 0) > (max[axis] ?? 0)) {
        issues.push(
          `clip is empty on axis ${'xyz'[axis]} — min ${min[axis]} exceeds max ${max[axis]}, ` +
            `which draws nothing and reads as "nothing is here"`,
        );
      }
    }
  }

  // ⚠ An unknown design option is never silently dropped — Entry 68's rule. Silently ignoring it would
  // show the PRIMARY option while the descriptor says otherwise: a drawing that claims to be Option B
  // and is Option A.
  //
  // ⚠⚠ THE LOOKUP IS `designoptions.ts`'s, NOT A SECOND COPY OF IT. This loop used to re-implement it,
  // so one rule had two homes and they had already drifted apart in the prose describing them (Entry 83's
  // sweep). ⚠ The REFUSAL stays here and stays different from the schedule door's on purpose: a view
  // reports every descriptor problem at once, so an unresolved option is COLLECTED into `issues` and
  // surfaces as `REFUSED`, while the schedule door throws `NOT_FOUND` on the first. Both codes are
  // agent-visible surface — the predicate is shared, the throw is not.
  for (const optionId of unresolvedDesignOptions(scene, descriptor.designOptionIds)) {
    issues.push(`designOptionId "${optionId}" names no design option in this document`);
  }

  switch (descriptor.kind) {
    case 'plan': {
      const container: SpatialContainer | undefined = scene.containers[descriptor.levelId];
      if (container === undefined) {
        issues.push(`levelId "${descriptor.levelId}" names no container in this document`);
      } else if (container.kind !== 'level') {
        // ⚠ A PLAN CUT AT A BUILDING IS NOT A PLAN. The container exists, so a bare existence check
        // passes and the drawing comes back empty or nonsensical — the descriptor must name the datum
        // it actually hangs from.
        issues.push(
          `levelId "${descriptor.levelId}" names a ${container.kind}, not a level — ` +
            `a plan is cut at a Level, which is the only container carrying an elevation datum`,
        );
      }
      break;
    }
    case 'section':
      // ⚠ THE ZERO NORMAL. It yields a degenerate plane and, in the cut, an EMPTY DRAWING that looks
      // exactly like "nothing is on this line". This is the single refusal in this list most likely to
      // be hit by an agent composing args, because 0 is every vector field's default.
      if (isZeroVector(descriptor.normal)) {
        issues.push(
          'a section needs a non-zero normal — the zero vector is a degenerate plane and cuts nothing',
        );
      }
      break;
    case 'elevation':
      if (isZeroVector(descriptor.direction)) {
        issues.push(
          'an elevation needs a non-zero direction — the zero vector gives no look direction',
        );
      }
      break;
    case '3d':
      // `direction` is optional on a 3D view (absent ⇒ the default axonometric), but an explicitly
      // authored ZERO is still a degenerate camera rather than an absent one.
      if (descriptor.direction !== undefined && isZeroVector(descriptor.direction)) {
        issues.push("a 3d view's direction, when given, must be non-zero");
      }
      break;
  }

  return issues;
}

/* ================================================================================================
 * THE PLANE
 * ============================================================================================= */

function normalise(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]);
  // Callers reach here only past `viewDescriptorIssues`, but `projectView` degrades rather than
  // throws (rule 17), so a zero vector must return something inert rather than NaNs.
  if (length === 0) return [0, 0, 1];
  return [v[0] / length, v[1] / length, v[2] / length];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/**
 * A DETERMINISTIC x-axis for a plane — the 2D frame the drawing's coordinates live in.
 *
 * ⚠⚠ DETERMINISM IS THE WHOLE REQUIREMENT AND IT IS EASY TO MISS. Any vector perpendicular to the
 * normal is a mathematically valid x-axis, so a "pick something perpendicular" implementation is
 * correct per-call and WRONG across calls: the same view re-projected after an unrelated edit would
 * come back rotated, and every dimension stored against the old frame would read against the new one.
 * The choice below is a pure function of the normal, so it cannot drift.
 */
export function xAxisFor(normal: Vec3): Vec3 {
  const n = normalise(normal);
  // Pick the world axis LEAST parallel to the normal, so the cross product is never near-degenerate.
  const seed: Vec3 =
    Math.abs(n[2]) < Math.abs(n[0]) && Math.abs(n[2]) < Math.abs(n[1])
      ? [0, 0, 1]
      : Math.abs(n[0]) <= Math.abs(n[1])
        ? [1, 0, 0]
        : [0, 1, 0];
  return normalise(cross(seed, n));
}

/** Revit's default cut-plane height above a level's datum, in mm, when a plan declares none. */
export const DEFAULT_CUT_HEIGHT = 1200;

/**
 * The plane a descriptor cuts. `undefined` ⇒ this view kind has no cut plane in v1.0.0.
 *
 * ⚠ `3d` returns `undefined` DELIBERATELY, and it is not an oversight to be filled in later: a 3D view
 * is not a section, it is the model itself, and the renderer already serves it from `tessellate`
 * through its own gateway. Projecting one through `sectionCut` would be asking a 2D op for a 3D answer.
 */
export function cutPlaneFor(descriptor: ViewDescriptor, scene: Scene): CutPlane | undefined {
  switch (descriptor.kind) {
    case 'plan': {
      const level = scene.containers[descriptor.levelId];
      const elevation = level?.elevation ?? 0;
      const height = descriptor.cutHeight ?? DEFAULT_CUT_HEIGHT;
      const normal: Vec3 = [0, 0, 1];
      return {
        // A plan is a horizontal cut at `cutHeight` ABOVE the level's own elevation datum.
        origin: [0, 0, elevation + height],
        normal,
        xAxis: xAxisFor(normal),
      };
    }
    case 'section':
      return {
        origin: descriptor.origin,
        normal: normalise(descriptor.normal),
        xAxis: xAxisFor(descriptor.normal),
      };
    case 'elevation':
      // An elevation is a section whose plane is placed at the world origin and faces the look
      // direction. The clip is what bounds it; the descriptor carries no origin of its own.
      return {
        origin: [0, 0, 0],
        normal: normalise(descriptor.direction),
        xAxis: xAxisFor(descriptor.direction),
      };
    case '3d':
      return undefined;
  }
}

/* ================================================================================================
 * THE PRE-FILTER — what keeps the cost per-LEVEL rather than per-MODEL
 * ============================================================================================= */

/** An element's world-mm axis-aligned bounds, as the caller measured them. */
export interface ElementBounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

/**
 * Does this element's bounding box straddle the plane (and fall inside the clip)?
 *
 * ⚠ BOUNDING-BOX ONLY, AND THAT IS THE POINT (§1.4). The cheap test throws away everything the plane
 * cannot possibly touch BEFORE any kernel call, which is what makes a plan cost per-LEVEL instead of
 * per-MODEL at D48's 10,000-element target. It is deliberately CONSERVATIVE: a box that straddles the
 * plane may still contribute no curve (the solid inside it may not reach), and that is fine — a false
 * keep costs one kernel call, a false drop costs a missing wall in a drawing someone builds from.
 */
export function straddlesPlane(bounds: ElementBounds, plane: CutPlane): boolean {
  const n = normalise(plane.normal);
  const d = (p: Vec3): number =>
    (p[0] - plane.origin[0]) * n[0] +
    (p[1] - plane.origin[1]) * n[1] +
    (p[2] - plane.origin[2]) * n[2];

  // Signed distance of all eight corners; the box straddles iff they are not all on one side.
  let anyBelow = false;
  let anyAbove = false;
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const distance = d([x, y, z]);
        if (distance <= 0) anyBelow = true;
        if (distance >= 0) anyAbove = true;
      }
    }
  }
  return anyBelow && anyAbove;
}

/** Does this element's box overlap the view's clip? Absent clip ⇒ everything overlaps. */
export function withinClip(bounds: ElementBounds, descriptor: ViewDescriptor): boolean {
  if (descriptor.clip === undefined) return true;
  const [min, max] = descriptor.clip;
  for (let axis = 0; axis < 3; axis += 1) {
    if (bounds.max[axis]! < min[axis]! || bounds.min[axis]! > max[axis]!) return false;
  }
  return true;
}

/**
 * The design-option selection a view resolves to — `evaluateSchedule`'s EXACT rule, deliberately.
 *
 * ⚠ The descriptor's own `designOptionIds` wins for the sets it names; the caller's `active` covers
 * every other set; absent ⇒ each set's primary. A view saved as "the Option B plan" shows Option B
 * when it is opened, exactly as a schedule saved that way does. Two artifacts answering the same
 * question two ways would be a defect nobody could see until the drawing and the table disagreed.
 */
export function activeForView(
  descriptor: ViewDescriptor,
  catalogue: Scene['designOptions'],
  callerActive: Readonly<Record<string, string>> | undefined,
): Readonly<Record<string, string>> {
  const active: Record<string, string> = { ...(callerActive ?? {}) };
  if (descriptor.designOptionIds !== undefined && catalogue !== undefined) {
    for (const optionId of descriptor.designOptionIds) {
      const option = catalogue[optionId];
      if (option !== undefined) active[option.setName] = optionId;
    }
  }
  return active;
}

/**
 * Assemble the result from what the kernel returned.
 *
 * ⚠ Pure, and separated from the async orchestration in `document.ts` for the same reason
 * `projectSchedule` is separated from `evaluateSchedule`: the part with the judgement in it should be
 * testable without a kernel.
 */
export function assembleViewResult(
  descriptor: ViewDescriptor,
  plane: CutPlane,
  perElement: readonly {
    readonly element: Pick<ModelElement, 'id' | 'rootId'>;
    readonly curves: readonly SectionCurve[];
  }[],
  unprojected: readonly UnprojectedElement[],
): ViewResult {
  const curves: ViewCurve[] = [];
  for (const { element, curves: found } of perElement) {
    for (const curve of found) {
      curves.push({ elementId: element.id, rootId: element.rootId, curve });
    }
  }
  return {
    viewId: descriptor.id,
    kind: descriptor.kind,
    plane,
    curves,
    unprojected,
  };
}

/** Every container id on the path from a level up to its root — used to scope a plan. */
export function levelScope(scene: Scene, levelId: ContainerId): ReadonlySet<ContainerId> {
  const scope = new Set<ContainerId>([levelId]);
  for (const [id, container] of Object.entries(scene.containers)) {
    let cursor: SpatialContainer | undefined = container;
    while (cursor !== undefined) {
      if (cursor.id === levelId) {
        scope.add(id);
        break;
      }
      cursor = cursor.parentId === undefined ? undefined : scene.containers[cursor.parentId];
    }
  }
  return scope;
}
