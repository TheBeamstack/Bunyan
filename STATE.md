# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: reviewer (box): PR #146 — T-077

## Claims

none

## Review

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
- B-20261128-04 PR #146 carries false needs-operator labels from a stale base: the reserved-class scan diffs 5448c12...merge, which includes T-076's documentation.ts change — need: builder: zayd runs agent_finish.py --seat zayd T-077 --continue to merge origin/main into PR #146, so the next reserved-class scan starts at main's tip and removes needs-operator/contract-touching and needs-operator/freeze
