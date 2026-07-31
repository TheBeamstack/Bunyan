# P5 · Step 5 Ⓐ — Documentation Anchoring Contracts — DESIGN (D58, Freeze-Gate row Ⓐ)

**Status:** design + reservation. **Author:** Zayd (dev box, headless). **Date:** 2026-07-21.
**Companion evidence:** `tests/documentation-anchoring.test.ts` (real OCCT + pure round-trip).
**Reopened-freeze context:** `current_state.md` §0a + Entry 46; `v1.0.0_imp_plan.md` "🟠 REOPENED" row Ⓐ.

---

## 0. What this row is, and what it deliberately is NOT

**D58 (owner-validated 2026-07-21):** a drawing is a **live projection of the B-Rep** (`core_logic.md`
rule 17). v1.0.0 ships **MINIMAL** 2D — **one plan + one section + one schedule** (a quantity view) — in
**P6, AFTER the P5 freeze.** The full documentation apparatus (detail views, tags at annotation scale,
view-graphic overrides, sheets, titleblocks, revision clouds, schedules-plural) is **post-v1.0.0**
(Parity-B — the single largest parity item).

**⇒ THIS ROW IS A RESERVATION, NOT A BUILD.** It reserves the **anchoring shapes** — the descriptor types
a View / Dimension / Tag / Schedule / Sheet / Viewport needs — so that both P6's minimal build and
Parity-B's full apparatus are **purely additive over frozen contracts**, never an amendment across three
products. It writes **no exporter, no renderer, no `sectionCut` body**; those land in their phases.

**Why it is pre-freeze even though the build is not.** The frozen contracts these lean on — `scene.json`,
`SubShapeRef`, `BimObjectType`'s `ParamSchema`, `QuantityBreakdown`, the `Command.argsSchema` — set at P5.
If a documentation entity turns out to need a stable anchor the frozen model does not carry, the freeze
**forecloses** it. Gate ⑨ (Entry 44) proved this for **one dimension between two faces**. D58 widens the
lens: v1.0.0 now ships a **schedule**, whose anchor (type/param/quantity keys) gate ⑨ never touched.

**The method (unchanged, `current_state.md` §1b): the freeze-forcing test + the three-consumers walk.**
For each documentation entity, name the frozen shape it anchors to and show a host edit does not break it.

---

## 1. The one invariant that shapes everything here — a drawing stores a DEFINITION, never a result

`core_logic.md` rule 17 + the gate ⑨ conclusion: **the projected 2D geometry is DERIVED and never stored**
— exactly as a mesh, a `Part`, and a room boundary are derived. What is stored is:

- for a **View** — _how to project_ (a cut plane, a direction, a clip box, a scale);
- for a **Dimension** — _its anchors_ (which sub-shapes it spans); the number re-derives;
- for a **Tag** — _its subject key_ (which derived value it shows); the text re-derives;
- for a **Schedule** — _its filter + column keys_; the rows and cells re-derive;
- for a **Sheet** — _its viewports_ (which views sit where on paper).

