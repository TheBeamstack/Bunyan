### Entry 57 — 2026-07-25 — Zayd — **THE PRE-FREEZE ADVERSARIAL SWEEP (owner-authorised in place of freezing): IT FOUND A DEFECT IN A RULE D65 HAD ALREADY PUT INSIDE THE FROZEN CONTRACT — THE DESIGN-OPTION EXCLUSION DID NOT CASCADE OVER THE HOSTING EDGE, AND A CONSUMER COUNTED 4 WINDOWS WHERE 1 WAS CORRECT. FIXED (D67) + REVERT-VERIFIED. THE SWEEP'S SECOND FINDING IS THAT THE MODEL STILL CANNOT BE ENUMERATED.**
**Task (owner):** all pre-freeze rows Ⓐ–Ⓕ + D66's four axes were closed and the freeze was an owner act. Offered FREEZE NOW
(recommended) vs one more adversarial sweep; **the owner chose the sweep** — *"fix it, and keep sweeping"* — and separately
**DECIDED D8: multithreading STAYS v1.0.x** (Amer's Entry-55 recommendation confirmed; it was "raised, not decided" until now).
`pnpm verify` **387/387 green** (375 → +12), real exit code captured.

- **⚠⚠ THE FINDING (D67, new row Ⓖ — `P5_step5G_option_cascade_design.md`). D65 ruled the exclusion invariant INTO the frozen
  contract** — not merely into storage — *"so the three consumers implement the SAME rule instead of three slightly different
  ones."* It shipped as `isElementActive`, tested, revert-verified, 19 assertions. **It read only the element's OWN
  `designOptionId`, and its signature `(element, options, active)` handed it NO MODEL — so it was structurally incapable of
  asking what the element hangs off.** Measured against the real kernel, two real facade schemes, `brokenRefs()==0`:
  ```
  Scheme A (chosen):     1 wall, 1 window        Scheme B (not built):  1 wall, 3 windows
    active WALLS   = 1   ✓        active WINDOWS = 4   ✗ (correct: 1)
    ⇒ all 3 spurious windows are hosted on the wall THE SAME RULE JUST EXCLUDED — each a window with no wall
  ```
  **This is verbatim D65's own stated failure mode** (*"a schedule double-counts and publishes work packages for a scheme
  nobody is building"*), reached by the one road D65 did not walk: **the hosting edge.** The author tags the WALL — the natural
  authoring act, and the only one Revit asks for — and the windows follow it in the model but not in the rule.
  ⚠ **Why pre-freeze and not an ordinary bug: the defect is in the SIGNATURE, not the body.** Correcting it later changes a
  helper D65 deliberately froze **for three products to call** — the exact cross-product amendment the freeze exists to prevent.
- **THE EDGE INVENTORY (the §1b method turned on the rule itself — *which edges make one element's reality depend on another's?*):**
  **hosting (`hostId`) — BROKEN, measured.** **Generated children (D59 Model A) — ✅ SAFE BY CONSTRUCTION:** they are not
  `scene.elements` rows, so a consumer never enumerates them separately and they are excluded WITH their parent. **D59's
  derived-children ruling pays off a second time.** **Manual groups (`parentElementId`, reserved) — the same hole, dormant**;
  the rule is now written for that edge too, so v1.0.x groups land additively.
- **THE FIX (owner-ruled shape: "widen the rule to see the model").** `isElementActive(element, scope, active?)` where `scope`
  is the document (`Scene` satisfies it structurally). An element counts iff **its own option is active AND every element it
  hangs off is active.** ⚠ It is a **TRAVERSAL, not a chain walk** — an element may hang off `hostId` AND `parentElementId` at
  once, and following only one would silently ignore the other, which is the shape of the very defect being corrected. Edge
  semantics each match an existing precedent: **a missing ancestor ⇒ excluded** (the broken-reference precedent — counting it
  bills a window into thin air); **a cycle ⇒ excluded and it TERMINATES** (the `buildChildrenTree` cycle-guard precedent —
  a hostile `.bnn` must break predictably, never hang). New exported types `OptionedElement`/`OptionScope`.
  **No `SCENE_SCHEMA_VERSION` bump, no new field, no verb, no stored byte** — a correction to a frozen RULE.
- **⚠ REVERT-VERIFIED:** neuter the ancestor walk ⇒ **8 tests fail, the headline one reproducing the original defect exactly —
  `expected 4 to be 1`, `{ walls: 1, windows: 4 }`.** `tests/option-cascade-d67.test.ts` (12, real OCCT — the two-scheme
  building is real geometry, not hand-made objects; the §1b method is what found this). `tests/step5F-reservations.test.ts`
  updated to the new signature (19, still green).
- **⚠⚠ THE SWEEP'S SECOND FINDING — THE MODEL CANNOT BE ENUMERATED, AND THREE SEPARATE CONSUMERS ALL NEED THAT ONE QUERY.**
  Not freeze-blocking (a query is additive, D19/rule 5) — but it is on the moat's critical path and it is the design input for
  the Clean Delta exporter. `scene.elements` is the AUTHORED ROWS, which is **not** the set of real elements:
  - **it MISSES generated children** — a 3×2 curtain wall is **1 scene row and 17 real elements**; a schedule over
    `scene.elements` misses **16**. A curtain-panel schedule is completely standard in Revit.
  - **it INCLUDES non-active design options** — that is D67 above; the rule now exists but nothing applies it.
  - **it INCLUDES voids** — and `quantities()` on an Opening still **throws** (*"has no built geometry"*), so the naive
    project-wide loop still dies on the first window, exactly as `review_P4.md` measured on **2026-07-14**. Still zero code
    **42 days and 13 entries later**, while P5 was declared closed twice — **§1c-7's disease, third occurrence.**
  - **there is no LBS/ancestry API** (`DocumentContext` has no container-path method) and **`QuantityBreakdown` carries no
    container address** — so the per-container roll-up the plan demands (spec §7a, Planitor's Location Breakdown Structure)
    has nowhere to land. ⚠ Two towers themselves are fine — `Site → Tower A/B → Levels` builds correctly (probed).
  ⇒ **ONE missing query serves all of it:** enumerate every real element (walking generated children), excluding non-active
  options, skipping voids by construction. **This is the plan's own instruction** — *"MAKE IT A COMMAND/QUERY, NOT A LOOP EVERY
  CONSUMER REWRITES"* — and *"a producer that cannot enumerate the model's quantities cannot produce a Clean Delta."*
- **RECORDED, NOT DEFECTS:** hosting an opening on a generated child is **refused cleanly** (*"no element …/panel.r0c0 in this
  document"*) — a capability gap vs Revit, but predictable breakage beat silent wrongness and `hostId` can express it, so it is
  additive. The journal for a composite edit names only the **parent** row (`rebuilt: [curtainwall-…]`, before/after params) —
  **correct** under Model A (children re-derive from the recipe), but a panel-level delta requires the same enumeration query.
- **⇒ THE SWEEP FOUND NO CONTRACT FORECLOSURE BEYOND D67.** Every other gap is an additive query. **On the evidence the
  contracts are now safe to freeze** — and one real defect was caught in a rule that had already been declared frozen-contract,
  which is precisely what the sweep was authorised to find.
- **Box:** read/measure/build only; `pnpm verify` ×5; nothing installed, no containers touched, no ports bound; `/tmp` 10 MB;
  both live public sites up throughout. ⚠ **UNCOMMITTED — owner-gated.**

**NEXT:**
- **Owner:** **the FREEZE (step 6) is again the owner's act** — the sweep is discharged and D67 is fixed. Sign off and tag
  `SubShapeRef`/`BimObjectType`/`Command`(+`argsSchema`)/`scene.json`/`ParamSchema`/`UndoableEdit` frozen, carrying the Ⓐ–Ⓖ
  reservations + `Material.thermal?`. ⚠ Also owner-gated: **committing Entry 57.**
- **Zayd (next build, owner-chosen):** **the Clean Delta exporter** — and it opens with the enumeration query above, which is
  its stated prerequisite. The join O(N²) endpoint index stays a v1.0.x perf item (`review_P5.md` #3).
- **Amer:** unchanged and all post-freeze/parallel — renderer batching/instancing (the Entry-55 unlock), P4.5, FSA adapter,
  WebGPU, service worker/PWA, Cloudflare deploy.
