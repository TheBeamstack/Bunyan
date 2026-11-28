# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: reviewer (box): PR #149 — T-066

## Claims

none

## Review

- T-066 PR #149 by zayd — reviewer (box): PR #149

## Awaiting approval (R93)

none

## Waits for the owner's session

- T-023 The kernel boots on the pc's system Chrome, confirmed there — 10 min

## BLOCKED

- T-064 — B-20261128-05 open; B-20261128-07 open

## Open blockers

- B-20261128-05 T-064 is ready with holder zayd since migrate 874bc84, so claim refuses (is held by zayd); its work is on main via 381fe3d — need: steward: settle T-064's row, state.py delivered T-064 --commit 381fe3d or state.py release T-064, per design §5's T-064 paragraph and B-20261024-02
- B-20261128-06 T-066 done-when 3 unmet: the first named save after an open holds the main thread 1517-1605 ms at 16k, 3 of 3 runs FAIL — need: steward: sequence a design row that takes the first save's keying of 4000 roots (268-409 ms), record parse (327-483 ms) and .brep inflate (556-571 ms) off the main thread, per design §5's T-066 paragraph, before T-066's 200 ms bar is re-run
- B-20261128-07 stop rule: T-064, refused twice by agent_start.py: zayd cannot claim T-064: is held by zayd. — need: steward: make T-064 pass agent_start.py or drop it
