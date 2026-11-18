# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: blocked: depends on T-029 (parked) — T-031

## Claims

- T-067 zayd on task/T-067-a-named-save-names-its-carried-cache-ent
- T-069 zayd on task/T-069-section-points-cross-the-wasm-boundary-a

## Review

none

## Awaiting approval (R93)

none

## Waits for the owner's session

- T-023 The kernel boots on the pc's system Chrome, confirmed there — 10 min

## BLOCKED

- T-031 — depends on T-029 (parked)
- T-064 — depends on T-065 (ready)
- T-065 — depends on T-067 (claimed)
- T-066 — depends on T-065 (ready); depends on T-067 (claimed)

## Open blockers

- B-20261102-02 the coordinator answered `release` for zayd's T-067 claim, and no entrypoint releases a claim — need: give diwan a claim-release act that frees a `task/*` claim while keeping its commits, then release zayd's T-067 claim under D-20261102-01
- B-20261106-01 T-069's relink cannot run: the unattended session's permissions refuse `docker` and the OCCT libs — need: allow `docker` and read access to `/home/brahim/occt-wasm-spike/install` in the box loop's Claude Code permission settings, then run T-069 in a zayd turn
