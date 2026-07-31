### Entry 54 — 2026-07-24 — Zayd — **D66 CONTRACT HALF DONE: THE HEAP-EVICTION HOOK NEEDS NOTHING RESERVED (additive by construction) — SO THE CONTRACT IS SAFE TO FREEZE ON SCALE GROUNDS. THE REMAINING SCALE WORK IS AMER'S AND BELOW THE FREEZE LINE.**
**Task (owner):** "commit then start D66." Committed Entries 52+53 (`origin/main` @ `e737aa9`) + Miqdar Entry 1 (local
`26b442c`, no remote), then started D66 — the last pre-freeze item. `P5_step9_D66_scale_design.md`. **No code change**
(an evidence-based contract ruling, like D64); the two headless scale harnesses re-run green as part of the suite.

- **⚠⚠ THE ONLY FREEZE-GATING PART OF D66 IS THE HEAP-EVICTION CONTRACT HOOK — and it is RULED: reserve NOTHING,
  ADDITIVE BY CONSTRUCTION.** The imp_plan feared heap-eviction/lazy-build might be a v1.0.0 requirement that *touches
  contracts*. Two findings retire it: **(i)** the heap FITS (below), so eviction is not required; **(ii)** even as a
  v1.0.x option, eviction FORECLOSES NOTHING — the same recipe-is-truth logic that earned D64. Verified against code:
  - *"any built solid may be dropped and rebuilt from the recipe"* = **the core invariant** (rule 1), and the D29
    cold-load test **proves it** (a fresh `DocumentContext` rebuilds every solid from `scene.json` alone, byte-identical,
    `brokenRefs()==0`; if the WHOLE model rebuilds, any SUBSET does — that IS lazy-build/eviction).
  - the evicted state already exists: **`ElementState.stale`** = recipe present, solid not built.
  - the release mechanism is **ALREADY FROZEN**: **`releaseShape`** is in the frozen protocol (P3), and the kernel-client
    **already fires it** for dropped handles (`kernel-client/src/client.ts:9`).
  - the keep-live POLICY (which solids to hold, by camera/selection/viewport) is **RUNTIME state, never `scene.json`**
    (persisting it would violate recipe-is-truth exactly as storing a mesh would) ⇒ **no frozen-type field.**
  - the build/evict-on-demand API is an **additive DocumentContext method** (D19/rule 5), not an edit to a frozen shape.
  ⇒ **The freeze does not — and could not — foreclose eviction, because eviction is recipe-is-truth exercised on a
  subset.** D64's finding in a second guise: a runtime concern binds to the recipe; nothing new on the frozen data shapes.
- **MEASURED FRESH (2026-07-24, this box, box healthy — 854 MB free / 2.28 GB avail; the heap harness is capped at ~310
  solids and extrapolates via a slope, never building 16k solids on a 3.7 GB box):**
  - **(a) HEAP: 16.2 KB/live-solid + 64 MB floor → 0.31 GB at 10,000 elements. FITS** (1.5 GB tab budget; 4 GB WASM32
    cap). Confirms Entry 29 on the current kernel. The harness's own verdict: eviction stays a v1.0.x option.
  - **(c) COLD LOAD: 38.1 ms/element → ~6.35 min at 10k, single-thread, NO cache.** Too slow for a good first-load UX —
    but every lever is already-ruled and **additive**: the D29 BREP cache (RULED SHIP; its ops reserved), `instantiate`
    (RESERVED), multithreading (D8, v1.0.x — deploy config, not a `scene.json` contract). **None touches a frozen shape.**
  - **(b) DRAW CALLS + (d) EDIT LATENCY: Amer's — browser-side, unmeasurable headless.**
- **⚠ THE O(N²) JOIN RESOLVER IS NOT IN THESE NUMBERS, AND THAT IS CORRECT.** The scale fixture's wall is
  `{length,height}`-parameterised, so `baselineOf` returns undefined and `resolveJoins` early-returns — the scan never
  fires. review_P5 #3 already measured it in isolation (~4.2 s at ~2,000 walls) and **ruled it a v1.0.x perf item, NOT a
  freeze item** (fixable with an endpoint spatial hash, no contract change). Re-deriving it is not the freeze-gating work.
- **⇒ THE CONTRACT IS SAFE TO FREEZE ON SCALE GROUNDS.** The only scale question that could foreclose a contract — the
  heap-eviction hook — is resolved (reserve nothing). Every remaining lever (cache, instantiate, MT, renderer batching)
  is additive.
- **⚠⚠ OWNER RULED THE FREEZE-READINESS QUESTION: HOLD (2026-07-24).** I put FREEZE NOW (recommended — contract safe,
  remaining perf additive) vs HOLD (wait for Amer's numbers). **The owner chose HOLD:** the freeze does NOT proceed until
  **all four scale axes have a number** and the **D8 single-thread verdict** is made. ⇒ **THE LAST PRE-FREEZE BLOCKER IS
  NOW AMER'S, NOT ZAYD'S** — the two missing axes (draw calls, edit latency) are the browser scale page (imp_plan P4 step
  9b), which a headless box cannot run. Nothing about the contracts changes; the owner is holding the *act* until the
  *measurement* is complete (a higher bar than "the contract is safe," and his to set).
- **⚠ Entry 54 = docs only; owner ruled COMMIT + PUSH.** Committed + pushed with this entry (see below). Box: read +
  measure only; nothing installed, no containers touched, no ports bound; the scale harnesses stayed within box limits.

**NEXT — ⚠ THE FREEZE IS BLOCKED ON AMER, FOR THE FIRST TIME:**
- **Amer (browser, THE pre-freeze blocker):** build the scale page (imp_plan P4 step 9b), produce **draw calls** +
  **edit latency** at ~10,000 elements with a written recommendation each — the two numbers the freeze now waits on.
  Then the **D8 single-thread verdict** (renderer wall vs kernel wall) can be made.
- **Zayd (headless):** the D66 contract half is done; nothing further owed until the freeze is called. Heap + cold-load
  stand (Entry 54 §1); the join O(N²) is a v1.0.x perf item (review_P5 #3).
- **The FREEZE (step 6)** unblocks only once those two axes exist + the D8 call is made — then the Architect signs off and
  the contracts freeze (tagging the Ⓐ–Ⓕ reservations + `Material.thermal?`). ⚠ **Committed + pushed: Entries 52+53+54.**
