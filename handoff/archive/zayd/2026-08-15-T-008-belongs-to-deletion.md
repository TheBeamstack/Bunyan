# T-008 — the belongs-to deletion reconciliation: the cascade and the exclusion rule now walk one edge set

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-15. **Decisions:** D83 (Q19), D39, D67,
D74, D86. **Task:** `docs/BACKLOG.md` T-008.

## 1. The defect

`cascadeOf` (D39) cascaded a delete over `hostId`; `isElementActive` (D67) excludes an element whose
`hostId` **or** `parentElementId` names an element that is not there. Delete a parent and its members stay
in `scene.elements` while leaving every enumerating consumer: two walls, one
`core.setElementMetadata { parentElementId }`, and `core.deleteElement` on the parent gives
`modelElements()` **0 of 1** and a whole-model schedule of **0 rows and 0 mm³ carrying `basis: 'exact'`**,
with `brokenRefs()` and `unbuildable()` both empty.

The general form: **a row the exclusion rule drops and the cascade spares is a row in `scene.elements`
that nothing can see.**

## 2. (a) the cascade — `packages/document/src/commands.ts`

`cascadeOf` walks `belongsTo(scene, id)` — hosted by it, or a member of it — instead of `hostedBy`. The
`seen` set already made the walk total, so a cycle on either edge still terminates.

`hostedBy` itself is unchanged and stays `hostId`-only, because it answers the **assembly** question
(which voids does this root cut?). A group member has no geometric relationship to its parent, which is
why the other four `hostedBy` call sites — `setParams`/`updateStyle` rebuild lists, `movedWithHosted`, and
`core.copy`'s refusal — are correct as they stand. `core.copy`'s "everything that points at the source"
list is the one that could arguably widen, and it does not need to: it exists because copying a host would
force a rewrite of each opening's `hostRef` token (D51/D1), and a `parentElementId` is not inside a token.

`rebuilt` needed nothing: the executor replaces the command's hint with `#affected`, and
`dependency.ts`'s `elements` case pushes `before.hostId`, so a cascaded member that was hosted on a
**surviving** wall re-cuts that wall. Measured rather than assumed — the fourth test in §1 of the new file
compares the host's volume before and after.

## 3. (c) the surface — `packages/document/src/document.ts`

`danglingAncestorRefs(scene)` returns one `BrokenReference` per element whose `hostId` or
`parentElementId` is not in `scene.elements`, and `brokenRefs()` unions it with the stored list and with
T-007's `danglingDesignOptionRefs`. It is the same surfacing path D86 built — derived at the query, never
staged into `scene.brokenRefs` — for the reason that entry records; this adds a second predicate to it,
not a second path.

`ref` and `hostId` both carry the missing ancestor's id, and `reason` names which edge. The panel and the
agent projection read `elementId`/`ref`/`reason` only, and `interface BrokenReference` is a watched
declaration that freezes at P5, so nothing widened.

**What reaches this state.** The delete road is closed by §2, so the population is a document written
elsewhere — a `.bnn` under D43, or an agent assembling a scene. On the `hostId` edge such an element is
not built at all: `assemblyRoot` sends it to a root that is not in the scene and `affectedAssemblies`
drops it, so `geometryOf` is `undefined`, `unbuildable()` lists only registration failures, and before
this the document said nothing at all about it.

## 4. The pin came past deliberately

`tests/belongs-to-cycle-guard.test.ts` asserted *"D39 cascades `hostId` ONLY — a child by
`parentElementId` SURVIVES its parent (pins Q19)"*, and D83 says it is supposed to fail. It is replaced by
the property it existed to protect: `cascadeOf` and `isElementActive` walk the same edges, asserted on the
two functions. The behaviour through the shipped verbs is the new file. The `cascadeOf`-terminates test in
the same section gained the mixed cycle (`a.hostId = b`, `b.parentElementId = a`), which a single-edge
walk could not reach.

## 5. Verification

`pnpm verify` green — **843 tests across 95 files**, all six gates, real OCCT throughout, real exit code 0.
`tests/freeze-boundary.test.ts` green: the frozen surface has not moved, so `RISK: additive`.

**The whole suite noticed the change in exactly one place.** Running everything against the new cascade
before the pin was updated: `1 failed | 842 passed`, the one failure being the pin itself. That is what
D83's own note predicted, and it is also the measure of how much behaviour depended on the old edge set.

**Revert-verified, each half separately.**

| Reverted | Result |
| --- | --- |
| `belongsTo` → `hostedBy` in `cascadeOf` | **6 RED** across the two files — `expected [ 'wall-…' ] to deeply equal [ …(2) ]` |
| `danglingAncestorRefs` dropped from `brokenRefs()` | **3 RED** — `expected [] to have a length of 1 but got +0` |
| both restored | 7/7 and 17/17 green |

**Cost.** `brokenRefs()` on a hand-assembled 10,000-element scene: **2.78 ms/call before, 5.81 ms/call
after** (50 calls after 20 warm-ups), and **5.70 ms/call when all 10,000 elements are broken** — the new
pass is flat in the number of findings. It is one `Object.values` walk over `scene.elements`, the same
shape and the same cost as the pass T-007 added; the one call site is a `useMemo` keyed on document
version.

## 6. Contract docs

- `docs/contracts/V1.0.0_spec.md` — the D39 row gains an `AMENDED BY D83` line, beside the existing D42
  one; the row's own text still said the cascade takes the windows hosted in a wall.
- `docs/contracts/core_logic.md` — domain rule 3 gains a third broken-reference class, next to the second
  one D86 added. `core.retargetReference` clears the host edge; the parent edge can be pointed at a live
  element but not cleared, which is affordable only because §2 closes the delete road.
- `packages/document/src/designoptions.ts` and `commands.ts` — three comment blocks described the D39/D67
  asymmetry as live and Q19 as open. Comments only; both files' declarations are byte-identical, which is
  what keeps `designoptions.ts` (a watched file) additive.
- `docs/decisions.md` — D83 gains its BUILT note.

## 7. What is not built, and why

**(b) refuse is ruled out**, so `core.deleteElement`'s `argsSchema` does not move.

**Groups are still a v1.0.x reservation**, which is the condition D83's (a) half was ruled under: nothing
authors a group, so the population of this cascade is exactly "an agent or a `.bnn` that set
`parentElementId`". If group authoring ships, deleting a group deleting its members goes back to the
owner.
