# P5 step 6C — THE PLAN AND SECTION BODIES (D58 row Ⓐ's last two units)

**Status:** DESIGN-FIRST. The doc is the deliverable; the build waits on §7's rulings.
**Author:** Zayd (dev box, headless). **Date:** 2026-07-30. **Entry:** 69.

**What this closes.** D58 scopes v1.0.0's documentation at **one plan + one section + one schedule.** The
schedule half is done end to end — the body in Entry 65 (D78) and the CRUD in Entry 68 (D79). This doc
designs the other two, which are one unit because they are the **same projection** taken on two planes:
a plan is a horizontal cut looking down, a section is a vertical cut looking along its normal.

**Why it is design-first and the schedule CRUD was not.** Entry 68 was an ordinary additive registration
(Entry 47 §7 had settled its freeze question in advance). This is not. A projected 2D view is a **new kind
of derived artifact** — D58 froze only its _anchoring_ shape, and the questions _what does `sectionCut`
return, in what frame, carrying which identities_ have never been answered against a running kernel.
**They are answered here by measurement, and one of the answers contradicts the frozen shape's own
comment.**

---

## 0. The one-line finding

> **The cut curves can carry full sub-shape identity, and the projected curves cannot.** OCCT hands us
> complete per-face provenance for everything the plane passes through — measured, zero orphans, on every
> shape class tried including a curved column and a wall cut through its window. It hands us **per-solid
> provenance and nothing finer** for everything _beyond_ the plane. The frozen `SectionCurve.ref` comment
> says provenance is _"absent only where a curve has no single owner (a silhouette of a curved surface)"_ —
> **that exception is in fact the entire projected half**, and `SubShapeRef` has no `'solid'` kind for it to
> degrade into.

This is Entry 65's and Entry 68's lesson for the third time: **reserving a shape and building its body are
two different verifications.** The reservation is not wrong; it is _unexercised_, and it says something
about OCCT that turns out not to be true.

---

## 1. The gap, MEASURED (§1b — drive the API, read the number)

Seven probes against **native OCCT** (`tools/oracle`, the §4b measuring instrument — same kernel as our
WASM build, different binding). All written and deleted; the numbers are reproduced here.

### 1.1 The CUT curves — provenance is COMPLETE, on every shape class tried

`BRepAlgoAPI_Section` is a boolean, so it carries boolean history, and D24 already measured that history as
complete for our OCCT (_"zero orphans"_). It holds for the section case, and it holds on the shapes §1c-6
says to actually cut rather than assume:

```
  shape cut                                   cut edges  exactly-1 owner  >1 owner  ORPHAN
  ------------------------------------------  ---------  ---------------  --------  ------
  3-layer wall, plan cut z=1200  structure            4         4                0       0
                                 insulation           4         4                0       0
                                 finish               4         4                0       0
  round column (1 cylinder + 2 planar faces)          1         1                0       0
  wall WITH A WINDOW, cut THROUGH the opening          8         8                0       0
```

- **Every cut edge is attributable to exactly one input face.** No orphans, no ambiguity, on any of them.
- **The curved face behaves** — §1c-6's repeat offender (the round column that broke D28 and again broke
  hosting) is clean here.
- **The wall-with-window case is the real plan case and the one that matters.** The cut yields **two
  separate wall segments plus the reveals**; the holed solid has **10 faces, of which 4 are `IsSame()` the
  original wall's and 6 are cut-generated**. All 8 resulting cut edges attribute cleanly — the reveal edges
  to the cut-generated faces, which in our model belong to the **cut node** (`cutNodeId(partNode,
voidElementId)`), not to the wall. ⇒ **a dimension anchored to a reveal in plan anchors to the OPENING's
  node, and that is correct**: nobody owned those faces before the cut existed (`geometry.ts`).

### 1.2 The PROJECTED curves — provenance is per-SOLID, and the output is new geometry

```
  HLR output edges that are IsSame() an input edge : 0 of 4
  HLRBRep_HLRToShape API surface                   : VCompound / HCompound / OutLine*/ Rg1Line* / IsoLine*
                                                     — every one of them returns a COMPOUND, per shape
```

