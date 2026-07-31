# P5 step 6A — THE MODEL ENUMERATION QUERY + THE PROJECT-WIDE QUANTITY ROLL-UP

**What this is.** The design for the query the 2026-07-25 adversarial sweep found missing (Entry 57, finding 2):
**the one query that enumerates every real element of the model.** It is the stated prerequisite of the Clean
Delta exporter — _"a producer that cannot enumerate the model's quantities cannot produce a Clean Delta"_
(`v1.0.0_imp_plan.md` P5 exit criteria) — and the same query serves the project-wide quantity roll-up, the
schedules (D58 row Ⓐ), and Planitor's + Miqdar's ingest.

**Status of the contract.** ⚠ **This is NOT a freeze item.** A query is additive (D19, `core_logic.md` rule 5)
and nothing here stores a byte or touches a frozen shape. It is on the **moat's critical path**, which is a
different axis from the freeze — see `current_state.md` §0a.

**Why it exists as its own document.** Because the naive version of it is what three separate consumers have
each been writing by hand, and the plan's own instruction is: _"BUILD THE PROJECT-WIDE QUANTITIES PATH, AND
**MAKE IT A COMMAND/QUERY, NOT A LOOP EVERY CONSUMER REWRITES**"_ (imp_plan, P5 exit criteria).

---

## 1. The gap, MEASURED — not quoted (§1b: build it, then read the number)

A real building was authored against the **real OCCT kernel** and the shipped `@bunyan/types`: a Site → Tower A
→ Level 1, one composite `core.wall` (C25/30, 6 m × 3 m), one `core.opening` Door hosted on its `lateral.1`
face (oak leaf + hardwood frame), and one `core.curtainwall` (3 cols × 2 rows, glass + aluminium).

```
  scene.elements (the AUTHORED rows)            3     wall, opening, curtainwall
  real elements  (the geometry tree)           19     ⇒ 16 of them are invisible to `scene.elements`
    of which carry their OWN parts             15
    of which carry NO parts                     4     the curtain-wall parent + its 3 columns
  the curtain wall alone: 1 scene row  →       17     geometry nodes

  THE NAIVE PROJECT-WIDE LOOP
    for (id of Object.keys(scene.elements)) await doc.quantities(id)
      ⇒ counted 2, then THREW:
        `element "curtainwall-01KYD7CYZ…" has no built geometry`
```

**Three findings, and the third is new.**

1. **`scene.elements` is not the model.** A 3×2 curtain wall is **1 row and 17 real elements**; a curtain-panel
   schedule (completely standard in Revit) over `scene.elements` misses **16 of them**. Confirms Entry 57.
2. **The naive loop still dies**, exactly as `review_P4.md` measured on **2026-07-14** — now **42 days and 13
   entries later**, with P5 declared closed twice in between. §1c-7's disease, third occurrence. Confirmed.
3. **⚠ NEW — the failure is BROADER than Entry 57 recorded.** Entry 57 (and `review_P4.md` before it) named
   **the Opening** as what kills the loop: _"a void has no parts."_ Measured above, the loop now dies on the
   **CURTAIN WALL** instead — a **pure composite parent**, which has no own parts _by design_ (`curtainwall.ts`:
   _"NO buildGeometry — a pure composite"_). ⇒ **"skip voids" is the wrong rule.** The honest rule is
   **"an element with no own parts yields no quantity rows"**, and it has _two_ populations, not one: pure
   voids **and** pure composites. A rule written to skip voids specifically would have shipped green and still
   crashed on the very element D59 was built to prove. _(The ⓙ door is not in either population — it has a leaf
   and a frame, 2 parts, and it is measured.)_

**And the exit criterion is answerable once the loop is written correctly** — _"how much C25/30 is in this
building?"_ = **3.18 m³** (plus 0.157 m³ glass, 0.093 m³ aluminium, 0.132 m³ timber). The number exists; what
does not exist is a supported way to ask for it.

---

## 2. What "a real element" means — the four filters

The query is exactly these four rules, in one place, so three products cannot each get them slightly wrong.

