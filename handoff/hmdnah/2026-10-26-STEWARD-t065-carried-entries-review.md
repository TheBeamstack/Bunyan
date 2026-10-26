# STEWARD-t065-carried-entries review — PR #121 — 2026-10-26 — seat: hmdnah

- **implements:** one-turn review of PR #121 (brahim's T-065 done-when 1–2 spec fix, new rows T-067 and T-068), under `../diwan/docs/REVIEW-PROMPT.md`.
- **changed:** this record and its `docs/PHASE_LOG.md` abstract only; no fix was needed on the branch.
- **verdict:** APPROVED, merged through `agent_merge.py --seat hmdnah --pr 121`; `gh` acts as `narutousomaki741` (`agent_start.py` step 0), and the PR's author is `Davidian-Abdo`.
- **verified:**
  - Item 1. With T-067's `implements:` line deleted, `python3 $DIWAN/scripts/gates.py docs` exited 1 and printed `BACKLOG: T-067 has no 'implements:' — a cold agent cannot act on it.` After `git checkout docs/BACKLOG.md` it printed `✓ documentation integrity` and exited 0.
  - T-065's done-when 4 (the 3-of-3 200 ms bar at 16k) is a context line in `git diff origin/main...HEAD -- docs/BACKLOG.md`, so it is unchanged.
  - The done-when 2 amendment fixes a real contradiction. `t064.test.ts:141` on T-064's branch is `expect(posted.transfer).toEqual([])`, and `bnnZip.ts` at `9b51781` returns `[]` for a cache-less save. Done-when 1 needs that buffer detached. The fix keeps the stricter item 1 and adds the `it.fails` ban, so it is no loosening to make the row claimable. T-065 was already claimed.
  - T-067 `requires: browser` covers its one browser item, done-when 5 (`named-save.mjs`, `save-check.html`). Done-when 1–4 and 6 run under node. T-068 has no `requires:`, and every item it lists runs under node.
  - The cites hold. The describes `records carried from an opened file` (t064:146) and `entries carried from an opened file` (t065:155) exist. The two `it.fails` cases are at t065:144,149. `pr-ready.mjs:27` accepts only `T-nnn: |STEWARD: `, and B-20261025-03/-04 are on T-065's branch as quoted.
  - At head: `gates.py reserved-classes --base origin/main --pr 121` printed none (exit 0). `pnpm verify` ran to its last step, with vitest at 1058 passed and 4 skipped, and `docs:check` passed 66. CI's two checks were SUCCESS.
- **noted (opinion):** no gate enforces `requires:`. With T-067's `requires: browser` removed, or T-065's table `depends-on` desynced from its section, `gates.py docs` still printed ✓. The checklist misses both, and only reading catches them. T-065 is `ready` while it depends on unfinished T-067, the same shape as T-064 → T-065.
- **risk:** docs-only; not owner-gated (no labels; `PR shape · reserved classes` SUCCESS).
