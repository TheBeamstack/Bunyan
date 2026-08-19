# T-024 — review (step 2, re-run against the new head) — 2026-08-19 — seat: `hmdnah`

**PR:** #38, tip `a555a2f`. **Verdict: APPROVED, not merged** — `needs-operator/freeze` routes the
merge to the owner (`AGENTS.md §5.3`). **F3 is closed.** Machine: box (Hetzner, headless), Node 20,
pnpm 10.34.5, vitest 4.1.10. Every measurement below was executed here.

## 0. What this turn is

Step 2 was run once on `5636b8e` and returned the branch for F3; `zayd` fixed it on the existing claim
and pushed to the same branch. `REVIEW.md`'s two-step table does not define the turn that reviews a
branch returned by **step 2** — that gap is `open_rulings.md` **Q22**, recorded by the previous step 2
and still the owner's to rule. Precedent governs until then: `docs/history.md`'s
`T-011 — review (step 2, re-run)` re-ran step 2 against the new head after its own defect return, with
one revert per closed finding. This turn is that shape, and the earlier step 2 is not treated as having
discharged it.

## 1. F3 — closed, and the branch is its own evidence

The repair moves the resolution off §7 and onto `recordedAbstracts(root)` — §7's parse plus every
`docs/history.md` abstract heading — and changes `baselineEntryIssues`'s exported `abstracts` contract
to match.

**The state the branch is in already carries the fuse.** Measured on the tip:

```
§7: 32075 bytes / 6 abstracts
_baselinedAtEntry  "STEWARD-unblock-pc-and-chrome-boot — 2026-08-18 — brahim"
resolves in §7?      false
resolves in record?  true      (record = 6 live + 51 archived = 57 headings)
```

Both `STEWARD-unblock-pc-and-chrome-boot` abstracts were rotated to `docs/history.md` §E by this turn,
which moved the baseline's own authorising entry out of the window. The fuse was performed, not
simulated.

### Revert (A) — the record-resolution removed, everything else in place

```
 ×  ⚠⚠ catches Q15's own shape: an entry whose date disagrees with the one beside it
 ×  ⚠⚠ an abstract that has rotated OUT of §7 still resolves — the fuse is gone
 ×  ⚠⚠ a key that names no turn is refused, against the real record
 ×  ⚠ the gate is repaired, not removed — a key whose date is not the baseline's still fails
      Tests  4 failed | 38 passed (42)      (freeze-boundary + docs-budget)
```

Restored ⇒ 50/50 across `freeze-boundary` + `docs-budget` + `state-risk-e2e`, matching the author's
`4 failed | 46 passed (50)` on the same three files.

### Revert (B) — the returned shape, run against the state this branch is in

`scripts/{docs-state,frozen-surface}.{mjs,d.mts}` and both test files restored from `317c756` (the
returned tip), with `current_state.md` and `docs/history.md` left at the new head:

```
 FAIL  … > the committed baseline records a key, and it resolves to a real §7 abstract
 AssertionError: STEWARD-unblock-pc-and-chrome-boot — 2026-08-18 — brahim names no abstract in §7:
   expected undefined to be defined
      Tests  1 failed | 37 passed (38)
```

Restored ⇒ green. The returned shape is red on the exact state the repair is green on, on a commit that
moved **0 of 214** declarations. That is the defect, reproduced by a second party.

## 2. Numbers

| claim | method | verdict |
| --- | --- | --- |
| suite 942 → **946** | `pnpm test`, full run | ✅ 946 passed, 97 files, 0 failed, 0 pending |
| `docs:check` 159 → **163** | `pnpm docs:check` | ✅ 163 (8 files) |
| `freeze-boundary` 17 → **19** | per-file count from the JSON report | ✅ 19 |
| the growth is new coverage | `it(` titles diffed `317c756` → `a555a2f` | ✅ +2/+2, one rename, nothing removed |
| nothing stopped running | per-file counts vs step 1's | ✅ `protocol` 8, `protocol/*` 17/33/8/9/46, `state-risk-e2e` 8 — identical |
| §7 was 32209 / 32768 with 559 B headroom on the returned tip | `section7(317c756:current_state.md)` | ✅ exact, and the authorising abstract was last |
| §7 reached 37913 / 32768 with this abstract prepended | 32075 + the two rotated footprints (2633 + 3252) | ⚠ re-derives to **37960**; the 47 B gap is separator accounting, the claim's substance holds |
| 0 of 214 declarations | `pnpm state` | ✅ `RISK: additive`, 946 green, 97 files |

