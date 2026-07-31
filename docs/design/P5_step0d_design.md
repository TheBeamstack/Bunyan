# P5 · Step 0d — The Sketch Constraint Solver — DESIGN

**Author:** Zayd (dev box) · **Date:** 2026-07-18 · **Status:** ✅ BUILT + GREEN (Entry 40) — Q1=A / Q2=dedicated verbs / Q3=full named set (tangent+arc SHAPES frozen; solver impl is lines + the 7 point/line constraints, arc/tangent deferred to v1.0.x — swappable, no contract cost)
**Depends on:** ✅ 0a (dependency graph), ✅ 0b (the `Constraint` discriminated union + datum bindings)
**Executes:** D50 §0d · `v1.0.0_imp_plan.md` P5 step 0d / step 2 · `core_logic.md` §9 (the north-star hook D50 pulled into scope)
**Freezes at P5:** the **sketch-constraint members of the `Constraint` union**, the **sketch data model** they reference, and (if adopted, Q1/Q2) any new `scene.json` collection. **This is why it gets a design + owner sign-off:** these are permanent contract shapes; a wrong one costs an amendment across three products + every `.bnn` in the field.

**⚠ THE HARD-GATE ESTIMATE IS CLOSED (2026-07-18).** The owner priced both solvers and ruled the cut: **both ship in v1.0.0, built now before the types, 0d first** (`current_state.md` Entry 39). This doc is 0d's design; the room-bounding solver (step 1) gets its own.

---

## 1. The planegcs verdict — ✅ ADOPT IT. PROVEN, NOT ASSUMED, ON THIS BOX.

The plan mandated _"do not write a numeric solver from scratch without first evaluating `planegcs`."_ Done — and it is not merely a candidate, it is a drop-in for the hard part. **Every claim below was verified headless in Node on the dev box** (`/tmp/…/planegcs-spike`, throwaway), not read from a README:

