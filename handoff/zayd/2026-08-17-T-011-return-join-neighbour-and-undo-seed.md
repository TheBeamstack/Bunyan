# T-011 — the D88 defect return: the option edge reaches the join neighbour, and seeds from the change

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-17. **PR:** #32, on the existing claim
(`agent-start.mjs --seat zayd --continue T-011`; the row stays `review`, no new claim, no new PR).
**Returned by:** `hmdnah` step 2 — `handoff/hmdnah/2026-08-17-T-011-review-step2.md` and PR #32's
`issuecomment-5310790811`. Both proven defects were reproduced red here before either was fixed.

## 1. What was wrong, reproduced red first

Both live in `dependency.ts`'s `case 'designOptions'`, and both were reproduced through the shipped verbs
against the real OCCT kernel before a line of the fix was written.

### Defect 1 — the edge never expanded over `wallsJoinedTo`

The case seeded `belongsToDescendants(elementsTaggedIntoSet(setName))` and stopped. The elements whose
*active-ness* flips are not the elements whose *geometry* changes: `partnersAt` filters by
`isElementActive` (`joins.ts:322/358/416`), so demoting an option removes a **main-model** wall's miter
partner — a wall tagged into nothing, hanging off nothing, and named by no edge.

Reproduced end-to-end, `core.updateDesignOption { isPrimary: true }`, main wall `M = [0,0]→[6000,0]`,
option wall `W = [6000,0]→[6000,4000]` tagged into A:

```
resolveJoins(M) before → ['end']        resolveJoins(M) after → []
edit.rebuilt           → [ wall-…9ZKYK ]     ← W only; M absent
```

### Defect 1, measured at the B-Rep as well — the reviewer's open item, closed

The reviewer proved this at `resolveJoins` + the invalidator and flagged the two-solid comparison as worth
writing after the fix. **Written, in this turn**, because "re-staged" is not the criterion — "not stale"
is. The comparison had to be picked with care: **volume and area cannot see this defect.** A 45° miter
between two equal-thickness walls adds on one lateral face exactly what it removes on the other, so both
are byte-identical before and after (measured: `volume 3 600 000 000`, `area 36 000 000`, and an identical
17-entry `refs` list, on both sides). The **shape** is what moves, and `bounds` on the live handle says so:

```
kernel `bounds` of M's built solid, after the promote
  with the fix    → { min: [0,-100,0], max: [6000, 100, 3000] }   correct, plain cap on the baseline end
  fix reverted    → { min: [0,-100,0], max: [6100, 100, 3000] }   ← STALE: still mitered, 100 mm too long
```

100 mm — half a wall thickness — of a wall nobody edited, mitered against a wall the document no longer
builds. That is `join-option-cascade.test.ts`'s own mode 1 arriving through the invalidator, i.e. D68 from
the authoring side, now measured in the solid rather than inferred from the resolver.

### Defect 2 — the seed resolved through a catalogue an undo has already emptied

`#affected` reads the **pre-change** scene on all three paths (`document.ts:367/451/493`). On **undo of a
delete** the pre-change scene is the *post-delete* one: the option is out of `scene.designOptions`, and a
seed resolved as `setName → optionIds → elements` drops the deleted option's own tagged elements out of
the filter. Reproduced through `core.deleteDesignOption { acknowledge: true }` on a set's only option:
`dependents(doc.scene, change) → []`, where the tagged wall is exactly the element that goes active again.

## 2. What landed

`packages/document/src/dependency.ts` only — no new exported declaration, so the frozen surface is unmoved.

1. **`joinNeighboursOf` (new, private)** — one hop of the same `wallsJoinedTo` scan `case 'elements'` runs
   (line 82), driven off each flipped element's own endpoints *and* its baseline segment, so the mid-span
   butt is covered as well as the corner. **One hop, not a fixpoint**, and that is deliberate: a join is
   not transitive (the far cap of a neighbour depends on that neighbour's baseline and thickness, neither
   of which moves), so a fixpoint would name the whole connected component of the wall graph.
2. **`elementsTaggedIntoSet` now takes the `DesignOption`, not the `setName`** — it seeds from
   `change`'s own option id **unioned with** the catalogue's siblings of that `setName`. The change
   carries the option even when the scene no longer does, which is what makes the undo direction work; the
   catalogue is still read for the siblings, whose active-ness flips on a promotion.
3. **`dependents`'s `@param scene` docstring** said the pre- and post-edit scene give the same answer. True
   for the container/grid/style edges it was written for, false for this one — corrected to say which edge
   is the exception and why, rather than left as an item-4 claims-vs-code miss inside the diff.

## 3. The regression tests, and why they do not repeat the shapes that let this through

The reviewer named the reason both defects stayed green: the one edge test's negative control sits 5000 mm
away and parallel, so it can never be a join partner and cannot distinguish *correctly excluded* from
*wrongly missed*; and `tests/dependency-graph.test.ts` — the file that exists to guard this graph — had no
`designOptions` case at all. Both are addressed head-on.

