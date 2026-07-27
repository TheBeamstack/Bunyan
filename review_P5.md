# `review_P5.md` — Pre-freeze review (2026-07-20)

**Reviewer session (Zayd, dev box, headless). Verified against artifacts — suite run, source read, join
cost measured. Did NOT implement.** Ordered by cost-of-delay per `review_prompt.md` §5.

Ground truth established first: `pnpm test` → **302/302 green** (38 files, real OCCT kernel, 105 s). The
suite is real. Everything below is what the green suite does **not** prove.

---

## THE HEADLINE — "STEP 0 CLOSED" is doing more work than the artifacts earn

`current_state.md` §1/§5 and the plan both say **"STEP 0 IS FULLY CLOSED"** and treat the scale question
as **settled** ("the WASM heap FITS; the other three axes are all in the renderer — Amer's, in the
browser"). Neither is quite true, and the gap is the same species the prompt warns about — _a risk
retired on a measurement scoped to an input that has since changed._

1. **The scale conclusion (D48/§1a) was drawn BEFORE joins existed, and joins were added into the
   rebuild hot path without re-measuring.** The join resolver is **O(N²)** in element count and runs on
   _every_ cold load / full rebuild. I measured it (below). It is in **Zayd's document layer**, not the
   renderer — so the written claim _"NOT ONE [kernel lever] touches the redraw… the redraw is the
   dominant interactive cost"_ now has a counter-example it doesn't mention: a **new** quadratic cost in
   the rebuild path.
2. **The whole of "Step 0 closed" is uncommitted.** `packages/document/src/joins.ts`,
   `tests/wall-joins.test.ts` and the **entire `packages/types/` package** are **untracked**;
   `build.ts`, `commands.ts`, `dependency.ts`, `current_state.md` are modified-not-committed. The 302
   green + "0c done" state exists **only in this working tree**. It does not travel (policy §9: the repo
   travels via git; uncommitted work does not). One `git stash`/clean and Entry 42 is gone.
3. **The two genuinely irreversible pre-freeze items are still open** — ⑥ (the Clean Delta / journal
   transport shape) and ⓙ (the door build-contract). Both are correctly flagged in the plan; neither is
   closed. "Step 0 closed" is true of the constraint model; it is not true of the freeze gate.

**If P5 freezes as-is, the thing discovered in six months** is that the transport shapes
(`UndoableEdit`/`SceneChange`/journal) were frozen against an **inferred** BIMsync consumer — a
three-repo amendment — because the one item that "cannot be closed headless" (⑥) was never escalated to
resolution. That is the expensive-forever finding. Lead with it (Finding 1).

---

## WHAT IS OWED A DECISION (yours, not mine)

- **[D-1] Escalate ⑥ or sign off freezing the transport on a written guess.** The `UndoableEdit` /
  `SceneChange` / journal shapes freeze at P5 step 6 and carry the Clean Delta — _"the contract that
  carries money."_ Its consumer (BIMsync) spec is **not on this box** (D37), so the shape is inferred
  from `Planitor/v2.2_spec.md`. Decision: **(a)** get the BIMsync spec onto the box before freezing, or
  **(b)** you sign off, in writing, freezing on the explicit inferred shape and accept the amendment
  risk. There is no headless third option. _Recommendation: (a) — this is the single irreversible,
  three-product-amendment item; an afternoon of getting the spec here vs. a schema migration across
  three repos later._
- **[D-2] Commit Entry 42 (0c joins) before any further work builds on it.** It is the foundation of the
  types you're about to freeze against, and it is entirely untracked. _Recommendation: commit now (owner
  gate); it is the "302 green" state._
- **[D-3] Is the join resolver's O(N²) acceptable for v1.0.0 ship, or is a spatial index in scope now?**
  It is **not** a freeze item (fixable anytime, no contract change) — so the honest answer is likely
  "ship it, index it in v1.0.x." But you should make that call knowing the number, not discover it.

---

## FINDINGS (ordered by cost-of-delay)

### [1] The Clean Delta transport freezes against an inferred consumer — the one irreversible bet

- **WHAT IS CLAIMED** — `v1.0.0_imp_plan.md` ⑥: _"BLOCKED: the BIMsync spec is NOT on this box… its
  consumer shape is only INFERRED… ESCALATION."_ `current_state.md` §5 lists it as "still owed, lower
  priority." `undo.ts:41–78` — `UndoableEdit`/`SceneChange`/`transactionId`/`issued_at_seq` freeze at P5.
- **WHAT IS TRUE** — The escalation has been _recorded_ for at least three entries (36→42) and never
  _actioned_; it is drifting down the priority list while the freeze it blocks approaches. The journal
  mechanism itself is sound (I read it — `issued_at_seq` + append-only `seq` genuinely make the delta
  _read, not inferred_; the D40 fix is real). The risk is not the mechanism — it is the **payload fields**
  (`change_type` set, per-part discipline, quantity-delta shape, moved-vs-modified) being frozen on a
  guess about what Planitor/BIMsync consume.
- **WHY IT MATTERS** — After freeze, a missing/renamed transport field is an amendment across `.bnn` in
  the field + Miqdar + Planitor (+ BIMsync). This is the definition of the freeze's cost.
