### Entry 58 — 2026-07-25 — Zayd — **THE ENUMERATION QUERY + THE CLEAN DELTA EXPORTER SHIP (owner ruled "both in one unit"). THE 42-DAY-OLD CRASHING EXIT CRITERION IS CLOSED — AND FIVE REAL DEFECTS WERE FOUND: TWO BY BUILDING IT (ONE ON THE MOAT'S LOAD-BEARING SENTENCE — THE JOURNAL WAS NOT RECORDING THE ASSOCIATIVE CASCADE AT ALL) AND THREE MORE BY THEN SWEEPING MY OWN NEW CODE ADVERSARIALLY.**
**Task (owner):** Entry 57's chosen next build — the Clean Delta exporter, opening with the enumeration query it is gated on.
Design-doc-first (`P5_step6A_enumeration_design.md`), then an AskUserQuestion round: **Q1 unmeasurable ⇒ a separate
`unmeasured[]` list · Q2 `prior` ⇒ rewind the journal + rebuild ONLY the delta · Q3 scope ⇒ BOTH units in one build**
(the owner overrode the recommendation to split them). `pnpm verify` **417/417 green** (387 → +30), real exit code captured.

- **⚠ THE GAP, RE-MEASURED ON REAL GEOMETRY RATHER THAN QUOTED** (§1b). A Site → Tower A → Level 1 with one `core.wall`,
  one `core.opening` Door and one 3×2 `core.curtainwall`, against the real OCCT kernel:
  ```
    scene.elements (AUTHORED rows)      3        real elements    19    ⇒ 16 invisible to `scene.elements`
    with own parts                     15        with none         4    the curtain-wall parent + its 3 columns
    NAIVE LOOP  for (id of Object.keys(scene.elements)) await doc.quantities(id)
       ⇒ counted 2, then THREW: `element "curtainwall-01KYD7CYZ…" has no built geometry`
  ```
  **⚠⚠ AND THE THIRD FINDING IS NEW — "SKIP VOIDS" IS THE WRONG RULE.** `review_P4.md` (2026-07-14) and Entry 57 both named
  **the Opening** as what kills the loop (*"a void has no parts"*). On the SHIPPED types it dies on the **CURTAIN WALL** — a
  **pure composite**, which has no own parts *by design*. **A rule written to skip voids specifically would have shipped
  green and still crashed on the very element D59 was built to prove.** The honest rule is *"an element with no OWN parts
  yields no quantity rows"*, and it has **two** populations. *(The ⓙ door is in neither — leaf + frame, and it is measured.)*
- **BUILT — the enumeration query** (`enumerate.ts`, additive, nothing frozen moved): `modelElements()` (sync, kernel-free)
  applies the four filters **in one place so three products cannot each get them slightly wrong** — the D59 children TREE
  (not one level: a column is itself composite), the D65/D67 option cascade, no-own-parts, and the build state.
  `projectQuantities()` returns **flat per-part rows carrying the LBS address** + `totalsBy{Material,Discipline,Container,Type}`;
  `containerCodeOf()` exposes the LBS path Entry 57 found missing. **The exit criterion answers: *"how much C25/30 is in this
  building?"* = 3.18 m³**, one call, no throw.
- **⚠⚠ DEFECT 1, FOUND BY THE TYPECHECKER WHILE WIRING IT: A GENERATED CHILD'S TYPE WAS NOT RECOVERABLE FROM THE BUILT TREE.**
  The engine constructs a full `Element` for every D59 child (it must — `buildGeometry` takes one) and then **threw it away**,
  keeping only geometry. So a **curtain-panel schedule** — *"completely standard in Revit"*, Entry 57's own example — could not
  say what type its rows were, and the Clean Delta's `classification.ifc_class` / `type_name` were unproducible for **16 of the
  19** real elements. Fixed by carrying it (`ElementGeometry.element?`) — a build-output projection, never stored, not a frozen
  shape; the object already existed in the engine's hand. It also makes a derived child and an authored row the **same shape**,
  which is why the enumeration has one code path instead of two.
