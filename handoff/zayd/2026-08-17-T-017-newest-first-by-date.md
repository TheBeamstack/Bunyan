# T-017 — `docs-budget.test.ts`'s newest-first check reads the authored date, not the positional key

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-17. **Decisions:** none new; closes the
defect Discovered 2026-08-15. **Task:** `docs/BACKLOG.md` T-017.

## 1. The defect, measured before the fix

`docs-budget.test.ts`'s "numbers entries uniquely and monotonically" case asserted
`ns` equals `ns` sorted descending, where `ns = abstracts.map(a => a.n)`. For a new-scheme
(`T-nnn`/`STEWARD-<slug>`) entry `parseAbstracts` assigns `n = 1000 - i` from the entry's index in the
same top-to-bottom walk (`docs-state.mjs`, "SYNTHETIC SORT KEYS") — so the assertion asked whether
`forEach` had counted down, which it always has. Only the legacy `### N | date | agent | headline`
scheme carries a number an author wrote, and §7 holds none of those now (all ten abstracts are
new-scheme).

Measured on a two-entry fixture deliberately written in the wrong order — `T-002` dated `2026-01-01`
above `T-001` dated `2026-01-02`:

```
ids  : T-002, T-001
dates: 2026-01-01, 2026-01-02
n    : 1000, 999
today's check (n descending) passes on this out-of-order fixture? true
```

The check was green on the exact input it exists to refuse.

## 2. Why the order is worth gating at all

`newestAbstract` returns the MAX `.n`, which for a new-scheme entry is its position in §7 — so §7's
written order **is** which entry the tooling calls newest. Two things are written from that value:
`current_state.md §8`'s "newest entry" row, and `--rebaseline`'s `_baselinedAtEntry`/`_baselinedAt`
audit fields (`state.mjs:229-240`). A §7 in the wrong order silently mislabels both, and
`docs-budget.test.ts`'s own "§8 agrees with §7 about which entry is newest" case cannot catch it —
both sides of that comparison come from the same `newestAbstract` call.

## 3. The fix

`tests/docs-budget.test.ts`:

- **`outOfDateOrder(list)` NEW**, module-local and pure — returns one description string per adjacent
  pair whose upper entry is dated **strictly before** its lower one; empty means §7 descends by date.
  Strictly-before is what admits equal dates in either order.
- The old case is split in two. "numbers entries uniquely — the parallel-agent collision detector"
  keeps the duplicate-number assertion unchanged (that half was never vacuous: it is a set-size
  comparison, not an order claim). "is written newest-first, judged by each entry's own date" is the
  replacement, asserting `outOfDateOrder(abstracts)` is empty.
- **The teeth, on a fixture** — "⚠⚠ refuses an older entry sitting above a newer one — what `.n` could
  not see" parses the §1 fixture and asserts BOTH things on that one input: the positional key
  descends on it (which is why the old check proved nothing), and `outOfDateOrder` still names the
  offending pair. The real `current_state.md` passes either version, so a fixture is the only place
  the difference is observable.
- **"accepts two same-date entries in either relative order"** — builds the same two-entry §7 twice
  with the headings swapped, both dated `2026-01-01`, and asserts both parse clean.

`tests/freeze-boundary.test.ts`: one comment corrected. Line 253 read *"§7 is written newest-first by
convention and nothing enforces it"* — true when written, false as of this PR. It now records that the
order is gated in `docs-budget.test.ts` by date, which cannot separate two entries written on the same
day. The `by MAX, not by position` choice it justifies is unchanged and still correct.

No `scripts/`, no `packages/`, no `apps/web`, no frozen byte.

## 4. Why day granularity is the honest limit, and what it does not catch

The heading's `date:` is the only authored, comparable field a heading carries — `id` is not
monotonic (a steward turn has no task id at all, and task numbers do not increase turn-over-turn once
three seats mint entries independently), and `seat`/`headline` order nothing. Its granularity is a
day, which is coarser than a turn: §7 today holds **eight** abstracts dated `2026-08-16` and two dated
`2026-08-17`, so a swap **within** either group is invisible to this gate and is accepted by design
rather than by oversight. What the gate does catch is a whole day out of sequence — the shape a
careless rotation or a badly-resolved §7 merge conflict takes.

## 5. Backward sweep (invariant 7) — every consumer of §7's order

The new rule is *"§7 descends by date"*; enumerated every existing site that reads §7's order:

| Site | Reads order? | Verdict |
| --- | --- | --- |
| `docs-state.mjs` `newestAbstract` | yes — MAX `.n`, and `.n` is position | the reason the gate exists; now covered |
| `state.mjs:229`/`:240` | via `newestAbstract` | covered transitively |
| `frozen-surface.mjs` `baselineEntryIssues` | no — `Math.max` and `find(a => a.n === entry)` treat `.n` as an identity, not a sequence | unaffected |
| `docs-budget.test.ts`'s `AWAITING REVIEW` guard | via `newestAbstract` | covered transitively |
| `agent-finish.mjs:280` | yes — `find(a => a.id === task && a.seat === seat)` takes the FIRST match, i.e. the topmost | see below |

`agent-finish.mjs:280` is the one site the day granularity does not fully reach: §7 can hold two
abstracts with the same `id` **and** the same `seat` (it does today — `hmdnah`'s two T-016 review
entries, both dated `2026-08-17`), and `find` resolves that to whichever is on top. It is not a defect
and needs no change: the call is an existence check whose only use is the `die()` beside it, and the
matched object is never read afterwards.

`docs-state.mjs`'s "SYNTHETIC SORT KEYS" comment cites *"`docs-budget.test.ts`'s own 'newest-first'
gate"* as what guarantees array order. That citation was hollow when written and is now true, so it is
left as it stands.

## 6. Verification

`pnpm verify` green, exit 0 — all six gates. Numbers in the §7 abstract.

**Revert-verified.** Neutralised the date comparison to reproduce the old blind behaviour
(`return above && above.date < below.date` → `return false && above && above.date < below.date`) and
ran `vitest run tests/docs-budget.test.ts`: **1 of 21 RED**, the fixture case, `expected [] to deeply
equal [ Array(1) ]` — `"T-001 (2026-01-02) is below T-002 (2026-01-01)"` not reported. Restored:
**21/21 green**. Note that the same test's positional-key assertion stayed GREEN through the revert,
which is the point of putting both on one fixture: it is the half that documents what the old signal
could see.

⚠ Run twice, because the first implementation did not survive `tsc`. `outOfDateOrder` was originally a
`slice`/`map`/`filter` pipeline that indexed `list[i]`, which is `T | undefined` under this repo's
`noUncheckedIndexedAccess` — three `TS18048` errors in `pnpm typecheck`, gate one, before any test
ran. The shipped shape is a single `flatMap` that reads `list[i - 1]` and guards it, so the `i === 0`
case falls out of the same check rather than needing a `slice` or a non-null assertion. The
revert-verification above is the re-run against the shipped shape.

## 7. Not covered

- Two entries written on the same day are unordered by this gate (§4). Closing that needs a
  finer-grained authored field in the heading — a schema change to §7, out of this task's scope and
  not obviously worth its cost.
- The gate reads `current_state.md` on disk. A §7 that is out of order only in a merge's index, never
  written to the working tree, is not a state this check can observe.
