# P5 step 6B — THE SCHEDULES BODY (D58 row Ⓐ)

**What this is.** The design for the **body that turns a `ScheduleDefinition` into rows** — the last of the
three consumers `enumerate.ts` was built to serve (`P5_step6A_enumeration_design.md` §1: _"the same query serves
the project-wide quantity roll-up, the schedules (D58 row Ⓐ), and Planitor's + Miqdar's ingest"_), and the
largest remaining v1.0.0 item. The **anchoring contract is already reserved and green** (Entry 47,
`documentation.ts`, `P5_step5A_documentation_anchoring_design.md`); what is missing is the body.

**Why v1.0.0 ships it.** D58 cuts 2D documentation to a **minimal** projection — one plan, one section, **one
schedule** — and the schedule is the one of the three that is _pure document layer_: it needs no `sectionCut`,
no renderer, no browser. It is the quantity→documentation path proven end to end, headlessly. It is also the
artifact rule 17 is really about: **a builder reads a schedule AS a measurement.**

**Status of the contract.** ⚠ The body itself is **NOT a freeze item** — a query is additive (D19,
`core_logic.md` rule 5), it stores no byte and touches no frozen shape. ⚠⚠ **But designing it walked the
reserved shape against a real model for the first time, and that walk found four things in the RESERVED
surface — three of them cheap only until step 6.** They are §6 and §7, and they are the reason this document
exists before any code.

---

## 1. The gap, MEASURED — not quoted (§1b: drive the API, read the number)

Three probes against the **real OCCT kernel** and the shipped `@bunyan/types`, 2026-07-28. Each asks what the
schedule body would report if it were written the obvious way.

### 1.1 What is a row? — a curtain wall is 1 authored row and 17 real elements

```
  scene.elements (the AUTHORED rows)               1
  real elements  (doc.modelElements())            17    ⇒ 16 invisible to `scene.elements`
    by typeId:  core.curtainwall 1 · .column 3 · .mullion 7 · .panel 6
    of which carry their OWN parts                13

  A CURTAIN PANEL SCHEDULE  { filter: { typeId: 'core.curtainwall.panel' } }
    over scene.elements  →   0 rows        ⇒ an EMPTY schedule, no error, nothing to notice
    over modelElements   →   6 rows        ⇐ correct
```

⚠⚠ **The failure mode is an empty table, not a crash.** A curtain-panel schedule is the canonical Revit
curtain-wall deliverable and the exact case D59 was built to prove; over `scene.elements` it renders zero rows
and looks like a schedule of a building that has no panels.

### 1.2 The whole-model schedule DIES — and it dies on the composite, not the void

```
  doc.quantities(<the curtain wall>)  →  THREW: element "curtainwall-01KY…" has no built geometry
  a no-filter schedule over scene.elements   →  DIED on the first curtain wall
  the same over modelElements/projectQuantities
      →  250,320,000 mm³ over 13 rows,  unmeasured: []
```

Same finding as `P5_step6A_enumeration_design.md` §1 finding 3, now confirmed from the schedule's side: the
loop dies on a **pure composite**, not on a void. **"Skip voids" is still the wrong rule.**

### 1.3 The design-option GHOST ROW — a 2.0000× over-report on the artifact that gets billed

Two `core.wall`s on the same baseline: the main-model wall, and one tagged into a non-primary facade option.

```
  wall schedule — rows over scene.elements   2      volume  3,840,000,000 mm³
  wall schedule — rows over modelElements    1      volume  1,920,000,000 mm³
                                                    ⇒ 2.0000× OVER-REPORT
```

This is **D65's named failure mode, verbatim** (_"a schedule double-counts and work packages are published for
a scheme nobody builds"_) — and D65, D67 and D68 each fixed it for a _different_ consumer. The schedule is the
consumer D65's own sentence names **first**, and it is the one that had no body to fix.

### 1.4 ⚠⚠ AND THE EVALUATOR THAT PRODUCES ALL THREE WRONG ANSWERS IS ALREADY IN THE REPO

It is not hypothetical. `tests/documentation-anchoring.test.ts:157` — the `evaluate` helper **Entry 47 wrote to
prove the reservation** — opens:

```ts
const rows = Object.values(doc.scene.elements).filter(…);
```

It is green today and was green when it was written, because its fixture is **two plain walls**: no children,
no options, no composite, nothing unmeasurable. Its own comment says _"this is what the v1.0.x renderer will
do."_ **It is the most likely thing a body author lifts, and it is wrong in all three ways above.**

⇒ **§1c-7's disease in its purest form** — a claim written down (here, as a passing test) and never read
against the model it will actually meet. The fix is not only to write the body correctly but to **retire that
helper**, so the repo stops carrying a worked example of the wrong loop (§5.4).

---

## 2. What a schedule row IS — and the whole architectural point is that this is ALREADY ANSWERED

The four filters `enumerate.ts` exists to hold — walk the children tree · exclude non-active options with the
D67 cascade · an element with no own parts yields no quantity · an unmeasurable element is reported, never
zeroed and never dropped — are **exactly** the four things §1 measured the schedule getting wrong.

⇒ **THE SCHEDULE BODY ADDS NO ENUMERATION RULE. It consumes `modelElements()`, and its correctness is that it
does not have its own loop.** A schedule is `modelElements()` → filter → project each element onto columns.
Everything §1 measured is fixed by that one decision, before a line of column code is written.

That is the plan's own instruction (`v1.0.0_imp_plan.md`, P5 exit criteria: _"make it a command/query, not a
loop every consumer rewrites"_) collected on its third and last consumer.

---

## 3. THE TRAP ENTRY 64 NAMED — a schedule is a PROJECTION, and the body must not be where a value first gets stored

Entry 64's rule-17 sweep found `ScheduleDefinition` **clean by SHAPE**: it stores a filter + column keys and
has nowhere to put a value. Rule 17 is clean _as of the last thing that was built_ — and this body is the next
thing built. Its own words: _"rule 17 is clean by shape only until a body is written against it."_

**The three disciplines that keep it clean, stated so they can be checked:**

1. **The result is a RETURN VALUE, never a scene write.** `evaluateSchedule` is a query. It writes no
   `scene.json` byte, mints no `UndoableEdit`, and caches nothing on the `Scene`. A schedule re-derives on
   every call exactly as `quantities()` does.
2. **Stored vs derived is legible from the FILE a type lives in.** The reserved definition types stay in
   `documentation.ts` (frozen, stored). Every result type — `ScheduleResult`, `ScheduleRow`, `ScheduleCell` —
   lands in a **new `schedule.ts`** (a body, not frozen, never persisted). No result type may be added to
   `documentation.ts`; that is the mechanical form of the rule, and it is greppable.
3. **`.bnn` carries the DEFINITION and never the result.** The round-trip test already asserts
   `scene.schedules` survives (Entry 47); the body adds the negative — a saved document that has been
   scheduled carries no cells.

⚠ The tempting violation is a legitimate-sounding one: caching evaluated rows on the scene "because a 10k
schedule is slow." That is D29's shape (a perf question dragging in a stored derived value, §1b method 3), and
the answer is the same — measure first, and if it is slow, cache **outside** the scene where staleness cannot
be saved to a file.

---

## 4. The shape

**One new file, one new `DocumentContext` method, no frozen byte.**

### 4.1 `packages/document/src/schedule.ts` — the body

```ts
/** The stable key a column is addressed by — `field:mark`, `param:thickness`, `quantity:volume:structure`. */
export function columnKeyOf(column: ScheduleColumn): string;

export interface ScheduleCell {
  /** `columnKeyOf(column)` — the STABLE key, never the display heading (§6.1). */
  readonly columnKey: string;
  /** ⚠ ABSENT when there is no value: unmeasurable, unset, or not applicable (rule 15 — never zeroed). */
  readonly value?: string | number;
  /** ⚠ Declared for every NUMERIC cell (rule 7). mm / mm² / mm³ / kg — the unit the number IS in. */
  readonly unit?: string;
  /**
   * ⚠⚠ ADDED WHILE BUILDING (§9). `true` ⇒ this element HAS this quantity and it could not be resolved.
   * Absent-with-no-flag ⇒ there is NOTHING TO MEASURE — a pure void or pure composite has no quantity by
   * construction, which is not an unknown. Omitting the distinction cost a real defect; see §9.
   */
  readonly unknown?: true;
}

export interface ScheduleRow {
  readonly elementId: ElementId; // the PEI — authored, or a D59 derived `${parentId}:${slot}`
  readonly rootId: ElementId;
  readonly derived: boolean; // a generated child (D59) — a first-class row
  readonly cells: readonly ScheduleCell[];
}

/** A `groupBy` bucket. Subtotals are DERIVED per numeric column, exactly as the grand totals are. */
export interface ScheduleGroup {
  readonly key: readonly string[]; // the group's values, in `groupBy` order
  readonly rows: readonly ScheduleRow[];
  readonly subtotals: ReadonlyMap<string, ScheduleTotal>;
}

export interface ScheduleResult {
  readonly scheduleId: ScheduleId;
  readonly columns: readonly { key: string; heading: string; unit?: string }[];
  readonly rows: readonly ScheduleRow[];
  readonly groups?: readonly ScheduleGroup[]; // present iff `groupBy` is
  readonly totals: ReadonlyMap<string, ScheduleTotal>;
  /** ⚠ Every selected element that could not be measured — beside the rows, never instead of them (D75). */
  readonly unmeasured: readonly UnmeasuredElement[];
  readonly basis: 'exact';
}

export function selectRows(
  elements: readonly ModelElement[],
  filter: ScheduleFilter,
): readonly ModelElement[]; // pure, kernel-free — a container filter is a SUBTREE test, not equality
export function projectSchedule(definition, rows, sources, unmeasured): ScheduleResult; // pure
```

### 4.2 `DocumentContext.evaluateSchedule(def, options?)` — the D19 door

Async (a `quantity` column measures on the kernel), mirroring `projectQuantities` exactly: it takes the same
`EnumerateOptions`, reports `unmeasured` beside its rows, and never throws for one bad element.

⚠ **A schedule with no `quantity` column makes ZERO kernel calls** — `selectRows` and every `field`/`param`/
`count` column are pure functions of the scene + the built tree. A door schedule of 400 doors costs nothing.

### 4.3 How each reserved column key resolves

| `source`   | Key                          | Resolves to                                                                          |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| `field`    | `mark`                       | `Element.mark` (ⓡ). ⚠ Structurally absent for a generated child — **§6.3**           |
| `field`    | `name`                       | `Element.name` / `BuiltChild.name`. The identity column that DOES reach a child      |
| `field`    | `id`                         | The PEI. ⚠ Opaque by D44 — **§6.4**, recorded, not owed                              |
| `field`    | `type`                       | `typeId` — the registered contract id, never a display label (rule 12's discipline)  |
| `field`    | `level`                      | The nearest ancestor container of `kind: 'level'` on `containerPath`; absent if none |
| `param`    | any `ParamSchema` field key  | `element.params[key]`; **`unit` read off the `ParamField`** (rule 7)                 |
| `quantity` | `volume` \| `area` \| `mass` | Summed over the element's parts, optionally scoped to `part`. mm³ / mm² / kg         |
| `count`    | —                            | Rows in the group when grouped, else in the whole schedule                           |

⚠ **`mass` is ABSENT, never 0, when any contributing part has no resolvable density** — the `QuantityTotal`
rule (rule 15, D45) applied one level down. A partial sum wearing `basis: 'exact'` is the failure this whole
family of rules exists to prevent.

### 4.4 What `ModelElement` must gain, and it is not a frozen shape

⚠ **`ModelElement` cannot answer a `param` or `mark` column today** — it carries id/typeId/root/derived/
container/style/host/name/classification/state/hasParts and **no `params`, no `mark`**. For an authored row a
consumer could reach into `scene.elements`; **for a generated child it could not**, because a child is not a
scene row and its params live on the synthetic `Element` the build carries on `ElementGeometry.children[]`.

⇒ **`ModelElement` gains `params` and `mark`** — additive on a **query result type in `enumerate.ts`**, which
is a body, not a frozen contract, and not persisted. The alternative — the evaluator re-walking the geometry
tree to find a child's params — is a **second enumeration walk**, precisely what §2 says the body must not
have. _This is the same lesson as D74's: when a consumer needs a field, add it where the ONE walk already
produces it, not by re-deriving it at the consumer._

---

## 5. The test plan — each criterion, and what would let it pass while FALSE (§1b method 2)

| #   | Asserts                                                                                                 | What would let it pass while false — and the guard                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A curtain-panel schedule returns **6 rows**, not 0                                                      | A fixture of plain walls (**exactly how the Entry-47 helper stayed green**). ⇒ the fixture is a real curtain wall, and 1 authored row / 17 real is asserted explicitly |
| 2   | A no-filter schedule over a model with a composite **returns**, and reports `unmeasured: []`            | Catching the throw and returning `[]` — a green test over an empty answer. ⇒ assert the row count AND the total volume (250,320,000 mm³)                               |
| 3   | A non-active design option contributes **no row and no volume**                                         | Testing with no options authored (the invariant is vacuous). ⇒ the two-wall fixture of §1.3, asserting `2.0000× → 1.0000×`                                             |
| 4   | Quantity columns **re-derive across a resize** with the definition unchanged                            | Re-authoring the definition between reads. ⇒ pass the **same object** twice (the Entry-47 discipline, kept)                                                            |
| 5   | An unmeasurable element yields a **row with the value ABSENT**, and is listed in `unmeasured`           | Zeroing the cell — the value would look fine. ⇒ assert `value === undefined`, and that the total EXCLUDES it                                                           |
| 6   | Every numeric cell declares a `unit` (rule 7)                                                           | Checking only quantity columns. ⇒ enumerate every numeric cell of a schedule using all four sources, in the idiom of `tests/units-rule7.test.ts`                       |
| 7   | **Nothing is stored**: a scheduled doc saves with no cells, and `documentation.ts` gains no result type | Asserting only the happy path. ⇒ a save→load→compare after evaluating, plus a grep-shaped assertion on the module boundary                                             |
| 8   | `mass` is **absent, not partial**, when one part's density is unresolvable                              | Every fixture material having a density. ⇒ a material with none                                                                                                        |

**Revert-verify, test-first, in the stronger order (Entry 64's):** write the tests, measure them failing
against the naive evaluator, then build. Criteria 1–3 must be **measured failing first** — they are §1's three
numbers, and they are the whole reason the body is not a `Object.values(scene.elements)` loop.

### 5.4 The Entry-47 helper is retired in the same commit

`tests/documentation-anchoring.test.ts`'s `evaluate` is replaced by a call to the real
`evaluateSchedule`. The test keeps asserting exactly what it asserts today (the KEYS re-derive across a
resize) — it simply stops carrying a worked example of the wrong loop. ⚠ Its coverage is **widened, not
narrowed**: it currently proves the keys are stable, and after the swap it proves that against the real body.

---

## 6. What the walk found in the RESERVED shape

Four findings. **Three are cheap only until step 6.** None is a defect in the body — they are in the shape the
body binds to, which is why they surface now and not later.

### 6.1 ⚠⚠ `groupBy` is keyed by "a column heading/key" — and the heading half is D70, exactly

`ScheduleDefinition.groupBy?: readonly string[]` is documented as _"Optional grouping by a column heading/
key."_ **Those are two different fields and only one of them is an identity.** A `heading` is display text —
optional, human-facing, renameable. Grouping by it reproduces **D70 (domain rule 12) field for field**: the
Clean Delta keyed materials by display NAME, so a rename re-keyed every work package and two entities sharing
a label merged into one. Here: rename a column heading and every group re-keys; two columns given the same
heading merge; a column with **no** heading cannot be grouped by at all.

⇒ **`groupBy` names stable column KEYS** (`columnKeyOf` — `field:mark`, `param:thickness`,
`quantity:volume:structure`), never headings. This is a **doc-comment change on a shape that freezes at P5**:
one line now, an ambiguity three products each resolve differently after.

⚠ It is the same defect D70 was, found the same way (rule 12, swept), on a surface that had not been built yet
— which is the cheapest moment it has ever been caught in this project.

### 6.2 ⚠ A `ScheduleDefinition` cannot record WHICH design option it shows, and a `ViewDescriptor` can

D65 reserved `ViewCommon.designOptionIds?` — _"which design alternatives this view shows"_ — on every drawing
view. **`ScheduleDefinition` does not extend `ViewCommon` and got nothing**, yet a schedule is placed on a
sheet through the same `Viewport` (Entry 47 §5: _"a schedule is placed on a sheet exactly like a drawing
view"_), and a schedule is the consumer D65's own sentence names **first**.

The evaluator takes the active selection as a **call-time argument** (like `projectQuantities`), so this
forecloses no behaviour. What it forecloses is **storing** the choice: a drawing view can be saved as "the
Option B plan"; the schedule beside it on the same sheet cannot be saved as "the Option B door schedule."

⚠ **The reason to settle it now is the D65/ⓥ precedent, not mechanics:** the owner ruled that when a shape is
reserved, **the consumer-facing rule is written in at reserve time**, so three products implement one rule. A
P6 author adding this field later has D65's exclusion invariant to re-derive, and §1.3 measures what happens
when they get it wrong.

### 6.3 ⚠ A generated child can never carry an authored `mark` — the schedule's identity column

`field: 'mark'` is a schedule's primary identity column. `Element.mark?` is **authored** (ⓡ, set via
`createElement`/`core.setElementMetadata`). A D59 generated child is not a scene row, so it is authored
through neither — and **neither `BuiltChild` (the recipe half) nor `ChildOverride` (the authored-deviation
half) has a `mark` slot.** Both freeze at P5. ⇒ a curtain-panel schedule's Mark column is **permanently
blank**, for 16 of a curtain wall's 17 rows.

⚠ **This is the weakest of the three, and it should be read as weaker**, because the identity column is not
actually lost: `BuiltChild.name?` exists, its doc comment already says _"a schedule/tag reads it"_, and a Type
can name its panels. What is missing is only the **user-editable** mark that Revit gives a curtain panel. The
fix, if wanted, is one optional field on `ChildOverride` — the shape that already exists for exactly
"authored deviation from a generated child."

### 6.4 Recorded, not owed

- **`field: 'id'` renders a PEI**, and D44 says ids are opaque (`current_state.md` §5 tells Amer _"never
  parse/render them — use `element.name`"_). ⚠ **Keep it**: it is the stable key an **agent** or an export
  binds a row to, which is the D19/D22 audience, and the column is opt-in. Recorded so the tension is not
  re-litigated; a human-facing schedule uses `mark`/`name`.
- **`ScheduleFilter.typeId` is a single id**, so "all walls AND all curtain walls" is not expressible. ⚠
  **Nothing owed**: Revit schedules are per-category too, and `documentation.ts`'s own header sanctions growth
  by **an optional field** — a later `typeIds?` is additive by the shape's stated rule.
- **Nothing new is owed on `Viewport`/`Sheet`.** Entry 47 §5's freeze-forcing check already resolved that a
  schedule on a sheet is an ordinary viewport (disjoint ULID id spaces, one field addresses either).

---

## 7. Open questions for the Architect

My recommended default is in **bold**; nothing is built yet, so all are reshape-cheap. **Q1–Q3 touch shapes
that freeze at step 6; Q4–Q5 do not.**

- **Q1 — `groupBy` keys (§6.1).** Group by **the stable column key `columnKeyOf(column)`** (recommended —
  `field:mark`, `quantity:volume:structure`; a rename cannot re-key a group, an unheaded column is groupable)
  vs. by the display `heading`. ⚠ The heading option is **D70's defect verbatim**, on a shape that has no body
  yet. Either way this is a **one-line doc-comment change to a frozen shape**, free now.

- **Q2 — Does `ScheduleDefinition` get `designOptionIds?` (§6.2)?** **Reserve it** (recommended — one optional
  absent-defaulted field, matching `ViewCommon`, carrying D65's exclusion rule in its comment at reserve time,
  the ⓥ precedent) vs. leave it to call-time only, and let a P6 author add it after the freeze.

- **Q3 — Does `ChildOverride` get `mark?` (§6.3)?** **Reserve it** (recommended, but weakly — one optional
  field, the natural home, gives a curtain panel the user-editable Mark Revit gives it) vs. **rule it not
  needed** and let a generated child's identity column be its Type-supplied `name`. ⚠ I would not spend a
  freeze delay on this one; it is cheap now and genuinely arguable.

- **Q4 — Scope of this unit: the evaluator only, or the CRUD too?** **The evaluator only** (recommended — it
  is the whole of the read path, it is what §1's three numbers are about, and it needs no verb) vs. also
  `core.createSchedule`/`updateSchedule`/`deleteSchedule`, which would promote `scene.schedules` to a full
  `SceneCollection` (undo + a dependency edge). ⚠ The CRUD is **additive and NOT pre-freeze** (Entry 47 §7:
  documentation entities are not elements, so a new command is an ordinary registry entry) — but v1.0.0's
  "one schedule" is not authorable without it, so it is the natural **next** unit, and I recommend keeping it
  a separate one so the read path lands revert-verified on its own.

- **Q5 — Cell units (§4.3).** Cells carry the **native value + its declared unit** (recommended — mm³/mm²/kg,
  the model's own units, and the renderer formats) vs. converting to display units (m³/m²) in the body. ⚠ The
  Clean Delta already owns the m³ convention at the **export** boundary (`units: 'metric'`, D70); doing it
  twice, in two places, is how the two disagree.

---

## 7a. THE ARCHITECT'S RULINGS (2026-07-28) — all four as recommended

| Q      | Ruling                                                                                                                                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1** | **`groupBy` names STABLE COLUMN KEYS**, never display headings. `documentation.ts`'s comment is corrected to say so, and `columnKeyOf` is the one place the key grammar lives. ⇒ D70's defect is closed on a surface before it ever had a body.          |
| **Q2** | **`ScheduleDefinition.designOptionIds?` IS RESERVED** — one optional absent-defaulted field mirroring `ViewCommon`, carrying D65's exclusion rule **in its comment at reserve time** (the ⓥ precedent). Absent ⇒ each set's primary, as everywhere else. |
| **Q3** | **`ChildOverride.mark?` IS RESERVED** — one optional field on the shape that already means "authored deviation from a generated child." ⚠ A pure reservation: nothing reads `childOverrides` in v1.0.0, so a derived child's `mark` stays absent today.  |
| **Q4** | **THE EVALUATOR ONLY.** The schedule CRUD is a separate, additive, non-freeze-sensitive unit (Entry 47 §7). This unit lands the whole read path, revert-verified on its own.                                                                             |
| **Q5** | _(Not put to the owner — a strong default with a precedent.)_ Cells carry the **native value + its declared unit** (mm/mm²/mm³/kg). The m³ conversion stays where it already is, at the Clean Delta **export** boundary (`units: 'metric'`, D70).        |

---

## 8. What lands this unit (one commit, owner-gated)

1. **`packages/document/src/schedule.ts`** — `evaluateSchedule` + `selectRows` + `columnKeyOf` + the result
   types. Pure; kernel only for `quantity` columns.
2. **`packages/document/src/enumerate.ts`** — `ModelElement` gains `params` + `mark` (§4.4).
3. **`packages/document/src/document.ts`** — `DocumentContext.evaluateSchedule` (the D19 door).
4. **`packages/document/src/index.ts`** — export `schedule.js`.
5. **`packages/document/src/documentation.ts`** — the Q1/Q2/Q3 doc-comment + reservation changes, **only as
   the owner rules them.**
6. **`tests/schedules-body.test.ts`** — the eight criteria of §5, real OCCT, revert-verified test-first.
7. **`tests/documentation-anchoring.test.ts`** — the Entry-47 helper retired onto the real body (§5.4).

**Verification:** `pnpm verify` with the **real exit code read** (`format:check` has failed silently five
sessions running), plus the three §1 numbers measured failing before the body exists.

---

## 9. What BUILDING it found — two defects in my own code, and both are one conflation

Recorded because the design above did not predict either, and both were caught by the tests rather than by
reading — which is this project's whole method, turned on its own new code (the Entry-58 discipline).

**(a) A total came back ABSENT where 250,320,000 mm³ is right.** I let _"no quantity BY CONSTRUCTION"_ (a
pure void, a pure composite) make a sum unknown, exactly as _"could not measure"_ does. **That is D72's
`exposedRefs: [] vs absent` defect by a new road**, and it bites in both directions: conflate one way and
**every total in the product goes absent the moment a curtain wall enters the model**; conflate the other and
a partial sum ships wearing `basis: 'exact'`. ⇒ `ScheduleCell.unknown` marks the genuine unknown, and the
totals **mirror `QuantityTotal` (`enumerate.ts`) exactly** rather than inventing a second semantic three
products would then disagree about — volume/area sum what is there with `unmeasured` beside them; **mass is
absent rather than partial.** _(Revert-verified: dropping the flag yields `expected +0 to be undefined` — the
0 kg wearing the badge that says trust me, precisely.)_

**(b) A wholly-unknown column got NO total entry at all.** I derived a column's numeric-ness from whether any
row happened to produce a number, so a mass column whose every cell was unknown simply vanished from
`totals` — and `totals.get(key) === undefined` then reads as _"there is no such column"_ rather than _"the
answer is unknown."_ **That is domain rule 14's shape** — silence a consumer reads as a fact — on a body
written four days after D76 fixed the same shape in the change feed. ⇒ numeric-ness is the column's
**declared source**, never what the rows produced.

⚠ **Both are the same mistake: two different reasons a value is missing, collapsed into one absence.** It is
worth naming, because this codebase has now hit it three times in three weeks (D72's `[] vs absent`, D76's
`[]`-as-silence, and here) and each time the fix was to make the _reason_ explicit rather than to guess at it
downstream.

---

## 10. Status — BUILT (Entry 65, 2026-07-28)

`pnpm verify` **517/517**, real exit code **0** (from 503). No frozen byte moved, no `SCENE_SCHEMA_VERSION`
bump, no verb. Revert-verified five ways, each firing exactly the expected tests: removing the children walk
(**4 fail**) · removing the option filter (**2**) · keying columns by `heading` (**2**) · dropping the
`unknown` flag (**1**) · deriving numeric-ness from the rows (**1**).

⚠ **Owed next, and deliberately not in this unit (owner Q4):** the schedule CRUD, which promotes
`scene.schedules` to a full `SceneCollection` (undo + a declared dependency edge) and is what makes v1.0.0's
"one schedule" authorable. Additive, not freeze-sensitive.
