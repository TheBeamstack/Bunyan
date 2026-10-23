# STEWARD-invariants-browser-claim review — PR #94 — 2026-10-20 — seat: hmdnah

- **implements:** one-turn review (`../diwan/docs/REVIEW-PROMPT.md`) of PR #94 at head `f459295`, a docs-only
  spec fix: `docs/INVARIANTS.md §1.9` follows diwan R79; the `## Discovered` clause that flagged it is trimmed.
- **changed:** this record; `docs/PHASE_LOG.md`.
- **verdict:** approved, no fix needed.
- **verified:**
  - item 1 (the PR's claims): `git checkout origin/main -- docs/INVARIANTS.md docs/BACKLOG.md`, then
    `bash /tmp/hmdnah-pr94-check.sh` → exit 1: old §1.9 bars box seats (`Only amer/khalihlna may`), no R79/§4
    routing, `## Discovered` flag present. `git checkout HEAD -- …` → exit 0, all green; `playwright-core` finding kept.
  - R79: `diwan/docs/RULINGS.md:984` routes `requires: browser` by the probe on the machine running the turn. This
    box probes it green (`agent_start.py` → `browser: …/chromium-1243/…/chrome`), so the old §1.9 contradicted it.
  - `diwan/AGENTS.md:151` (§4) is the `unverified here: <claim> — <seat> to confirm` rule §1.9 now cites.
  - backward sweep: `grep -rn` for `khalihlna to`, `only one seat can ever`, `browser claim`, `§1.9` over the repo
    (no `node_modules`, `handoff/`) → only the new §1.9, the PR's log entry and history in `docs/phase-log-01.md`.
    The handoff's own grep covered only `tests scripts`.
  - gates: `python3 ../diwan/scripts/gates.py docs` → `✓ documentation integrity`. `gh pr view 94` → `MERGEABLE`.
  - item 7: `node scripts/reserved-classes.mjs --base origin/main` → `none — RISK: additive`; CI `PR shape ·
    reserved classes` passed; no labels.
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741`. The PR is authored by `Davidian-Abdo`.
- **notes (opinion, non-blocking):** `docs/CURRENT_STATE-reference.md:40` still scopes `khalihlna` to "anything only
  a browser can verify"; it is an actor description, not a rule, but now reads narrower than R79.
- **not verified:** nothing this machine could not run.
- **risk:** none (docs-only); not owner-gated.
