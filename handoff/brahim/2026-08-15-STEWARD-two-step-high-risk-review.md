# STEWARD — `risk: high` becomes a two-step review (D88)

**Seat:** `brahim` (steward, box). **Date:** 2026-08-15. **Ruling:** owner, in chat.

## 1. What was decided

`risk: high` had no protocol of its own. `scripts/agent-finish.mjs` wrote `NEXT TURN: REVIEW ONLY` for it,
`docs/prompts/brahim-orchestrator.md` treated it as owner-gated, and `AGENTS.md §5` — the file that
actually defines owner-gated — never listed it. Three files, three different answers.

The owner ruled it is **not** owner-gated and takes **two review turns** instead of one, split by kind:

| Turn | `REVIEW.md` items | Ends with |
| --- | --- | --- |
| Step 1 | 1, 4, 5, 7 — revert-verification, claims vs code, numbers, risk verdict | A posted report; no approval, row stays `review` |
| Step 2 | 2, 3, 6 — backward sweep, new-kind-of-thing, weak green | Approve and merge on green CI |

Step 2 reads step 1's report rather than re-running it, and re-confirms only item 7's `needs-operator/*`
check, because that is the gate it is about to cross.

## 2. The constraint that decided who runs the steps

Both steps are the same seat. A cross-account second reviewer does not exist for a box builder PR: `zayd`
opens on `davidian-abdo`, and `khalihlna` — the other reviewer seat — holds that same account, so GitHub
refuses its approval. Independence therefore comes from the session boundary, not a second account, and
step 2 must start with no memory of step 1. The orchestrator runs the two steps in separate cycles for
that reason.

The owner was offered rearranging the seat accounts to buy a genuine second approver and declined.

## 3. A proven defect goes back to the builder

Either step may prove a defect. It goes back to the builder on the same branch and the existing `§0b`
claim, no new claim is made, the row stays `review`, and step 2 reviews what the fix left behind. This
keeps one PR mapped to one row, which a new `T-nnn` for a review fix would break.

## 4. What changed

- `docs/decisions.md` — **D88**.
- `AGENTS.md` §1.2 (the rule) and §5 (`risk: high` named as explicitly not owner-gated). The file was at
  its 200-line cap, so the §1.3 loop paragraph and the §2 abstract-heading note became pointers to
  `docs/prompts/*` and D82 respectively — both already said it in full elsewhere.
- `REVIEW.md` — a `Two steps` section carrying the split, and a warning on item 7 that only step 2 merges.
- `docs/prompts/brahim-orchestrator.md` — step 4c separates `contract-touching` (still stops the loop for
  the owner) from `risk: high` (does not), and the `Never` list follows.
- `docs/BACKLOG.md` — READY criterion 8 states what each flag buys, and **T-014** is filed.

## 5. What is left

`scripts/agent-finish.mjs --review` still reads the frozen-surface verdict and never the task's `risk:`
field, so it stamps a `risk: high` row `done` after step 1 and prints the approve-and-merge pair.
Measured on T-008; the reviewer corrected the row by hand. That is **T-014**, and until it ships the
step-1 reviewer checks the row by hand. `--review` also clears the `NEXT TURN: REVIEW ONLY` banner
unconditionally, which T-014's second `done-when:` item covers — the banner is what routes step 2.

The `## Discovered` entry that recorded this defect is on the T-008 branch, not `main`, so it is not
closed here. The T-008 fix turn closes it against D88 and T-014.
