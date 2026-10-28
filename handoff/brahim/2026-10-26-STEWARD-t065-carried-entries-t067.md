# STEWARD-t065-carried-entries — T-065's contradiction fixed; T-067 carries the 200 ms bar; T-068 for dependabot — 2026-10-26 — brahim

## What was done

- **Spec fix, B-20261025-03.** T-065's done-when 2 now admits one amendment: T-064's cache-less `expect(posted.transfer).toEqual([])` (`tests/app-named-save-transfers-records-t064.test.ts:141`) expects the one packed buffer, which done-when 1 detaches. Done-when 1 also says neither cache-less case is `it.fails` (hmdnah's step-2 item 6). T-065's bar item, done-when 4, is unchanged.
- **T-067** (`ready`, `requires: browser`), from B-20261025-04's `need:`. Carried roots' `.brep` and record JSON cross by name, and the zip worker reads them from the opened file's bytes. It is built on T-065's branch, carries the unchanged 200 ms bar (3 of 3), and must also make T-065's amended done-when 1–2 hold. T-065 and T-066 now depend on it.
- **T-068** (`ready`): the Bunyan half of B-20261025-01. `pr-ready.mjs` routes a `dependabot/*` head branch whose author is the dependabot app. The diwan half (`agent_start.py` routing) belongs to diwan, so it is not sequenced here.
- **No `D-` opened.** The bar has never been shown unreachable: the pack copies ~105 MB that T-067 removes. Bunyan has no direction register (`docs/OWNER-DIRECTION.md` is absent).
- **No `cleared:` stamped.** B-20261025-03's and B-20261025-04's needs are performed here, but both records exist only on `task/T-065-…`, and this turn writes no other seat's branch. T-067's note has its builder re-append them when it merges main. B-20261026-01 and B-20261025-02 each end in "route PR #120/#116 to hmdnah once the bar holds", which waits on T-067. B-20261025-01 waits on both of its halves.

## Evidence

| Claim | Source |
|---|---|
| a cache-less save transfers nothing, and its two T-065 cases are `it.fails` | `bnnZip.ts:124-126` at `9b51781`; the T-065 test file on that branch |
| the pack copies every entry, record slice and the secret into one fresh buffer | `bnnZip.ts:93-98` at `9b51781` |
| 3 runs exited 0, 1, 1; pack 115.5/132.8 ms on the failing saves, 54.5–66.1 ms otherwise | PR #120 step-2 comment (hmdnah, 2026-10-26) |
| 43.9 MB `.brep` and 61.3 MB `index.json` raw at 16k | design §5, R4 table |
| PR #118 head `dependabot/npm_and_yarn/vite-6.4.4`, author `app/dependabot` | `gh pr view 118 --json headRefName,author` |

Not measured: T-067's effect on the hold. Its bar item measures it, and its note names a candidate next shape if the bar still fails.

## Next

`hmdnah` reviews this PR. After it merges, a box builder (`zayd`) with `browser` takes T-067.
