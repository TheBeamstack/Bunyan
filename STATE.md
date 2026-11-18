# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: builder (pc) — T-023

## Claims

- T-067 zayd on task/T-067-a-named-save-names-its-carried-cache-ent
- T-069 zayd on task/T-069-section-points-cross-the-wasm-boundary-a

## Review

none

## Awaiting approval (R93)

none

## BLOCKED

- T-031 — depends on T-029 (parked)
- T-064 — depends on T-065 (ready)
- T-065 — depends on T-067 (claimed)
- T-066 — depends on T-065 (ready); depends on T-067 (claimed)

## Open blockers

- B-20261028-01 start's review mode claims PR #120 ahead of PR #118, so hmdnah cannot reach the retitled dependabot PR — need: make diwan `agent_start.py --review` admit a PR past a hold only for the act its ticket's `need:` names, then run hmdnah's review of PR #118
- B-20261102-02 the coordinator answered `release` for zayd's T-067 claim, and no entrypoint releases a claim — need: give diwan a claim-release act that frees a `task/*` claim while keeping its commits, then release zayd's T-067 claim under D-20261102-01
- B-20261105-01 start resumed zayd's T-067 on the box with no browser, so its browser done-when cannot run — need: install a Playwright Chromium that diwan `browser_cmd()` finds for the box loop's user, then run T-067 in a builder turn
- B-20261106-01 T-069's relink cannot run: the unattended session's permissions refuse `docker` and the OCCT libs — need: allow `docker` and read access to `/home/brahim/occt-wasm-spike/install` in the box loop's Claude Code permission settings, then run T-069 in a zayd turn
