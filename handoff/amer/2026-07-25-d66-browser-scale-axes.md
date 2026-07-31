### Entry 55 — 2026-07-25 — Amer — **D66 AXES (b) + (d) MEASURED IN A REAL BROWSER: THE LAST TWO SCALE NUMBERS EXIST. BOTH COLLAPSE TO ONE WALL — THE ~30k-DRAW-CALL ONE-MESH-PER-PART REDRAW — WHICH MULTITHREADING (D8) DOES NOT TOUCH. THE FIX IS RENDERER BATCHING, ADDITIVE, NO CONTRACT CHANGE.**
**Task (owner, via the Entry-54 hold):** build the browser scale page (imp_plan P4 step 9b), load a ~10k-element model,
and produce a real number for **(b) draw calls / frame time** and **(d) edit latency** at ~10,000 elements, each with a
one-paragraph recommendation; **raise D8 (pull multithreading into v1.0.0?) with the owner — do not decide it.** Built the
page, ran it on the real OCCT kernel + real three.js on this box's real GPU. `pnpm verify` fully green (**370 tests, +6**;
typecheck incl. apps/web, lint, format, reseed). ⚠ **No commit — owner-gated.**

- **WHAT I BUILT (`apps/web/src/scale/` + `scale.html`, plan P4 step 9b — the browser half the headless box cannot run).**
  A dedicated scale page that boots the REAL kernel + document through `bootstrap()` (**D19 — the app never holds a
  `KernelClient`; it authors through `DocumentContext` and draws through `RenderGateway`**), builds a small REAL reference
  set of composite walls through the command layer (D30 — an element is its PARTS; each layer tessellated), then fills ONE
  three.js scene — mirroring the shipped `Viewport` byte-for-byte (I EXPORTED `toBufferGeometry`/`buildEdgeSegments`/
  `createPartMaterial`/`EDGE_COLOR` so the harness builds meshes with the *identical* code path, not a lookalike) — to the
  ~16,000-part target and measures. ⚠ **NO BATCHING (plan step 9b is explicit): measure the as-built one-mesh-per-part
  architecture FIRST; batching is the decision the number informs, not a thing to sneak in — "a rewrite, not an
  optimisation".**
- **⚠ METHOD — the same discipline the headless harnesses use, and box-safe (§6a: 3.7 GB RAM, live public sites).** The
  renderer axes are a function of what is IN the scene (draw calls + triangles), not of how the geometry was produced — a
  box the kernel built and a box cloned from it render identically. Building 16k real OCCT solids in a tab is ~10 min and
  strains the box (the heap harness caps at ~310 solids and EXTRAPOLATES for the same reason). So filler meshes SHARE a pool
  of ~36 real composite-wall layer geometries (one draw call each — three.js does not auto-instance a shared geometry),
  grid-spread with a fit camera (nearly all in-frustum — the honest worst case a CAD user hits zoomed-to-fit). **Draw calls
  = mesh count EXACTLY; frame time is draw-call-bound and faithful; memory stays a few pooled buffers.** The (d) edit runs
  the REAL kernel + document on a REAL wall (`core.setParams`) — only the filler is cloned.
- **⚠ THE HARDWARE, DISCLOSED (it is what makes the absolute number legible).** Real GPU, not a software rasterizer:
  **ANGLE / Intel UHD Graphics (Direct3D11)** — a genuine low-end INTEGRATED GPU, the most common class in laptops.
  Canvas 795×684, `devicePixelRatio` 1. The draw-call COUNT is hardware-independent; the frame TIME scales with the GPU, so
  **a discrete GPU would be materially faster** — Intel UHD is a fair "modest laptop" floor, not the best case.

