# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: blocked: depends on T-065 (ready) — T-064

## Claims

- T-067 zayd on task/T-067-a-named-save-names-its-carried-cache-ent

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
- T-069 — depends on T-072 (ready)
- T-072 — B-20261123-01 open

## Open blockers

- B-20261118-02 agent_finish.py --incomplete never converges on exit 75: each rerun commits an empty WIP (allow_empty, agent_finish.py:304), moving HEAD and restarting the head-keyed verify; 9 WIP commits 7f0506c..86b321a — need: diwan: make agent_finish.py --incomplete skip the WIP commit when the tree and handoff body are unchanged since the branch's last WIP commit, so a rerun after exit 75 keeps the head its detached verify is keyed to
- B-20261122-01 state.py edit refuses T-067's depends-on T-070: 'T-067 is claimed; only a ready, parked or dropped row is edited' (python3 diwan/scripts/state.py edit --seat brahim --depends-on 'T-062, T-063, T-070' T-067) — need: diwan: let state.py edit set depends-on on a claimed row, so T-067 waits on T-070 while zayd keeps the claim
- B-20261122-02 [incident] pnpm verify fails on any turn's handoff body: tests/docs-budget.test.ts:150 counts the untracked handoff/<seat>/*.md the finish requires (scripts/docs-state.mjs:386 entryBodies walks the disk), 'has no abstract and is not indexed in docs/PHASE_LOG.md' (agent_finish.py --seat brahim STEWARD-propose-M-bunyan-04, 1 failed of 1087) — need: builder: make entryBodies count only git-tracked handoff bodies, so a finish's untracked body passes docs-budget
- B-20261122-07 state.py clear refuses zayd on B-20261122-02 though zayd performed its 'builder:' need (T-071, PR #133 merged): 'B-20261122-02 was opened by brahim; only it, a seat its need: names or the steward clears it' (state.py clear --seat zayd B-20261122-02) — need: diwan: make state.py clear admit a seat whose role the need: names (builder, reviewer), so T-071's builder clears B-20261122-02 and the steward proposes M-bunyan-04 per P-20261118-02
- B-20261123-01 stop rule: T-072, refused twice by agent_start.py: zayd cannot claim T-072: awaits the reviewer's approve (R93). — need: steward: make T-072 pass agent_start.py or drop it
- B-20261123-03 box's rootless podman cannot apply T-072 done-when 2's --memory=2g --cpus=2: no cgroup cpu delegation to user brahim (podman info: cgroupfs v2, controllers [memory pids]; 'podman run --rm --memory=2g docker.io/library/busybox:latest true' exits 126, per B-20261123-02) — need: permission: delegate the cpu and memory cgroup controllers to user brahim on box (systemd user@.service Delegate=cpu memory pids, with a systemd user session as podman's cgroup manager), so 'podman run --rm --memory=2g --cpus=2 docker.io/library/busybox:latest true' exits 0 and hmdnah can approve T-072
