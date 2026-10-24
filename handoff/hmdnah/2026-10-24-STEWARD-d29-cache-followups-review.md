# STEWARD-d29-cache-followups review — PR #112 — 2026-10-24 — seat: hmdnah

- **implements:** one-turn review of PR #112 (docs-only; adds T-062, T-063, T-064) under `../diwan/docs/REVIEW-PROMPT.md`.
- **changed:** nothing on the PR branch; this record, `docs/PHASE_LOG.md`, and B-20261024-01 on `main`.
- **verdict:** CHANGES REQUESTED. Not approved, not merged. Four defects, all in docs:
  1. `docs/design/P5_step9_D29_bnn_cache_design.md:230` (§5, the T-060 paragraph) still cites `docs/BACKLOG.md ## Discovered`, 2026-10-23.
     The PR deletes that finding, so the pointer dangles. It should name T-062 and T-064.
  2. The log abstract says "an open inflates and parses the whole index on the caller (`cacherestore.ts:92`)", and the handoff evidence row says the same.
     At `624b5ba`, `:92` only reads, and so inflates, `index.json` on the caller. The parse runs in the worker (`cacheOpen.ts:28` → `openSignedCacheIndex`, `cachesign.ts:171`).
     The caller pays the reply's `structuredClone` instead, which design §2e:103-104 already says. T-063's row is not wrong, but its provenance overstates the cost.
  3. The handoff evidence gives `cachesign.ts:81` (`JSON.stringify`) and `:94` (`canonicalJson`). The code has it the other way round: `:81` is `canonicalJson` and `:94` is `JSON.stringify`.
  4. T-064's `verify:` and `done-when:` run `node tools/browser-check/named-save.mjs` with no arguments. Without `--playwright`/`--browser` it prints its usage and exits 2, so "exits 0" can never hold as written (READY rule 3).
     T-060's row (`BACKLOG.md:653`) has the same form. That row is done, so this is not this PR's regression, but a new `blocked` row should not copy it.
- **verified:**
  - Item 1. I deleted T-062's `implements:` line, and `python3 ../diwan/scripts/gates.py docs` failed with exit 1:
    `BACKLOG: T-062 has no 'implements:' — a cold agent cannot act on it.` After `git checkout -- docs/BACKLOG.md` it printed `✓ documentation integrity`, exit 0.
  - These citations match the code at `624b5ba`, and the PR touches no code: `document.ts:737-740,749,755,1543-1552`; `cacherestore.ts:92,223-226`; `bnn.ts:32-35,489,491-492,498`;
    `cacheOpen.ts:10,28,51`; `bnnZip.ts:52,84`. `bnn.ts:347` is the first body line of `checkCaps`, which is declared at `:346`.
  - The `implements:` sections all exist: design §2b, §2e, §3, §4, §5 (the T-060 paragraph at :222), and §6 R1/R3/R4/R5 (:242-246); spec §6.5 (:583).
  - `requires: browser` is on T-064 alone. T-064 is the only row with a browser `done-when:`, and T-063 puts browser timing out of scope.
  - `npx vitest run tests/app-named-save-signs-in-worker-t060.test.ts tests/app-cache-open-verifies-in-worker-t061.test.ts` gave 10 passed, 2 skipped, matching the handoff.
  - CI: both checks `SUCCESS` at `34bffdd` (`gh pr view 112 --json statusCheckRollup`). No labels, so the PR is not owner-gated.
- **not a defect, noted:** `area: backend|workers` is outside `BACKLOG.md` READY rule 6's list. 24 rows already use them, and `backlog.py` accepts them, so rule 6 and the tool have drifted apart.
- **not done here:** `agent_finish.py --review` was not run, because it writes "ready to merge" and has no changes-requested verdict (`agent_finish.py:676`).
- **risk:** docs-only; not owner-gated.

## Re-review at `170a54d`, after B-20261024-01 was cleared

- **changed:** merged `main` into the branch and re-rendered `## BLOCKED` with `blocked.py`. Also changed: this section and its log abstract.
- **verdict:** APPROVED, and merged through `agent_merge.py --seat hmdnah --pr 112 --wait-ci` (exit 0). Acting account `narutousomaki741` (`agent_start.py --review`, "gh identity: narutousomaki741"); the PR's author is `Davidian-Abdo`.
- **B-20261024-01, each item at `170a54d`:**
  1. Design §5:230 now reads "(T-062 removes the double key, T-064 the clone)". Fixed.
  2. The corrections section and the log entry put the whole-index parse in the worker. The code agrees: `cacheOpen.ts:28` calls `openSignedCacheIndex`, and `cachesign.ts:171` runs `JSON.parse`. The caller reads `index.json` at `cacherestore.ts:92`. Fixed.
  3. `cachesign.ts:81` is `canonicalJson` and `:94` is `JSON.stringify`, as T-064's `implements:` now says. Fixed.
  4. T-064's `verify:` and `done-when:` now pass `--playwright`/`--browser`. Run with no arguments, `node tools/browser-check/named-save.mjs` prints usage and exits 2 (`:30-31`). Fixed.
- **verified:**
  - Item 1. I deleted T-063's `implements:` line (`BACKLOG.md:686`), and `python3 ../diwan/scripts/gates.py docs` exited 1 with `BACKLOG: T-063 has no 'implements:' — a cold agent cannot act on it.` After `git checkout -- docs/BACKLOG.md` it printed `✓ documentation integrity`, exit 0.
  - The PR touches no code: `git diff --stat 624b5ba 170a54d -- packages apps tools` is empty, so the citation check above still holds.
  - Fixed on the branch: `main` at `ac6ec19` failed `gates.py docs`, because `CURRENT_STATE.md ## BLOCKED` still listed B-20261024-01 after its `cleared:` stamp (R15). A merge of `main` into the head failed the same way, so I merged `main` in and ran `blocked.py`, and `gates.py docs` then exited 0.
  - CI passed on `aab2d84` (both checks). `pnpm verify` on the merge result: 121 files, 1049 passed, 4 skipped.
- **not a defect, noted:** T-063's done-when asserts that the caller runs "no JSON.parse of the whole index", and that is already true at `624b5ba`. Its red has to come from the `unzipSync` and transfer assertions.
