### Entry 63 — 2026-07-28 — Amer — **THE RENDERER BATCHING REWRITE SHIPS: ~30,700 DRAW CALLS → 2 AT THE 10k TARGET (606 ms → ~10–14 ms, 1.6 → ~80 fps). THE ENTRY-55 (b)+(d) SCALE WALL IS GONE. NO FROZEN CONTRACT TOUCHED; ONE REAL BUG FOUND BY REMOVING 16k PARTS.**
**Task (owner):** resume Bunyan as Amer; picked the **renderer batching / instancing** track (the owner chose it from
the post-freeze Amer tracks) — the direct answer to Entry 55's finding that BOTH interactive scale axes collapse to the
one-`THREE.Mesh`-per-part redraw wall (~30,700 draw calls / ~606 ms / 1.6 fps at 16k parts). Design-first per this
project's ethos: wrote `P4_step9_renderer_batching_design.md`, owner ruled its §8 (Q1 = batch edges now, the full win),
then built + measured. `pnpm verify` fully green (**490 tests, +20**; typecheck incl. apps/web, lint, format, reseed).
✅ **COMMITTED + PUSHED (owner-authorised, 2026-07-28).**

- **WHAT I BUILT (`apps/web/src/render/`, all internal to `Viewport` — the seam was already right).** Every opaque face
  part now lives in ONE `THREE.BatchedMesh` (per-instance colour via `setColorAt`, one multi-draw call) and every edge in
  ONE `THREE.LineSegments` over a shared, sub-range-allocated position buffer. **End state ~2 draw calls for the whole
  model**, down from ~2 per part. New files: **`PartBatch.ts`** (the three.js batch owner — install/recolor/remove/
  pick-remap, `setGeometryAt`-in-place-with-delete+add-fallback, geometric growth, `optimize()`+edge compaction),
  **`edgeAlloc.ts`** (the PURE edge-buffer allocator + compaction planner — `reconcile.ts` discipline, unit-tested in
  Node), **`tessellation.ts`** (the shared `toBufferGeometry`/`buildEdgeSegments`/`EDGE_COLOR` helpers, moved out of
  `Viewport` to break the `PartBatch` import cycle; `Viewport` re-exports them so the scale harness is untouched).
- **⚠ EVERY INVARIANT PRESERVED (design §4).** `RenderPart`, `RenderGateway`, `planRedraw`/`reconcile.ts`, `pick.ts`/
  `PickResult`, `App.tsx` — ALL unchanged; batching is entirely inside `Viewport`. **D30** (a part is individually
  addressable) — one instance per part, per-instance colour. **2b incremental redraw** — a rebuilt part rewrites only ITS
  instance + edge slot (O(changed), not O(N)); the step-2b tessellation-count test is green VERBATIM. **step-4 picking**
  — the load-bearing one the plan warned "after picking it is a rewrite" (imp_plan:366): a `BatchedMesh` raycast reports a
  GLOBAL face index + `batchId`; `getGeometryIdAt`+`getGeometryRangeAt` remap it to the part's LOCAL triangle, which runs
  through the UNCHANGED retained-provenance path (`localFaceIndex` helper, pure-tested). **Gained free:**
  `perObjectFrustumCulled`. **No `scene.json`/protocol/verb/`@bunyan/document` change — app-layer three.js only, below
  every frozen contract; not a freeze item.**
- **⚠⚠ THE MEASURED BEFORE/AFTER (real browser, ANGLE / Intel UHD — Entry 55's GPU; the scale page now runs BOTH sweeps
  of the same scene):**
```
   parts    UNBATCHED (Entry 55)         BATCHED (this build)
    1,000   2,036 calls /  ~65 ms        2 calls /  1.8 ms (555 fps)
    8,000  15,762 calls / ~350 ms        2 calls /  6.6 ms (152 fps)
►  16,000  30,746 calls /  606 ms        2 calls / 10–14 ms (73–93 fps)   ← the 10k-element target
```
  **At target: 30,746 → 2 draw calls (~15,000×), 606 → ~10–14 ms (~50×, 1.6 → ~80 fps).** Same triangle counts (184k at
  16k) in both columns — identical geometry, just batched, so the win is purely the draw-call collapse the finding named.
  **(d) follows by composition (Entry 55's own logic in reverse): edit COMPUTE unchanged (~23 ms flat, 2b), post-edit
  frame now a batched frame (~10 ms) ⇒ perceived edit latency ~590 ms → ~35 ms.** ⇒ the D8 recommendation from Entry 55
  is REINFORCED, not changed: the interactive axes were a single-threaded renderer-batching fix, and they are now fixed
  single-threaded — multithreading stays v1.0.x (owner already ruled D8 that way, Entry 57).
- **⚠ ONE REAL BUG, FOUND THE PROJECT'S WAY (§1b — "cut a shape nobody cut").** Removing 16,000 parts at once (the harness
  teardown) threw `THREE.BatchedMesh: Invalid instanceId` — `PartBatch.remove` deleted the instance and THEN the geometry,
  but three's `deleteGeometry` ALREADY cascades to the instance, so the second delete hit a dead id. The small unit
  fixtures never removed enough parts to see it; the 16k teardown did. **Fixed (call `deleteGeometry` alone) + REVERT-
  VERIFIED headlessly** — `PartBatch.test.ts` reintroduces the double-delete and gets the EXACT browser error. ⚠ This is
  the app's real element-delete path too (a `deleteElement` removes parts through the same seam), so it is a genuine fix,
  not just a harness artifact.
- **VERIFICATION (measure, don't assert).** (1) Both sweeps measured in a real browser (numbers above); the batched sweep
  runs FIRST + parks on `window.__batchedSweep` as it accrues, so the deliverable is captured before the heavy unbatched
  re-confirmation strains the tab. (2) The batched teardown that had thrown now proceeds cleanly into the next phase
  (the fix, in-browser). (3) `PartBatch` is HEADLESSLY testable (its textures are plain data, GPU-uploaded only at render)
  ⇒ `PartBatch.test.ts` (5), `edgeAlloc.test.ts` (7), `pick.test.ts` +3 (the batch remap). (4) The APP boots, builds,
  tessellates + computes EXACT quantities through the batched `Viewport` with ZERO console errors. (5) `pnpm verify`
  green (**490 tests**). ⚠ **The Browser pane cannot screenshot the continuously-animating WebGL canvas** (it times out) —
  so correctness is proven via the DOM/`window` measurement path + the console-error-free app boot + the headless tests,
  the same "GL-only code is browser-verified, logic is headless-verified" split as the storage/scale precedents.
- **✅ COMMITTED + PUSHED (owner-authorised).** Box: dev server on :5173 during measurement then STOPPED; the scale page
  peaked ~16k batched instances in the tab (box healthy); nothing installed, no containers touched.

**NEXT (Amer, all still post-freeze / parallel — none blocks the owner's freeze):** the renderer batching is now DONE, so
the remaining browser tracks are **P4.5** (the interaction model — tool state machine, snapping, preview, numeric entry;
gated on the baseline-Wall, which exists) · a **File System Access** `StorageAdapter` (additive, Entry 56) · **WebGPU +
WebGL2 fallback** (P4 step 1) · **TSL shading** (step 7) · **service worker/PWA + Cloudflare deploy** · real material
appearance + transparency (a second `BatchedMesh` material group — designed for in §2, not built). **The freeze (step 6)
remains the owner's act.**
