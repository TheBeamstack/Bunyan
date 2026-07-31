# P5 · Step 0b — The Associativity / Hosting Model — DESIGN (rev. 2)

**Author:** Zayd (dev box) · **Date:** 2026-07-16 · **Status:** ⏳ awaiting owner review, then implementation
**Depends on:** ✅ 0a (typed dependency graph, Entry 33) · **Rulings it executes:** D52 (baseline wall), D53 (first-class `constraints` collection), Freeze-Gate row ⓐ (`BuildContext` datums)
**Freezes at P5:** `Scene` shape (new `constraints` collection), `BuildContext`, `Constraint`, `SceneCollection`. **This is why it gets a design and 0a did not** — 0a was a pure internal refactor; 0b adds contracts that outlive the freeze.

**Owner decisions folded in (2026-07-16):** `gridRefs` → **removed, one mechanism** (§4). Authoring → **folded into `createElement` + standalone verbs** (§6). And the one that reshaped this revision: _"reanalyse / test that this is the direction that competes with ArchiCAD & Revit."_ → **§2, and it changed the frozen `Constraint` shape.**

---

## 0. The one-paragraph problem

Bunyan has exactly **one** associative relationship — `opening → host face`. Everything else is absolute: a Level cannot be moved, a Grid hosts nothing (`gridRefs` is stored, validated, and read by nothing), and a wall's height is a typed number, not a span between datums. D50 makes the model **associative**. 0b builds the **infrastructure** — the constraint data model, the build contract, the invalidation edges — and proves it with a fixture. It does **not** build the real Wall (P5 step 3), joins (0c), or the sketch solver (0d).

---

## 1. The direction is right; the first-draft SHAPE was not. Why this revision exists.

Rev. 1 proposed a flat constraint record: `{ id, element, kind: 'base'|'top'|'grid', target: string }`. The owner asked the correct question — _does this compete with Revit/ArchiCAD, or does it foreclose them?_ — and the honest answer, after the reanalysis in §2, is that **the flat record foreclosed two things a serious BIM tool cannot live without, and both would have cost a post-freeze `Constraint` amendment.** The direction (first-class constraints, D53) survives unchanged. The record shape does not.

---

## 2. Competitive reanalysis — what associativity a Revit/ArchiCAD-class tool must express

The method (§1 of the plan, "keep modelling real buildings"): enumerate the associativity operations a professional actually performs, and check each against the shape that is about to freeze. Not "what do base/top/grid need" — _"what does the category need, so the shape does not foreclose it."_

| #   | Real operation (Revit / ArchiCAD)                        | Operand(s)            | Value          | 0b builds?      | Shape must not foreclose                |
| --- | -------------------------------------------------------- | --------------------- | -------------- | --------------- | --------------------------------------- |
| 1   | Wall base on a Level                                     | element → Level       | **offset**     | ✅ yes          | —                                       |
| 2   | Wall top to a Level, height derived                      | element → Level       | **offset**     | ✅ yes          | —                                       |
| 3   | Parapet: top = Roof **+ 1100 mm**                        | element → Level       | **offset ≠ 0** | ✅ yes          | ⚠ **needs `offset`**                    |
| 4   | Footing: base = L0 **− 300 mm**                          | element → Level       | **offset < 0** | ✅ yes          | ⚠ **needs `offset`**                    |
| 5   | Column / wall on a Grid intersection                     | element → Grid ×2     | —              | ✅ yes          | —                                       |
| 6   | Attach wall top to a **roof/floor/other element**        | element → **element** | offset         | 🔒 reserve      | ⚠ target is an **element**, not a datum |
| 7   | **Align & lock** a face to a grid / plane / another face | **ref ↔ ref**         | —              | 🔒 reserve      | ⚠ **two operands, one a `SubShapeRef`** |
| 8   | Locked / **EQ** dimension between references             | ref ↔ ref (+ set)     | **dimension**  | 🔒 reserve (0d) | ⚠ **operands + a numeric value**        |
| 9   | Sketch: coincident / parallel / perpendicular / tangent  | sketch geometry ×2    | ± dim          | 🔒 0d           | ⚠ **per-kind operands & payload**       |

