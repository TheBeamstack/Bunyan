# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: reviewer (box): PR #138 — T-074

## Claims

- T-072 zayd on task/T-072-the-prebuilt-occt-7-9-3-webassembly-stat

## Review

- T-074 PR #138 by zayd — reviewer (box): PR #138

## Awaiting approval (R93)

none

## Waits for the owner's session

- T-023 The kernel boots on the pc's system Chrome, confirmed there — 10 min

## BLOCKED

- T-064 — depends on T-065 (ready)
- T-065 — depends on T-067 (ready)
- T-066 — depends on T-065 (ready); depends on T-067 (ready)
- T-067 — B-20261118-02 open
- T-069 — depends on T-072 (claimed); B-20261124-01 open

## Open blockers

- B-20261118-02 agent_finish.py --incomplete never converges on exit 75: each rerun commits an empty WIP (allow_empty, agent_finish.py:304), moving HEAD and restarting the head-keyed verify; 9 WIP commits 7f0506c..86b321a — need: diwan: make agent_finish.py --incomplete skip the WIP commit when the tree and handoff body are unchanged since the branch's last WIP commit, so a rerun after exit 75 keeps the head its detached verify is keyed to
- B-20261124-01 T-069 still needs read access to the OCCT libs, which T-072 builds: [tools] read_dirs can name the dir only once it exists — need: steward: once T-072 is done and /home/brahim/occt-wasm-spike/install exists, add it to Bunyan's .agent.toml [tools] read_dirs (diwan #265; doctor.read_dirs refuses a missing directory), so zayd's session can read the prebuilt OCCT 7.9.3 libs; podman is already granted (doctor --needs true since 2026-11-23T17:03Z)
- B-20261125-01 T-072 done-when unmet: tools/kernel-build/verify.mjs calls measure(h) with one argument and fails 14 checks on the byte-identical artefact — need: steward: edit T-072 to allow the one-file fix in tools/kernel-build/verify.mjs (kernel.measure(h) to kernel.measure(h, -1, 0)), or cut that fix as its own row and drop the verify.mjs clause from T-072