This is why documentation is safe to reserve now and build later: **a stored definition + a frozen anchor
⇒ the body is a pure function of the (frozen) scene.** A resize moves the witness line and updates the
number with zero re-authoring. Storing the value would be storing a stale result (domain rule 15's sibling).

**Consequence for the dependency graph:** a documentation entity's value depends on the geometry it
anchors, but that dependency is a **projection refresh (a query), not a scene rebuild** — like
`roomMetrics`. So its `dependency.ts` edge, when the CRUD lands, is a declared **"nothing"** (changing an
annotation re-stages no element's solid). This mirrors `roomSeparators` exactly (Entry 41).

---

## 2. The anchor vocabulary — `AnnotationAnchor` (the widened gate ⑨)

Gate ⑨ stored a dimension as `{ elementId, [refA, refB] }`. That is right for a dimension **within one
element**. A real dimension spans elements (a wall face to a column face), and a tag leaders to a **corner**
(a vertex). So the frozen anchor vocabulary is a **tagged union**, so a new anchor kind is an additive
member, never an edit:

| kind      | payload                                         | survives a model edit?                                     | frozen shape it uses   |
| --------- | ----------------------------------------------- | ---------------------------------------------------------- | ---------------------- |
| `ref`     | `elementId` + a `SubShapeRef` token (face/edge) | **yes** — token byte-identical (D1)                        | `SubShapeRef`          |
| `vertex`  | `elementId` + a `kind:'vertex'` token           | **yes** (once the kernel exports vertices — reserved D54a) | `SubShapeRef` (vertex) |
| `element` | `elementId`                                     | **yes** — a ULID PEI, never reused (D44)                   | `Element.id`           |
| `point`   | a 2D point in a view's plane, mm                | **no, by design** — a note pinned to paper, geometry-free  | —                      |

Each `ref`/`vertex` anchor carries its **own** `elementId` (so a cross-element dimension is expressible —
gate ⑨'s single-element case is the degenerate one). The `elementId` is stored explicitly rather than
parsed back out of the token's `nodeId` — recovering identity by parsing an opaque derivation path is the
"match after the fact" the whole design refuses.

**Freeze-forcing check — does any documentation need an anchor NOT in this union?** No, for v1.0.0's
minimal set and Revit's full set: dimensions/tags anchor to faces/edges/vertices/elements; a floating text
note anchors to a paper point. New kinds (a grid intersection, a level datum) are additive members.

---

## 3. Dimension & Tag — `Annotation`

`Annotation = Dimension | Tag` (a tagged union on `kind`; a text note / revision cloud / spot elevation is
an additive member). Both **store an anchor + a rule, never a value.**

- **`Dimension`** — `anchors: AnnotationAnchor[]` (≥ 2), a `dimensionKind` (`linear`/`angular`/`radial`),
  an optional `viewId`. The number is the measured distance/angle between the anchors, **derived from live
  geometry** (via the frozen `bounds`/`distance` kernel query ops — never off the mesh).
- **`Tag`** — one `anchor`, plus a `subject` **key** naming which derived value it displays. The subject is
  a **stable key into the frozen model**, never the value: `mark`, `type`, `param:<key>`,
  `quantity:<key>`. The tag text re-derives on every draw.

**The gate ⑨ proof, widened (real OCCT):** author a `Dimension` over two wall faces as the reserved shape;
resize the host; both `ref` tokens stay byte-identical and the value re-derives 3000 → 5000. A `vertex`
anchor round-trips through the codec (its kernel export is a reserved D54a additive step). The tag's
`element` anchor + `mark` subject survive a resize (the PEI and the key are both stable).

---

## 4. Schedule — `ScheduleDefinition` (the row gate ⑨ did NOT cover — the reason Ⓐ exists)

A schedule is a **tabular view**: a **filter** (which elements are rows) + **columns** (each a stable key
into the frozen model). Rows and cells are **derived from the live scene on every render** — a schedule is
a query with a layout. v1.0.0 ships **one** (D58).

**The freeze question Ⓐ must answer:** can a schedule bind to **type / param / quantity** with keys that
**survive an edit**, against **frozen** shapes? The three-consumers walk against the frozen model:

| Schedule needs                    | Frozen shape it binds to                                           | Stable across an edit?                                            |
| --------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| "all doors" / "load-bearing only" | `Element.typeId`, `Classification.{ifcClass, loadBearing}`         | ✅ typeId is a registered contract id; classification is authored |
| "on Level 2"                      | `Element.containerId` + the container tree                         | ✅ a ULID container id                                            |
| a "Mark" column                   | `Element.mark` (reserved ⓡ)                                        | ✅ authored, survives rebuild                                     |
| a "Width" column                  | a `params` key (`ParamSchema` field key)                           | ✅ stable key; a rename is a `migrate` (D-migration test)         |
| a "Concrete volume" column        | a `QuantityBreakdown` part/measure (`part.volume`/`.mass`/`.area`) | ✅ measured per part per material, re-derives                     |
| a "Count" column                  | the filtered row count                                             | ✅ derived                                                        |

**⇒ NO NEW FROZEN FIELD IS REQUIRED TO ANCHOR A SCHEDULE.** Every filter and every column binds to a key
that is already frozen and already stable. The **exporter/renderer is a v1.0.x/P6 additive body** over the
reserved `ScheduleDefinition` shape. The shape itself is reserved so P6 fills a body, never amends a type.

`ScheduleColumn` is a **tagged union** on `source` (`field` | `param` | `quantity` | `count`) so a new
column source (a formula, a classification code) is an additive member. The real-kernel proof: define a
wall schedule with all four column kinds, evaluate it against the live doc, **resize a wall**, re-evaluate
with the **same definition** — the quantity column re-derives the new volume; the param/field/count keys
are unchanged. A schedule is stable because its keys are frozen and its values are derived.

---

## 5. View, Sheet, Viewport — the projection + paper shell

- **`ViewDescriptor`** = `PlanView | SectionView | ElevationView | ThreeDView` (tagged union on `kind`).
  Stores _how to project_: a plan is a horizontal cut at a Level; a section/elevation is a cut plane +
  direction in world mm; each carries a `scale` and an optional `clip` box. **A view is anchored by
  GEOMETRY (a cut plane), not by a `SubShapeRef`** — it shows a **region**, not a sub-shape; its stability
  comes from being a pure function of the frozen scene + its own cut plane (move a wall → the plan
  re-projects). The projected lines come from the **`sectionCut` op (already reserved in the frozen kernel
  protocol)** — a v1.0.x/P6 body, no new op.
- **`Sheet`** = `{ number, name, titleblock?, viewports }`. A titleblock library is a v1.0.x concern; the
  field is a reserved string id now.
- **`Viewport`** = `{ viewId, at }` — a placement of a view on a sheet. **Nested inside `Sheet`** (a sheet
  owns its viewports; a view appears on N sheets via N viewports), so no separate collection is reserved.

**Freeze-forcing check:** a section needs a cut plane (world mm) — reserved on `SectionView`. A schedule on
a sheet is a viewport whose `viewId` names a `schedules` entry — the id spaces are disjoint by prefix
(ULID), so a viewport referencing a schedule vs a drawing view is the same shape. No amendment needed.

---

## 6. Where it lands on `scene.json` — four OPTIONAL collections, absent-defaulted

Following the **`georeference` precedent** (an optional field, absent ⇒ today's behaviour), not the
`roomSeparators` precedent (a first-class `SceneCollection` in `emptyScene`), because **no body authors or
reads documentation in v1.0.0 pre-freeze** — there is no undo to produce and no dependency edge to invalidate:

```
Scene {
  …
  readonly views?:       Readonly<Record<ViewId, ViewDescriptor>>;
  readonly annotations?: Readonly<Record<AnnotationId, Annotation>>;
  readonly schedules?:   Readonly<Record<ScheduleId, ScheduleDefinition>>;
  readonly sheets?:      Readonly<Record<SheetId, Sheet>>;
}
```

**Why TOP-LEVEL optional collections, not a nested `documentation?` bag.** When the CRUD lands (P6 /
Parity-B), each collection must be **promotable to a full `SceneCollection`** (undo + a dependency edge).
The undo machinery indexes `scene[change.collection]` by a **flat** key, so a top-level `scene.views` can
join `SceneCollection` **additively** (a new union member → `dependency.ts`'s exhaustive switch fails to
compile until its "nothing" edge is declared — the designed mechanism, Entry 33). A nested
`documentation.views` would force a **migration** to unwrap. Top-level is the additive-promotion shape.

**Why OPTIONAL-ABSENT, not in `emptyScene()`.** Absent ⇒ "no documentation," today's behaviour and the
reservation's semantics. It keeps the frozen default surface minimal (exactly what `georeference` did), and
the round-trip test proves both present and absent cases. When P6 adds a reader, it adds the `emptyScene`
entry + the hostile-`.bnn` `isPlainObject` guard **in the same additive step** (the guard matters only once
a `null` can crash a reader; today it cannot — matching `georeference`, which is likewise unguarded).

**No `SCENE_SCHEMA_VERSION` bump.** The schema is release-candidate v2 pre-freeze (scene.ts §schema note);
these fold into the frozen v2 exactly as `roomSeparators`/`georeference` did in 0g.

---

## 7. No verb reservation is owed (distinct from ⓣ)

ⓣ (Entry 38) had to add args to `createElement`'s **existing, frozen-at-P5** `argsSchema`, because a
reserved `Element` field with no authoring path forecloses being born with it. **Documentation entities are
NOT elements** and are not authored through `createElement`. Their CRUD (`createView`/`createSchedule`/…)
is **new commands**, and **a new command is a purely additive registry entry** (D19 — "a new command
instance is NOT pre-freeze; the shape of the contracts a command leans on is"). ⇒ **no `argsSchema` slot is
owed pre-freeze for documentation.** This is the one place Ⓐ is cheaper than ⓣ, and the reason is worth
recording so a future agent does not re-open it.

---

## 8. What lands this row (one commit, owner-gated)

1. **`packages/document/src/documentation.ts`** — the reserved types: `AnnotationAnchor`, `Annotation`
   (`Dimension`|`Tag`), `ScheduleDefinition` (+ `ScheduleFilter`, `ScheduleColumn`), `ViewDescriptor`
   (the four view kinds), `Sheet`, `Viewport`, and their id aliases. All optional/additive; tagged unions
   where they grow.
2. **`packages/document/src/scene.ts`** — the four optional collections on `Scene` (+ imports). No
   `emptyScene` change, no `SceneCollection` change, no schema bump.
3. **`packages/document/src/index.ts`** — export `documentation.js`.
4. **`tests/documentation-anchoring.test.ts`** — the widened gate ⑨ (real OCCT: dimension refs
   byte-identical + value re-derives across a resize; schedule quantity/param/field/count keys re-derive
   across a resize with an unchanged definition; tag element-anchor + mark subject survive), plus the
   reservation proofs (freeze-safety: every field optional/additive at compile time; round-trip: a `.bnn`
   carrying the whole documentation surface saves + loads byte-identical, and one carrying none defaults).

**Verification (`current_state.md` §1b + review_prompt.md — verify against artifacts):** compile-time
freeze-safety (tagged-union additivity), real-OCCT anchor-stability, and codec round-trip. The one
executable seam I add beyond types is the four Scene fields; the round-trip test **fails in their absence**
(a `.bnn` carrying a schedule would lose it on load) — that is the reservation's revert-check, exactly as
`reserve-shapes.test.ts` revert-checks ⓣ by dropping a field.

---

## 9. Open framing questions for the owner (recommended defaults in force; reshape before commit)

All reservations are additive and uncommitted, so these are reshape-cheap. My recommended default is in
**bold**; I have built against it.

- **Q1 — Grouping.** Four top-level optional collections (**recommended**, §6) vs one nested
  `documentation?` bag. I chose top-level for additive `SceneCollection` promotion.
- **Q2 — Anchor `elementId` on `ref`/`vertex`.** Store it explicitly on each anchor (**recommended** —
  cross-element dimensions, no token-parsing) vs a single `elementId` per dimension (gate ⑨'s shape, single
  element only).
- **Q3 — Schedule column key encoding.** `source`-tagged union with string keys (**recommended** — open,
  additive) vs a fixed enumerated column set. The union keeps a formula/classification column additive.
- **Q4 — Titleblock.** A reserved string id on `Sheet` now (**recommended**) vs deferring the field to
  Parity-B. A string id is one optional field and keeps P6 sheets nameable.

**Gate ⑨ is hereby widened** from "one dimension anchors" to "the whole documentation surface anchors to
frozen shapes and survives an edit," proven in `tests/documentation-anchoring.test.ts`.