**Two findings, both freeze-fatal for the flat shape:**

- ⚠⚠ **FINDING 1 — `offset` is mandatory, and it is a v1.0.0 feature, not a north-star.** Rows 3–4 are ordinary walls. A base/top constraint _without_ an offset cannot express a parapet, a footing, a dropped slab, or a wall that stops short of the level above. Revit's wall dialog leads with "Base Offset" and "Top Offset." **This must be BUILT in 0b**, not reserved. The flat record had no field for it.
- ⚠⚠ **FINDING 2 — a constraint is not always `{one element, one string target}`.** Rows 6–9 have a **second operand**, and that operand is sometimes an **element** (attach) and sometimes a **`SubShapeRef`** (align/lock/dimension — and `SubShapeRef` already exists, it is what `opening→host` uses). A single stringly-typed `target` cannot grow into that without redefining what `target` means — a `Constraint` amendment across three products. **The fix is structural: make `Constraint` a discriminated union on `kind`, where each kind names its own operands.** A union never forecloses a new member; a flat record with a repurposed field always does.

**Conclusion:** competing with Revit/ArchiCAD does **not** require building attach/align/dimension in v1.0.0 — it requires a `Constraint` shape whose **freeze does not foreclose them**, plus **offsets shipped now**. The union below does exactly that: it implements rows 1–5 (with offsets) and makes rows 6–9 additive.

---

## 3. The data model — a discriminated union (the refined shape)

### 3.1 `Constraint` (`entities.ts`, new)

```ts
export type ConstraintId = string;

/** An operand a constraint can point at — a datum now; an element or a SubShapeRef when rows 6–9 land. */
export type ConstraintTarget =
  | { readonly kind: 'level'; readonly id: ContainerId }
  | { readonly kind: 'grid'; readonly id: GridId };
// FUTURE (additive, not built in 0b): { kind:'element'; id } · { kind:'ref'; token: string /* SubShapeRef */ }

/** BUILT IN 0b — the active datum bindings. Discriminated on `kind` so rows 6–9 add MEMBERS, never edits. */
export type Constraint = DatumConstraint;

export interface DatumConstraint {
  readonly id: ConstraintId;
  readonly element: ElementId; // the dependent whose geometry follows the datum
  readonly kind: 'base' | 'top' | 'grid';
  readonly target: ConstraintTarget;
  /** mm along the datum's normal. base/top: vertical offset from the Level (parapets, footings). Grid: unused. */
  readonly offset?: number;
}

// FUTURE members (reserved by the union, shape sketched, NOT built in 0b):
//   AttachConstraint    { kind:'attach';    element; target:{kind:'element'};      offset? }   // row 6
//   AlignConstraint     { kind:'align';     a:ConstraintTarget; b:ConstraintTarget; locked }   // row 7
//   DimensionConstraint { kind:'dimension'; a:ConstraintTarget; b:ConstraintTarget; value }    // row 8
//   Sketch constraints  { kind:'coincident'|'parallel'|… ; … }                                 // 0d
// ⇒ when they land, `Constraint = DatumConstraint | AttachConstraint | … ` — purely additive.
```

Why this is the freeze-safe shape:

- **`kind` is the discriminant**, so every future constraint class is a new union member with its **own** operand fields — the flat record's fatal weakness (one repurposed `target`) is gone.
- **`ConstraintTarget` is itself a tagged union**, so "a base is on a Level" and "an attach is to an element" and "an align is to a `SubShapeRef`" are all expressible without ever changing what an existing field means. Rows 6–9 add `ConstraintTarget` members and `Constraint` members — both additive.
- **`offset` ships now** (Finding 1). A wall spanning L1→L2 with a 1100 mm parapet is `{kind:'top', target:{kind:'level',id:'Roof'}, offset:1100}`.
- **A base/top wall has two constraints** (base, top); a grid column has two `grid` constraints (one per axis). The engine resolves each set.