| What was checked                                                                 | Result                                                                                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@salusoft89/planegcs` boots **headless in Node** (⇒ Zayd-testable, CI-testable) | ✅ initialised the WASM module, ran a solve, `status 0`                                                                                            |
| Solves the exact constraint classes 0d needs                                     | ✅ a rough L-corner → **`\|AB\|=3000.000`, `\|BC\|=2000.000`, `perpendicular_ll` dot `0.000`, anchor fixed**                                       |
| WASM artifact size (the second-module / download-size cost, §4j-5)               | **497 KB** uncompressed (~150 KB gzip) — vs our **4.19 MB** OCCT kernel. Modest.                                                                   |
| License compatibility with Bunyan's **AGPL-3.0** (D15)                           | **LGPL-2.1** (wrapper) over FreeCAD's **LGPL-2.0+** GCS — LGPL links cleanly into AGPL. ✅                                                         |
| Maintenance                                                                      | **v1.2.0, 6 July 2026** — current, actively released (4 releases, 310 commits).                                                                    |
| API shape                                                                        | JSON "sketch primitives" in, solved coordinates out, by **stable id** — ⚠ this is what makes the no-permute invariant (§5) _free by construction_. |

**What this buys:** the numeric core — DogLeg / Levenberg-Marquardt / BFGS / SQP over the constraint Jacobian, the genuinely hard and genuinely researchy part `core_logic.md` §9 flagged — is **imported, not written.** 0d collapses from a research project to a **bounded integration**: map our constraints ↔ planegcs primitives, own the sketch data model, preserve D26, report over/under-constrained. Estimate holds: **~4–6 build sessions.**

**Two strings attached, both recorded, neither a blocker:**

- **A second WASM module** rides alongside the kernel. +497 KB uncompressed feeds the open **first-load-size** question (§4j-5) — additive, small, and it can lazy-load behind the sketch tool (it is not needed to open or view a model, only to _edit a sketch_).
- **An LGPL attribution obligation** joins the OCCT one (§4e housekeeping) — a `NOTICE`/attribution entry before the repo goes public. Does not block work.
- ⚠ **Known planegcs limitation (from its own README):** several constraints "don't work properly when set to **non-driving**" (`CircleDiameter`, `ArcDiameter`, `C2CDistance`, …). **v1.0.0 uses only DRIVING constraints** (the geometry follows the constraint), so this does not bite us — recorded so a future non-driving/dimension-reporting feature knows the edge.

---

## 2. Architecture — where the solver runs, and the seam that keeps `@bunyan/document` pure

**The solver is a DOCUMENT-LAYER subsystem, not a kernel op.** A sketch is 2D; planegcs is a separate WASM module from OCCT; and the solved profile then feeds the **existing frozen `extrude`/`revolve` kernel ops** (§4). So nothing about 0d touches the frozen kernel protocol. It lives in `@bunyan/document`, headless-testable on this box (just proven).

**⚠ It is injected behind a narrow seam, exactly like the kernel is (D19 precedent).** `DocumentContext` does not `import '@salusoft89/planegcs'` directly, for the same three reasons `GeometryGateway` exists:

```ts
// A narrow, swappable seam — the sketch analogue of GeometryGateway.
export interface SketchSolver {
  /** Solve in place: mutates each primitive's coordinates to satisfy the constraints.
   *  Returns the solve status + the diagnosis (which constraints conflict / what is free). */
  solve(sketch: SolvableSketch): SketchSolveResult;
}
```

- **Testability** — a `MockSketchSolver` (identity solve, or a hand-canned result) keeps the document layer's non-solver logic testable without booting a second WASM module, exactly as `kernel-mock` does for OCCT.
- **Purity / boundary** — `@bunyan/document` gains no hard dependency on planegcs; the planegcs-backed `PlanegcsSolver` lives in its own module (`packages/document/src/sketch/planegcs-solver.ts` or a tiny sibling package) and is handed to `DocumentContext` at bootstrap, alongside the `GeometryGateway`. Amer's `bootstrap.ts` wires both.
- **Single-threaded, in-process (v1.0.0, D8).** planegcs solves synchronously in-process; no worker for v1.0.0. (A worker is a v1.0.x option if a huge sketch ever blocks the main thread — additive, no contract cost.)

**The `solve → Profile → extrude` pipeline** (§4) is orchestrated by the element's `buildGeometry`, which already receives a `BuildContext`. The context gains **one accessor** — `solveSketch(sketch) → solved segments` — so a Type stays pure (it asks for a solved profile; it never imports planegcs). This mirrors how 0b gave `BuildContext` `grid()`/`baseElevation()` rather than letting a Type read the scene.

---

## 3. The sketch data model — the frozen shape (Q1)

A _constrained sketch_ needs three things stored so a rebuild is deterministic and the naming is stable:

1. **Points** — the vertices the solver moves. Each needs a **stable local id** (so a constraint can name it and so a solve reads/writes it by id, never by position).
2. **Segments** — an **ordered** list `pointId → pointId` (+ arc data). ⚠⚠ **The order IS the identity** (D26): segment `k` becomes `lateral.k`. The array is authored, never permuted.
3. **Which points are anchored** (fixed) vs free.

**The one genuinely open question:** does the sketch live **in the element's `params`** (a structured `ParamValue`) or in a **new first-class `scene.sketches` collection**?

|                  | **(A) Sketch in the element's `params`** — RECOMMENDED                                                                                                                                            | **(B) A first-class `scene.sketches` collection**                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Where            | `params.sketch = { points, segments }` on the GenericSolid / custom-profile element                                                                                                               | `scene.sketches[sketchId]`, element references it                                                                   |
| Ownership        | A sketch belongs to exactly ONE element (it IS that element's profile) — matches the anti-fuse "a part belongs to one element" discipline                                                         | A sketch could be shared — but nothing in v1.0.0 shares one, and sharing raises the same identity hazards as fusing |
| Dependency graph | element-self edge (already exists) — a sketch edit re-stages its own element, nothing else                                                                                                        | a new `sketches` edge (0a's exhaustive switch forces it) + a sketch→element edge                                    |
| `.bnn` cost      | none — `params` already round-trips                                                                                                                                                               | a new collection + `SCENE_SCHEMA_VERSION` bump + a hostile-null guard (like `constraints`/`roomSeparators`)         |
| D53 tension      | ⚠ points are _values_ (fine as params); the **constraints** are NOT params (they go in `scene.constraints`, §4) — so the sketch's _geometry_ is params, its _rules_ are constraints. Clean split. | constraints still go in `scene.constraints`; the geometry gets its own collection — one more place to look          |

**Recommendation: (A).** A sketch is an element's own profile recipe — it belongs to one element exactly as a Part does, and `params` already round-trips with no schema-version bump. D53 is honoured precisely: the sketch's **coordinates are values (params)**; its **constraints are first-class (`scene.constraints`)** — the same value-vs-relationship split D53 drew for datums. (B) buys sharing that v1.0.0 does not use and re-imports the fusing hazard.

⚠ **Either way, the POINT IDS and the SEGMENT ARRAY ORDER are frozen contract** — a constraint references a point by id, and `lateral.k` names a segment by index. Q1 only decides _which container_ holds them.

---

## 4. The sketch constraints — new members of the `Constraint` union (Q2)

The codebase already reserved the direction, in three files: _"the sketch constraints (0d) land as NEW members of the `Constraint` union"_ (`entities.ts:308`), _"extends the `Constraint` union without touching these edges"_ (`dependency.ts:26`). This design follows it. A sketch constraint is a new discriminated-union member beside `DatumConstraint`:

```ts
export type Constraint = DatumConstraint | SketchConstraint; // additive — 0b Finding 2 shape

