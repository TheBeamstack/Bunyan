# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: reviewer (box): PR #145 — T-076

## Claims

none

## Review

- T-076 PR #145 by zayd — reviewer (box): PR #145

## Awaiting approval (R93)

none

## Waits for the owner's session

- T-023 The kernel boots on the pc's system Chrome, confirmed there — 10 min

## BLOCKED

- T-064 — depends on T-065 (ready)
- T-065 — B-20261126-01 open; B-20261126-02 open
- T-066 — depends on T-065 (ready)

## Open blockers

- B-20261126-01 T-065 is unclaimable: its row is ready yet still names holder zayd — need: steward: clear T-065's stale holder so the row is claimable again (release refuses it, the row is not claimed)
- B-20261126-02 T-065 stays unclaimable: no steward op frees a ready row's holder (release needs claimed, state.py:775; edit keeps holder, state.py:973) — need: diwan: let state.py release free a ready row that still names a holder, so T-065 can be claimed