### 3.2 `Scene` gains a collection (`scene.ts`)

```ts
readonly constraints: Readonly<Record<ConstraintId, Constraint>>; // NEW
```

- `emptyScene()` gains `constraints: {}`; `SceneCollection` gains `'constraints'` — **which trips 0a's exhaustive switch** (`dependency.ts` won't compile until its edge is declared; §5). The ruling and the guard reinforce each other.
- `applyOne`/`revertChanges` index `scene[change.collection]` generically ⇒ **undo/redo over constraints works for free.**
- `SCENE_SCHEMA_VERSION`: `1 → 2`; the loader defaults a missing `constraints` to `{}` (v1 files load).

---

## 4. `element.gridRefs` — REMOVED (owner decision A)

`gridRefs` had zero readers, so removing the field migrates no behaviour. A grid-hosted element now carries `grid` constraints. One binding mechanism (D53). `createElement`'s `gridRefs` validation is replaced by the constraint path (§6). `Element` loses one field before it freezes.

---

## 5. The dependency edges (`dependency.ts`) — invalidation

`'constraints'` forces a new case; `containers`/`grids` widen to also follow constraint targets:

```ts
case 'constraints': {
  const c = (change.after ?? change.before) as Constraint | undefined;
  return c ? [c.element] : []; // a binding appeared/moved/vanished ⇒ re-stage its element
}
case 'containers':
  // elevation path (as 0a) OR a base/top constraint targeting this Level → "move a Level, the building follows"
  return unique([
    ...elementsUnderContainer(scene, change.id),
    ...elementsConstrainedToLevel(scene, change.id),
  ]);
case 'grids':
  // NO LONGER DORMANT — elements with a `grid` constraint on this axis → "move a Grid, its columns follow"
  return elementsConstrainedToGrid(scene, change.id);
```

`elementsConstrainedToLevel/Grid` scan `scene.constraints` for a `DatumConstraint` whose `target` matches. The exhaustiveness guard still holds; `materials`/`sections` still declare "nothing".

---

## 6. `BuildContext` (Freeze-Gate row ⓐ) — resolvers + derived datums

```ts
export interface BuildContext {
  … // unchanged surface
  readonly elevation: number;                       // KEPT — element's own container elevation (back-compat)
  readonly elevationOf: (containerId: string) => number;   // NEW — any datum
  readonly grid: (id: string) => Grid | undefined;         // NEW
  readonly baseElevation?: number;   // NEW — elevationOf(base.target) + base.offset
  readonly topElevation?: number;    // NEW — elevationOf(top.target)  + top.offset   ⇒ height = top − base (DERIVED)
  readonly gridPoint?: readonly [number, number];  // NEW — intersection of the element's `grid` constraints
}
```

- The engine (`build.ts:contextFor`) resolves the element's constraints and folds in **offsets** to produce `baseElevation`/`topElevation`; a Type reads scalars and stays a pure function (never sees the scene). Illustrative wall build (real wall is step 3):
  ```ts
  const base = ctx.baseElevation ?? ctx.elevation;
  const top = ctx.topElevation ?? base + Number(ctx.params.height ?? 0); // fallback = old behaviour
  // author from start/end at Z=base, extruded to (top − base)
  ```
- **Back-compat is explicit:** no constraints ⇒ `baseElevation`/`topElevation`/`gridPoint` are `undefined` and the fallbacks reproduce today's build byte-for-byte. Every existing fixture stays green.
- `gridPoint` reading **activates the once-dormant `grid→element` edge** from 0a — the build now READS the binding.

### 6.1 Authoring (owner decision: fold in + standalone verbs)