The projected edges are **new curves in the projection plane**; they share no topology with the input.
The only provenance the supported path offers is the per-shape overload, `VCompound(shape)` — and it is a
**genuine partition**, which I verified rather than assumed (probe 1 had the column fully occluded, so its
4/0 split proved nothing):

```
  two solids, both fully visible, one HLR run
    VCompound()        : 8 edges
    VCompound(wall)    : 4
    VCompound(column)  : 4        4 + 4 == 8, and the two sets OVERLAP IN 0 EDGES
```

⇒ **each projected edge can be attributed to exactly one input solid, with correct occlusion.** Correct
occlusion _requires_ all solids in one `HLRBRep_Algo` (running HLR per-solid would make every solid
visible through every other — the probe showed the column correctly vanishing behind the wall), so
per-solid is the finest granularity the supported path can give while staying correct.

### 1.3 ⚠ Is anything finer reachable? Honestly: yes, but by re-implementing an OCCT class

I checked rather than asserting impossibility. `HLRBRep_Algo.DataStructure()` returns `HLRBRep_Data`, which
**does** hold the original topology indexed — `EdgeMap()` / `FaceMap()`, reporting **24 edges and 12 faces
for our two boxes**, i.e. the real input edges. So the information exists inside HLR. What does not exist is
a public path from an _output_ edge back to its index: `HLRBRep_HLRToShape` assembles its compounds from
that data and exposes only the compounds.

⇒ **Per-edge provenance for projected curves is not impossible — it is a from-scratch re-implementation of
`HLRBRep_HLRToShape`'s assembly against `HLRBRep_Data`, in our own C++.** That is real work of unknown size,
and it is not v1.0.0's. It is named here so a future author does not re-derive the dead end, and so the
owner's ruling in §7 is made against the true cost rather than against "OCCT cannot".

### 1.4 The COST — and the two halves scale differently

Native OCCT, three-layer walls (so _solids_, which is what the document layer actually hands over —
a part is a solid with its own `nodeId`):

```
  solids   section (cut)               HLR (projection)
  ------   -------------------------   -------------------------
      30     39.4 ms  1.31 ms/solid      16.5 ms  0.55 ms/solid
     150    196.8 ms  1.31 ms/solid     135.8 ms  0.91 ms/solid
     300    384.8 ms  1.28 ms/solid     477.8 ms  1.59 ms/solid
```

- **The cut is LINEAR** — 1.28–1.31 ms/solid, flat from 30 to 300. Predictable.
- **HLR is SUPER-LINEAR** — per-solid cost nearly triples over the same range; 10× the solids cost **29×**
  the time (≈ N^1.5).

⚠ **The extrapolation, with its assumption stated.** Our WASM is ~3× native (§4j, measured). A level of a
10k-element building is roughly 2,000 elements ≈ 6,000 solids. At N^1.5 that is **~39 s of HLR native,
~2 min in WASM**, against ~8 s / ~23 s for the cut. _This is an extrapolation, not a measurement, and it
assumes every solid is fed in._ The obvious lever is that **the document layer should pre-filter solids by
the cut plane and the clip box before calling the op** — a bounding-box test it can do for free, no
contract change, and it is what makes a plan cost _per level_ instead of _per model_. Even so, the two
halves point the same way, and §7 Q1 asks the owner to choose on that basis.

### 1.5 What exists today

```
  commands able to author a view                        0   (of 32 — `views` is a pure reservation)
  kernel handler for `sectionCut`                       none — the op answers UNKNOWN_OP by design
  `sectionCut` in `capabilities`                        absent (capabilities derive from the handler map)
  TKHLR in the OCCT WASM link line                      PRESENT (`link.sh:34`, `libTKHLR.a` in the install)
```

⚠ The last line is worth recording: the frozen op's comment claims _"TKHLR is one of the 18 toolkits in our
OCCT build, and it was chosen for this."_ **That claim checks out** — a pleasant change from §1c-7's usual
result, and it means the projection half needs no kernel _rebuild recipe_ change, only a body.

---

## 2. What a drawing IS — and the invariant that shapes every decision below

