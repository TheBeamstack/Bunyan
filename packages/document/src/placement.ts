/**
 * THE PLACEMENT ALGEBRA — and the ONE RULE the five move verbs turn on (P4.5 §9/§10, owner-ruled Q4/Q5,
 * 2026-07-30).
 *
 * ⚠⚠ THE RULED SPLIT, RESTATED SO IT IS NEVER RE-DERIVED: **an element whose position lives in its PARAMS
 * moves by `core.setParams`; an element whose position lives in its `placement` moves by `core.move` /
 * `core.setPlacement`.** A D52 baseline wall is the first kind (a whole-wall drag translates BOTH
 * endpoints); a GenericSolid or a placed family is the second. *So the commonest "move" in the product
 * never calls these verbs, and that is correct rather than a gap.*
 *
 * ⚠⚠⚠ AND HERE IS WHAT BUILDING IT MEASURED, WHICH THE RULING'S OWN EXAMPLE GETS WRONG: the ruling names
 * *"an Opening's offset"* as the placement-positioned case, and **it is not.** Of the three shipped MVP
 * Types, **all three position themselves from PARAMS**:
 *
 *     core.wall          {start,end}          the D52 baseline           (params)
 *     core.opening       {offsetU,offsetV}    from the host face         (params — and see below)
 *     core.curtainwall   {origin}             [x,y] min corner           (params)
 *
 * ⚠⚠ **A HOSTED ELEMENT'S OWN `placement` IS NEVER READ BY THE ENGINE AT ALL** — `build.ts` cuts the void
 * in the HOST's local frame and rides the leaf out on **the host's** placement (*"it is the HOST's placement
 * the leaf rides, never the opening's"*). So `core.move` on a door would write a field nothing reads, the
 * command would SUCCEED, the journal would record a move, the Clean Delta would tell Planitor the door
 * moved — **and the door would not have moved.** That is not a missing feature; it is a plausible wrong
 * building, which is the one failure this project refuses to ship (D42/D45's discipline, D70's shape).
 *
 * ⇒ **THE GUARD BELOW IS THAT REFUSAL, AND IT IS DERIVED FROM ENGINE BEHAVIOUR, NEVER FROM A TYPE LIST.**
 * Each rung names a place where the *recipe* already decides where the element is, so a placement written
 * beside it is either ignored (host) or contradicted (baseline, datum):
 *
 *   | rung       | who derives the position          | what a placement verb would contradict            |
 *   |------------|-----------------------------------|---------------------------------------------------|
 *   | `host`     | `build.ts` (the host's frame)     | nothing — it is a NO-OP, which is worse            |
 *   | `baseline` | `joins.ts` / `room.ts` / D72       | joins, room bounding, the billed axis length       |
 *   | `datum`    | `scene.ts`'s constraint resolver  | the grid intersection (XY) / the Level span (Z)    |
 *
 * ⚠ The `datum` rung is deliberately PER-AXIS: a `grid` constraint derives XY and a `base`/`top` pair
 * derives Z, so a level-constrained curtain wall may still be slid sideways, and a grid-constrained column
 * may still be rotated about its own frame origin (a rotation that displaces nothing displaces nothing).
 * Refusing the whole element there would have been simpler and would have blocked ordinary, correct
 * gestures.
 *
 * ⚠⚠ WHAT IS DELIBERATELY **NOT** A RUNG, MEASURED RATHER THAN ASSUMED: **`containerId`.** It resolves to
 * an elevation that some Types read (`ctx.elevation`) and others ignore, and the product's own existing
 * convention is *`containerId` + an explicit vertical placement* — that is how the 5-storey scale fixtures
 * put a column on storey N, and it has been how they do it since P4. So a container is an ADDRESS here
 * (the LBS, D35), not a datum, and treating it as one would refuse the established idiom. Named so nobody
 * re-derives it; if a Type ever positions itself from `ctx.elevation` AND is moved, that is the case to
 * re-open this on.
 *
 * ⚠ Everything here is PURE — no scene mutation, no kernel, no failure type (`CommandFailure` lives in
 * `commands.ts`, which imports this file; the refusals are returned as strings so the algebra stays
 * testable on its own and the import graph stays a tree).
 */

import type { RigidMotion, Vec3 } from '@bunyan/protocol';
import type { DatumConstraint, Element, ElementId } from './entities.js';
import { baselineOf } from './joins.js';
import type { Scene } from './scene.js';
import { constraintsOf } from './scene.js';

/**
 * Below this, a displacement is not a move (mm). It exists because the frame-origin comparison below is
 * arithmetic on doubles: rotating an element about its own origin must come back EXACTLY where it was, and
 * "exactly" through a sine and a cosine is a nanometre.
 */
