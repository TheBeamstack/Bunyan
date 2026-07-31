# P5 / D66 — the 4-axis scale measurement, and THE ONE PRE-FREEZE QUESTION IN IT (the heap-eviction contract hook)

**Status:** ANALYSIS + MEASUREMENT (headless, Zayd, 2026-07-24). **The contract question is RULED here;
the freeze-readiness call is surfaced to the owner (§5).** No code change — like D64, this is an
evidence-based contract ruling plus fresh numbers.
**Predecessor:** rows Ⓐ–Ⓕ (Entries 47–53, all closed). **Successor:** the owner-gated FREEZE (P5 step 6).

**What D66 is (Entry 46 / imp_plan P4 step 9).** The 10,000-element interactive target (D48, BINDING) has
**four scale axes**: WASM heap · draw calls · cold load · edit latency. Entry 46 made the 4-axis
measurement a _binding pre-freeze deliverable_ — **but not because all four numbers gate the freeze.**
Exactly one thing in D66 is a frozen-contract question, and it is the reason D66 is pre-freeze at all:

> _"If the [heap] answer is bad, a heap-eviction / lazy-build strategy is a v1.0.0 requirement… it is a
> **document-layer design** (what may be released and rebuilt on demand), which means **it touches
> contracts**, which means **it must be known before P5 freezes.**"_ — imp_plan P4 step 9a

**⇒ The freeze-gating deliverable is: does heap-eviction / lazy-build need a hook reserved in the frozen
contract, or is it additive?** That is Zayd's, and this doc rules it. The other three axes are either
already-priced (heap, cold load) or Amer's browser-side renderer measurement (draw calls, edit latency),
and — critically — **none of them can foreclose a frozen contract** (§3), so none gates the freeze.

---

## 1. The measurement (fresh, this box, 2026-07-24)

Re-ran the two headless scale harnesses (`tests/document-heap-scale.test.ts`, `tests/document-scale.test.ts`)
on the current kernel. Box stayed healthy throughout (854 MB free / 2.28 GB available; the heap harness is
deliberately capped at ~310 live solids and extrapolates via a least-squares slope, never by building 16k
solids on a 3.7 GB box).

| Axis                 | Number (measured)                                                 | At the 10,000-element target        | Verdict                                                                                                |
| -------------------- | ----------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **(a) WASM heap**    | 16.2 KB / live solid marginal + 64 MB fixed floor                 | ~16,000 solids ⇒ **0.31 GB**        | ✅ **FITS** (1.5 GB practical 1-tab budget; 4 GB WASM32 cap). Confirms Entry 29 on the current kernel. |
| **(c) Cold load**    | 38.1 ms / element (195 el ⇒ 7.4 s), **no cache, single-threaded** | ~**6.35 min**                       | ⚠ Too slow for a good first-load UX — but every lever is already-decided and **additive** (§3).        |
| **(b) Draw calls**   | —                                                                 | ~16,000 (one `THREE.Mesh` per part) | ⛔ **Amer's — browser-side, not measurable headless.**                                                 |
| **(d) Edit latency** | — (kernel rebuild is flat; the cost is renderer re-tessellation)  | —                                   | ⛔ **Amer's — browser-side.**                                                                          |

