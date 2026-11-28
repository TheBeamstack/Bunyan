# STATE — Bunyan, rendered from `state.json` by scripts/state.py; never edited by hand

next: blocked: steward: sequence a design row that takes the first save's keying of 4000 roots (268-409 ms), record parse (327-483 ms) and .brep inflate (556-571 ms) off the main thread, per design §5's T-066 paragraph, before T-066's 200 ms bar is re-run; builder: zayd re-run node tools/browser-check/named-save.mjs on PR #149 for T-066 once T-079's filed build row merges, and send it back to review only on exit 0 — T-066

## Claims

- T-079 zayd on task/T-079-a-design-names-how-the-first-named-save

## Review

none

## Awaiting approval (R93)

none

## Waits for the owner's session

- T-023 The kernel boots on the pc's system Chrome, confirmed there — 10 min

## BLOCKED

- T-066 — depends on T-079 (claimed)

## Open blockers

- B-20261128-08 PR #149 review: T-066 done-when 3 re-measured unmet, first save after an open holds the main thread 2106 ms at 16k — need: builder: zayd re-run node tools/browser-check/named-save.mjs on PR #149 for T-066 once T-079's filed build row merges, and send it back to review only on exit 0
- B-20261128-09 PR #150 review: T-079 done-when 3 unmet, R9's re-run command exits 2 and R8 depends on T-066, which waits on R9 — need: builder: zayd give R9's done-when and verify the --playwright and --browser arguments, and order R8 and R9 so neither waits on T-066 while T-066's 200 ms bar waits on them
