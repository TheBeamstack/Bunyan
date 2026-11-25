# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: reviewer (box): approve — T-072

## Claims

none

## Review

none

## Awaiting approval (R93)

- T-072 The prebuilt OCCT 7.9.3 WebAssembly static libs exist on box 2 at /home/brahim/occt-wasm-spike/install, built in rootless podman on the pinned emsdk digest
- T-075 A small house's plan view draws in desktop Chrome from the live model and redraws when the model changes

## Waits for the owner's session

- T-023 The kernel boots on the pc's system Chrome, confirmed there — 10 min

## BLOCKED

- T-064 — depends on T-065 (ready)
- T-065 — depends on T-067 (ready)
- T-066 — depends on T-065 (ready); depends on T-067 (ready)
- T-067 — B-20261118-02 open
- T-069 — depends on T-072 (ready); B-20261124-01 open

## Open blockers

- B-20261118-02 agent_finish.py --incomplete never converges on exit 75: each rerun commits an empty WIP (allow_empty, agent_finish.py:304), moving HEAD and restarting the head-keyed verify; 9 WIP commits 7f0506c..86b321a — need: diwan: make agent_finish.py --incomplete skip the WIP commit when the tree and handoff body are unchanged since the branch's last WIP commit, so a rerun after exit 75 keeps the head its detached verify is keyed to
- B-20261124-01 T-069 still needs read access to the OCCT libs, which T-072 builds: [tools] read_dirs can name the dir only once it exists — need: steward: once T-072 is done and /home/brahim/occt-wasm-spike/install exists, add it to Bunyan's .agent.toml [tools] read_dirs (diwan #265; doctor.read_dirs refuses a missing directory), so zayd's session can read the prebuilt OCCT 7.9.3 libs; podman is already granted (doctor --needs true since 2026-11-23T17:03Z)
- B-20261124-02 hmdnah does not approve T-072 (R93): done-when 1 needs host writes under /home/brahim/occt-wasm-spike (README ## Build: mkdir -p, curl, tar before any podman step), which a bunyan lane session cannot make — doctor.py --dirs bunyan grants only Bunyan, diwan and .state, a session ls of the dir is refused, the dir is absent (podman busybox ls exits 1), and podman -v on a missing host dir exits 125 'statfs ... no such file or directory'; podman itself passes: rootless, systemd cgroup v2 [cpu memory pids], --userns=keep-id --memory=2g --cpus=2 on the pinned emsdk digest runs emcc 6.0.2 (7a2d97d6) — need: steward: make /home/brahim/occt-wasm-spike writable from the bunyan lane's sessions without a podman mount of /home/brahim (pre-create it owned by brahim or grant it to the lane), then route T-072 back to hmdnah's approve
- B-20261124-03 steward cannot perform B-20261124-02's need: mkdir /home/brahim/occt-wasm-spike outside the lane's granted dirs needs a permission prompt an unattended session cannot answer — need: owner: create /home/brahim/occt-wasm-spike on box 2, owned by brahim, so the steward adds it to Bunyan's .agent.toml [tools] read_dirs and routes T-072 back to hmdnah's approve