**⚠⚠ (b) DRAW CALLS + FRAME TIME — measured, this box, Intel UHD:**
```
   parts   draw calls   tris    ms/frame   p95      fps
    1,000     2,036      12k       36.9     75.1    27.1
    2,000     4,016      24k       69.8    162.5    14.3
    4,000     7,948      48k      139.2    211.9     7.2
    8,000    15,762      95k      363.8    548.3     2.7
   12,000    23,398     140k      525.1   1009.4     1.9
►  16,000    30,746     184k      606.3    834.2     1.6   ← the 10,000-element target (~1.6 solids/el)
```
**At the target: ~30,700 draw calls, ~606 ms/frame (1.6 fps).** ~1.9 draw calls per part — because the Viewport draws a
face `Mesh` AND an edge `LineSegments` per part (2× the part count, as designed). Frame time is linear-to-slightly-
superlinear in parts (the slight super-linearity is `scene.updateMatrixWorld` over a growing graph — real, and part of the
honest cost). **~0.02 ms per draw call on this GPU.** This is the plan's own extrapolation (§1a: "~16k draw calls, 10–20×
a 60 fps budget"), now a MEASURED number and worse than the extrapolation because edges double the calls: **~30k calls is
~20× over a 16 ms frame budget.**

**⚠⚠ (d) EDIT LATENCY — one incremental edit (`setParams` on one wall), at rising resident scale:**
```
   resident   changed   total ms   rebuild   retess   install   next-frame
        0        3        46.6       29.4     16.7      0.4        0.9      ← cold JIT
    8,000        3        21.4        7.0     13.8      0.5      194.1
   16,000        3        23.4        5.0     18.1      0.3      568.5      ← the target
```
**THE INCREMENTAL EDIT COMPUTE IS ~23 ms AND FLAT vs SCALE — step 2b works.** Only **3 of 16,000 parts** re-tessellate
(the changed wall's 3 layers); the kernel rebuilds ONE element (~5 ms), the 3 parts tessellate (~18 ms), the mesh swap is
~0.3 ms. **The kernel is NOT the wall at edit time** (the redraw-not-kernel finding of §1a, now confirmed from the browser
side). **BUT the frame the user waits to SEE the edit is ~568 ms** — the (b) render cost, because after the swap the whole
30k-draw-call scene must render once. **⇒ end-to-end perceived edit latency at target ≈ 23 ms compute + ~570 ms render ≈
~590 ms.** The compute half is solved; the render half is the wall.

- **⚠⚠ THE FINDING: BOTH AXES COLLAPSE TO ONE WALL — the one-`THREE.Mesh`-per-part redraw at ~30k draw calls.** (b) IS that
  wall; (d)'s perceived latency is that wall plus a flat ~23 ms of kernel+tessellation. The incremental redraw (2b, Entry 26)
  already did its job — it made the edit COMPUTE flat and cheap, exactly as designed — so what remains is purely the
  per-frame *render* of 30k independent draw calls. **The fix is renderer BATCHING-BY-MATERIAL / GPU INSTANCING** (a real
  building has few DISTINCT part geometries per type; instancing collapses N identical meshes to ~1 draw call). It is
  Amer's browser-side work, **additive, below every frozen contract**, and its kernel partner `instantiate` is **already
  RESERVED in the frozen protocol** (§4j-3). The plan calls it "a rewrite not an optimisation" — a RENDERER rewrite, **not a
  contract change.**

- **⚠ RECOMMENDATION (b) — reachable single-threaded; multithreading is the wrong lever.** ~30k draw calls at ~606 ms is a
  renderer-ARCHITECTURE problem (too many draw calls), not a compute-throughput problem. **D8 / multithreading attacks the
  KERNEL rebuild (§1a — "not one of the three kernel levers touches the redraw"), so it would NOT move this number.** The
  unlock is batching/instancing on the three.js side, single-threaded: merge parts sharing a geometry+material into one
  instanced draw, batch edges, add frustum-culling/LOD. That drops ~30k calls toward the low hundreds and the frame back
  under budget — **no thread, no contract, no kernel change.**
- **⚠ RECOMMENDATION (d) — the kernel is already fast enough; this is the SAME renderer-batching fix.** The edit compute is
  ~23 ms and flat (2b + one-element rebuild) — the kernel does not need multithreading to make an EDIT interactive. The
  ~570 ms a user waits is the post-edit frame, i.e. (b). Once (b)'s batching lands, the post-edit frame is interactive and
  (d) becomes ~23 ms compute + one cheap frame. **⇒ neither interactive axis needs D8.**

- **⚠⚠ D8 (multithreading into v1.0.0?) — RAISED WITH THE OWNER, NOT DECIDED (as instructed; imp_plan step 9c: "raise it,
  do not re-decide it").** The evidence says the two INTERACTIVE axes (b)+(d) do **not** need multithreading — they are a
  single-threaded renderer-batching fix. The axis where D8 would actually help is **COLD LOAD** (Entry 54: ~6.35 min
  single-thread), which is Zayd's kernel wall and already has additive levers (D29 cache RULED SHIP, `instantiate`
  RESERVED). **My recommendation: do NOT pull D8 into v1.0.0 on the strength of the renderer axes — they don't need it; the
  renderer batching (additive) is the real unlock, and cold-load's own levers are additive too.** But **D8 is the owner's
  call and it is additive either way** (MT is COOP/COEP + `SharedArrayBuffer` deploy config, not a `scene.json` contract —
  Entry 54 §4), **so it does not gate the freeze.**
- **⇒ ALL FOUR SCALE AXES NOW HAVE A NUMBER** (heap 0.31 GB FITS · cold load ~6.35 min · **draw calls ~30k / ~606 ms · edit
  ~23 ms compute + ~570 ms render**), and the D8 verdict is made and surfaced. The Entry-54 owner HOLD condition ("all four
  axes + the D8 verdict") is **satisfied.** Nothing measured forecloses a frozen contract (confirms Entry 54 §2/§3): every
  remaining lever — renderer batching, `instantiate`, the D29 cache, MT — is additive. **On the evidence the contracts are
  safe to freeze on scale grounds; whether to FREEZE now is the owner's act (P5 step 6).**
- **VERIFICATION + fidelity notes.** `pnpm verify` green (**370 tests**; the pure `percentile` helper is unit-tested —
  `apps/web/src/scale/stats.test.ts`, 6 — the rest is a WebGL measurement, exercised only in a real browser). The page is
  gated: `scale.html` is a second vite build input, and apps/web's typecheck/lint/format cover the new files (the P4-step-0
  gate). ⚠ **Filler geometry is cloned from real composite-wall LAYER solids (rectangular prisms — the simplest real part),
  so per-part TRIANGLES are a conservative lower bound; the DRAW-CALL count — the axis's binding cost — is exact.** ⚠ A
  weak-GPU caveat is honest: the ~606 ms is Intel-UHD-integrated; a discrete GPU is faster, but the ~30k-draw-call COUNT and
  the "20× over budget" shape are hardware-independent and are the real finding.
- **⚠ NO COMMIT — owner-gated.** Box: dev server on :5173 during the run then STOPPED; the kernel WASM + up to ~30k meshes
  lived in the browser tab (peaked well within the tab, box stayed healthy); no containers touched, the two live public
  sites untouched, nothing installed beyond the existing workspace (`pnpm install` linked the two packages Zayd added —
  `@bunyan/types`, `@bunyan/sketch-solver`).

**NEXT:**
- **Owner:** the freeze's Entry-54 HOLD condition is met (four axes + D8 verdict). **The FREEZE (step 6) is now an owner
  act** — sign off and tag `SubShapeRef`/`BimObjectType`/`Command`/`scene.json`/`ParamSchema`/`UndoableEdit` frozen (with
  the Ⓐ–Ⓕ reservations + `Material.thermal?`). And the D8 call: my recommendation is to keep multithreading v1.0.x (the
  interactive axes don't need it); confirm or overrule.
- **Amer (post-freeze / parallel, NOT a freeze blocker):** the renderer-batching / instancing rewrite (the (b)+(d) unlock)
  · P4.5 interaction model · browser storage · WebGPU + fallback · service worker/PWA. All additive, all below the freeze.
- **Zayd:** nothing owed on scale; the join O(N²) endpoint index stays a v1.0.x perf item (review_P5 #3).
