# T-011 review (step 2, re-run after the defect return) — both defects closed; one measured claim is false

**Seat:** `hmdnah` (reviewer, box — headless). **Date:** 2026-08-17. **PR:** #32, author seat `zayd`.
**Head reviewed:** `89130fb` (the previous step 2 reviewed `6cac987`; `ee8abb3..89130fb` is new here).
**Prior report:** `handoff/hmdnah/2026-08-17-T-011-review-step2.md` / PR #32
`issuecomment-5310790811`.

⚠ **Body named to sort last** — `agent-finish.mjs` resolves a turn's body by lexical sort over
`handoff/<seat>/` (step 3, `.sort().at(-1)`), which cannot separate two same-day bodies for one task.
`…-review-step2b-rerun.md` sorts after `…-review-step2.md`; `…-review-step2-rerun.md` would not
(`-` < `.`). Already a `## Discovered` row from `zayd`'s side of the same turn.

## 1. Verdict — APPROVED. The owner merges it.

Both returned defects are closed, and closed at the mechanism rather than at the assertion. The one-hop
choice is correct and provably so (§4). `RISK: contract-touching` + `needs-operator/freeze` ⇒ I approve
and do not merge (`AGENTS.md §5`); the `docs/BACKLOG.md` row stays `review` until the owner merges.

**One finding that does not block:** the entry's and the handoff's oracle measurement is wrong on `area`
and on the `refs` count (§5). It is a claim in the permanent record, not a defect in the code or the
tests, and the test's chosen oracle (`bounds`) is the right one regardless.

## 2. Item 1 — revert-verification, re-executed, one revert per defect

Both reverts were made by hand against `89130fb`, tests untouched, and restored with
`git checkout HEAD -- packages/document/src/dependency.ts`.

**Revert A — the join hop only** (`return unique([...flipped, ...joinNeighboursOf(scene, flipped)])`
→ `return unique([...flipped])`), the undo seed left fixed:

```
FAIL tests/dependency-graph.test.ts (3 of 13)
  × designOption→element reaches the JOIN NEIGHBOUR, whose miter the option flip changes
  × a design option in a set nothing is tagged into still re-stages its own set only
  × undo of a DELETE seeds from the CHANGE, not from a catalogue that no longer holds the option
      AssertionError: expected [ 'w-opt-a', 'w-opt-b', 'win-opt-a' ]
                   to deeply equal [ 'w-butting', 'w-corner', 'w-opt-a', 'w-opt-b', 'win-opt-a' ]
FAIL tests/design-option-crud.test.ts (1 of 15)
  × promoting the other option re-stages the MAIN-MODEL wall whose miter it silently changes
      AssertionError: expected [ 'wall-…SKSXB4CEE0' ] to include 'wall-…GKMHF0NW1'   (edit.rebuilt)
```

**Revert B — the undo seed only** (`new Set<string>([option.id])` → `new Set<string>()`, i.e. the
catalogue-only seed), the join hop left fixed:

```
FAIL tests/dependency-graph.test.ts > undo of a DELETE seeds from the CHANGE …
      expected [ 'w-corner', 'w-opt-a', 'w-opt-b' ]
   to deeply equal [ 'w-butting', 'w-corner', 'w-opt-a', 'w-opt-b', 'win-opt-a' ]
FAIL tests/design-option-crud.test.ts > undoing the delete of a set's only option …
      expected [] to include 'wall-01M07J9VHFBR2JSX3NV0B0W2PV'   (dependents, line 386)
```

Restored, then the five files this unit touches: **61/61 green** (`design-option-crud` 15,
`dependency-graph` 13, `design-option-refs` 8, `option-cascade-d67` 19, `join-option-cascade` 6). Full
suite re-run here, foreground, real OCCT kernel: **920 passed · 96 files**, and `pnpm docs:check`
**146 passed · 8 files** — both figures match `zayd`'s claim exactly.

## 3. ⚠ Correction to MY OWN prior report — defect 2 is not reachable through `DocumentContext`

My step-2 report said the undo direction meant *"`undo()` restores the option, they go active again, and
nothing is re-staged."* **That half is wrong, and I proved it wrong here.**
`DocumentContext.#affected(edit)` is `edit.rebuilt ∪ #touched(edit.changes)`, and `edit.rebuilt` was
journalled at execute time from the PRE-delete scene, where the catalogue still held the option.
Measured, with revert B in place (defect 2 restored) and the test's `dependents` assertion neutralised:

```
delete edit.rebuilt = [ wall-01M07JARZ08REH3BAEHQNRYPPR ]   ← the tagged wall, already named
undo() → modelElements() contains it · partsOf() defined     ← PASSES with the defect present
```

⇒ the journal carries the forward answer into the undo, and for this edge the forward and backward
answers are always equal (an option flip moves no baseline, so both the flipped set and its join
neighbours are symmetric). **Defect 2 is real in `dependents` and only in `dependents`** — which is an
exported declaration that `dependency.ts`'s own header names Miqdar and Planitor as readers of, so the
fix earns its place; it is not the end-to-end erasure I described. Stated at its actual size, per
`AGENTS.md §7.4`, and recorded as a new statement rather than an edit to the old one (invariant 10).

