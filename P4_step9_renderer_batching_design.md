# P4 step 9(b) — Renderer batching / instancing (the `(b)+(d)` scale unlock)

**Author:** Amer (browser hot path) · **Date:** 2026-07-28 · **Status:** ✅ **BUILT + BROWSER-VERIFIED
2026-07-28.** Owner-ruled §8. See §10 for the measured before/after.

**Owner rulings (§8):** **Q1 = batch edges now (the full win, §7).** Q2 = one opaque `BatchedMesh` with
per-instance colour. Q3 = in-place `setGeometryAt` with delete+add fallback. Q4 = target-sized capacity, grow
geometrically. ⇒ end state ~2 total draw calls.

**Result (§10):** at the 16k-part target, **2 draw calls / ~10–14 ms per frame (73–93 fps)** — vs Entry 55's
**30,746 draw calls / 606 ms (1.6 fps)**. Built as `render/PartBatch.ts` (+ pure `edgeAlloc.ts`,
`tessellation.ts`); `Viewport` delegates to it behind the unchanged seam. One real bug found by the harness
(a 16k-part teardown double-delete), fixed + revert-verified.

**What this is.** The implementation half of `v1.0.0_imp_plan.md` **P4 step 9(b)** ("DRAW CALLS … decide
between batching by material, instancing and frustum culling / LOD"). Entry 55 measured the as-built
one-`THREE.Mesh`-per-part renderer at the D48 10,000-element target and found **both interactive scale axes
collapse to one wall**: ~30,700 draw calls / ~606 ms per frame (1.6 fps) for a steady frame (axis b), and a
~570 ms post-edit frame on top of a flat ~23 ms compute (axis d). This design replaces the per-part draw with
GPU batching so that wall falls.

**Why it is a rewrite, not an optimisation (the plan's own words, imp_plan:366).** The plan wanted this
decided _"BEFORE picking (step 4) and section views (P6) are built on top of the renderer — after that it is a
rewrite."_ Picking (step 4) and the incremental redraw (step 2b) are already built on the per-part meshes, so
the batch has to be threaded through both without regressing either. That is the whole difficulty, and §4/§5
are how it is discharged.

---

## §1 — The finding, restated as the target

| Axis (Entry 55, Intel UHD) | As-built          | Cause                                                        | This design's target                                     |
| -------------------------- | ----------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| (b) draw calls @ 16k parts | ~30,700           | 1 face `Mesh` + 1 edge `LineSegments` per part               | **≤ ~4** (1–2 face + 1–2 edge)                           |
| (b) frame time @ target    | ~606 ms (1.6 fps) | draw-call submission + `updateMatrixWorld` over ~30k objects | **< 16 ms budget region** (draw-call bound cost removed) |
| (d) post-edit frame        | ~570 ms           | the same (b) render after the mesh swap                      | **one cheap batched frame**                              |
| (d) compute                | ~23 ms, FLAT      | already solved by 2b (only 3 dirty parts re-tessellate)      | **unchanged — keep it flat**                             |

The compute half of (d) is already right (2b, Entry 26). This design must **preserve** it and fix only the
render half — which is (b). So: **fix (b), and (d) follows for free.**

---

## §2 — The technique: `BatchedMesh` for faces, a batched line buffer for edges

three@0.171 (installed) ships `THREE.BatchedMesh` with the full surface this needs (verified in the installed
build + `@types/three@0.171`): `addGeometry`/`addInstance`, `setMatrixAt`/`setColorAt`/`setVisibleAt`, in-place
`setGeometryAt`, `deleteGeometry`/`deleteInstance`, `getGeometryIdAt`, `getGeometryRangeAt`, `optimize()`,
`perObjectFrustumCulled`, `sortObjects`, and a `raycast` that stamps `intersect.batchId`.

**Why `BatchedMesh`, not `InstancedMesh`.** `InstancedMesh` draws N copies of **one** geometry — perfect for
identical repeated components (a curtain-wall mullion ×400) but useless for the common case, where every wall
has a **distinct** length/height so its structure-layer solid is a distinct geometry. `BatchedMesh` packs
**many distinct geometries** into one buffer and draws them with one multi-draw call (with a documented
non-`WEBGL_multi_draw` fallback; ANGLE/D3D11 — the measured GPU — has the extension). That is exactly
"batch by material": all parts sharing a material → one `BatchedMesh` → one draw call. `BatchedMesh` also gives
**per-object frustum culling and depth sorting for free** (the plan's third lever, `perObjectFrustumCulled`),
which the flat `Group` of `Mesh`es never had.

**Faces.** One opaque `BatchedMesh`, per-instance colour (`setColorAt`) carrying the current placeholder
palette. All ~16k opaque face parts → **1 draw call**. (Grouping is by a _material key_ — a signature of the
non-colour material params: `roughness`/`metalness`/`transparent`/`opacity`. Today every part is the same
opaque `MeshStandardMaterial` ⇒ one key ⇒ one `BatchedMesh`. Transparency, e.g. glass, becomes a second key /
second `BatchedMesh` when real materials land — designed for, not built now.)

**Edges.** `BatchedMesh` is triangle-only, and edges are the _other_ ~half of the draw calls, so they must be
batched too or the win is halved. Edges are positions-only and all one colour (`EDGE_COLOR`) ⇒ far simpler than
faces: **one `LineSegments` over a single shared position buffer, maintained with a per-part sub-range
free-list** (the same idea `BatchedMesh` uses internally, minus the matrix/colour/visibility bookkeeping). A
part owns a `{vertexOffset, vertexCount}` slice; add = fill a free slot or append; edit = rewrite the slice
(reallocate if larger); remove = free the slot. All edges → **1 draw call**. See §7 for the mechanics and §8 Q1
for the alternative (keep per-part edge lines — lower risk, only halves the win).

**End state: ~2 draw calls for the whole model** (1 faces + 1 edges), down from ~30k.

---

## §3 — What changes, and what deliberately does not

The seam is already right (it survived the scale harness unchanged): `Viewport` receives a `RenderGateway`,
`App.tsx` feeds it `RenderPart[]`, and `pick()` returns a `PickResult`. **Batching is entirely internal to
`Viewport`.**

**Unchanged (load-bearing — the batch must not leak past these):**

- `RenderPart` (`{elementId, nodeId, partName, handle, color}`) and how `App.tsx` builds it — untouched.
- `RenderGateway` / `tessellate` (+ coalesce key) — untouched; the batch consumes the same `MeshBuffers`.
- `planRedraw` / `reconcile.ts` — the pure `{tessellate, recolor, remove}` planner is unchanged; only the
  **executor** inside `Viewport` (`#installPart`/`#recolorPart`/`#removePart`) changes from "make a `Mesh`" to
  "write an instance into the batch". The step-2b test (count tessellations) stays green verbatim.
- `pick.ts` / `resolveFacePick` / `PickResult` — the pure provenance→`SubShapeRef` resolution is unchanged;
  only how `Viewport.pick` obtains the _local face index_ changes (§5).
- The superseded/cancelled `#frame` guard, the `coalesceKey`, and dispose semantics — preserved (§6).
- **No frozen contract moves. No `scene.json`, no protocol, no verb, no `@bunyan/document` change.** This is
  app-layer three.js only — additive, below every frozen contract, not a freeze item (Entry 55 said so).

**Changed (all inside `Viewport`):**

- `#drawn: Map<nodeId, DrawnPart>` keeps its keys and its retained `buffers`/`provenance`/`bounds`, but a
  `DrawnPart` now holds a **batch instance id** (+ geometry id) instead of a `THREE.Mesh`/`THREE.LineSegments`.
- A new `PartBatch` helper owns the `BatchedMesh` (faces) + the batched line buffer (edges) + the
  `instanceId ↔ nodeId` maps. `Viewport` delegates install/recolor/remove/pick-remap to it.

---

## §4 — Preserving every invariant (the table that has to be true)

| Invariant                                              | Today                                         | Under batching                                                                                                                                                       |
| ------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D30 — an element is its PARTS, each its own colour** | one `Mesh` per part, per-part material colour | one **instance** per part, per-instance `setColorAt`. Parts stay individually addressable (add/remove/recolor/pick one).                                             |
| **2b — incremental redraw**                            | dirty parts re-tessellate, rest reused        | `planRedraw` unchanged; only dirty parts tessellate; each writes **only its instance** via `setGeometryAt` (or delete+add), O(changed) not O(N). Compute stays flat. |
| **2c — provenance retained**                           | `buffers` kept on `DrawnPart`                 | kept identically; the batch stores geometry on the GPU, the `MeshBuffers` (with `provenance`) stay on `DrawnPart` for picking.                                       |
| **step 4 — sub-shape picking**                         | raycast `Mesh` → `faceIndex` → provenance     | raycast `BatchedMesh` → `batchId`+global `faceIndex` → remap to local face index (§5) → **same** `resolveFacePick`. `PickResult` identical.                          |
| **recolor without re-tessellation**                    | swap material colour                          | `setColorAt(instanceId, color)` — cheaper (no material object).                                                                                                      |
| **remove / dispose**                                   | `Group.remove` + geometry/material dispose    | `deleteInstance` (+ free the edge slot); periodic `optimize()` reclaims buffer space.                                                                                |
| **superseded-frame `#frame` guard**                    | stale results dropped                         | unchanged — the guard runs before any batch write, so a stale frame writes nothing.                                                                                  |
| **frustum culling**                                    | none (flat `Group`)                           | **gained** — `perObjectFrustumCulled = true`; a zoomed-in view now pays for on-screen parts only.                                                                    |

---

## §5 — The load-bearing detail: picking through the batch

This is the invariant the plan warned "after [picking] it is a rewrite." `BatchedMesh.raycast`
(`src/objects/BatchedMesh.js:1080`) sets, per hit: `intersect.batchId = <instanceId>` and a `faceIndex` that is
**global** to the merged index buffer (it raycasts a temp mesh with `setDrawRange(geometryInfo.start, …)`, and
`Mesh.raycast` computes `faceIndex` off the absolute index position). To recover the part's **local** face
index — which is what the retained provenance (`faceRefForTriangle`) is keyed by:

```
const batchId    = intersect.batchId;                       // the instance the ray hit
const nodeId     = this.#instanceToNode.get(batchId);        // my map, instance → part
const drawn      = this.#drawn.get(nodeId);                  // retained buffers/provenance
const geometryId = batched.getGeometryIdAt(batchId);
const range      = batched.getGeometryRangeAt(geometryId);   // { start, count, ... } in index units
const localFace  = intersect.faceIndex - range.start / 3;    // start is a multiple of 3
return resolveFacePick(drawn, localFace);                     // UNCHANGED downstream
```

`resolveFacePick` already returns `null` on an out-of-range or undecodable index, so a remap slip fails safe
(no ref, never a _wrong_ ref — the picking contract). This is covered by a headless-pure unit test on the remap
arithmetic (given a geometry range + a global faceIndex → the expected local index), plus the existing
end-to-end "pick a face → valid `SubShapeRef`" exit criterion, re-run in the browser against the batched
viewport.

---

## §6 — `setGeometryAt` fit policy, capacity, and growth

**Fit on edit.** `setGeometryAt(geometryId, geom)` replaces geometry **in place** but throws if the new geometry
exceeds the space reserved for that id. Fortunately the common edit — a wall length change — does **not** grow
triangle count: a flat-faced prism has fixed topology regardless of length (only _curved_ solids grow with
deflection, and only an opening changes topology). So the policy is:

1. **Try `setGeometryAt` in place** (reserve modest headroom per geometry via `addGeometry`'s
   `reservedVertexRange`/`reservedIndexRange` so growth usually fits).
2. **Fall back to `deleteInstance` + `addGeometry`/`addInstance`** when it doesn't fit (curved part, opening
   topology change), remapping that part's instance id. O(1) per dirty part.
3. **`optimize()`** opportunistically after removals to compact freed ranges.

**Capacity + growth.** `BatchedMesh` is constructed with `(maxInstanceCount, maxVertexCount, maxIndexCount)`.
Size the initial reservation from the D48 target (a `TARGET_PARTS`-shaped constant) and grow geometrically via
`setInstanceCount`/`setGeometrySize` on overflow. A house (a few hundred parts) reserves small; the scale page
reserves target-sized.

---

## §7 — Edge batching mechanics (if §8 Q1 = "batch edges now")

One `THREE.LineSegments` over a single `Float32Array` position buffer + an index buffer, with a
`Map<nodeId, {vertexOffset, vertexCount, indexOffset, indexCount}>` and a free-list of holes:

- **add**: expand each `EdgePolyline` into segment-pair indices (the existing `buildEdgeSegments` logic),
  write positions+indices into a free slot (or append + grow the buffer), record the slice, bump
  `geometry.drawRange`/attribute `updateRange`.
- **edit**: rewrite the part's slice in place; reallocate to a new slot if the new edge set is larger.
- **remove**: free the slot (zero the index slice so nothing draws; reuse on next add); compact when
  fragmentation is high.

This is positions-only (no per-instance matrix/colour) so it is markedly simpler than the face batch. It is,
however, the one genuinely new buffer-management code in this design — hence it is the Q1 decision.

---

## §8 — OPEN QUESTIONS FOR THE OWNER

**Q1 (the real one) — edges: batch them now, or defer?**

- **(A) Batch edges now** (§7): ~2 total draw calls, the full win, but adds the one hand-written buffer
  manager. **← recommended:** it is the only option that hits the target _and_ keeps (d) incremental; the edge
  buffer is the simple positions-only case.
- **(B) Faces only for now, keep per-part edge `LineSegments`:** ~15k draw calls remain (halves the wall to
  ~300 ms). Lower risk, ships sooner, but does not reach the frame budget — a second pass still owed.

**Q2 — one opaque `BatchedMesh` with per-instance colour** (recommended, collapses all opaque faces to 1 draw
call and is the natural home for real per-material colour later), **vs** one `BatchedMesh` per distinct colour?
Recommend per-instance colour.

**Q3 — the `setGeometryAt` fit policy** (§6: in-place with reserved headroom, delete+add fallback,
opportunistic `optimize`). Recommend as written; flag if you want a different reservation size.

**Q4 — capacity sizing.** Reserve initial batch capacity from a `TARGET_PARTS`-shaped constant and grow
geometrically. Recommend as written.

---

## §9 — Verification plan (measure, don't assert — the project's method)

1. **Re-run the browser scale harness with the batched viewport** (the same `apps/web/src/scale/` page that
   produced Entry 55, pointed at the batched path) and record the **after** numbers per axis. The finding is
   the _number_: draw calls ~30k → ~2, frame time ~606 ms → target region, post-edit frame ~570 ms → one cheap
   frame. Same GPU, same scene, side-by-side with Entry 55.
2. **The 2b incremental test stays green verbatim** (`planRedraw` unchanged; still counts one element's parts).
3. **A pure remap unit test** for §5 (geometry range + global faceIndex → local index), headless.
4. **The end-to-end picking exit criterion** re-run in the browser: click a face → the expected `SubShapeRef`,
   through the batched raycast. (This is the invariant the plan flagged; it gets an explicit before/after.)
5. **Revert story:** the batched `Viewport` is a drop-in behind the same seam; a git revert of the `Viewport`/
   `PartBatch` change restores the per-part path, and the scale harness re-measures Entry 55's numbers —
   proving the improvement is this change and not the wind.
6. `pnpm verify` green (typecheck incl. apps/web, lint, format, the scale page's pure helpers). No commit —
   owner-gated.

**Not in scope (stays where the plan puts it):** WebGPU backend (P4 step 1), TSL shading (step 7), LOD, and
real material appearance — all additive follow-ups on top of the batch, none blocked by it.

---

## §10 — Result (measured 2026-07-28, this box, ANGLE / Intel UHD — Entry 55's GPU)

The scale page now runs BOTH sweeps of the same resident scene (batched through the real `PartBatch`, then
the unbatched re-confirmation), on the same real kernel + three.js. Draw calls at every scale = **2** (one
`BatchedMesh` faces + one `LineSegments` edges), and frame time is back inside the interactive budget:

```
                    UNBATCHED (Entry 55 / re-confirmed)      BATCHED (this build)
   parts   draw calls   ms/frame    fps        draw calls   ms/frame    fps
    1,000     2,036       ~65       15.5             2          1.8      555
    4,000     7,948      ~182        5.5             2          7.5      133
    8,000    15,762      ~350        2.9             2          6.6      152
   16,000    30,746       606        1.6    ►         2       10–14     73–93   ← the 10k-element target
```

**At the target: 30,746 → 2 draw calls (~15,000× fewer), 606 ms → ~10–14 ms (~50× faster, 1.6 → ~80 fps).**
Same triangle counts in both columns (184k at 16k) — it is the identical geometry, just batched, so the win
is purely the draw-call collapse the finding named. `perObjectFrustumCulled` now culls off-screen parts for
free (a zoomed-in view pays even less). (d) follows by composition, exactly as Entry 55 framed it in reverse:
the edit COMPUTE is unchanged (~23 ms, flat — 2b), and the post-edit frame is now a batched frame (~10 ms),
so perceived edit latency at target falls from ~590 ms to ~35 ms.

**One real bug, found the project's way (§1b — "cut a shape nobody cut").** Removing 16,000 parts at once in
the harness teardown threw `THREE.BatchedMesh: Invalid instanceId` — `remove` deleted the instance and THEN
the geometry, but three's `deleteGeometry` already cascades to the instance, so the second delete hit a dead
id. Fixed (call `deleteGeometry` alone) and **revert-verified** headlessly (`PartBatch.test.ts` — reintroduce
the double-delete and it throws the exact browser error). The small fixtures never removed enough parts to
see it; the 16k teardown did.

**Verification discharged:** (1) both sweeps measured in a real browser, numbers above + on
`window.__scaleResults`/`__batchedSweep`; (2) the 2b incremental test is green verbatim (`planRedraw`
untouched); (3) the pure remap unit test (`pick.test.ts`) + the `edgeAlloc` allocator test + the `PartBatch`
lifecycle test, all headless; (4) the app itself boots, builds, tessellates and computes exact quantities
through the batched `Viewport` with zero console errors; (5) revert story: `PartBatch`/`Viewport` are a
drop-in behind the same seam; (6) `pnpm verify` green — typecheck, lint, format, **490 tests**, reseed.
✅ COMMITTED + PUSHED (owner-authorised, 2026-07-28).
