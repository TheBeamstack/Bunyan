# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: builder (box) — T-070

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

- T-064 — depends on T-065 (ready)
- T-065 — depends on T-067 (claimed)
- T-066 — depends on T-065 (ready); depends on T-067 (claimed)

## Open blockers

- B-20261106-01 T-069's relink cannot run: the unattended session's permissions refuse `docker` and the OCCT libs — need: allow `docker` and read access to `/home/brahim/occt-wasm-spike/install` in the box loop's Claude Code permission settings, then run T-069 in a zayd turn
- B-20261118-01 T-067's done-when 5 fails: named-save.mjs exits 0 in 2 of 4 read runs at c5c2f35, held 89.5-300 ms at 16k — need: steward: sequence the next main-thread cut of the named save (the row's candidate, scene.json assembled in the zip worker; assemble measured 48.7-122.8 ms) as its own row or amend T-067, per design §5's T-067 paragraph
- B-20261118-02 agent_finish.py --incomplete never converges on exit 75: each rerun commits an empty WIP (allow_empty, agent_finish.py:304), moving HEAD and restarting the head-keyed verify; 9 WIP commits 7f0506c..86b321a — need: diwan: make agent_finish.py --incomplete skip the WIP commit when the tree and handoff body are unchanged since the branch's last WIP commit, so a rerun after exit 75 keeps the head its detached verify is keyed to
- B-20261122-01 state.py edit refuses T-067's depends-on T-070: 'T-067 is claimed; only a ready, parked or dropped row is edited' (python3 diwan/scripts/state.py edit --seat brahim --depends-on 'T-062, T-063, T-070' T-067) — need: diwan: let state.py edit set depends-on on a claimed row, so T-067 waits on T-070 while zayd keeps the claim