**`tests/dependency-graph.test.ts` — three new pure cases**, on a fixture built so the positives and the
negatives are the same shape. `w-opt-a` (tagged) runs north from a corner at `[6000,0]`; `w-corner` (main
model, tagged into nothing) **meets it at that corner**; `w-butting` **lands mid-span on its face**;
`win-opt-a` is hosted in it. The controls are `w-far` (parallel, 5000 mm away) and `w-lobby` (tagged into a
**different option set**, and sharing `w-corner`'s other endpoint — so it is a genuine join candidate that
this edit must still not reach). Assertions are `toEqual` on the whole sorted set, so over-naming fails too.

- the join-neighbour case, and a third case proving the edge stays **set-scoped** (a `Lobby` edit reaches
  `w-lobby` and its corner partner, never the Facade walls);
- the undo-of-delete case, in both forms: the option removed from an otherwise-full catalogue, and the
  reviewer's own "set whose only option was the deleted one".

**`tests/design-option-crud.test.ts` — two new end-to-end cases** through the shipped verbs on the real
kernel: the reviewer's `updateDesignOption` measurement with `resolveJoins` as ground truth on both sides,
`edit.rebuilt`, **and the `bounds` comparison of §1**; and the delete/undo direction, ending on
`modelElements()` and `partsOf(tagged)` after the `undo()`.

**Also taken, from the review's non-blocking §5 item:** the five refusal cases asserted
`rejects.toBeInstanceOf(CommandFailure)` without pinning `code`. `REFUSED` vs `NOT_FOUND` is agent-visible
surface, and `design-option-refs.test.ts` already holds the two doors apart by exactly that field — a local
`refuses(call, code)` helper now pins both the class and the code.

**Not taken:** the `## Discovered` row about the primary invariant being enforced at the CRUD doors only.
It is pre-existing, reachable before this PR, and is not this PR's growth — the steward's call, not a
defect return's.

## 4. Verification

**Revert-verified, the fix only.** `git stash push -- packages/document/src/dependency.ts`, tests
untouched: **5 failed | 23 passed (28)** across the two files — every new assertion red, every
pre-existing one green.

```
× promoting the other option re-stages the MAIN-MODEL wall whose miter it silently changes
× undoing the delete of a set's only option re-stages the elements that go active again
× designOption→element reaches the JOIN NEIGHBOUR, whose miter the option flip changes
× a design option in a set nothing is tagged into still re-stages its own set only
× undo of a DELETE seeds from the CHANGE, not from a catalogue that no longer holds the option
```

The `bounds` assertion was additionally shown to fire **on its own** (§1's `6100` vs `6000` diff), by
neutralising the `edit.rebuilt` assertion above it while the fix stayed reverted — so the B-Rep claim is
not riding on the id-naming claim.

Restored, `git stash pop`, **28/28 green**, then `pnpm verify` in full, foreground, real OCCT kernel,
exit 0: **920 green · 96 files**, 0 failing; `docs:check` **146 · 8 files**. `tests/freeze-boundary.test.ts`
12/12 and **unmoved** — no re-baseline this turn, and no exported declaration was added or changed, so the
branch keeps the classification it already had (the one `scene.ts :: type SceneCollection` move).

**Cost of the new scan, measured** (pure TS, no kernel; `dependents` on one `designOptions` change, half
the walls tagged, cold scene):

```
walls   before this turn   after
  200        0.42 ms      11.40 ms
  400        0.21 ms      17.33 ms
  800        0.43 ms      23.82 ms
```

4× the walls costs 2.1× the time — **not** a return of D73's quadratic. `wallsJoinedTo`'s spatial index is
memoised per scene object (`INDEX_CACHE`, a `WeakMap`), so the per-element loop pays for one index build,
and `DocumentContext.#touched` passes the same pre-change scene for every change in an edit. The figures
above are the cold case, which is the honest upper bound; the warm case is the lookups alone. Set against
the alternative — a wall carrying a solid 100 mm too long until an unrelated full rebuild cures it — and
against the kernel rebuild the edge triggers, this is not a cost worth trading correctness for.

## 5. Backward sweep (invariant 7) — where else does an option change decide what rebuilds?

The rule this turn adds is *"an option-set edit must reach the join neighbours of what it flips."*
Enumerated every site that turns a design-option change into an affected set: `dependency.ts` is the only
one. Every other reader of `scene.designOptions` — `enumerate.ts`, `joins.ts`, `room.ts`, `cleandelta.ts`,
`document.ts`'s `projectView`/`projectQuantities` — resolves the catalogue **at query time** through
`optionScopeOf` and caches nothing, so there is no second invalidator to keep in step. `roomSeparators`'
declared "nothing" is unaffected for the same reason its own comment gives: the room-area invalidation
lives with the solver, not in the rebuild graph.

## 6. What I could not verify or resolve

- **Nothing browser-shaped** in this change, so no `unverified here` debt.
- **The PR still needs the owner's merge** — `RISK: contract-touching` plus `needs-operator/freeze`, from
  the earlier commits on this branch, unchanged by this turn. I did not merge it and must not.
- **`hmdnah`'s spurious review-claim comment on PR #33** stands; it is `## Discovered` and not mine to
  clear.
- **The `## Discovered` primary-invariant item is untouched** by design (§3).