The four added tests are `freeze-boundary`'s *"an abstract that has rotated OUT of §7 still resolves"*
and *"a key that names no turn is refused"*, plus `docs-budget`'s two collision assertions. The one
removed title is a rename of *"resolves to a real §7 abstract"* to *"resolves in the record"*.

## 3. Item 3 — the new kind of thing

`recordedAbstracts` is a new population and the invalidator does not read it: `diffSurface` is
`{added:[],removed:[],changed:[]}` at 214 = 214. The writer (`state.mjs --rebaseline` →
`newestAbstract().key`) mints only from §7, and §7 ⊂ record, so the writer cannot mint a key the
acceptor refuses. Parser robustness: **0** of the 51 archived headings sit inside a code fence, and the
38 new-scheme + 13 legacy headings the regexes find are the whole of them.

The rotation this turn performed was a **move**, not a copy — `docs/history.md` gains 68 lines and §7
loses both headings — so the T-015 shape in §6 did not recur here.

## 4. Item 2 — the backward sweep, and the one site it missed

**The legacy half's documented behaviour is now false**, because `abstracts` changed under it.

`scripts/frozen-surface.mjs:250` still says a legacy number *"is resolved in §7 while it is still there
and SKIPS once it rotates, which is why that half never cries wolf"*, and `:314` says *"The bound skips
when §7 holds no legacy entry"*. With `abstracts` = the record, the record holds 13 legacy headings
permanently, so the bound is always live and the resolution never skips. Measured:

```
legacy headings in §7:      0
legacy headings in record:  13   → 67 76 77 79 80 81 82 83 84 85 86 87 88
```

Two consequences, neither red today:

- **The diagnostic names the wrong file.** `:327` emits `… is dated <d> in §7 …` for an entry the same
  test asserts is **not** in §7. It should say "in the record".
- **The bound is wrong at its boundary.** `newestLegacy` is 88, but entries **89 and 90 happened** —
  `docs/history.md:460` records Entry 89 merging a PR and `:328` records Entry 90 re-running four
  reverts — they simply carry no `### N |` heading. A baseline naming 89 or 90 is now refused as
  *"the newest entry that exists is 88"*. Unreachable through the writer, which mints keys only, and so
  the same class as **G3**.
- The new test's own title, *"A legacy number that has not happened yet — the shape a mistyped constant
  takes"*, is therefore false of the input it now chooses (`newestLegacy + 1` = 89). It was true of the
  fixture it replaced.

Two in-repo call sites still pass §7 alone — `tests/state-risk-e2e.test.ts:209` and `:250` — against
which `scripts/frozen-surface.d.mts:44`'s *"never the §7 parse alone"* is overstated. Both are fixture
repos with no `docs/history.md`, where `recordedAbstracts` throws by design, so the qualifier the
handoff uses ("both **real-file** call sites") is the accurate one and the `.d.mts` line is not.

**G1 — the reasoning holds and it stays `brahim`'s.** `scripts/agent-finish.mjs:279` is
`abstracts.find((a) => a.id === task && a.seat === seat)`. The first pass and the return are both
`T-024 — 2026-08-19 — zayd` — measured, the record holds that key **twice** — so a `.key` gate accepts
the predecessor exactly as `id + seat` does. `.key` would catch only a return that crossed midnight,
which is not the case that occurred. Closing it needs a turn identity the record does not carry, which
is a §7 schema change and a task rather than a sweep edit.

## 5. Item 6 — weak green

Three of the four things step 2 reported are fixed and re-measured: the Q15-shape test takes both its
input and its expectation from the record, the `abstracts` argument is asserted load-bearing (the same
input against a population lacking the key reports one issue more), and *"the gate is repaired, not
removed"* asserts the messages rather than `toHaveLength(1)`.

**The fourth is new and it is the collision gate.** *"every colliding key is one task, one seat, ONE
DAY"* cannot fail for a new-scheme key:

```
new-scheme abstracts in the record: 44
key === `${id} — ${date} — ${seat}` for all of them: true
legacy collisions, where the assertion would be non-vacuous: 0
```

