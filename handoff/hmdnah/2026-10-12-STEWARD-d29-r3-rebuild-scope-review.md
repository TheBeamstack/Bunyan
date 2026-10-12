# STEWARD-d29-r3-rebuild-scope review — PR #76 — 2026-10-12 — seat: hmdnah

- **implements:** one-turn review (`../diwan/docs/REVIEW-PROMPT.md`, all items) of PR #76 at head `5387470`;
  design `P5_step9_D29_bnn_cache_design.md` §6 R3 read against §2b, §2c and T-041's `done-when:`.
- **changed:** nothing on the PR's diff; this record and `docs/PHASE_LOG.md`, written before the merge.
- **verdict:** approved; merged through `agent_merge.py --seat hmdnah --pr 76` after this finish.
- **verified:**
  - item 1 (docs-only: the "fix" is the R3 cell, no vitest reads it; two probes re-executed):
    (A) the PR's own evidence check — design reverted to `main` (`git checkout main -- <design>`) → grep finds
    "rebuilds only its assembly", probe exit 1 (RED); restored → finds "whose §2b key it flips", exit 0.
    (B) the padding claim — R3 wording reverted, new padding kept → `npx prettier --check <design>` exit 1
    "Code style issues found"; restored → exit 0 "All matched files use Prettier code style!".
  - diff scope: `git diff -w --word-diff main...HEAD -- <design>` → only the R3 cell and the separator row change.
  - item 4: new R3 text matches §2b (`resolveJoins` in the key; `styles`/`materials`/`sections`/`containers`/
    `grids` digested into every key) and T-041:402; `resolveJoins` exists at `packages/document/src/joins.ts:375`.
  - item 2: `grep -rn 'only its assembly' docs handoff` → only dated log/handoff history remains, no live spec.
  - gates: `pnpm verify` exit 0 (100 files, 910 tests; docs:check 66/66); `gates.py docs` exit 0.
  - item 7: `gates.py reserved-classes --pr 76` → none; `gates.py pr-ready --pr 76` exit 0; `gh pr checks 76` 2/2 pass.
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741`; PR author `Davidian-Abdo` (`gh pr view 76`).
  - items 3, 5, 6: n/a — no new kind, figure or test.
- **not verified:** nothing this machine could not run.
- **notes:**
  - The PR body's "`python3 scripts/gates.py pr-ready`" names a path absent in Bunyan (`ls scripts/gates.py`
    → no such file); the gate is `$DIWAN/scripts/gates.py`. Body template text, non-blocking.
- **risk:** normal (steward spec fix); not owner-gated; docs only.