⚠ **The O(N²) join resolver (review_P5 #3) is NOT in these numbers, and that is correct, not an oversight.**
The scale fixture's wall is `{length,height}`-parameterised, so `baselineOf` returns `undefined` and
`resolveJoins` early-returns — the join scan never fires. review_P5 already measured the join cost in
isolation (~4.2 s of pure-TS scan at ~2,000 walls; ~100 s at 10k) and **ruled it a v1.0.x perf item, NOT a
freeze item** — it is fixable anytime with an endpoint spatial hash, **no contract change.** Re-deriving it
is not the freeze-gating work; the contract hook is. _(It is flagged in `current_state.md` §1a so the "scale
is settled" narrative accounts for it.)_

---

## 2. ⚠⚠ THE CONTRACT RULING — heap-eviction / lazy-build needs NO reserved hook. Additive by construction.

The imp_plan feared heap-eviction might be a v1.0.0 requirement that _touches contracts_. Two independent
findings retire that fear:

**(i) The heap answer is not bad — it FITS (§1a).** So eviction is not a v1.0.0 _requirement_ at all. The
harness's own recommendation: _"heap is NOT the binding constraint at target… eviction/lazy-build stays a
v1.0.x option."_

**(ii) And even as a v1.0.x option, eviction/lazy-build FORECLOSES NOTHING — the frozen contract already
permits it, by construction.** This is the load-bearing finding, and it is the same recipe-is-truth logic
that earned D64. Verified against code:

| What eviction/lazy-build needs                                     | Already in the frozen contract?                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _"any built solid may be dropped and rebuilt from the recipe"_     | ✅ **The core invariant** (`core_logic.md` §2, rule 1): the recipe is truth, the solid is a disposable projection. The D29 cold-load test **proves it** — a fresh `DocumentContext` rebuilds every solid from `scene.json` alone, byte-identical, `brokenRefs() == 0`. If the _whole_ model rebuilds from the recipe, **any subset does** — that IS lazy-build/eviction. |
| a state meaning _"recipe present, solid not built"_                | ✅ **`ElementState.stale`** (`entities.ts:686`) already models exactly this. An evicted element is a `stale` element; no new state.                                                                                                                                                                                                                                      |
| a mechanism to release a solid's WASM handle                       | ✅ **`releaseShape`** is in the **FROZEN protocol** (`ops.ts` — frozen at P3), and the kernel-client **already fires it** for every dropped handle (`kernel-client/src/client.ts:9`), so drags don't leak heap. The mechanism ships today.                                                                                                                               |
| _which_ elements to keep built (viewport-visible, recently-edited) | ⚠ **RUNTIME state, never `scene.json`.** Which solids to hold live is computed from the camera, the selection, the viewport — transient inputs that are **never persisted** (storing them would violate recipe-is-truth exactly as storing a mesh would). So it needs **no scene.json / no frozen-type field.**                                                          |
| the API to build/evict a chosen element on demand                  | ⚠ **Additive DocumentContext surface** — a `buildElement`/`evictElement` method (or internal policy) is a _new_ capability, and a new command/method is additive (D19 / domain rule 5), never an edit to a frozen shape. `quantities()`/a query would "rebuild-on-demand if evicted" — additive policy, not a contract field.                                            |

⇒ **RULING (D66 contract half): reserve NOTHING for heap-eviction / lazy-build.** It is additive by
construction — the data contracts (`scene.json`, `BimObjectType`, `SubShapeRef`) need no hook because
recipe-is-truth makes every solid disposable-and-rebuildable, the evicted state (`stale`) and the release
mechanism (`releaseShape`) already exist and are frozen, and the keep-live _policy_ is runtime state that is
never persisted. **The freeze does not foreclose eviction; it never could, because eviction is just
recipe-is-truth exercised on a subset.** _(This is D64's finding in a second guise: a runtime/analysis
concern binds to the recipe, and nothing new lives on the frozen data shapes.)_

---

## 3. Why the other three axes do not gate the freeze either

The freeze is about **contracts**, not about hitting a performance number. Each remaining axis's fix is
already-decided and **additive**, so none forecloses a frozen shape:

- **Cold load (6.35 min single-threaded, no cache).** Levers, all already-ruled: the **D29 BREP cache**
  (RULED SHIP; its ops `exportBrep`/`importBrep` are **reserved in the frozen protocol**) · **`instantiate`**
  (RESERVED in the frozen protocol — it collapses N identical builds to 1 build + N cheap re-owns) ·
  **multithreading** (D8, v1.0.x — COOP/COEP + `SharedArrayBuffer` is deploy/runtime config, **not a
  `scene.json` contract**). Every lever is additive; **none touches a frozen data shape.**
- **Draw calls (~16k) and edit latency.** Both are **renderer** concerns (batching by material, instancing,
  LOD, incremental re-tessellation) — **Amer's, browser-side, below no frozen contract.** `instantiate` is
  their natural kernel partner and is already reserved.

⚠ **So the honest freeze position:** the _only_ scale question that could have foreclosed a contract — the
heap-eviction hook — is resolved (§2, reserve nothing). Every remaining scale lever is additive. **The
CONTRACT is safe to freeze on scale grounds.**

---

## 4. What is genuinely still OWED — and it is NOT contract-gating

Two things remain, and both are _performance-verdict_ work, not _contract_ work:

1. **Amer's two renderer axes** (draw calls, edit latency) — measurable only in the browser (the scale
   _page_, imp_plan step 9's browser half). They are essential for the _product_, improvable forever, and
   **below the freeze line.**
2. **The single-threaded-target / D8 decision.** Cold load at 6.35 min (even with the cache + `instantiate`)
   _may_ argue for pulling multithreading (D8) into v1.0.0. ⚠ **imp_plan is explicit: "Raise it with the
   Architect; do not re-decide it here."** And it cannot be decided yet — it needs Amer's two axes to know
   whether the renderer or the kernel is the wall. **D8 is additive either way** (MT is a build/deploy
   concern, no `scene.json` change), so **deferring the D8 decision does not block the freeze.**

---

## 5. ⚠ OWNER DECISION — is the freeze ready? → ✅ RULED: HOLD (owner, 2026-07-24)

Rows Ⓐ–Ⓕ are closed; D66's **contract** question is resolved (reserve nothing). The remaining scale work
(Amer's 2 renderer axes + the D8 performance verdict) is **additive and below the freeze line** — it cannot
foreclose a frozen contract. So the contracts (`SubShapeRef` / `BimObjectType` / `Command` / `scene.json` /
`ParamSchema` / `UndoableEdit`, now carrying the Ⓐ–Ⓕ reservations + `Material.thermal?`) are, on the
evidence, **safe to freeze.**

**The options put to the owner (the freeze is owner-gated, P5 step 6):**

- **(A) FREEZE NOW** — track Amer's renderer measurement + the D8 verdict as a parallel, non-contract item.
  _(My recommendation, on the evidence that the contract cannot be foreclosed by any remaining perf lever.)_
- **(B) HOLD the freeze** until Amer's browser scale page has produced the draw-calls + edit-latency numbers
  and the D8 single-thread verdict is made — the imp_plan's _"every axis has a number"_ exit criterion, read
  as literally blocking.

> ### ✅ OWNER RULED (B) — HOLD THE FREEZE. (2026-07-24)
>
> **The freeze does NOT proceed until all four scale axes have a number and the D8 single-thread verdict is
> made.** The two missing axes — draw calls, edit latency — are **Amer's browser-side measurement** (the
> imp_plan step-9 _browser scale page_, the half a headless box cannot run). ⇒ **THE LAST PRE-FREEZE
> BLOCKER IS NOW AMER'S, NOT ZAYD'S**: the pre-freeze critical path has, for the first time, an item that
> can only be closed in a real browser. **Nothing about the contracts changes** — they remain safe to freeze
> on scale grounds (§2/§3); the owner is holding the _act_ until the _measurement_ is complete, which is a
> higher bar than "the contract is safe," and it is his to set.
>
> **What this means for the next sessions:**
>
> - **Amer (browser):** build the scale page (imp_plan P4 step 9b), produce **draw calls** + **edit latency**
>   at ~10,000 elements, and report both with a written recommendation — the two numbers the freeze now waits
>   on. Then the **D8 single-thread verdict** can be made (renderer wall vs kernel wall).
> - **Zayd (headless):** the contract half is done; nothing further is owed here until the freeze is called.
>   The heap + cold-load numbers stand (§1); the join O(N²) remains a v1.0.x perf item (review_P5 #3).
> - **The freeze (step 6)** is unblocked only once those two axes exist and the D8 call is made — then the
>   Architect signs off and the contracts freeze (now also tagging the Ⓐ–Ⓕ reservations + `Material.thermal?`).
