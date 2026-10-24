# STEWARD-d29-cache-followups re-review — PR #112 — 2026-10-24 — seat: hmdnah

- **implements:** one-turn re-review of PR #112 at `170a54d` under `../diwan/docs/REVIEW-PROMPT.md`, after B-20261024-01 was cleared.
- **changed:** merged `main` into the branch and re-rendered `## BLOCKED` with `blocked.py`; this record and its log abstract.
- **verdict:** APPROVED, no defect proven. Acting account `narutousomaki741` (`agent_start.py --review`, "gh identity: narutousomaki741"); the PR's author is `Davidian-Abdo`.
- **B-20261024-01, each item at `170a54d`:**
  1. Design §5:230 now reads "(T-062 removes the double key, T-064 the clone)". Fixed.
  2. The corrections section and the log entry put the whole-index parse in the worker. The code agrees: `cacheOpen.ts:28` calls `openSignedCacheIndex`, and `cachesign.ts:171` runs `JSON.parse`. The caller reads `index.json` at `cacherestore.ts:92`. Fixed.
  3. `cachesign.ts:81` is `canonicalJson` and `:94` is `JSON.stringify`, as T-064's `implements:` now says. Fixed.
  4. T-064's `verify:` and `done-when:` now pass `--playwright`/`--browser`. Run with no arguments, `node tools/browser-check/named-save.mjs` prints usage and exits 2 (`:30-31`). Fixed.
- **verified:**
  - Item 1. I deleted T-063's `implements:` line (`BACKLOG.md:686`), and `python3 ../diwan/scripts/gates.py docs` exited 1 with `BACKLOG: T-063 has no 'implements:' — a cold agent cannot act on it.` After `git checkout -- docs/BACKLOG.md` it printed `✓ documentation integrity`, exit 0.
  - The PR touches no code: `git diff --stat 624b5ba 170a54d -- packages apps tools` is empty, so the earlier review's line-by-line citation check still holds.
  - Fixed on the branch: `main` at `ac6ec19` fails `gates.py docs`, because `CURRENT_STATE.md ## BLOCKED` still lists B-20261024-01 after the `cleared:` stamp (R15). The PR head passes. A merge of the two failed the same way, so I merged `main` in and ran `blocked.py`, and `gates.py docs` then exited 0.
- **not a defect, noted:** T-063's done-when asserts that the caller runs "no JSON.parse of the whole index", and that is already true at `624b5ba`. Its red has to come from the `unzipSync` and transfer assertions.
- **risk:** docs-only. There are no labels, so the PR is not owner-gated.
