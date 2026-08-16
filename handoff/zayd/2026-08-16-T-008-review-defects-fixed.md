# T-008 — the two step-1 review defects, closed on the existing claim

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-16. **Decisions:** D83 (Q19), D39, D67,
D88 (two-step review). **Task:** `docs/BACKLOG.md` T-008. **Mechanism:** the first real use of
`agent-start.mjs --continue T-008` (T-015), resuming PR #23 rather than opening a new one.

## 1. `--continue` itself

`node scripts/agent-start.mjs --seat zayd --continue T-008` switched to
`task/T-008-q19-the-belongs-to-deletion-reconciliati`, found PR #23 open on it, printed
*"returning the branch to its builder, not a new claim"*, wrote no new `§0b` claim, and told me to
finish with `node scripts/agent-finish.mjs --seat zayd T-008`. Worked exactly as documented.

## 2. Defect 1 — `brokenRefs()` double-reported one element

`danglingAncestorRefs` (`packages/document/src/document.ts`) checked `hostId` and `parentElementId`
independently, so an element naming the **same** missing ancestor on both edges produced two
`BrokenReference`s differing only in `reason`. `App.tsx` keys the Problems panel on
`${elementId}:${ref}` alone, so the two rows collided on one React key; `agent.ts`'s projection
reported the element twice too.

**Fix, at the source.** Group the two edges by the missing ancestor id before emitting: one entry per
distinct missing id, its `reason` naming every edge that pointed at it (`"its hostId and
parentElementId name …"` when both match, `"its parentElementId names …"` when only one does — no
loss of information, no duplicate row).

**Red test, through the shipped verbs** (`tests/belongs-to-deletion-d83.test.ts`): a door created in a
wall, then `core.setElementMetadata { elementId: door, parentElementId: <that wall> }` (no cycle — the
Entry 87 guard allows it because door → wall is not yet a path back to door), then the wall dropped the
way a foreign writer would (D43's `without()` helper, already in this file). Before the fix:
`broken.length === 2`. After: `1`.

**Also aligned `hostId`'s convention (item 3 from both reviews, essentially free here):**
`danglingAncestorRefs` now sets `hostId: element.id`, matching `danglingDesignOptionRefs` (T-007) one
function above it, instead of `hostId: ancestorId` — an id that is by construction not in
`scene.elements` and, on the `parentElementId` edge, was never a host at all. No consumer reads the
field today (checked again before changing it), so this is free, not a scope expansion.

## 3. Defect 2 — the edit label was not swept with the cascade widening

`core.deleteElement` (`packages/document/src/commands.ts`) still built
`` `Delete ${type.label} and ${doomed.length - 1} hosted element(s)` `` — "hosted" was accurate when
the cascade was `hostId`-only (T-008's own build); D83's (a) half widened the cascade to
`hostId` + `parentElementId`, and a member reached only by the belongs-to edge is not hosted on
anything. Journalled (D40), so this was a wrong word in the permanent record, not only in the UI.

**Fix:** `"and N other element(s)"` — accurate for either edge kind, and for a mix of both, without
naming one over the other.

**Red test, through the shipped verb:** two walls joined by `parentElementId` alone (`core.wall` has no
`hostId` relationship to another wall), `core.deleteElement` on the parent. Before the fix: label
matched `/hosted/`. After: it does not.

## 4. Verification

Both fixes revert-verified independently (`git stash` on one file at a time, re-run, restore):

| Reverted | Red |
| --- | --- |
| the label fix alone (`commands.ts`) | 1 failed — `expected 'Delete Wall and 1 hosted element(s)' not to match /hosted/` |
| the dedup fix alone (`document.ts`) | 1 failed — `expected […] to have a length of 1 but got 2` |
| both restored | `tests/belongs-to-deletion-d83.test.ts` 9/9, plus `belongs-to-cycle-guard.test.ts` and `broken-ref-lifecycle-rule3.test.ts` unaffected (neither test file reads `broken.hostId` or asserts the old two-entry shape) |

`pnpm verify` full run: **845 tests across 95 files**, all six gates, real OCCT throughout, real exit
code 0. `reseed:check` skipped (no `BASE_REF` — not a CI PR context locally). `docs:check`'s own 91
tests green, including `tests/freeze-boundary.test.ts` (12/12) — the frozen surface has not moved, so
`RISK: additive` still holds; neither `commands.ts` nor `document.ts` is a watched declaration file.

## 5. What is still open, and why it is not built here

Nothing else from the two reviews was left unaddressed — both defects and the recorded divergence are
closed. (b) refuse remains ruled out per D83, unchanged by this turn.

## 6. The mechanism note the task asked for

This is the first real exercise of `--continue`. It worked cleanly: it read the row's `review` status
off `docs/BACKLOG.md`/`§0b`, found the open PR by branch name rather than by asking, and refused to
write a second claim — the exact shape D88 describes (*"row stays `review` throughout"*). No
`gh pr checkout` by hand was needed.