| #     | Rule                                                                                                                                                                                                                          | Why, and its precedent                                                                                                                                                                                                                                                                        |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Walk the generated-children tree.** A real element is an authored `scene.elements` row **or** any descendant of one in `ElementGeometry.children` (D59 Model A).                                                            | Children are DERIVED from the parent's recipe (recipe-is-truth, D30) and are never scene rows. Measured above: 16 of 19 real elements are invisible without this.                                                                                                                             |
| **2** | **Exclude non-active design options — with the D67 cascade.** An element counts iff its own `designOptionId` is active **and** every element it hangs off (`hostId`, `parentElementId`) is active.                            | `isElementActive` (D65 + D67, `designoptions.ts`). ⚠ Generated children need no test of their own: they are excluded **with their parent**, by construction (D67's own finding).                                                                                                              |
| **3** | **An element with no own parts yields no quantity rows — BY CONSTRUCTION, never by catching an exception.** Two populations: **pure voids** (a plain opening) and **pure composites** (a curtain wall, its columns).          | The imp_plan's explicit instruction (_"skip voids by construction (not by catching an exception)"_), widened by §1 finding 3. ⚠ Such an element is still **enumerated** — it is a real element with a PEI a tag or a schedule may bind to; it simply contributes no quantity.                 |
| **4** | **An element that cannot be measured is REPORTED, never zeroed and never silently dropped.** `state: 'failed'` (the kernel refused, D42) or `'unbuildable'` (an unregistered / future-versioned Type, D43) or `'broken-ref'`. | Domain rule 15 (_an unmeasurable quantity is OMITTED, never zeroed_) forbids the zero. But silently dropping an element from a **project-wide total** is the same silent wrongness one level up: the total would be plausible and short, which is exactly what makes it dangerous. See §4 Q1. |

---

## 3. The shape

Two layers, deliberately. **Enumeration is synchronous and reaches no kernel** (it reads the recipe + the built
tree); **the roll-up is async** because measuring is a kernel op. A schedule that needs the element list without
measuring — the common case — pays nothing.

```ts
/** One REAL element of the model: an authored row, or a generated descendant of one (D59). */
export interface ModelElement {
  readonly id: ElementId;               // the PEI (authored ULID, or the derived `${parent}:${slot}`)
  readonly typeId: TypeId;
  readonly rootId: ElementId;           // the authored scene row this belongs to (itself, when authored)
  readonly derived: boolean;            // true ⇒ a generated child — never a `scene.elements` row
  readonly containerId?: ContainerId;   // inherited from `rootId` for a derived child
  readonly containerPath: readonly ContainerId[];  // ⚠ THE LBS ADDRESS, root-first (spec §7a)
  readonly containerCode: string;       // "Site/Tower A/Level 1" — Planitor's `spatial_container_code`
  readonly styleId?: StyleId;
  readonly hostId?: ElementId;
  readonly classification?: Classification;
  readonly state: 'valid' | 'failed' | 'broken-ref';
  readonly hasParts: boolean;           // false ⇒ a pure void or a pure composite (§2 rule 3)
}

interface EnumerateOptions {
  /** The active option per set (D65). Absent ⇒ each set's primary. */
  readonly active?: ActiveOptions;
  /** The option catalogue, when the consumer holds one — `scene.designOptions` has no verb in v1.0.0. */
  readonly designOptions?: Readonly<Record<DesignOptionId, DesignOption>>;
}

// on DocumentContext:
modelElements(options?: EnumerateOptions): readonly ModelElement[];
projectQuantities(options?: EnumerateOptions): Promise<ProjectQuantities>;
containerCodeOf(id: ContainerId | undefined): string;   // the LBS address, exposed (Entry 57's gap)
```

**The roll-up returns FLAT PER-PART ROWS carrying their LBS address, plus grouping helpers** — not pre-grouped
totals only. Rationale: the Clean Delta's payload **is** per-part (`quantity.parts[]`, D30/D45 — _"the point of
the whole exercise"_), Miqdar wants per-discipline, Planitor wants per-container, and a schedule wants per-type.
One row shape serves all four; four pre-grouped bags serve one each and hide which rows were omitted.

```ts
export interface ProjectQuantityRow {
  readonly elementId: ElementId;
  readonly rootId: ElementId;
  readonly typeId: TypeId;
  readonly containerPath: readonly ContainerId[];
  readonly containerCode: string;
  readonly part: PartQuantity;   // name, materialId/Name, discipline, volume, area, mass?
}

export interface ProjectQuantities {
  readonly rows: readonly ProjectQuantityRow[];
  /** §2 rule 4 — every real element that could not be measured, with WHY. Never silently dropped. */
  readonly unmeasured: readonly { readonly elementId: ElementId; readonly reason: string }[];
  readonly basis: 'exact';
}

// derived groupings — pure functions over `rows`, never a second source of truth:
export function groupByMaterial(rows): ...;
export function groupByDiscipline(rows): ...;
export function groupByContainer(rows): ...;
```

⚠ **`QuantityBreakdown` / `PartQuantity` are NOT touched.** They are computed projections, not stored state
(`P5_step6_clean_delta_design.md` §4a), so the LBS address rides on the _row_, not on the part. Nothing frozen
moves; `SCENE_SCHEMA_VERSION` does not bump.

---

## 4. The Architect's rulings (2026-07-25)

**Q1 — the unmeasurable element in a project-wide total. ✅ RULED: (A) a separate `unmeasured[]` list**, each
entry naming the element and **why**. The total stays honest _and_ declares what it is missing. Silently
dropping an element from a building total is the same silent wrongness as zeroing it — the number would look
plausible and be short — which is domain rule 15's failure mode reached one level up.

**Q2 — the Clean Delta's `prior` state** (`P5_step6_clean_delta_design.md` §2, `prior.{quantity_value,
spatial_container_code}`). ✅ **RULED: (A) rewind the journal and rebuild only the delta.** Inverse-replay
`SceneChange.before` to reconstruct the scene at revision N, then rebuild + measure **only the elements this
delta names**, in a throwaway context. Exact, and its cost scales with the **size of the change**, not the size
of the model. ⚠ The cheap alternative (read `before` and omit the rest) was rejected because it goes blank
exactly on the associative cascade — _"the case a naive two-model diff gets right only by luck"_ (Clean Delta
design §3), which is the one case the moat exists to win.

**Q3 — the scope of this build. ✅ RULED: (B) both in one unit** — the enumeration query + the roll-up **and**
the Clean Delta exporter (payload, `change_type` derivation, `prior` replay, JSON Schema), together.

---

## 5. The test plan (each criterion, and what would let it pass while false — §1b method 2)

1. **The census.** The building of §1: 3 authored rows ⇒ **19 real elements**, 15 with parts, 4 without.
   _Passes-while-false if_ the walk is depth-1 — so the assertion names the **depth-2** panels
   (`…:column.c0:panel.r1`), which only a recursive walk reaches.
2. **The exit criterion.** _"How much C25/30 is in this building?"_ ⇒ **3.18 m³**, from one call, with **no
   throw** — and the run is compared against the hand-written loop the composition test performs today.
3. **⚠ The regression that motivated it (revert-verify).** Delete the no-own-parts guard ⇒ the roll-up throws
   `has no built geometry` on the curtain wall. Delete the children walk ⇒ the glass and aluminium totals
   collapse to **0** while the run stays green-looking.
4. **The D67 cascade, through the query.** Two facade schemes tagged on the **walls only**: the roll-up over
   the active scheme must exclude the other scheme's windows _and their glass_. Revert the cascade ⇒ the
   4-windows-where-1-is-correct number returns, now visible as a **quantity**, not just a count.
5. **The LBS address.** A two-tower model (`Site → Tower A/Tower B → Levels`): every row's `containerCode`
   resolves, and grouping by container splits the totals per tower.
6. **The unmeasurable.** An element authored against a future Type version (D43, `unbuildable`) appears in
   `unmeasured[]` with a reason, and **not** as a zero row.

---

## 6. The post-build adversarial sweep (2026-07-25, after both units were green)

The §1b method turned on **this document's own implementation**, after it was green and revert-verified. It found
**three more defects in ~30 minutes**, and **not one of them was on a happy path** — each needed a question the build
itself never asks.

| #       | The question nobody asked                                 | What it found                                                                                                                                                                                                                                                                                                                                                                                                                                 | Fix                                                                                                                                                                                          |
| ------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a)** | _What if the element is in a design option nobody chose?_ | `modelElements` applies the D65/D67 rule, but **the journal names ids directly** — so a non-active option arrived through `histories` and was emitted as a **ghost row** (`modified_qty`, no quantity, empty container code, `IfcBuildingElementProxy`): **a work-package row for a facade nobody will build.** D65's stated failure mode by a **third** road — not the option tag (D65), not hosting (D67), but the exporter's journal path. | Not-active is neither a change nor a deletion ⇒ omitted entirely.                                                                                                                            |
| **(b)** | _What if the edit was undone?_                            | An undo is a first-class journal entry (D40), so **the last change in the slice is the REVERSAL** — a `before → after` differing in `end`. Net change since the baseline: nothing. Reported: **`modified_move`** — a spatial move that never happened.                                                                                                                                                                                        | Compare the **two endpoints** (state at N vs state now), not the last event.                                                                                                                 |
| **(c)** | _What if a generated child stopped existing?_             | Shrink a curtain wall 3 cols → 2 and the dropped column is in **no scene row and no current enumeration** ⇒ absent from the package ⇒ under Planitor's _"absence ⇒ unchanged"_ rule, **billed forever.**                                                                                                                                                                                                                                      | Walk the **prior** enumeration too, and derive the authored root **structurally from the PEI** (`${parentId}:${slot}`) — the lookup returned nothing for exactly the element that needed it. |

**⚠ On (b), the distinction that matters:** comparing endpoints is **not** "diffing two models". The journal still
decides **which** elements are asked about — including the ones no `SceneChange` names, reachable only through
`rebuilt`. Only those elements' endpoints are then read. **The moat is the SET, not the comparison.** BIMsync must
compare every element of two models because it has no idea which ones moved; Bunyan never asks that question.

**✅ Probed and clean — do not re-probe:** the ⓣ reserved metadata args (`mark`/`phaseCreated`/`properties`/
`classifications`) thread through `createElement` **and** survive a `.bnn` round-trip; and **the Clean Delta is
computable from a reloaded `.bnn`** (save → load → export ⇒ exact prior 3.6 m³, current 5.4 m³) — the D40 headline
end to end, now a permanent test rather than a claim.

**⇒ The standing conclusion:** a surface going green is when the sweep should _start_, not when it can be skipped.
Five defects landed in this one deliverable; two came from building it, three from interrogating it afterwards.