const DISPLACEMENT_TOL = 1e-6;

/* ================================================================================================
 * Vector arithmetic. Small, local and unexported except where a command needs it — the kernel owns
 * geometry, and this file owns only enough of it to answer "where did the element's own origin go?".
 * ============================================================================================= */

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** The unit vector, or `undefined` for a zero-length one — which every caller must refuse, never guess. */
function unit(v: Vec3): Vec3 | undefined {
  const length = Math.sqrt(dot(v, v));
  if (!Number.isFinite(length) || length === 0) return undefined;
  return scale(v, 1 / length);
}

function isVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

/* ================================================================================================
 * MOTIONS — building them, validating them, and applying them TO A POINT
 * ============================================================================================= */

/**
 * Append a translation, **merging into a trailing translate** — `translate(a)` then `translate(b)` IS
 * `translate(a+b)`, exactly, so the merge changes no geometry and keeps the array bounded.
 *
 * ⚠ Without it a drag is unbounded authored state: a gizmo that commits per frame would leave a hundred
 * motions in `scene.json`, saved into every `.bnn` forever and re-applied on every rebuild. The merge is
 * the reason `core.move` can be dispatched as often as a pointing device produces one.
 */
export function withTranslation(
  placement: readonly RigidMotion[] | undefined,
  by: Vec3,
): readonly RigidMotion[] {
  const motions = placement ?? [];
  const last = motions[motions.length - 1];
  if (last !== undefined && last.kind === 'translate') {
    return [...motions.slice(0, -1), { kind: 'translate', by: add(last.by, by) }];
  }
  return [...motions, { kind: 'translate', by }];
}

/**
 * Append a rotation about a WORLD point. `about` is resolved by the caller — `core.rotate` defaults it to
 * the element's own frame origin (`frameOriginOf`), which is what makes an un-`about`ed rotate spin the
 * element in place instead of **orbiting it around the world origin**. That distinction is not cosmetic:
 * on an element placed 5 m out, the naive version throws it across the site.
 */
export function withRotation(
  placement: readonly RigidMotion[] | undefined,
  axis: Vec3,
  degrees: number,
  about: Vec3,
): readonly RigidMotion[] {
  return [...(placement ?? []), { kind: 'rotate', axis, degrees, origin: about }];
}

/**
 * Everything malformed about a placement array, named. Empty ⇒ it is well-formed.
 *
 * ⚠ WHY THE VERB VALIDATES RATHER THAN LETTING THE KERNEL REFUSE: `placement` is **authored state** — it
 * is written into `scene.json` and saved into the `.bnn`. A malformed motion that reaches the kernel comes
 * back as `GEOMETRY_FAILED`, which reads as *"this element's geometry broke"* when the truth is *"your
 * argument was not a rigid motion"* — Entry 71's Finding 3 one layer up (a refusal a caller must classify
 * will eventually be classified wrongly). And a zero-length axis is exactly the case the protocol's own
 * comment says *"must not be zero-length"* about.
 */
export function motionIssues(motions: unknown): readonly string[] {
  if (!Array.isArray(motions)) return ['placement must be an array of rigid motions'];
  const issues: string[] = [];
  motions.forEach((raw, i) => {
    const at = `placement[${String(i)}]`;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      issues.push(`${at} must be a rigid motion object`);
      return;
    }
    const motion = raw as Record<string, unknown>;
    const origin = motion['origin'];
    if (origin !== undefined && !isVec3(origin)) {
      issues.push(`${at}.origin must be an [x, y, z] point in mm`);
    }
    switch (motion['kind']) {
      case 'translate': {
        if (!isVec3(motion['by'])) issues.push(`${at}.by must be an [x, y, z] vector in mm`);
        return;
      }
      case 'rotate': {
        const axis = motion['axis'];
        if (!isVec3(axis)) issues.push(`${at}.axis must be an [x, y, z] direction`);
        else if (unit(axis) === undefined) issues.push(`${at}.axis must not be zero-length`);
        if (typeof motion['degrees'] !== 'number' || !Number.isFinite(motion['degrees'])) {
          issues.push(`${at}.degrees must be a finite number of DEGREES`);
        }
        return;
      }
      case 'mirror': {
        const normal = motion['normal'];
        if (!isVec3(normal)) issues.push(`${at}.normal must be an [x, y, z] plane normal`);
        else if (unit(normal) === undefined) issues.push(`${at}.normal must not be zero-length`);
        return;
      }
      default:
        issues.push(
          `${at}.kind must be "translate", "rotate" or "mirror", got ${JSON.stringify(motion['kind'])}`,
        );
    }
  });
  return issues;
}