- **COST NOW vs LATER** — Get the spec on-box: hours. Amend a frozen transport shape later: a
  coordinated three-to-four-repo migration.
- **RECOMMENDATION** — Resolve ⑥ to a decision (D-1) _before_ step 6, not as a "lower priority" trailing
  item. It is the highest-cost-of-delay thing in the project.

### [2] ⓙ is real and still open — the build engine can make a hole, not a door (verified)

- **WHAT IS CLAIMED** — Plan ⓙ / Entry 36: a hosted element is built via `buildVoid` only; its
  `buildGeometry` is never called ⇒ a door is a hole with no leaf/frame/sill. Flagged "must resolve at
  step 5 before freeze."
- **WHAT IS TRUE** — Confirmed at `build.ts:218–300`: the void loop calls **only** `voidType.buildVoid`
  and pushes `parts: []` (`:298`); the opening's own `buildGeometry` is never invoked. The host's
  `buildGeometry` _is_ required (`:173`), so the asymmetry is real: hosts build parts, hosted elements
  cannot. The finding is accurate and unresolved.
- **WHY IT MATTERS** — Freezing `BimObjectType` + the build wire now forecloses real doors/windows — a
  declared v1.0.0 element. It is the one _foreclosure_ (vs. the cheap reservations ⓚ–ⓝ).
- **COST NOW vs LATER** — A build-engine change + a `BuildContext` confirmation now; a frozen-contract
  amendment after step 6.
- **RECOMMENDATION** — Do exactly what the plan says (resolve at step 5). My only addition: **verify the
  fix is purely a build-engine change and needs no new frozen field** before you rely on that assumption
  — if placing a leaf in the opening frame needs a new `VoidBuildContext`/`BuiltPart` field, that field
  is itself pre-freeze. Prove it's additive-free, don't assume it.

### [3] The wall-join resolver is O(N²) and runs on every rebuild — measured, undocumented