Grouping by key therefore partitions exactly by those three fields, and the three `size === 1`
assertions are tautologies on today's data. Its doc comment states more than that: *"What IS checkable
is that every collision is a pair of distinct turns rather than one abstract written twice, and that is
what this asserts."* The record holds exactly that second shape right now — the T-015 duplicate in §6 —
and the test is green on it. The `## Discovered` row is more careful than the comment, saying the gate
asserts one task/seat/day *rather than* distinct headlines; the comment should say the same.

The half that does measure is `collisions.length > 0`, and that one is sound.

## 6. The T-015 duplicate — verified

`docs/history.md` §E holds
`### T-015 — review: the fix holds, backward sweep and weak-green clean — 2026-08-16 — seat: hmdnah`
at lines **2299 and 2368**, bodies differing only in the `REVIEW:` line's wording. `git log -S` puts
the two writes at `71cfc02` (PR #31) and `c18ae8e` (PR #32) — two compactions, one of which copied
instead of moving. It predates this branch: `origin/main` carries both copies. Invariant 10 makes the
archive append-only, so recording it rather than editing it is right.

## 7. The uniqueness claim — corrected, and stale again by one

The count is out of the comment and into a measuring test, which is the repair that matters. The prose
copies restate a number and both are already falsified by the commit that wrote them:

```
docs/BACKLOG.md ## Discovered  and the §7 abstract's FOUND:
  "5 colliding keys of 51 distinct across 56 headings"
measured on the tip:
  6 colliding keys of 51 distinct across 57 headings
  (T-024/zayd, T-024/hmdnah, T-011/hmdnah, T-011/zayd, T-016/hmdnah, T-015/hmdnah)
```

The sixth is this turn's own abstract colliding with the first pass — the same mechanism that killed
the previous two statements of this fact. The row's line numbers for the T-015 duplicate (2231, 2300)
are stale by exactly the 68 lines the same commit inserted above them: 2231 + 68 = 2299,
2300 + 68 = 2368.

Not blocking, and the code is immune because the test measures. The fix shape is for the row to cite
the test rather than a number.

## 8. Item 7 — `needs-operator/*`, on the exact tip, per job

```
local HEAD == origin == headRefOid == a555a2fd59b38514239712fc635025761bf47b1b
  typecheck · lint · geometry harness   SUCCESS   20:03:58Z → 20:13:38Z
  PR shape · reserved classes           SUCCESS   20:13:40Z → 20:13:52Z
labels: needs-operator/freeze, review/step-1
```

Both jobs completed on the tip and the labeller is one of them, so `needs-operator/freeze` is a verdict
and not a silence — the trap item 7 names, and the 429 case step 1 recorded. `pnpm state` re-derives
`RISK: additive` against the diff. ⇒ **`AGENTS.md §5.3`: the owner merges this. I approved and did not
merge.**

## 9. Verdict

**Approved.** F3 is closed on the state the branch is actually in, both reverts reproduce here, every
number re-derives, the invalidator is untouched, and the growth is new coverage with nothing dropped.

Four findings, none blocking and none red:

| | |
| --- | --- |
| **H1** | the legacy half's comment and its `in §7` message describe behaviour the record-scoped `abstracts` no longer has; its `newest entry that exists is 88` bound is wrong for entries 89 and 90, which happened but carry no heading. Unreachable through the writer. |
| **H2** | *"every colliding key is one task, one seat, ONE DAY"* is a tautology for new-scheme keys, and the T-015 duplicate is the shape its comment claims it catches. |
| **H3** | the corrected uniqueness count (5 of 51 across 56) is stale by one on the commit that wrote it — 6 of 51 across 57 — and the T-015 line numbers are stale by 68. |
| **H4** | `frozen-surface.d.mts:44`'s *"never the §7 parse alone"* is overstated: two fixture call sites do exactly that, legitimately. |

## 10. Owed

- **The owner** — the merge. `needs-operator/freeze` is unconditional and composes with `risk: high`.
- **`brahim`** — H1 through H4 as `## Discovered` rows; **Q22** still unruled, and this turn ran the
  conservative reading of it rather than inventing one; **G1**, **G3** and **G5** unchanged.
- Nothing owed to a `pc` seat — every measurement here is headless and was executed here.