`core_logic.md` rule 17 and D58: **a drawing is a LIVE PROJECTION of the B-Rep.** What is stored is the
_definition_ (a cut plane, a direction, a clip, a scale); the 2D geometry is derived on demand and never
stored, exactly as a mesh, a `Part` and a room boundary are.

The op's own reserved comment states the consequence, and it is the sentence this design has to satisfy:

> _"A plan must be annotatable and clickable… A section that returned anonymous polylines would be a
> picture, and pictures go stale."_

⇒ **the test of this design is whether a dimension anchored in the drawing survives an edit of the model.**
For cut curves, §1.1 says yes. For projected curves, §1.2 says not at sub-shape granularity — which is
precisely why §7 Q1 exists rather than being decided here.

⚠ **And the tempting fix is forbidden by D1.** Given an anonymous projected polyline, the obvious repair is
to match it back to a face geometrically. That is _"recovering identity by matching geometry after the
fact"_ — the one thing the whole naming design refuses (§0, D1). It must not be done, and it must not be
done _quietly_, which is the more likely failure. Reading `Generated()` is **not** that: it is OCCT's own
operation history, the same channel the existing resolver already consumes.

---

## 3. THE D1 ARGUMENT — why `sectionCut` mints nothing

This matters more than it looks, and it is what makes the cut half cheap.

`sectionCut` is a **query op, not a shape-producing op.** It is in the same family as `measure` / `bounds` /
`distance` / `faceFrame`: it reads the B-Rep and returns numbers plus **references to identities that
already exist**. It does not create a shape, does not register a handle, and **mints no `SubShapeRef`.**

- A cut edge's `ref` is **the owner face's existing token**, borrowed. The face was named when its part was
  built; the drawing quotes that name.
- Therefore no new relation kind, no new role grammar, and no canonical re-sort question. The existing
  structural channel (`srcOperand`/`srcKind`/`srcIndex` → `composeRefs`, `naming.ts`) already expresses
  _"this output came from that operand's face k"_, which is exactly and only what §1.1 measured.
- Therefore, too, **`releaseShape` has nothing to release** and the heap accounting is unchanged.

⇒ the cut half of `sectionCut` is an additive op over machinery that already exists, and its correctness
argument is D24's, re-measured in §1.1 for the section case.

---

## 4. The shape

### 4.1 Kernel — `sectionCut`, in `packages/kernel-occt` (C++ + the TS adapter)

The payload is **frozen and unchanged**; this is a body under it.

- **`mode: 'cut'`** — per input handle, `BRepAlgoAPI_Section(solid, plane)`; for each result edge, read
  `Generated()` over the operand's faces to find its single owner (§1.1 proves it is single); emit a
  `SectionCurve { kind:'cut', ref: <owner face's existing token>, points, closed }`.
- **`mode: 'cut+projection'`** — additionally one `HLRBRep_Algo` over **all** handles (occlusion is global),
  then `VCompound(shape)` per input to attribute each projected edge to its solid. §7 Q1 decides what
  `ref` may be on these.
- **The 2D frame** is `plane.origin` + `plane.xAxis` from the payload; points are flat `[x0,y0,x1,y1,…]` in
  mm, per the frozen `SectionCurve`.
- **`depth`** bounds how far beyond the plane to look; **absent ⇒ unbounded**, per the frozen payload.
- Once a handler is registered the op appears in `capabilities` automatically (derived from the handler
  map) — no separate declaration, and `tests/quantities-and-contract.test.ts`'s reserved-op list moves
  `sectionCut` from "reserved" to "live" in the same commit.

⚠ **Discretisation is the one genuinely new decision inside the kernel.** A section of a cylinder is an
exact circle; `SectionCurve.points` is a polyline. So the op must choose a chord tolerance, and that
tolerance is a **display** parameter that must never leak into anything measured (rule 15 — a projected
polyline is not a quantity). Proposed: a fixed chord tolerance, documented, with the exact curve's
provenance `ref` still attached so a dimension reads the _model_, never the polyline. Recorded, not owed.

### 4.2 Document layer — `views` becomes a first-class collection

