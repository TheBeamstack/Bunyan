# Entry 84 — alignment guides ship, and the guide is the first snap candidate that owns NOTHING

**Amer · 2026-08-06 · local PC, real browser · branch `amer/2026-08-06-alignment-guides`**

---

## 0. What this entry is

P4.5 design §4.3's second row: *"when the cursor is aligned (horizontally/vertically/on-axis) with a
live reference point, draw a dashed guide line and snap to it."* Pure overlay geometry over Tier-1
candidates — no model state, no contract, no command, no frozen byte.

It is also the first candidate kind that is **produced by the app rather than found in the model**, and
that turned out to be the whole design: everything hard about it is a question about what such a
candidate may and may not claim.

**`pnpm verify`: 728 green · 85 files · six gates · real exit code 0.**

---

## 1. The shape

```
pointermove ─► viewport.guidesAt(cursor, tol, snapTo, [gesture anchor])   ← NEW
                    │  references = endpoints + midpoints within 15 m, + the anchor
                    │  alignmentGuides(...)  — PURE, projection injected
                    ▼
              AlignmentGuide[] ──► guideCandidates() ──┐
                                                       ├─► viewport.snapAt(…, live, snapTo)
              faceCandidate(pick) ─────────────────────┘        one ruled comparison
                    │
                    └──► viewport.setGuideLines(lines)   — dashed, in `#preview`
```

- **`apps/web/src/tool/align.ts` (NEW)** — `alignmentGuides` · `guideCandidates` · `referencePoints` ·
  `GUIDE_SNAP_KIND`. Pure; the projection is injected exactly as `snap.ts` injects it, so every rule is
  headless.
- **`apps/web/src/render/Viewport.ts`** — `guidesAt()` · `setGuideLines()` · a dashed
  `LineSegments` inside `#preview` (the group deliberately outside `#sceneGroup`, so a guide can never
  be picked or snapped to).
- **`apps/web/src/render/ViewportCanvas.tsx`** — guides computed BEFORE the snap and fed in through the
  same `live` array the face candidate uses.
- **`apps/web/src/tool/useToolController.ts`** — `ToolController.authoring`, and §4 is why.
- **`apps/web/src/tool/align.test.ts` (NEW, 13 tests)**.

⚠ **There is no new `SnapKind` and `SNAP_PRIORITY` is untouched.** A guide is `'extension'`, which Q3's
owner-ruled order already has a slot for, and the slot is right in both directions: an endpoint 3 px
away beats the guide (a user pointing at a corner means the corner), and the guide beats the face behind
it (a user who has lined up with something means the alignment). **Re-ruling Q3 re-rules this**, because
the test asserts the guide's PLACE in the array rather than restating the array.

---

## 2. ⚠⚠ THE ONE DECISION EVERYTHING ELSE FOLLOWS FROM: A GUIDE CARRIES NO IDENTITY

A guide's point is `[cursor.x, reference.y, reference.z]` — a place reached by travelling along an axis
from a reference. **It is not a point on any sub-shape**, so the candidate carries **no `ref`, no
`elementId`, no `nodeId`**, however identified the reference was.

This is Entry 80's rule arriving from the other side. Entry 80's finding was *"a `SnapHit`'s `ref` and
its `point` must come from the same place"*, after a door was hosted on an edge because the two were
taken from different candidates. A guide that inherited its reference's `ref` would be the same defect
with a longer lever: the identity of a wall corner, attached to a coordinate four metres away from it.

⇒ A tool that needs a host **declines** a guide, and that is correct. `guideCandidates` omits the fields
rather than setting them to `undefined`, because the tools test `=== undefined` and *"we looked and
there is none"* is a different claim from *"this kind has none, by construction."*

**Revert-verified:** make `guideCandidates` inherit a `ref`/`elementId` ⇒ **2 RED**, including the
opening-tool test below.

---

## 3. ⚠⚠ THE FAILURE MODE THAT WOULD HAVE SHIPPED: THE GRID LATTICE

