# STEWARD — D88's two missing mechanisms, ruled and filed

**Seat:** `brahim` (steward, box). **Date:** 2026-08-15. **Ruling:** owner, in chat. **Amends:** D88.

## 1. What the review of PR #24 found

D88 asserted two mechanisms that no script implements. `hmdnah` proved both while reviewing the PR that
introduced them.

**The banner cannot route step 2.** `agent-finish.mjs` writes `## NEXT TURN: REVIEW ONLY` into the task
branch's `current_state.md` and clears it there; `agent-start.mjs` reads it only after `git checkout
main`. `git log -S` over `origin/main -- current_state.md` returns nothing — the heading has never existed
on `main`. Confirmed independently here: the only two hits on `main` today are prose inside §7 abstracts,
one of them the review's own. Routing comes from the PR title via `reviewerFor`.

**A defect cannot go back to the builder.** `agent-start.mjs` refuses a named task whose row is not
`ready`, `seats.readyFor` enumerates `ready` rows only, and a claim reading `finished — PR open, awaiting
review` is refused as _"not an incomplete turn to continue"_.

## 2. What was ruled

| Mechanism | Ruling |
| --- | --- |
| Which step a reviewer is running | A **`review/step-1` PR label**, applied by `agent-finish.mjs --review --step 1`, read by `agent-start.mjs`. |
| A proven defect returning to its builder | **`agent-start.mjs --continue <T-nnn>`**, resuming a finished claim on a `review` row for the seat that owns it. |
| T-008, blocked on the second | **Waits for it.** Not fixed off-protocol, and not handed to the reviewer.

The label was chosen over a fifth status value and over parsing step 1's PR comment: it is readable from
either machine without a checkout, it survives a lost session, and CI already labels PRs for the
owner-gated classes, so nothing new is introduced.

## 3. What changed

- `docs/decisions.md` — **D88 amended** in place, marked as an amendment with its date and cause.
- `docs/BACKLOG.md` — **T-014**'s second `done-when:` rewritten from the banner to the label, plus a
  criterion for `agent-start.mjs` reading it; **T-015** filed for `--continue`; both `## Discovered`
  entries closed against the ruling.
- `REVIEW.md` — the `Two steps` section names both mechanisms, since that is where a reviewer looks.

`AGENTS.md` is unchanged: its §1.2 sentence already points at `REVIEW.md` for the detail, and the file is
at its 200-line cap.

## 4. Sequencing

T-015 unblocks T-008 and T-014 does not, so they are separate rows rather than one — T-015 can land
without waiting on the `--step` work. Both are `risk: high` infra, so each takes its own two-step review.

⚠ **T-008's own step 2 will be routed by hand**, because its step 1 ran before the label existed.

## 5. Left open

`tests/docs-budget.test.ts`'s _"abstracts must be newest-first"_ sorts the same positional numbers it was
handed, so it passes while the order is wrong — which is how a misplaced abstract shipped in PR #24. The
reviewer recorded it rather than writing the gate, since it is a layer that seat does not own. Not yet
filed as a row: it wants a decision about what the gate should read, not just a fix.