Exactly the Entry-68 promotion, **including its correction**:

1. `'views'` joins `SceneCollection` (`scene.ts`) — the exhaustive switch in `dependency.ts` will refuse to
   compile until its edge is declared (Entry 33's mechanism, and Entry 68 verified it still fires).
2. Its dependency edge is a **declared "nothing"**, with the same comment discipline Entry 68 used: the
   _wrong_ edge is the plausible one. _"Editing a view re-stages the elements it shows"_ would rebuild a
   level's solids to change a drawing's scale. A view stores nothing derived, so its freshness needs no
   invalidation at all.
3. The **optional-collection `.bnn` guard** (`bnn.ts`): absent is legal, present-and-not-an-object is a
   typed refusal. `views` joins `schedules` in that loop.
4. ⚠⚠ **NO `emptyScene()` entry.** Entry 68 found this the hard way: adding one turned two green Entry-47
   reservation assertions red, and relaxing them would have been the wrong move. **The collection
   materialises on first authoring** (`applyOne` already does it). A document with no views stays
   byte-identical, and all four documentation collections keep one rule — absent ⇒ none of it.

**No `SCENE_SCHEMA_VERSION` bump. No frozen byte moved.**

### 4.3 Document layer — the view CRUD, and the Entry-68 sentence applies verbatim

`core.createView` / `core.updateView` / `core.deleteView`, ordinary additive registry entries.

⚠⚠ **The verbs carry the refusal the body will not.** A projection must never deny a builder his drawing
(rule 17), so `projectView` degrades; the authoring door is the only place a malformed descriptor can be
stopped. What the verbs refuse, and why each line is where it is:

- a `kind` outside the frozen union (refused by the `argsSchema` enum itself, so the generated agent
  tool-list _is_ the documentation — Entry 68's idiom);
- a `plan` whose `levelId` names no container, or names one that is not a Level (a plan cut at a Building
  is not a plan);
- a `section` whose `normal` is the **zero vector** — which yields a degenerate plane and, in the cut, an
  empty drawing that looks exactly like _"nothing is on this line"_: D78's empty-table failure mode on a
  new artifact;
- a `scale` of 0 or negative (it divides annotation sizing);
- a `clip` whose min exceeds its max on any axis — an empty drawing again, silently;
- a blank `name` (a plausible empty artifact in the sheet list);
- an unknown `designOptionId` — `NOT_FOUND`, never silently dropped (Entry 68's rule).

⚠ **Where the validator lives:** beside the grammar it validates, in `view.ts` (§4.4), never in
`commands.ts` — Entry 68's Q1 discipline, so the grammar has exactly one home and `commands.ts` only turns
issues into a typed `CommandFailure`.

⚠ **Update validates the MERGED descriptor, never the args** — Entry 68's finding, which generalises
directly: `updateView` changing `kind` from `plan` to `section` while mentioning no `normal` leaves a
section with no cut direction, each half legal and the result degenerate.

⚠ **The delete guard** reuses Entry 68's referrer machinery unchanged: a `Sheet.viewports` entry may place
a view, `sheets` is still a collection nothing authors, so it is RESTRICT-or-break with `redirect`
**absent** — which is exactly why Entry 68 made `Referrer.redirect` optional. **That optionality is now
load-bearing for a second consumer**, which is the argument that it was the right shape.

### 4.4 `packages/document/src/view.ts` — the body and every RESULT type

Entry 65's rule, verbatim: _every RESULT type lives with the body, never in `documentation.ts`_ — so that
**stored-vs-derived is legible from the file a type is in**, and greppable. `documentation.ts` keeps the
stored `ViewDescriptor`; `view.ts` holds `ViewCurve` / `ViewResult` and the projection.

⚠⚠ **AND THE ARCHITECTURAL DECISION, WHICH IS THE SCHEDULES ONE AGAIN: this module has no enumeration loop
of its own.** It consumes `modelElements()`. Every defect Entry 65 measured — a curtain wall contributing
0 of its 17 real elements, a throw on the pure composite, a non-active design option double-drawn — is a
defect a _drawing_ has in exactly the same way a schedule does, and they close by the same one decision.
⚠ **A plan that silently omits every curtain-wall panel is D78's empty-table failure mode with a
worse consumer**, because a drawing is what gets _built from_.

### 4.5 `DocumentContext.projectView(descriptor, options?)` — the D19 door

Symmetric with `evaluateSchedule`:

- resolve the design-option selection (the descriptor's own `designOptionIds` wins for the sets it names,
  the caller's `active` covers the rest, absent ⇒ each set's primary) — `evaluateSchedule`'s exact rule;
- `modelElements()` → the elements this view shows;
- **pre-filter by the cut plane + `clip`** (§1.4) — bounding-box only, and it is what keeps the cost
  per-level;
- collect part handles, one `sectionCut` request through the `GeometryGateway`;
- return `ViewResult`.

⚠ It is a **query, not an edit**: writes no `scene.json` byte, mints no `UndoableEdit`, caches nothing. The
`.bnn` carries the _descriptor_. ⚠ `GeometryGateway` already admits `sectionCut` — `DocumentOpName` excludes
only `tessellate` — so **no seam changes**; a drawing is parametric truth, not a render.

⚠ **One refusal costs its element, never the drawing** (rule 4 / D75, the `projectQuantities` discipline):
an element whose section fails is reported in an `unprojected[]` beside the curves, never dropped silently
— a plausible, short drawing is exactly what nobody audits.

---

## 5. The test plan — and what would let each test pass while the criterion is FALSE (§1b method 2)

| Criterion                        | Test                                                                                            | How it could pass while false                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A plan cuts the real model       | a 3-layer `core.wall` + an opening, plan at 1200, real OCCT                                     | **fixture is one plain wall** — the Entry-47 trap exactly. ⇒ the fixture MUST carry a curtain wall (children), an opening (cut faces) and a design option |
| Cut curves carry identity        | every `kind:'cut'` curve's `ref` decodes AND names a live part                                  | asserting `ref !== undefined` only. ⇒ assert the token is **byte-identical** to the face's own ref                                                        |
| The drawing is LIVE              | resize the wall, re-project, curve count/geometry follow with **zero re-authoring**             | asserting the descriptor round-trips, which tests storage, not projection                                                                                 |
| A curtain wall is drawn          | panel/mullion curves appear (17 real elements from 1 authored row)                              | a fixture with no children — Entry 65's 0-rows-where-6 with worse consequences                                                                            |
| A non-active option is not drawn | a variant wall contributes no curves                                                            | no option in the fixture                                                                                                                                  |
| Openings read correctly          | the plan through a window yields **two** wall segments; reveal refs resolve to the **cut node** | asserting only the segment count and not the ref ownership                                                                                                |
| The verbs refuse                 | each §4.3 refusal, one test apiece                                                              | testing the args and not the merged descriptor (§4.3)                                                                                                     |
| The promotion is additive        | Entry 47's reservation tests pass **UNMODIFIED**                                                | modifying them — the move Entry 68 correctly refused                                                                                                      |

**Revert-verify every one** (the standing rule): remove the fix, watch its test fail, and record which
tests fire.

---

## 6. What the walk found in the RESERVED shape

Only one thing, and it is the whole reason this is design-first rather than build-and-verify.

### 6.1 ⚠⚠ `SectionCurve.ref` cannot be populated for projected curves, and the comment says otherwise

The frozen field reads:

> _"The sub-shape this curve came from — the provenance that makes the drawing parametric. **Absent only
> where a curve has no single owner** (a silhouette of a curved surface has no edge behind it)."_

Measured (§1.2): the exception is not silhouettes. It is **every projected curve**, because HLR's output is
new geometry and its supported provenance granularity is the whole solid — and `SubShapeKind` is
`'face' | 'edge' | 'vertex'`, with no member a solid can occupy. So the projected half of a plan is
**anonymous polylines**, which is the outcome the op's own comment calls _"a picture, and pictures go
stale."_

**Nothing here is broken today** — no body reads the field, and no `.bnn` carries a projected curve
(projections are derived, never stored). That is exactly why it is cheap now: the shape can still be
completed, and after P5 it is an amendment across three products. §7 Q1/Q2.

### 6.2 Recorded, not owed

- **`ViewDescriptor` needs nothing else.** `PlanView`(`levelId`,`cutHeight`) and `SectionView`
  (`origin`,`normal`) map onto the frozen `SectionCutPayload.plane` without a gap; `scale` is display,
  `clip` is the pre-filter §1.4 wants, `designOptionIds` is D65's and `projectView` honours it.
- **`ElevationView`/`ThreeDView` need no body in v1.0.0** (D58 ships one plan + one section) and are
  reachable through the same op — an elevation is a section with no cut, a 3D view is not a `sectionCut`
  at all. No shape change either way.
- **`Viewport.viewId` addressing both id spaces holds** — the delete guard §4.3 is the second consumer of
  it and it needed no change.

---

## 7. Open questions for the Architect

> ## ✅ **ALL FIVE ARE RULED. Q1–Q3 by the owner in chat on 2026-08-03 (D81), each as recommended;
>
> Q4 and Q5 stand where §7 left them.**
>
> - **Q1 ⇒ (a)** — v1.0.0 ships **`mode:'cut'` only.**
> - **Q2 ⇒ (a)** — **`SectionCurve.nodeId?: string`**, reserved now, written by nothing until projection lands.
> - **Q3 ⇒ all four** — `refTo` gains `'view'`, `'sheet'`, `'annotation'`, `'family'`.
> - **Q4 ⇒ no sheet in v1.0.0** (`open_rulings.md` Q4, recommendation standing and uncontested).
> - **Q5 ⇒ mine**, a documented fixed chord tolerance that never reaches a quantity (rule 15).
>
> ⚠ **These blocked this unit across SEVEN sessions (69 → 71 → 72 → 73 → 74 → 75 → 76).** The text below
> is preserved verbatim as the reasoning the ruling was taken against — it is the argument, not the
> queue. The queue is `open_rulings.md`, where these rows are struck.

**Q1 — THE ONE THAT SHAPES THE UNIT. What does v1.0.0's plan and section SHOW?**
Both measured facts push the same way: the projected half is the expensive one (§1.4, super-linear) _and_
the unattributable one (§1.2).

- **(a) `mode:'cut'` only for v1.0.0's plan + section. ⬅ RECOMMENDED.** Every curve carries full sub-shape
  identity, so the drawing is annotatable and clickable — the op's stated invariant is _met, not
  approximated_. Cost is linear and predictable. D58 says **MINIMAL** 2D, and a cut-only plan is an honest,
  legible, complete artifact (Revit ships exactly this as a display setting). `cut+projection` then lands
  post-v1.0.0 as an additive `mode`, which the frozen payload already provides for.
  ⚠ **What is given up, stated plainly:** no lines for what lies _beyond_ the plane — no floor edges below
  the cut, no door swings, no stair beyond. A cut-only plan is a real plan; it is not yet a pretty one.
- **(b) Ship `cut+projection`, projected curves anonymous.** A more complete-looking drawing whose projected
  half cannot be dimensioned or clicked, and which does not scale. It also puts a _picture_ inside the
  artifact whose whole claim is that it is not one.
- **(c) Ship `cut+projection` with per-edge provenance** — the `HLRBRep_Data` re-implementation (§1.3). Real
  C++ of unknown size, on the critical path to a freeze that is otherwise unblocked. Not recommended now;
  recommended eventually.

**Q2 — If projected curves ever carry provenance, WHERE DOES IT GO? (cheap only until P5)**
Independent of Q1's timing, because the field must exist before the freeze or the P6 body amends a frozen
contract — the ⓣ trap, and exactly row Ⓕ's argument.

- **(a) `SectionCurve.nodeId?: string` — an optional field on a reserved, unimplemented op result. ⬅
  RECOMMENDED.** It names the DAG node (the part) a curve came from — which is _precisely_ the granularity
  §1.2 measured, no more and no less. `nodeId` is already the opaque first component of every
  `SubShapeRef`, so it introduces no new vocabulary, and honest under-specification beats a `ref` that
  claims sub-shape identity it does not have.
- **(b) `SubShapeKind` gains `'solid'`**, so a projected curve gets a real `SubShapeRef`. More uniform — one
  provenance field — but it widens the identity vocabulary **three products bind to** and that is written
  into `scene.json`. A much larger blast radius for a benefit Q2(a) already delivers.
- **(c) Nothing.** Then the P6 projection body amends the frozen protocol to say where its curves came from.

**Q3 — `ParamField.refTo`: add `'view'`, `'sheet'`, `'annotation'`, `'family'` now? (Entry 68's owed
question, and my task is its first caller.)**
`createView`/`updateView`/`deleteView` take a view id. Typed as a bare string, the generated picker and
agent tool-list cannot say what the id names; widening the union after `ParamSchema` freezes is an
amendment across three products. Entry 68 added only `'schedule'`, deliberately, so the call stayed the
owner's — **and it is now blocking a unit.** ⚠ **Recommendation unchanged from Entry 68: add all four**
(free now, an amendment later, nothing switches on it). If the ruling is "only what you need", I take
`'view'` and the question returns with the next documentation unit.

**Q4 — Does v1.0.0's minimal documentation owe a SHEET, or is a view enough?**
D58 says _one plan + one section + one schedule_, and says nothing about paper. `sheets` remains a pure
reservation, and §4.3's delete guard is RESTRICT-or-break precisely because nothing can author one.
**Recommendation: no sheet in v1.0.0** — the three artifacts exist and are addressable; a sheet is
composition, not projection, and it is the natural first Parity-B unit. Recorded so it is a decision rather
than a gap.

**Q5 — The discretisation tolerance (§4.1) — mine to choose, or yours?**
A projected curve is a polyline approximating an exact edge. **Recommendation: mine**, with a documented
fixed chord tolerance, because it is a display parameter that never reaches a quantity (rule 15) and the
exact identity travels beside it in `ref`. Raised only because "a number in a drawing" is the kind of thing
that looks like a display detail and turns out to be a contract.

---

## 8. What lands this unit (one commit, owner-gated)

Assuming Q1(a) + Q2(a) + Q3:

- `packages/kernel-occt` — the `sectionCut` handler (cut half), C++ + adapter, with the `Generated()`
  attribution of §1.1; `capabilities` gains the op by construction.
- `packages/protocol` — `SectionCurve.nodeId?` (Q2a), additive, on an unimplemented reserved result.
- `packages/document/src/view.ts` — the projection body + every result type + the descriptor validator.
- `packages/document/src/scene.ts` / `dependency.ts` / `bnn.ts` — the `views` promotion (§4.2), **no
  `emptyScene()` entry**, no schema bump.
- `packages/document/src/commands.ts` — `core.createView`/`updateView`/`deleteView`.
- `packages/document/src/document.ts` — `projectView`, the D19 door.
- `packages/document/src/schema.ts` — `refTo: 'view'` (+ the other three, per Q3).
- `tests/plan-section.test.ts` — §5, against real OCCT, revert-verified.

⚠ **The kernel change means a WASM rebuild** — a ~60 s single-file compile + link (§1c-3), not the 2.5 h
version bump. Constrained at the source per §6a (`--memory=2g --cpus=2`), and the box has 2.4 GB free with
`/tmp` at 6.5 MB; no pause of any other project is needed and none is proposed.

---

## 9. Status

**DESIGN DELIVERED (Entry 69) — RULED 2026-08-03 (D81) — BUILT (Entry 77).** Nothing in the design session
touched source; the deliverable was this doc, per the standing design-first rule. Nothing frozen moved,
and the freeze (step 6) remains the owner's act and remains unblocked: §6.1 is a hole in a _reservation
nothing reads_, and both proposed fixes are additive.

⚠ **What Entry 77 actually built is §8 under Q1(a) + Q2(a) + Q3-all-four.** Where the build measured
something this doc asserted, the correction is recorded in the entry and in `current_state.md` §7 —
**read those against this doc before trusting a number here**, per §1c's standing rule that a copy is a
claim nobody re-reads.