/**
 * Where a point ends up after the motions are applied IN ORDER. `undefined` ⇒ a degenerate motion (a
 * zero-length axis or normal), which is refused rather than silently treated as the identity.
 *
 * ⚠ This is the ONLY geometry in the document layer, and it is deliberately tiny: it answers one question
 * — *"where did the element's own frame origin go?"* — which the guard below needs and the kernel cannot be
 * asked (it holds solids, not recipes, and the answer is needed BEFORE anything is built).
 */
export function applyMotions(point: Vec3, motions: readonly RigidMotion[]): Vec3 | undefined {
  let p = point;
  for (const motion of motions) {
    switch (motion.kind) {
      case 'translate': {
        p = add(p, motion.by);
        break;
      }
      case 'rotate': {
        const k = unit(motion.axis);
        if (k === undefined) return undefined;
        const about = motion.origin ?? [0, 0, 0];
        const v = sub(p, about);
        const theta = (motion.degrees * Math.PI) / 180;
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        // Rodrigues: v·cosθ + (k × v)·sinθ + k·(k·v)(1 − cosθ).
        const rotated = add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)));
        p = add(about, rotated);
        break;
      }
      case 'mirror': {
        const n = unit(motion.normal);
        if (n === undefined) return undefined;
        const about = motion.origin ?? [0, 0, 0];
        const d = sub(p, about);
        p = add(about, sub(d, scale(n, 2 * dot(d, n))));
        break;
      }
    }
  }
  return p;
}

/**
 * The element's OWN frame origin, in the world — its `placement` applied to `[0,0,0]`.
 *
 * ⚠ An element is authored in its own build frame and placed afterwards (`entities.ts`, D25), so this
 * point is the element's own anchor: it is what `core.rotate` spins about when the caller names no
 * `about`, and it is the point whose displacement the guard measures.
 */
export function frameOriginOf(element: Element): Vec3 | undefined {
  return applyMotions([0, 0, 0], element.placement ?? []);
}

/* ================================================================================================
 * THE GUARD — where the recipe already decides the position
 * ============================================================================================= */

/** Which part of an element's position the RECIPE derives — the reason a placement verb may refuse. */
export type RecipePositioning =
  | { readonly kind: 'host'; readonly hostId: ElementId }
  | { readonly kind: 'baseline' }
  | { readonly kind: 'datum'; readonly plan: boolean; readonly vertical: boolean };

/**
 * What derives this element's position, other than its `placement`. `undefined` ⇒ nothing does, so the
 * placement verbs own it outright.
 *
 * ⚠ Read in rung order, and the order is not arbitrary: a hosted element's placement is *ignored*, which
 * outranks every other objection because no motion of any size can be right.
 */
export function positioningOf(
  scene: Scene,
  element: Element,
  /**
   * The element's datum constraints, when they are not (yet) in the scene — `core.createElement` mints an
   * element and its constraints in ONE edit (D50 step 0b), so at that moment the scene cannot answer.
   */
  datumConstraints?: readonly DatumConstraint[],
): RecipePositioning | undefined {
  if (element.hostId !== undefined) return { kind: 'host', hostId: element.hostId };
  // ⚠ The SAME function the join resolver uses to decide whether an element is a baseline wall — so this
  // is not a guess about a Type, it is the engine's own test (`joins.ts`, D52/D69/D72).
  if (baselineOf(element) !== undefined) return { kind: 'baseline' };
  const datums = datumConstraints ?? constraintsOf(scene, element.id);
  const plan = datums.some((c) => c.kind === 'grid');
  const vertical = datums.some((c) => c.kind === 'base' || c.kind === 'top');
  if (plan || vertical) return { kind: 'datum', plan, vertical };
  return undefined;
}

/**
 * Does this placement change alter the element's ORIENTATION, or is it a pure translation?
 *
 * ⚠⚠ IT DECIDES WHETHER THE FRAME-ORIGIN TEST IS EXACT, AND THAT IS A PROVABLE THING RATHER THAN A
 * HEURISTIC. If the non-translate motions are unchanged, every point of the solid is displaced by exactly
 * the same vector as the frame origin — including when the edited translation sits BEFORE a rotation,
 * where both the origin and every other point move by `R(Δ)`. So the per-axis datum test below reads the
 * true displacement of the whole element.
 *
 * ⚠ When the orientation DOES change, the frame origin says nothing about where the solid went: a Type
 * may build its solid anywhere relative to its own origin (the grid-placed member builds itself centred on
 * `ctx.gridPoint`, metres away from the origin it would spin about), and only the Type knows that. So a
 * reorientation of a datum-positioned element is refused rather than measured — the honest answer, since
 * the number that would justify it does not exist in this layer.
 */