Consequence for the new e2e test: `design-option-crud.test.ts`'s *"undoing the delete … re-stages the
elements that go active again"* is red only on its `dependents(doc.scene, change)` line; its three
`undo()`-side assertions pass with the defect present. Not a weak green — the case does fail without the
fix — but its title is discharged by the unit call, not by the undo.

## 4. Item 3 / the one-hop judgement — correct, and the reason is structural

**One hop is the exact dependency closure, not a conservative cut.** Read against the code rather than
against the argument: an element's built geometry depends on option active-ness through exactly one
route — `buildContext` calls `resolveJoins(scene, element.id)` (`build.ts:595`), and `build.ts` calls
`isElementActive` nowhere else. `resolveJoins` reads only

- the element's own baseline;
- `joinOverridesOf(self)` — and `resolveEnd` skips an override whose partner is inactive
  (`joins.ts:416`);
- `partnersAt(P, self)` and `throughWallsAt(P, self)` at **the element's own two endpoints**
  (`joins.ts:322/358`).

Every one of those is one join-hop. A neighbour's *cap* moving changes neither its baseline nor its
thickness, so nothing propagates a second hop — a fixpoint would name the whole connected component of
the wall graph and buy nothing. `case 'elements'` has always drawn the line in the same place.

**And the hop is complete in the direction that matters.** `joinNeighboursOf` passes both the endpoints
and the baseline segment, so it finds (a) walls sharing an endpoint with a flipped wall, (b) walls whose
endpoint lies on a flipped wall's segment — the mid-span butt — and (c) walls named in a join override
with it. What it does not find is the through wall a flipped wall butts *into*, and that is right:
`wallsJoinedTo`'s own asymmetry note says a butt moves only the butting wall.