The obvious implementation feeds every Tier-1 candidate in as a reference. That is wrong, and it is
wrong in the way that looks like success.

**The ground grid is a lattice.** Every cursor position on the plane shares its x with some grid
intersection and its y with another, so admitting grid points lights **both guides at every cursor
position, permanently**. A guide that is always on carries no information at all — and it would look, in
a screenshot, exactly like a working feature.

Measured rather than argued (`align.test.ts`): a 1000 mm lattice over ±3 m and a cursor at (1000, 2000)
— on no grid line the eye would notice — yields `['x', 'y']` when the lattice is admitted and `[]`
through `referencePoints`. **`'face'` is excluded for the same reason one step along:** a face candidate
is wherever the ray hit, so it moves WITH the cursor and can never be *aligned with* it.

What is left is the fixed places a human recognises: **endpoints and midpoints**, plus the gesture's own
anchor. Grid alignment is already served, and served better, by the `'grid'` snap itself — which is
EXACT where a guide is not.

**Revert-verified:** drop the kind filter in `referencePoints` ⇒ **2 RED**.

---

## 4. ⚠ `snapTo: null` IS AMBIGUOUS, AND THE OVERLAY IS WHAT EXPOSED IT

`ToolController.snapTo` returns `null` for two different situations: *"every kind"* for a collecting
input (the wall tool declares exactly that), and *"there is no input"* for Select. A consumer reading
only `snapTo` cannot tell **author anywhere** from **author nothing**.

The guides need the difference. A dashed guide is an offer to land a click on a line, and while Select
is active there is no click to land — so drawing them would put a permanent flicker of dashes over the
model on the one interaction a user performs most. ⇒ `ToolController.authoring` (`inputs.length > 0`),
passed to the canvas, gating the guide computation. It is also the cheaper answer: `guidesAt` projects a
reference set per pointer move, and Select is where most pointer moves happen.

⚠ **And the second filter is `snapTo` itself, applied where the guides are MADE and not after:** a guide
the active input cannot snap to must not be **drawn**. The opening tool declares `snapTo: ['face']`, so
a dashed line offered to it would be the renderer promising a landing the click cannot make. One filter,
so the drawing and the snapping answer the same question. `Viewport.guidesAt` returns `[]` outright when
`allow` excludes `GUIDE_SNAP_KIND`.

---

## 5. ⚠⚠ THE BROWSER HALF — AND IT IS A REVERT, NOT A SCREENSHOT

Entry 80's lesson was that a headless-green, revert-verified tool **did not work in the browser**,
because the code declared the right thing and nothing enforced it. So this was driven in the real app
before it was claimed, and the claim is a MEASUREMENT rather than a picture.

The wall tool, anchored by a click at px(700, 200) — which grid-snapped to `[-5000, 4000]` — then a
second click at px(700, 380). Same document, same pixels, guides on and guides off:

```
guides ON   end = [0,                  5780.276509297827]     ← x EXACTLY 0, from the reference
guides OFF  end = [115.71171400965068, 5780.276509297827]     ← the raw ground point
```

**The y is byte-identical and only the aligned component moved** — 115.7 mm of correction, taken from a
reference at x = 0. That is the signature of an alignment and of nothing else: a grid snap would have
made BOTH components round; an endpoint or midpoint snap would have replaced both with mesh
coordinates. Guides were turned off by an early `return []` in `guidesAt` and the page hard-reloaded
between runs.

⚠ **What is NOT claimed: a picture of the dashed line.** The Browser pane cannot screenshot a
continuously-animating WebGL canvas (it is not compositing frames), so the dashes themselves are
unverified visually. What IS verified is the whole path that produces them running error-free on every
pointer move, and the committed point it yields. ⚠ `LineDashedMaterial` needs `computeLineDistances()`
on every geometry update; without it the dashes render **solid and nothing errors**, which is why the
call sits in `setGuideLines` with a comment saying so.

**The opening tool, re-run under the guides**, sweeping the cursor across the model first so guides were
computed on every move:

