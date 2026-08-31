# STEWARD-blf-open-alignment — review — 2026-08-31 — seat: khalihlna

**PR:** #44 (`brahim/2026-08-30-blf-open-alignment`, `TheBeamstack/Bunyan`) · **Risk:** additive

## 1. Item 1 — revert-verification

Reverted `NOTICE`'s Beamstack brand block (`git checkout main -- NOTICE`) and confirmed
`tests/notice-attribution.test.ts` still passes — that test greps for each shipped dependency's name
present anywhere in the file, so it cannot distinguish the brand block's presence either way; the
real check is that removing the block changes nothing the test asserts, which held. Restored.

More load-bearing: this review's own first pass hit a genuine CI failure — the re-seed gate
(`check-reseed.mjs`) failed because 14 of the 216 SPDX-swept files (`packages/kernel-mock/src/box.ts`,
`packages/kernel-occt/src/*`, `packages/kernel-occt/wasm/bunyan-kernel.d.ts`,
`packages/types/src/*`, `tools/kernel-build/postlink.mjs`, `tools/kernel-build/src/kernel.cpp`) are
in `scripts/reseed-paths.mjs`'s `GEOMETRY_PATHS`. Confirmed by reading `check-reseed.mjs`: the
`Re-seed-unchanged:` commit trailer is only consulted in its SECOND failure branch (a golden file
was re-seeded but its payload didn't move) — the FIRST branch (`touchedGoldens.length === 0`) exits
1 immediately, unreachable by any trailer. The original commit's trailer therefore had no effect.

**RED:** CI run `33335482669`, job `typecheck · lint · geometry harness` — `re-seed gate FAILED —
geometry changed but no goldens were re-seeded`, naming exactly those 14 files.
**GREEN:** reverted the SPDX header on exactly those 14 files (`git diff main -- <14 files>` — zero
lines), pushed `0016690`; CI run `33376138958` — both jobs pass, `10m16s` main job.

## 2. Items 2–7

- **Spec sections:** the framework repo (`beamstack-licensing`) `DECISIONS.md` BLF-D2/BLF-D6, `tiers/
  open.md` — read against the diff; `LICENSE`/manifests genuinely untouched
  (`git diff main...HEAD -- LICENSE '**/package.json'` empty), matching the claim.
- **Backward sweep:** N/A — no rule/invariant added, a documentation/attribution alignment only.
- **New kind of thing:** none.
- **Claims vs code:** `docs/decisions.md` D90 and the handoff body's "202 of 216" / "14 excluded"
  figures match the actual diff, confirmed by direct file count after the fix commit.
- **Numbers:** `pnpm verify` run twice locally by this review (974/974 both times after the fix), CI
  run twice (once red on the pre-fix commit, once green on the fix) — each carries its own method.
- **Weak green:** N/A — no new test in this PR.
- **Risk:** additive — `tests/freeze-boundary.test.ts` green (19/19) inside every run; no
  `needs-operator/*` label (`gh pr view 44 --json labels` → `[]`).

## 3. A seat-identity correction, recorded for the record

An earlier attempt at this review ran as `hmdnah` (this PR's branch prefix `brahim/…` mechanically
routes to the box reviewer, per `reviewerForBranch`). The owner corrected this mid-turn: reviews
originating on this pc are `khalihlna`, regardless of what a `brahim/…`-prefixed branch's mechanical
routing derives — `brahim` has no registered machine-appropriate reviewer of its own in the five-seat
model (it never builds), and the branch-prefix heuristic assumed brahim's registered machine (box)
rather than where this steward turn actually ran (pc). The `hmdnah` attempt took no write action
(confirmed: no `gh pr review`/`gh pr merge`/`gh pr comment`/push) before being stopped — its research
(the CI red finding) was independently reproduced and confirmed rather than trusted. A stray "Review
claimed by seat `hmdnah`" PR comment remains on #44 as an artifact of that attempt; not removed,
per invariant 10.

## 4. `gh` identity note, worth a `RUNBOOK.md` follow-up

`RUNBOOK.md`'s seat-credential table states the pc's default `gh` identity is `Davidian-Abdo`. As
measured this session, `gh auth status` on this pc actually reports `narutousomaki741` as the active
account, with `Davidian-Abdo` logged in but inactive. Worked around per D87 (never `gh auth switch`)
by using `GH_TOKEN=$(gh auth token --user Davidian-Abdo)` to read that account's stored token without
changing the global active account. Not fixed here — `RUNBOOK.md`'s table may be stale, or the
active-account state may have drifted from an earlier session; `brahim` should reconcile which is
true and correct the doc or the machine.

## 5. What this leaves

`brahim`: the `docs/BACKLOG.md` Discovered entry (2026-08-30, re-seed gate trailer gap) and the
`gh auth status` discrepancy above both want a look. `zayd`: the 14 excluded files still need SPDX
headers, alongside a real re-seed run on the pinned native-OCCT environment.