**The test pins the boundary in both directions**, which is what makes the choice reviewable rather than
asserted: `w-lobby` is a genuine join candidate (it shares `w-corner`'s other endpoint) tagged into a
different set, and `toEqual` on the whole sorted set means a fixpoint implementation would go red on it,
not just an under-naming one. Over-naming and under-naming both fail this fixture.

**Item 3 — what quantifies over "every one of them", including the invalidator.** `dependency.ts` is the
only site that turns an option change into an affected set; `enumerate.ts`, `cleandelta.ts`, `room.ts`
(`roomMetrics` — a live query that caches nothing, `document.ts:1023`) and `projectView`/
`projectQuantities` all resolve the catalogue at query time through `optionScopeOf`. `build.ts` holds no
geometry cache that could return a stale solid to a correctly re-staged element — proven, not inferred,
by the `bounds` moving in §5. Hosted openings are covered by `assemblyRoot` (`build.ts:117`, `hostId`),
so a tagged opening on a main-model host still rebuilds that host's assembly.

## 5. Items 4 and 5 — the oracle claim is FALSE for `area`, and the `refs` count is wrong

Re-measured independently, same construction as the test (`M = [0,0]→[6000,0]`,
`W = [6000,0]→[6000,4000]` tagged into A, `t = 200`, `h = 3000`), on the live handle of `M`'s part,
either side of `core.updateDesignOption { id: B, isPrimary: true }`:

```
                  before (mitered)        after (plain cap)     verdict
volume            3 600 000 000           3 600 000 000         IDENTICAL   ✓ as claimed
counts            6 faces/12 edges/8 v.   same                  IDENTICAL
refs              18 entries              18 entries            IDENTICAL   ✗ claimed "17-entry"
area              39 848 528.137 mm²      39 600 000 mm²        DIFFERS     ✗ claimed identical, and
                                                                            claimed "36 000 000"
edgeLength        36 965.685 mm           36 800 mm             DIFFERS     ✗ not mentioned
bounds.max        [6100, 100, 3000]       [6000, 100, 3000]     DIFFERS     ✓ as claimed
resolveJoins(M)   ['end']                 []                    ground truth, both sides
```

The volume argument is sound and the area argument is not, and the difference is exactly the miter's own
geometry: the 45° cut moves volume from one lateral face to the other, but it replaces a `t × h` cap with
a `t√2 × h` one, so area grows by `t·h·(√2−1)` = **248 528.137 mm²** — which is the measured delta to
the last digit. `39 600 000` is the plain wall's true total surface (`2·6000·3000 + 2·200·3000 +
2·6000·200`); the quoted `36 000 000` is only the two large lateral faces.

⇒ **The record's conclusion — "any quantity-based assertion in this unit is a weak green by
construction" — does not hold.** `area` and `edgeLength` would both have been sound oracles here. This
changes nothing about the code or the tests: `bounds` is still the clearest oracle, and it is the one the
test uses. It matters because a future turn reading that sentence would skip an oracle that works. It is
`§1c-7`'s disease in its usual form — a number written into an entry and never read back — and it is the
second measured claim on this branch to fail re-measurement, so it is worth naming rather than absorbing.

**The performance claim re-measured, and it holds.** `dependents` on one `designOptions` change, half the
walls tagged, walls laid out sharing endpoints (pure TS, no kernel):

```
walls    cold      warm
  200   14.34 ms   9.20 ms
  400   16.58 ms   8.92 ms
  800   24.97 ms  11.65 ms
 1600   47.91 ms  26.75 ms
```

8× the walls for 3.3× the cold time — same shape as `zayd`'s 200/400/800 figures, and not a return of
D73's quadratic. `wallsJoinedTo`'s spatial index is memoised per `Scene` object, and `#touched` passes
one pre-change scene for every change in an edit, so the per-element loop pays for one index build.

## 6. Item 7 — risk, re-confirmed immediately before approving

```
pnpm state → RISK: contract-touching (re-baselined) · 1 declaration moved
             packages/document/src/scene.ts :: type SceneCollection
             ⚠⚠ contract-touching ⇒ the OWNER merges this PR, not the reviewing agent.

gh pr checks 32                (head 89130fba50186041edf0ccd99dc4cf6dda5c3495)
  PR shape · reserved classes           pass  12s
  typecheck · lint · geometry harness   pass  9m17s
gh api …/commits/89130fb/check-runs → both completed/success, 2026-08-17T08:52Z
labels: needs-operator/contract-touching · needs-operator/freeze · review/step-1
```

The labeller **ran** and **succeeded** on this exact head — "no label" and "the labeller never executed"
are different states, and this is neither: two `needs-operator/*` labels are a positive verdict. Two of
`AGENTS.md §5`'s three classes ⇒ **the owner merges**. `review/step-1` present, so this is legitimately
step 2. `tests/frozen-surface.snapshot.json` is untouched by `ee8abb3..89130fb` (the branch keeps the one
`SceneCollection` move step 2 already verified against `main`'s own committed baseline), no
`SCENE_SCHEMA_VERSION` change on the branch, and `freeze-boundary` is green inside `docs:check` 146/146.

## 7. `done-when`, item by item

1. the three verbs ship and 0-of-40 is closed — ✔ (verified in step 1; unchanged this turn).
2. materialise-on-first-authoring, no `emptyScene()` entry, no schema bump, byte-identical document —
   ✔ (`git diff main...HEAD -- scene.ts` moves no `SCENE_SCHEMA_VERSION`; step 2 mutation-tested the
   byte-identical case).
3. **the edge is not the "nothing" `schedules`/`views` declared, and does not reproduce D68 from the
   authoring side** — ✔ **and this is the item that was false last turn.** Now measured in the solid:
   `bounds.max.x` `6100 → 6000`, i.e. 100 mm (half a thickness) of a wall nobody edited, gone.
4. `TS2345` in the exhaustive switch closed — ✔ (CI typecheck green on this head).
5. the 50 % under-report reproduced red then closed — ✔ (`design-option-crud.test.ts` §6, step 1).

## 8. Housekeeping, checked rather than accepted

- **§7 rotation.** `T-013 — the seat identity guard` (zayd, the oldest of the ten) moved to
  `docs/history.md` §E **verbatim, all eight fields**, nothing summarised away (invariant 10); §7 now
  holds 10 abstracts at 29.3/32.0 KB and `current_state.md` at 82.1/96.0 KB, and `docs:check` passes the
  budget gate. Its `T-013 — review (step 2)` companion stays in §7, which is right — position, not pairing,
  is what the rotation rule uses.
- **The handoff-name workaround.** Verified at the source: `agent-finish.mjs` step 3 takes
  `readdirSync(handoff/<seat>).filter(f => f.includes(task)).sort().at(-1)` and then requires the newest
  §7 abstract's `FULL:` to name it. `…-reserved-comment-sweep` sorts before `…-return-join-neighbour-…`,
  so the gate resolves the new body — the workaround works, and the `## Discovered` row records both the
  mechanism and the fix shape honestly. This body carries the same workaround (see the header note).
- **The `## Discovered` rows** for the third `--review` wrong-PR occurrence and for the primary-invariant
  sweep are both accurate as written; the wrong-PR row's fix shape (order candidates by review-pipeline
  position, or add `--pr <n>`) is the right one.

## 9. What I could not verify or resolve

- **Nothing browser-shaped** in this PR, so no `unverified here` debt.
- **`agent-start.mjs --seat hmdnah --review` claimed PR #33 again** — a fourth occurrence, and it took
  #33 (T-016) rather than #32 exactly as recorded. ⚠ **Correction to what I first wrote here:** it did
  not merely check the branch out — it posted the auto-claim comment on #33 as well
  (`2026-08-17T09:51:29Z`, `agent-start.mjs:646`), which I had asserted it had not. Checked, then
  answered with a housekeeping comment (`#33 issuecomment-5314875325`) saying #33 was not reviewed and
  carries no live claim. I redirected to #32 by hand; the `## Discovered` row covers the mechanism.
- **I did not re-run `pnpm verify`'s `typecheck`/`lint`/`format:check` legs locally** — CI ran all three
  green on `89130fb`, and I re-ran the two legs that carry this turn's evidence (`test`: 920/96,
  `docs:check`: 146/8).
- **The primary-invariant `## Discovered` item stays open** — pre-existing, correctly not grown into this
  PR, and it needs a steward's readiness call, not a reviewer's.