```
core.opening  state: valid   params: { width: 900, height: 2100, offsetU: 895.49…, offsetV: 350 }
parts: leaf 63 999 999.99 mm³ · frame 85 549 999.99 mm³
brokenRefs() []   unbuildable() []
```

Entry 80's numbers, unchanged. `snapTo: ['face']` did its job in the browser as well as in the suite.
Console clean on a fresh tab (vite + React DevTools only, zero errors).

---

## 6. Revert-verification summary — three headless, one browser

| # | revert | result |
| --- | --- | --- |
| 1 | `referencePoints` drops its kind filter | **2 RED** — the lattice lights both guides everywhere |
| 2 | `guideCandidates` inherits the reference's `ref`/`elementId` | **2 RED** — including the opening-tool test |
| 3 | the `minSpanMm` degeneracy guard removed | **2 RED** — a cursor ON the reference "aligns" three ways |
| 4 | `guidesAt` returns `[]` (browser) | end.x **0 → 115.71171400965068**, y unchanged |

---

## 7. Stated bounds — limits, written down rather than discovered

- **`GUIDE_REFERENCE_RADIUS_MM = 15 000`**, five times the snap radius on purpose: a snap asks *"what is
  under my cursor?"*, an alignment asks *"what am I lined up WITH?"*, and the value of the second is that
  the answer is somewhere else. A reference further away than 15 m produces no guide. The alternative is
  projecting every endpoint in the model on every pointer move.
- **At most ONE guide per axis, the nearest** ⇒ three is the hard maximum. Two references whose y differs
  by less than the tolerance produce two guides a user cannot tell apart. The tie-break is
  `chooseSnap`'s, so the two agree by construction.
- **A cursor sitting ON its reference gets no guide** (`minSpanMm`, default 1 mm) — a zero-length line
  has no direction, and the honest answer at that position is the reference's own endpoint snap, which
  outranks a guide anyway.
- **Only endpoints, midpoints and the gesture anchor may be references** (§3).

---

## 8. What I did NOT do, and why

- **No new `SnapKind`, no `SNAP_PRIORITY` edit.** Adding one would be re-opening an owner ruling (Q3) to
  buy nothing: `'extension'` is the slot, and the design text names it.
- **No `perpendicular` foot and no candidate-line intersection.** Design §4.3 lists three derived kinds;
  this entry ships the axis-alignment one. The other two are the same shape (a derived line, a foot on
  it) and land in the same module, with the same identity rule.
- **No scene `Grid`/`Level` references (D32).** `gridCandidates` draws the WORLD grid, not `scene.json`
  grids, and the demo has none — feeding real ones in is additive and produces the same `'grid'` kind,
  which §3 excludes from references anyway.
- **The move tool + gizmo, and the corner-drag** — the next row, unblocked, and Q8's question (*is
  `core.move`'s baseline refusal hostile in the hand?*) is still waiting for the session that builds it.

---

## 9. Also in this PR: entry 83's review is NOT here

PR #10 (Zayd, entry 83) was reviewed at this session's step 3 and is **`RISK: contract-touching`**, so it
is the owner's merge. One defect was found and **fixed on that branch, not this one** (`cba786b`): its
replacement freeze-boundary assertion resolves `_baselinedAtEntry` against `current_state.md` §7, which
is a rotating ten-entry window — so it tests *"has not rotated out"* rather than *"exists"*, and the
`_README` policy it guards (*"after the P5 freeze this file may not be updated without an owner
ruling"*) guarantees the baseline sits still while §7 keeps turning. The gate would go red on a PR that
changed nothing, for obeying the freeze. Full review in PR #10's comment.

⚠ **Rotation note for whoever merges second.** §7 was over budget, and this entry rotates **77** rather
than the strictly-oldest **76** — because PR #10 rotates 76 and doing it twice would collide in
`docs/history.md` §C for no reason. Either merge order ends with §7 = {84, 83, 82, 81, 80, 79} and both
76 and 77 in §C.