- `createElement` gains optional `base` / `top` / `grid` args (each `{ target, offset? }` / list) and emits the element **and** its constraints in **one `UndoableEdit`** (the reserved `transactionId`, row ⓘ) — "a wall from L1 to L2" is one atomic, one-undo action.
- `createConstraint` / `deleteConstraint` edit bindings on existing elements. Each validates operands exist and the `kind` fits the target (`base`/`top`→Level, `grid`→Grid), refusing with a typed `NOT_FOUND`/`INVALID` (D39). Full CRUD (`updateContainer`/`updateGrid`) is **0e**; 0b adds only what authors and proves the model.

---

## 7. Scope guard — what 0b does NOT do

Real Wall/LinearMember types (step 3) · joins (0c) · sketch solver + sketch constraints (0d) · general CRUD (0e) · **attach/align/dimension constraints (reserved as union members, not built)**. 0b proves the infra with a fixture (`constrained-member`) that reads `baseElevation`/`topElevation`/`gridPoint`.

---

## 8. Test plan (each an executable exit-criterion)

Against the real OCCT kernel, except the pure edge tests:

1. **MOVE A LEVEL → THE BUILDING FOLLOWS.** Element `base`→L1; change L1's elevation; assert the **solid** rebuilds at the new Z (end-to-end proof of the 0a edge).
2. **SPAN L1→L2, HEIGHT DERIVED, WITH OFFSET.** `base`→L1, `top`→L2 `offset:1100`; raise L2; measure height = new(top+offset − base). _(Directly tests Finding 1 — a parapet.)_
3. **NEGATIVE OFFSET (footing).** `base`→L0 `offset:-300`; assert the solid starts 300 below the level.
4. **MOVE A GRID → COLUMNS FOLLOW.** Two `grid` constraints; change a grid `offset`; placement follows (dormant edge activated).
5. **Pure edge tests** (extend `dependency-graph.test.ts`): constraint change re-stages its element; container change re-stages path- **and** constraint-bound elements; grid change re-stages grid-bound elements. **Revert-verified.**
6. **Back-compat:** every constraint-less fixture builds byte-identically.
7. **Integrity + atomicity:** a constraint to a missing datum surfaces broken, not a crash; `createElement` folding constraints is one `UndoableEdit` that undoes atomically.
8. **Persistence:** a v1 `.bnn` (no `constraints`) loads; a v2 round-trips the collection.
9. ⚠ **Freeze-safety test (the point of this revision):** a throwaway type-level check that adding a sketch/attach member to the `Constraint` union and an `element`/`ref` member to `ConstraintTarget` **compiles without editing any existing member** — the executable proof that rows 6–9 are additive.

**Bar:** full suite green, typecheck/lint/format clean, every edge revert-verified.

---

## 9. What this bakes into the P5 freeze

- `Scene.constraints` · `SCENE_SCHEMA_VERSION = 2` · `SceneCollection += 'constraints'`.
- `Constraint` (**discriminated union**) · `ConstraintTarget` (**tagged union**) · `ConstraintId` · `offset` on datum constraints — shaped so attach/align/dimension/sketch are additive members (Finding 2).
- `BuildContext`: `+elevationOf` · `+grid` · `+baseElevation?` · `+topElevation?` · `+gridPoint?` (row ⓐ discharged).
- `Element`: `gridRefs` **removed** (decision A).
- `createElement` gains `base`/`top`/`grid` args; `+createConstraint`/`+deleteConstraint` — their `argsSchema` freezes with `Command` at step 6.

---

## 10. Sign-off

Decisions 1 (gridRefs→A) and 2 (fold authoring) are **confirmed**. The reanalysis (decision 3) is **done** and it changed the shape: **discriminated-union `Constraint` + tagged-union `ConstraintTarget` + `offset` shipped now** — implements rows 1–5 the way Revit/ArchiCAD do, and freezes without foreclosing rows 6–9. If this shape is approved, I build 0b to this spec. The only thing that would change it now is a disagreement with the union shape or the "reserve, don't build, rows 6–9" scope line.
