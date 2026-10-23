# STEWARD-cache-requeue-table-edit review — PR #95 — 2026-10-20 — seat: hmdnah

- **implements:** one-turn review (`../diwan/docs/REVIEW-PROMPT.md`) of PR #95 at head `2504168`, a docs-only
  steward PR: backlog row T-052 added, the 2026-10-14 `## Discovered` finding it converts deleted.
- **changed:** this record; `docs/PHASE_LOG.md`.
- **verdict:** approved, no fix needed.
- **verified:**
  - item 1: `git checkout origin/main -- docs/BACKLOG.md`, then `bash /tmp/hmdnah95/check.sh` → exit 1 (no T-052 row
    or section, no done-when/implements, `## Discovered` finding present). `git checkout HEAD -- docs/BACKLOG.md` →
    exit 0, all six checks green.
  - the claim, on `main`'s code (`git diff origin/main --stat -- packages apps tests` is empty):
    `npx vitest run --dir /tmp/hmdnah95 /tmp/hmdnah95/tests/flip.test.ts --silent=false` (real in-process OCCT, two
    walls, envelope set) → `before=2 rebuilt=[] queuedAfterEdit=0 after=0`; without an envelope → `queued=0
    files=undefined`.
  - citations read against the code: `cachekey.ts:73-82` digests the five tables, `:136-142` puts it in every key;
    `document.ts:1481-1485` queues only `staged.built`; `:688` drops a stale export, `:693-695` skips built roots;
    undo/redo reach `#commit` (`:511`, `:549`); `tests/geometry-cache-export-d29.test.ts:92-110` is the spy.
  - `implements:`: design §2b ("And the shared tables, whole") says a table edit re-keys every assembly; §5 holds the
    commit-queue and save-filter bullets; §6 row R4 exists; spec §6 has the `geometry-cache/` box.
  - done-when: all four run headless in vitest on in-process OCCT, as the probe did; no `requires:` is missing.
  - `risk: high`: READY rule 8 (D29 cache). `depends-on: T-042`: T-042 (R4 exporter) is `done`.
  - gates: `python3 ../diwan/scripts/gates.py docs` → `✓ documentation integrity`; `gh pr view 95` → `MERGEABLE`.
  - item 7: `node scripts/reserved-classes.mjs --base origin/main` → `none — RISK: additive`; CI `PR shape ·
    reserved classes` passed; no labels.
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741`. The PR is authored by `Davidian-Abdo`.
- **notes (opinion, non-blocking):** done-when 1's "`exportCacheIdle()` returns more than 0" holds only with more
  queued roots than its `maxAssemblies` (default 1); design §5's "the rebuilt assemblies are queued" bullet will
  need amending in T-052's PR.
- **not verified:** done-when 2 and 3 were not probed; the other four tables come from reading `cachekey.ts`.
- **risk:** none (docs-only); not owner-gated.
