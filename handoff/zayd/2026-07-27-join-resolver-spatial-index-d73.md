### Entry 61 — 2026-07-27 — Zayd — **THE JOIN RESOLVER'S O(N²) SCAN IS GONE (D73). `review_P5.md` #3 RETIRED, MEASURED ON BOTH SIDES — AND THE OPTIMISATION'S OWN RISK IS WHAT GOT TESTED. 458 GREEN.**
**Task (owner): "go for next work."** Taken from Entry 60's own NEXT list. Chosen over the schedules body because it needs
no ruling to proceed (a schedules build opens with a design doc + a ruling round), it is bounded and measurable, and
**Entry 60 had made it worse** — `throughWallsAt` added a second full scan per wall end, so this is partly debt I created.

- **⚠⚠ MEASURED FIRST, WHICH IS THE ONLY REASON THE NUMBER IS TRUSTWORTHY.** A pure-TS probe (no kernel) over a room
  grid, reproducing `review_P5.md` #3's method:
  ```
    walls    resolveJoins(all)   per-wall    wallsJoinedTo(all)
       60             8.6 ms      143 µs               12.7 ms
      544           344.9 ms      634 µs              281.7 ms
     1984          4757.7 ms     2398 µs             3645.1 ms
  ```
  **The per-wall cost RISES with N** — that is the quadratic, seen directly rather than inferred. `review_P5` measured
  4193 ms at 1984 walls; the 4757.7 ms here is the same shape plus Entry 60's mid-span scan. Extrapolated to the 10,000
  element target **D48 makes BINDING**: ~**3.5 minutes of pure join scanning before the kernel computes any geometry.**
- **THE FIX, AND THE PART WORTH REUSING: A `WeakMap` KEYED ON THE `Scene` OBJECT.** A uniform grid (CELL 500 mm) over
  every wall's endpoints and its segment, built once and cached against the scene it describes. **`Scene` is replaced
  immutably on every change** (`applyChanges` folds into a new object) ⇒ **a stale index is not merely unlikely, it is
  unreachable**: a changed scene is a different key and the old entry is collected with the old scene. **There is no
  invalidation logic, therefore none to get wrong** — which matters because a stale spatial index is exactly the class
  of bug that produces confidently wrong geometry. **No function signature changed. No contract touched.**
- **⚠ OPTION FILTERING DELIBERATELY STAYS AT QUERY TIME** (D65/D67/D68), on the handful of candidates a cell returns.
  Baking a selection into the index would be faster and wrong: the same scene is legitimately queried under different
  option selections, and an index that had chosen one would answer the wrong question for the next.
- **MEASURED AFTER, at the real target rather than extrapolated:**
  ```
    walls    resolveJoins(all)   per-wall    wallsJoinedTo(all)
     1984            32.1 ms       16 µs                51.9 ms
     5100            75.0 ms       15 µs               108.7 ms
     9940           169.2 ms       17 µs               219.7 ms
  ```
  **Per-wall cost is FLAT from 1k to 10k** — the quadratic term is gone, not merely reduced. ~**540× at the binding
  target**; 3.5 minutes of join scanning becomes **under half a second**.
- **⚠⚠⚠ THE REAL LESSON OF THIS ENTRY IS ABOUT THE TEST, NOT THE SPEED. AN INDEX BUYS SPEED BY CHANGING *WHO IS
  ASKED*, AND THAT IS PRECISELY HOW IT FAILS SILENTLY.** All **32** existing join/dependency tests passed unchanged
  the moment the index landed — and **that proves less than it appears to**, because every one of them places its
  walls at comfortable round coordinates. The failure this optimisation actually risks is a **coincident corner that
  straddles a cell boundary**: two endpoints within `JOIN_TOL` of each other but in different buckets, so the miter is
  **silently never found** — and what comes out is *a perfectly valid wall with a plain cap*, which nothing flags.
  **That is D68's failure shape (a join silently not happening) reached by an entirely new road.**
  ⇒ `tests/join-spatial-index.test.ts` (7) is written **hostile to the GRID rather than to the geometry**: corners on
  a cell boundary, corners either side of one (999.9999 vs 1000.0001), a mid-span T on a boundary, a 60 m wall queried
  from the middle of its span, walls far apart that must NOT join, and the scene-identity cache test.
- **⚠ REVERT-VERIFIED BY NEUTERING THE MECHANISM, not by deleting the fix:** the 3×3 neighbourhood lookup was narrowed
  to a single cell and the suite re-run — **exactly one test fired (the cell-boundary corner), and all 21 existing
  join tests still passed.** That is the whole argument for the new file in one measurement: *the existing suite could
  not have caught it.*
- **Box:** read/measure/build only; `pnpm verify` ×3 + targeted vitest + one pure-TS probe (deleted after); **nothing
  installed, no containers touched, no ports bound, no kernel rebuild** (pure TS); `/tmp` 11 MB; available RAM never
  below ~2.3 GB; **both live public sites up throughout**.

**NEXT:**
- **Owner:** **the FREEZE (step 6) is still the owner's act and still unblocked** — D73 touched no contract at all.
- **Zayd:** the schedules body (D58 row Ⓐ) — now the largest remaining v1.0.0 item, and it wants a design doc + a
  ruling round · the D29 cache bodies (§4j-2 FIRST — it is an identity task, not a serializer task) · **the OWED
  `exposedRefs` declarations** for `core.opening` and `core.curtainwall` (D72, Entry 60).
- **⚠ STILL UNSWEPT (§1c-8's ledger): rules 1–4, 7–11, 14, 17, 18.** Six swept, four dirty; the two clean ones were
  the two that were EXERCISED rather than read.
- **Amer:** unchanged — renderer batching/instancing (Entry 55's wall, now the only remaining scale item), P4.5, FSA
  adapter, WebGPU, service worker/PWA, Cloudflare deploy; plus the optional `codecFor` wiring (D71).