- **WHAT IS CLAIMED** — `current_state.md` §1a: scale is settled; the heap fits; the remaining cost is
  the renderer (Amer's). Entry 42: joins "BUILT + GREEN."
- **WHAT IS TRUE** — `partnersAt` (`joins.ts:133`) and `wallsJoinedTo` (`joins.ts:236`) each do a **full
  scan of `Object.values(scene.elements)`**; `resolveJoins` is called **per element in the build**
  (`build.ts:404`). So a cold load of N walls is **O(N²)** — and the scan runs even when nothing joins.
  Measured (pure TS, no kernel, throwaway probe, now deleted):

  | walls N | resolveJoins(all) | per-wall |
  | ------- | ----------------- | -------- |
  | 40      | 3.9 ms            | 97 µs    |
  | 144     | 29 ms             | 203 µs   |
  | 312     | 96 ms             | 307 µs   |
  | 544     | 285 ms            | 524 µs   |
  | 1012    | 1008 ms           | 996 µs   |
  | 1984    | 4193 ms           | 2113 µs  |

  Per-wall cost grows linearly with N ⇒ total is quadratic. **~4.2 s of pure join scan at ~2,000 walls**;
  extrapolates to ~100 s at the **D48 binding target of 10,000 elements**, on top of the ~40 ms/element
  kernel cost. It also bites interactive edits: a style edit restaging 400 walls re-resolves each
  (O(N) apiece) via the `dependency.ts:70` edge.

- **WHY IT MATTERS** — It is a **new** quadratic cost in the rebuild path (Zayd's layer) that the "scale
  is settled / it's all the renderer" narrative does not account for. This is the style-edit-cliff
  pattern (§4j) exactly: found by _timing_, suspected by no one. **Honest magnitude:** negligible
  (<20 ms) at the hundreds-of-walls of a house; the kernel itself is already the catastrophe at 10k
  (~400 s). So this is a _secondary_ contributor to an already-known problem — but it is unmeasured and
  contradicts a written claim, which is why it belongs in the record.
- **COST NOW vs LATER** — **Not a freeze item** — fixable anytime with an endpoint spatial hash (bucket
  ends by rounded coordinate; O(N) build), no contract change. Cheap whenever done.
- **RECOMMENDATION** — Don't block the freeze on it. Do (a) add one line to §1a retiring the "it's all
  the renderer" claim — the rebuild path gained an O(N²) term; (b) put the endpoint-index fix on the
  v1.0.x perf list beside multithreading. And re-run the D29 5-storey measurement **with joins in the
  path** so the headline scale number isn't from a pre-joins build.

### [4] Mid-span / T-junction wall joins cannot be expressed — an "beats-Revit" ambition gap

- **WHAT IS CLAIMED** — D50/0c: wall joins are in scope; the product "intends to beat Revit/ArchiCAD."
- **WHAT IS TRUE** — Both the auto-join (`partnersAt`, endpoint coincidence only) and the `setJoin`
  override (gated by `wallsShareCorner` → endpoint-to-endpoint, `commands.ts:1380` / `joins.ts:261`)
  handle **only end-to-end corners**. A partition wall whose _end_ meets another wall's _mid-span_ — the
  single commonest interior condition in a real building — gets no join, no miter, no butt, and
  `setJoin` **refuses** it (`NOT_JOINABLE`). Revit/ArchiCAD do this trivially.
- **WHY IT MATTERS** — It's a visible modelling limit the moment someone lays out interior partitions —
  i.e. found by _using_ it, the project's own most reliable method (§1b), which has **not** been aimed
  at interior layouts yet.
- **COST NOW vs LATER** — Likely **additive** (JoinConstraint `{element, other, resolution}` can carry a
  mid-span butt if the precondition relaxes to "endpoint-near-segment") — so probably not a freeze
  foreclosure. **But confirm that**: if a mid-span join needs to record _where_ on the host it lands
  (a parameter along the host baseline), that field is pre-freeze.
- **RECOMMENDATION** — Before step 6, model a small floor plan with interior partitions against the real
  Wall and confirm the `JoinConstraint` shape survives adding mid-span joins later. Record the result
  either way (a reservation, or a proof it's additive).
- **✅ RESOLVED 2026-07-27 (Entry 60, D69) — AND IT WAS WORSE THAN THIS ITEM PREDICTED.** The additivity
  question was answered first (Entry 44, `wall-join-midspan.test.ts`): purely additive, no new frozen
  field, `{element, other, resolution:'butt'}` already keys the junction because two straight baselines
  meet at at most one point. That answer was correct and still stands. **But this item priced the gap as
  a _visible modelling limit_, and the 2026-07-27 backward sweep of domain rule 16 measured it as a
  _silent quantity defect_:** an unjoined partition's last half-thickness sits INSIDE the through wall, so
  that sliver of blockwork exists in **both** B-Reps and `projectQuantities` sums it twice — **2.8800 m³
  reported where 2.8320 m³ is the truth**, with `unmeasured: []` and `basis: 'exact'`. The over-report is
  **fixed per junction** (`t_partition × t_through/2 × height`), so it scales with the **number** of
  partitions rather than their size. ⚠ **The Entry-44 test pinned this exact fixture and stayed green for a
  week**, because it asserted the geometry and the contract-additivity and never asked what the limit did
  to a quantity (§1b's second method). **Mid-span T-junctions now auto-butt in v1.0.0** — directional, with
  a corner's ambiguity discipline, the invalidator's segment edge, and `setJoin` widened so `none` can
  disable it. _A "visible limit" and a "silent wrong number" are not the same severity, and this item chose
  the wrong one._

---

## WHAT IS GENUINELY FINE (and how I checked)

- **The suite is real and green** — ran `pnpm test`, 302/302, 38 files, against the **real OCCT kernel**
  (not the mock; confirmed `document-scale`/`wall-joins`/`constraint-model` import `@bunyan/kernel-occt`).
- **The anti-fuse rule holds for joins** — read `joins.ts`: it computes cap _lines_ only; the Wall clips
  its own side-lines and extrudes its own solid. It reads `{start,end}` **params**, never a built solid,
  so the D1-safety claim (auto-join is a pure function of the recipe) is **true**. The anti-fuse gate
  test (`wall-joins.test.ts §7.1`) genuinely asserts a window's host token stays byte-identical across a
  join. This is the load-bearing invariant and it is correctly guarded.
- **The dependency graph is structurally sound** — `dependency.ts` switches exhaustively over
  `SceneCollection`, so a new collection is a compile error until its edge is declared. The
  container-elevation hole (Entry 24b) is genuinely closed.
- **The journal mechanism** (`undo.ts`) genuinely delivers _read-not-inferred_ deltas via `issued_at_seq`
  - append-only `seq`. D40's fix is real, not a slogan. (The _payload fields_ are the open question —
    Finding 1 — not the mechanism.)
- **The room solver reads params, derives on demand, never stores** (`room.ts`) — the D55/D45
  "unavailable, never 0" discipline is honoured. Its per-query element scan is O(walls) but it is
  on-demand, not in the build hot path, so it is not a Finding-3 sibling.

---

## COVERAGE — what this review did NOT touch (if it's wrong there, I would not have caught it)

- **The browser / renderer (Amer's layer)** — headless box; I did not run `apps/web`. The dominant
  interactive cost (redraw, draw calls, cold load in a real tab) is there and I measured none of it.
- **Gate ⑧ (Miqdar §3.4)** — I did not open `Miqdar_v1.0.0_spec.md` §3.4 and walk the analytical-hint
  reservation. It is a required pre-freeze gate; treat it as unverified here.
- **Gate ⑨ (2D-annotation anchoring)** — not exercised.
- **Hostile-`.bnn` / BREP deserializer hardening** (§4j-2) — the cache bodies aren't written, so there
  was nothing to attack; the required hardening test remains a future deliverable, unverified.
- **IFC round-trip (P6)** — not built, not in scope, not checked.
- **The join O(N²) at the _real_ 10k target** — I measured to ~2,000 walls and extrapolated the
  quadratic; I did not build a 10,000-element model end-to-end (the kernel cost alone would be minutes).
  The quadratic shape is measured; the absolute 10k number is extrapolated.
