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

- B-20261025-01 PR #118's `PR shape · reserved classes` check refuses every dependabot PR, so it cannot merge — need: give dependabot PRs a routable shape (a `dependabot/*` route in `scripts/pr-ready.mjs` and diwan `agent_start.py`, or a retitle convention) in a brahim turn, then route PR #118 to hmdnah
- B-20261025-02 PR #116's step 2 measured T-064's 200 ms named-save bar unmet at 16k, so it is not merged — need: sequence the row that takes the 16k entries clone off the named save's main thread (B-20261024-02's `need:`) in a brahim turn, then route PR #116 to hmdnah for step 2 once `named-save.mjs` exits 0 at 16k
- B-20261026-01 PR #120's step 2 found T-065's done-when 1 and done-when 4 unmet, so it is not merged — need: perform B-20261025-03's and B-20261025-04's `need:` in a brahim turn, then route PR #120 to hmdnah for step 2 once both done-when items hold
- B-20261026-02 start cannot hand zayd T-067: it resumes the blocker-held T-064, and `--continue T-067` needs an open PR — need: make diwan `agent_start.py` resume a seat's incomplete claim that no blocker holds (T-067) before one a blocker holds (T-064), then run T-067 in a zayd turn
- B-20261027-01 start refuses zayd's tickets T-067 and T-068 because the ticket records themselves hold those tasks — need: make diwan `agent_start.py` admit a builder past a `scope: item` record whose `need:` names that seat and the task when it resumes or claims a task with no PR, then run T-067 in a zayd turn
- B-20261027-02 PR #120's flow-routed conflict merge cannot run: start refuses `--continue T-065` for the reviewer seat hmdnah — need: make diwan `agent_start.py --continue` admit a reviewer seat that holds the task's claim to a flow-routed conflict merge, then re-run hmdnah's `--continue T-065`
- B-20261027-03 PR #116's flow-routed conflict merge cannot run: start refuses zayd's `--continue T-064` on B-20261025-02 — need: make diwan `agent_start.py --continue` admit the task's builder to a flow-routed conflict merge on a PR a review blocker holds, then re-run zayd's `--continue T-064`
- B-20261028-01 start's review mode claims PR #120 ahead of PR #118, so hmdnah cannot reach the retitled dependabot PR — need: make diwan `agent_start.py --review` admit a PR past a hold only for the act its ticket's `need:` names, then run hmdnah's review of PR #118
- B-20261102-02 the coordinator answered `release` for zayd's T-067 claim, and no entrypoint releases a claim — need: give diwan a claim-release act that frees a `task/*` claim while keeping its commits, then release zayd's T-067 claim under D-20261102-01
- B-20261105-01 start resumed zayd's T-067 on the box with no browser, so its browser done-when cannot run — need: install a Playwright Chromium that diwan `browser_cmd()` finds for the box loop's user, then run T-067 in a builder turn
- B-20261106-01 T-069's relink cannot run: the unattended session's permissions refuse `docker` and the OCCT libs — need: allow `docker` and read access to `/home/brahim/occt-wasm-spike/install` in the box loop's Claude Code permission settings, then run T-069 in a zayd turn