export interface SketchConstraint {
  readonly id: ConstraintId;
  /** The element whose sketch this constrains (the dependency subject — an element-self edge). */
  readonly element: ElementId;
  readonly kind:
    | 'coincident' // two points share a location
    | 'parallel' // two segments parallel
    | 'perpendicular' // two segments perpendicular
    | 'tangent' // segment ↔ arc, or arc ↔ arc
    | 'horizontal' // a segment is horizontal in the sketch plane
    | 'vertical' // a segment is vertical
    | 'distance' // dimensional: |p1 p2| = value   (the driving dimension)
    | 'equal'; // two segments equal length
  /** Sketch-local operands: point ids and/or segment indices in THIS element's sketch (Q1). */
  readonly operands: SketchOperands; // shape per kind, discriminated
  /** mm or degrees — present only for the dimensional kinds (`distance`, and later `angle`/`radius`). */
  readonly value?: number;
  /** RESERVED, always true in v1.0.0 (planegcs non-driving is buggy — §1). A future reporting/reference
   *  dimension sets this false; reserving the field now keeps that additive. */
  readonly driving?: boolean;
}
```

- **Why the union, not a per-sketch list:** the dependency invalidator and the ecosystem consumers (Miqdar/Planitor) read **one** constraint structure (D53). A sketch constraint's re-stage edge is the element-self edge the graph already has; declaring it in `scene.constraints` means `dependents()` already routes it (0a's `constraints` case), with **zero new dependency code** — verified against the existing switch.
- **Operands are sketch-LOCAL** (point ids / segment indices within the element's own sketch), NOT a `ConstraintTarget` (which addresses scene datums — Levels/Grids). This is the key distinction: `DatumConstraint` binds an element to the _scene_; `SketchConstraint` relates geometry _within_ an element. They share the collection and the `id`/`element` spine; their operands differ by kind. This is exactly what a discriminated union is for.
- **`tangent`/arc support:** planegcs supports arcs and `tangent`. v1.0.0 sketch scope (Q3) decides whether arcs are in for launch or reserved.

**The scope question (Q3):** which constraint kinds ship in v1.0.0? The plan (step 2) names _"coincident · parallel · perpendicular · tangent · dimensional."_ All are one-line planegcs mappings (proven for perpendicular/distance; the rest are the same shape). Recommendation: **ship the full named set** (coincident, parallel, perpendicular, horizontal, vertical, distance, equal, tangent) — they cost the same to map and a solver missing perpendicular-but-having-parallel is a toy. Reserve nothing extra; new kinds are additive union-of-kinds members later.

---

## 5. The D26 invariant — the one correctness hazard, and why planegcs makes the guard cheap

**The rule (D26, frozen):** the solver may move a vertex; it must **NEVER permute the segment array**, because segment `k` is `lateral.k` and reordering re-targets every `SubShapeRef` into the shape — silently, catastrophically, exactly the class D51 guards on the document side.

**Why it is nearly free here:** planegcs addresses every primitive by a **stable id we assign** and returns solved coordinates **by that id**. So the pipeline is:

1. Build planegcs primitives from our sketch, keyed by our point ids (`point-<id>`), segments by our own index.
2. Solve. planegcs mutates _coordinates_; it has no concept of our segment array and cannot reorder it.
3. Read solved coordinates back **by id**, write them into a **copy of the sketch whose segment array is structurally identical** (same length, same `from→to` id pairs, same order) — only the referenced points' `(x,y)` change.

**The guard (a hard assertion + a test, revert-verified per the standing rule):** after solve, assert the output segment array is order- and membership-identical to the input (same ids, same sequence). If a future refactor ever lets the solver's output reshape the array, the assertion throws rather than mis-naming. A test drives _"solve a sketch, then verify `lateral.2` still names the segment the author drew as index 2"_ — and is revert-verified by deliberately permuting and watching the naming break. _A fix without a test that fails in its absence is an assertion._

---

## 6. Over-/under-constrained reporting — a first-class result, not an exception

planegcs returns a `SolveStatus` and can report conflicting / redundant / dependent constraints. The solve result surfaces this as **data**, never a throw (the D10 kernel discipline, applied to the solver):

```ts
export interface SketchSolveResult {
  readonly status: 'solved' | 'over-constrained' | 'under-constrained' | 'failed';
  readonly conflicts?: readonly ConstraintId[]; // which constraints conflict (over-constrained)
  readonly dof?: number; // remaining degrees of freedom (under-constrained ⇒ > 0)
  readonly solved?: SolvedPoints; // present iff status === 'solved'
}
```

- **Over-constrained** (adding a constraint that conflicts) ⇒ the command that added it is **REFUSED** with a typed failure naming the conflicting constraints — the same refuse-don't-corrupt discipline as D42/D51. The document is left at last-good.
- **Under-constrained** is **allowed** — a partially-constrained sketch is normal in CAD; the free DOF just means the solve is one of many valid solutions (planegcs picks the nearest to current). The UI surfaces `dof > 0` as info, not an error. This matches every sketcher.
- **A build reads a solved profile only when `status === 'solved'`** (which for under-constrained still holds — it solved, just non-uniquely). A `failed`/`over-constrained` solve yields no geometry change; the element keeps last-good.

---

## 7. What 0d touches — and what it explicitly does NOT

**Touches (all `@bunyan/document`, all additive, no frozen-kernel-protocol change):**

- `entities.ts` — the `SketchConstraint` union member + `SketchOperands`; the sketch data model (Q1).
- `scene.ts` — nothing new _if Q1=A_; a `sketches` collection + version bump _if Q1=B_.
- `dependency.ts` — nothing new (the `constraints` edge already routes a `SketchConstraint` to its element-self edge — verified).
- `types.ts` `BuildContext` — one `solveSketch` accessor.
- `build.ts` — resolve an element's sketch constraints, solve, emit the `Profile` in authored order.
- `commands.ts` — `createSketchConstraint` / `deleteSketchConstraint` (or fold into the existing `createConstraint`/`deleteConstraint` — Q2 sub-decision), guarded like every other command; the over-constrained refusal.
- a new `SketchSolver` seam + `PlanegcsSolver` impl + `MockSketchSolver`.
- `packages/document/package.json` — the `@salusoft89/planegcs` dependency.

**Does NOT touch:** the frozen kernel protocol (extrude/revolve are unchanged and consume the solved profile) · `SubShapeRef` (`lateral.k` naming is unchanged — that is the whole point of §5) · the type contracts' _other_ shapes · any `.bnn` already saved (additive-only; no version bump if Q1=A).

**Explicitly out of scope for 0d (reserved or deferred):**

- **3D assembly constraints** (mate/align two elements in space) — that is the reserved `ConstraintTarget` `element`/`ref` direction, a different subsystem, v1.0.x.
- **Non-driving / reference dimensions** — the `driving?` field is reserved (§4); planegcs's non-driving bugs (§1) make this a deliberate v1.0.x item.
- **The sketch UI** (drawing, dragging, dimension entry, the constraint toolbar) — Amer's, P4.5/step 2 in the browser. 0d builds the headless engine + the commands; the tool that drives them is Amer's.

---

## 8. Test plan (all headless, all revert-verified where a guard exists)

`tests/sketch-solver.test.ts` (real planegcs, in Node — proven runnable):

1. **Each constraint kind solves** — coincident, parallel, perpendicular, horizontal, vertical, distance, equal, tangent — a rough sketch → exact satisfied values (the §1 spike, generalised).
2. **⚠⚠ The D26 no-permute guard** — solve a 5-segment profile; assert `lateral.2` names the segment authored at index 2, byte-identical token, before and after; **revert-verified** by permuting and watching it break.
3. **Solve → extrude → exact volume + stable naming** — a constrained rectangle solves, extrudes to the exact solid, and a face named `lateral.k` survives a _re-solve_ after a dimensional edit (the associativity proof — the sketch analogue of 0b's rebind-a-datum).
4. **Over-constrained ⇒ typed refusal**, document at last-good (no geometry change), the conflicting constraints named.
5. **Under-constrained ⇒ solved with `dof > 0`**, not an error.
6. **`MockSketchSolver`** keeps a non-solver document test green without booting planegcs (the seam works).
7. **`.bnn` round-trip** — a scene with a constrained sketch saves and reloads byte-identical and rebuilds identically (Q1=A ⇒ no version bump).

`pnpm verify` (all five CI steps) green before the owner-gated commit.

---

## 9. Open questions for the owner (each freezes a permanent shape)

1. **Q1 — where the sketch geometry lives:** **(A) the element's `params`** [recommended — one owner, no schema bump, D53-clean] · **(B) a first-class `scene.sketches` collection** [only if you foresee shared sketches].
2. **Q2 — where sketch constraints live:** **new members of the `scene.constraints` union** [recommended — the reserved direction, already anticipated in the code] · confirm, and whether their CRUD **folds into the existing `createConstraint`/`deleteConstraint`** verbs or gets **its own `createSketchConstraint`** pair (the `argsSchema` freezes either way, so this is a name/shape call).
3. **Q3 — v1.0.0 constraint-type scope:** **the full named set** (coincident/parallel/perpendicular/horizontal/vertical/distance/equal/tangent) [recommended] · or a narrower launch subset.

**Nothing below the owner's rulings blocks:** the planegcs adoption, the `SketchSolver` seam, the no-permute guard, and the test plan are engineering calls already made here (the seam mirrors `GeometryGateway`, the established precedent). Only the three frozen shapes above need a ruling before build.