- **⚠⚠⚠ DEFECT 2 — AND IT IS ON THE MOAT'S LOAD-BEARING SENTENCE. THE JOURNAL WAS NOT RECORDING THE ASSOCIATIVE CASCADE.**
  `P5_step6_clean_delta_design.md` §3 rests `modified_qty` on *"whether the element's own params changed **OR it appears in
  some edit's `rebuilt`**"*, and calls it *"the case a naive two-model diff gets right only by luck; Bunyan reads it off
  `rebuilt`."* **It did not.** **Thirteen commands** — `updateContainer`, `updateGrid`, `updateMaterial`, `updateSection`
  among them — declare `rebuilt: []`, because the command layer legitimately does not KNOW what a container/grid/material edit
  reaches; the **typed dependency graph** does, and `#affected` had already resolved it to *do* the rebuild. **So the geometry
  was always right and the journal simply did not say so: moving a Level rebuilt every wall on it and recorded `rebuilt: []`** —
  and a Clean Delta consumer would have been told a storey of re-quantified walls was `unchanged`. **A wrong schedule, from a
  green suite.** Fixed at the one place both answers meet (`execute` now journals the RESOLVED set — the field is frozen and
  unchanged, only its content is now complete). **⚠ §1c-7's disease, FOURTH occurrence: the claim was written in a design doc
  and never read against the code.**
- **BUILT — the Clean Delta exporter** (`cleandelta.ts`): `journal + revN → CleanDeltaPackage`, `contract_version "1.1"`,
  `source "bunyan"`, mapped field-for-field onto the real on-box `../Planitor/v2.2_spec.md` §4. `change_type` derived from the
  journal slice; `sceneAt()` **rewinds** by inverting `SceneChange.before/after` (exact — the journal is append-only and an
  undo is a REVERSAL, D40); `prior` priced on a **throwaway document rebuilt over only the delta's elements** (owner Q2) via
  the new bounded `rebuildOnly()`. `reidentified` is declared and **never emitted**. The LBS zones/floors fall straight out of
  `scene.containers` — nothing minted, nothing mapped. **No frozen change, exactly as the ⑥ design proved pre-freeze.**
- **⚠ AND A HEAP CONSEQUENCE THE RULING CREATED: a throwaway document holds real OCCT solids.** Added `DocumentContext.dispose()`
  — without it every export would bleed the whole prior model into the tab the user is still modelling in (spec §6.2, the
  Entry-21 leak class one level up). Pinned by a `wasmLiveHandles()` before/after assertion.
