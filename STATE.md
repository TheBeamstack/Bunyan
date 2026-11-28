# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: builder (box) — T-078

## Claims

none

## Review

- T-076 PR #145 by zayd — reviewer (box): PR #145
- T-077 PR #146 by zayd — reviewer (box): PR #146

## Awaiting approval (R93)

none

## Waits for the owner's session

- T-023 The kernel boots on the pc's system Chrome, confirmed there — 10 min

## BLOCKED

- T-064 — depends on T-065 (ready)
- T-065 — B-20261126-02 open
- T-066 — depends on T-065 (ready)

## Open blockers

- B-20261126-02 T-065 stays unclaimable: no steward op frees a ready row's holder (release needs claimed, state.py:775; edit keeps holder, state.py:973) — need: diwan: let state.py release free a ready row that still names a holder, so T-065 can be claimed
- B-20261128-01 stop rule: lane bunyan, refused twice by agent_finish.py: [commands] verify failed (1): pnpm verify — need: steward: remove what makes agent_finish.py refuse in this lane
- B-20261128-02 [incident] every finish in the lane refuses: a T-048 test times out in a full pnpm verify on box — need: builder: make tests/bnn-aggregate-ratio-t048.test.ts pass three consecutive full pnpm verify runs on box without raising vitest's testTimeout
- B-20261128-03 stop rule: lane bunyan, refused twice by agent_start.py: D-20261126-02 answered and not yet stamped: the steward acts on it first, then `state.py stamp <id>`; nothing new is claimed until then (AGENTS — need: steward: remove what makes agent_start.py refuse in this lane