export function reorients(
  before: readonly RigidMotion[] | undefined,
  after: readonly RigidMotion[] | undefined,
): boolean {
  return canonicalTurns(before) !== canonicalTurns(after);
}

/** The rotate/mirror motions, in order, as a string that does not depend on key order. */
function canonicalTurns(motions: readonly RigidMotion[] | undefined): string {
  return (motions ?? [])
    .filter((m) => m.kind !== 'translate')
    .map((m) =>
      m.kind === 'rotate'
        ? `rotate:${m.axis.join(',')}:${String(m.degrees)}:${(m.origin ?? [0, 0, 0]).join(',')}`
        : `mirror:${m.normal.join(',')}:${(m.origin ?? [0, 0, 0]).join(',')}`,
    )
    .join('|');
}

/**
 * The refusal a placement verb owes for displacing this element's frame origin `from` → `to`, or
 * `undefined` when the move is the element's own business.
 *
 * ⚠ ONE WORDING, SHARED BY ALL FOUR VERBS (domain rule 10's discipline): a refusal three products will meet
 * should not be four differently-worded guesses at one cause. Every branch NAMES the road that does work,
 * because a refusal nobody can act on has stopped being a refusal (rule 3's lesson).
 *
 * @param turns `true` when the change also REORIENTS the element (`reorients`), which is when the
 *   frame-origin displacement stops describing the solid's.
 */
export function positioningRefusal(
  positioning: RecipePositioning | undefined,
  from: Vec3,
  to: Vec3,
  turns = false,
): string | undefined {
  if (positioning === undefined) return undefined;
  const d = sub(to, from);
  const movedInPlan = Math.abs(d[0]) > DISPLACEMENT_TOL || Math.abs(d[1]) > DISPLACEMENT_TOL;
  const movedVertically = Math.abs(d[2]) > DISPLACEMENT_TOL;

  switch (positioning.kind) {
    case 'host':
      return (
        `this element is HOSTED on "${positioning.hostId}", and a hosted element's own \`placement\` is ` +
        `never read: the engine cuts its void in the HOST's frame and rides its leaf out on the HOST's ` +
        `placement (build.ts). Writing one here would succeed, change no geometry, and tell the change ` +
        `feed the element moved — so it is refused. Move it with \`core.setParams\` (a door is positioned ` +
        `by its own offset params along the host face), or move the HOST.`
      );
    case 'baseline':
      return (
        `this element is positioned by its {start, end} BASELINE params (D52), which is also what the ` +
        `join resolver, the room solver and the billed axis length are derived from (joins.ts, room.ts, ` +
        `D72). A placement written beside them moves the SOLID and leaves every one of those derivations ` +
        `at the old baseline. Translate the baseline instead: \`core.setParams\` with both endpoints ` +
        `moved (dragging one end is \`core.setParams\` on that endpoint alone) — the owner-ruled split, ` +
        `P4.5 design §9.`
      );
    case 'datum': {
      if (turns) {
        return (
          `this element's position is derived from a datum constraint (${positioning.plan ? 'a `grid` intersection' : 'a `base`/`top` Level span'}), and this ` +
          `verb also REORIENTS it. Where a rotation carries the solid depends on where the Type builds ` +
          `it relative to its own frame origin — a grid-placed member builds itself centred on the grid ` +
          `POINT, metres from the origin it would spin about — and only the Type knows that, so the ` +
          `document layer cannot prove the element stays on its datum. Release the constraint with ` +
          "`core.deleteConstraint` if the element is genuinely no longer bound to it, or rotate the datum's own " +
          `definition. ⚠ A pure translation is measured exactly and is not refused on this ground.`
        );
      }
      if (positioning.plan && movedInPlan) {
        return (
          `this element's XY position is derived from a \`grid\` constraint (D50 step 0b) — the ` +
          `intersection of the axes it is placed on. A placement that moves it in plan leaves the ` +
          `constraint saying it is somewhere it visibly is not. Move the GRID (\`core.updateGrid\`, and ` +
          `the element follows), or release the constraint with \`core.deleteConstraint\` first. ` +
          `A purely vertical move is not refused.`
        );
      }
      if (positioning.vertical && movedVertically) {
        return (
          `this element's vertical extent is derived from a \`base\`/\`top\` Level constraint (D50 step ` +
          `0b, D52 — height is DERIVED). A placement that moves it vertically leaves it no longer ` +
          `touching the Levels it declares itself spanning. Move the LEVEL (\`core.updateContainer\`, and ` +
          `the building follows), edit the constraint's offset, or release it with ` +
          `\`core.deleteConstraint\` first. A purely horizontal move is not refused.`
        );
      }
      return undefined;
    }
  }
}