- **BUILT — the JSON Schema** (`packages/document/schema/clean-delta-1.1.schema.json`), the artifact **Planitor D11** makes the
  contract itself (*"a contract maintained by remembering to edit N files WILL drift, and this one carries money"*). A real
  export is validated against it, and **the validator is itself revert-verified** against 8 deliberate mutations (a wrong
  `const`, a downgraded `basis`, an out-of-enum `change_type`, a nested bad part…) — a conformance test whose checker cannot
  fail is theatre. A third test asserts the schema uses **only** the draft-07 keywords the validator implements, so the subset
  cannot silently fall behind. ⚠ `ajv` is in the tree only as an eslint transitive (not importable under pnpm) — **nothing was
  installed**; cross-repo CI validation (Planitor D11's other half) is not this repo's to land.
- **⚠ REVERT-VERIFIED, all three:** remove the no-own-parts guard ⇒ the roll-up **throws on the curtain wall**; remove the
  children walk ⇒ the glass and aluminium totals **silently vanish** while the run stays green (*the* failure mode — a
  plausible, short number wearing `basis: 'exact'`); revert the journalled cascade ⇒ `expected [] to include 'wall-…'`.
  `tests/model-enumeration.test.ts` (12), `tests/clean-delta-export.test.ts` (9), `tests/clean-delta-schema.test.ts` (4) —
  all on real OCCT, real `@bunyan/types`, real buildings.
- **Box:** read/measure/build only; `pnpm verify` ×4 + targeted vitest runs; **nothing installed, no containers touched, no
  ports bound**; `/tmp` 11 MB; available RAM never below ~2.2 GB; **both live public sites up throughout**.
  ⚠ **UNCOMMITTED — owner-gated** (Entries 57 + 58 now both sit in the tree).

- **⚠⚠⚠ AND THEN THE SAME METHOD WAS TURNED ON THIS SESSION'S OWN CODE — A POST-BUILD ADVERSARIAL SWEEP OF THE EXPORTER,
  WHICH FOUND THREE MORE. Every one of them is a row Planitor would have ACTED on.**
  - **(a) A NON-ACTIVE DESIGN OPTION WAS EMITTED AS A GHOST ROW — D65's failure mode by a THIRD road.** `modelElements`
    applies the exclusion rule, but **the journal names element ids directly**, so an element in a non-active option
    arrived through `histories` with no match in the enumeration and was emitted as `modified_qty`, no quantity, empty
    `spatial_container_code`, `IfcBuildingElementProxy` — **a work-package row for a facade nobody will build.** D65's
    own stated failure mode, reached neither by the option tag (D65) nor by hosting (D67) but by the **exporter's
    journal path.** ⇒ not-active is neither a change nor a deletion: those elements are omitted entirely.
  - **(b) AN EDIT THAT WAS UNDONE WAS REPORTED AS A SPATIAL MOVE THAT NEVER HAPPENED.** The derivation read the **last
    change in the slice** — and an undo is a first-class journal entry (D40), so the last change is the REVERSAL, a
    `before → after` differing in `end`. Net effect since the baseline: nothing. Reported: `modified_move`. ⇒ rewritten
    to compare **the two ENDPOINTS** (state at revision N vs state now). ⚠ **This is still not "diffing two models":
    the journal decides WHICH elements are asked about — including the cascade nothing names — and only those elements'
    endpoints are read.** The moat is the SET, not the comparison.
  - **(c) A GENERATED CHILD WHOSE SLOT VANISHED FELL OUT OF THE PACKAGE SILENTLY.** Shrink a curtain wall from 3 columns
    to 2 and the dropped column is in no scene row and no current enumeration — so under Planitor's *"absence-from-
    `elements` ⇒ unchanged"* rule **it would have been billed forever.** ⇒ the prior model's enumeration is now walked
    too, and the authored root is derived **structurally from the PEI** (`${parentId}:${slot}`) rather than looked up —
    the lookup returned nothing for exactly the element that needed it most.
  - **✅ CHECKED AND CLEAN (don't re-probe):** the ⓣ reserved metadata args (`mark`/`phaseCreated`/`properties`/
    `classifications`) thread through `createElement` **and** survive a `.bnn` round-trip; and **the Clean Delta is
    computable from a reloaded `.bnn`** — save → load → export gives the exact prior (3.6 m³) and current (5.4 m³). That
    is the D40 headline end-to-end, and it is now a permanent test rather than a claim.
  - **⚠ THE PATTERN, AND IT IS THE SESSION'S REAL LESSON: five defects, and NOT ONE was on a happy path.** Each needed a
    question the build itself never asks — *what if the option is excluded? what if it was undone? what if the child is
    gone?* The sweep cost ~30 minutes and found three defects in code that was already green and already revert-verified.

**NEXT:**
- **Owner:** **the FREEZE (step 6) is still the owner's act** and is unblocked — nothing in this entry touched a frozen shape.
  ⚠ Also owner-gated: **committing Entries 57 + 58** (`origin/main` is still at `6ec5139`).
- **⚠⚠ A JUDGEMENT CALL, AND THIS SESSION STRENGTHENED IT RATHER THAN CLOSING IT.** Defect 2 means **every claim in a design
  doc that names a field should be read against the code before the freeze tags it** — four occurrences now. And the
  post-build sweep then found **three defects in code that was already green and already revert-verified**, in ~30 minutes,
  none of them on a happy path. ⇒ **the adversarial sweep is not a one-off pre-freeze ritual; it is the only method that has
  ever found anything** (§1b), and it should run against each new surface *after* it goes green, not instead of. A standing
  sweep of *"which asserted behaviours have no test that would fail without them?"* is cheap now; after the freeze a missing
  one is a three-product amendment.
- **Zayd:** the schedules body (D58 row Ⓐ — the enumeration query is now their input too) · the join O(N²) endpoint index
  (`review_P5.md` #3, v1.0.x perf, no contract change) · the D29 cache bodies.
- **Amer:** unchanged and all post-freeze/parallel — renderer batching/instancing (the Entry-55 unlock), P4.5, FSA adapter,
  WebGPU, service worker/PWA, Cloudflare deploy.
