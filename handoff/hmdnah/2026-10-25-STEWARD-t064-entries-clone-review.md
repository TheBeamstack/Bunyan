# STEWARD-t064-entries-clone review — PR #119 — 2026-10-25 — seat: hmdnah

- **implements:** one-turn review of PR #119 (brahim's T-065/T-066 rows, T-064 `depends-on:` + T-065), under `../diwan/docs/REVIEW-PROMPT.md`.
- **changed:** `docs/BACKLOG.md` T-066 `implements:` provenance on the PR branch, `cacherestore.ts:224` → `usableRecord's cacheInputKey, cacherestore.ts:274` (`2017ff4`). Also this record and its `docs/PHASE_LOG.md` abstract.
- **verdict:** APPROVED, merged through `agent_merge.py --seat hmdnah --pr 119`; `gh` acts as `narutousomaki741` (`agent_start.py` step 0), and the PR's author is `Davidian-Abdo`.
- **verified:**
  - Item 1. With T-065's `implements:` line deleted, `python3 $DIWAN/scripts/gates.py docs --root .` exited 1 and printed `BACKLOG: T-065 has no 'implements:' — a cold agent cannot act on it.` After `git checkout -- docs/BACKLOG.md` it printed `✓ documentation integrity` and exited 0.
  - READY 1–9 hold for T-065 and T-066: each has an outcome, `implements:`, `verify:`, checkable `done-when:`, `depends-on:`, area, machine and risk. T-065's deps T-062/T-063 are `done`. `area: workers|backend` matches T-058–T-064.
  - `requires: browser` is right for both rows: T-065 done-when 4 and T-066 done-when 3 run `named-save.mjs` in Chrome, and the other items run under node.
  - T-064's four `done-when:` lines are byte-identical to `origin/main`'s, and its section differs only in `depends-on:` (python compare of the sections). Every `done-when:` line on main is still present at head.
  - `git diff -w origin/main...HEAD -- docs/BACKLOG.md` shows only the new rows, T-064's depends-on, the `## Discovered` entry and the table separator's prettier re-padding.
  - The cites hold at `origin/main`: `bnnzip.ts:16`, `document.ts:716,760,776-779,1403,1601-1604`, `bnn.ts:378`, `.agent.toml:56-75` (no touched file is watched), and diwan `agent_start.py:928-937` at `de91ec1`.
  - The exception is `cacherestore.ts:224`, which is right at `3addfb3` but has been the `importBrep` call since `f677281` (T-063). I fixed it on the branch.
  - On the fixed branch, `pnpm docs:check` passed 66 tests, `gates.py docs` printed ✓, and `prettier --check docs/BACKLOG.md` was clean.
- **noted (opinion):** T-065 is built on PR #116's branch, so its PR lands T-064's commits. T-065's own two-step review (risk high) is then the only review those commits get after #116's step 1. T-064's existing note still cites the stale `:224`; I left it alone because it is outside this PR's diff.
- **not resolved:** the session exports `GIT_COMMITTER_*` as `Davidian-Abdo`, so `2017ff4` has author `narutousomaki741` (`--author`) but committer `Davidian-Abdo`.
- **risk:** docs-only; not owner-gated (no labels; `PR shape · reserved classes` SUCCESS).
