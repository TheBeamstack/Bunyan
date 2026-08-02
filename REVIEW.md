# `REVIEW.md` — the per-PR review checklist

**When you use this.** Step 3 of the session loop: after `git pull`, before your own work. **Every PR gets
reviewed — the other agent's, and your own if you were the last to run.** A fresh session has genuinely
lost the author's working state, which is what makes a self-review worth doing at all.

⚠⚠ **AND THAT SENTENCE IS THE WHOLE RULE, SO READ IT AS A CONSTRAINT AND NOT AS A COURTESY: "your own"
MEANS AN ENTRY FROM A PREVIOUS SESSION. You never review — or merge — a PR you opened in the session
you are still in.** There is no lost working state to recover, so there is no review; there is only an
author agreeing with themselves. **Entry 74 opened its PR and merged it minutes later**, and is on
`main` unread by any second party as a result. If you are about to merge something you wrote today,
that is the bug. Push it, write `⚠ AWAITING REVIEW — this is the open PR` in its `REVIEW:` line, and
stop — the next session merges it. `docs:check` now fails the build if that marker is left stale.

**What this is not.** This is the **per-PR** checklist — roughly the cost of a coffee. For a **phase-level
adversarial review** (the seven hunts, hours of work, the instrument that produced `review_P4.md`'s
"there is no interaction model" and `review_P5.md`'s O(N²) finding), use
**`docs/reviews/review_prompt.md`** instead. Different instruments, different jobs.

**Why a checklist rather than a read.** This codebase's defects are not syntax or logic errors. Its own
backward sweep found **nine of eighteen domain rules dirty**, and every one was a _reasoning_,
_precondition_, _completeness_ or _semantic_ defect — the kind an author cannot see because they have
already convinced themselves, and the kind a line-by-line read walks straight past. A checklist scales
with diff size; reading does not.

---

## The checklist

Tick each item, or state why it does not apply. Paste the result into the PR.

### 1. REVERT-VERIFICATION — the one that costs two minutes and is worth the most

Pick **ONE** of the author's revert-verification claims. **Actually revert the fix. Run the test. Confirm
it goes RED. Paste the failure output.**

> This project's single most important rule is _"a fix without a test that fails in its absence is an
> assertion."_ Until this checklist existed, **every `revert-verified N ways` was a claim no second party
> had ever executed.** This item is what makes the rule externally true instead of self-attested.

⚠ **MANDATORY on a self-review too.** No substitution, no exception.

⚠ **The one NAMED exception:** a **browser-only measurement** (draw calls, frame time, a
console-error-free boot) cannot be re-run on the headless dev box. Do **not** tick this item — write
`unverified here: <claim> — Amer to confirm` into the PR and into the entry's `REVIEW:` line. **If that
claim blocks your own task, tell the owner to run Amer now.** Everything with logic in it is
headless-verified by Amer's own verification split, so this exception is narrower than it looks.

### 2. BACKWARD SWEEP

Does this PR add a rule, an invariant, or a correctness guarantee? If so — **was every PRE-EXISTING site
enumerated and checked?**

> A new rule binds the next consumer and **nothing else**. This has cost real defects repeatedly: a rule
> landed 07-23 while its two broken consumers were written 07-18, and the defect surfaced 07-26 —
> **eight days of building on a corrupted B-Rep**. Base rate when someone finally looks: **9 dirty out of 18.**

### 3. NEW KIND OF THING

If this adds a new _kind_ of entity, collection, or relationship — **what quantifies over "every one of
them"?** Check the consumers, **the invalidator**, and the machinery that decides what is even rebuilt.

> D77 was **clean against every consumer and dirty against the invalidator**. The Entry-59 sweep form
> (_"does this aggregate or publish?"_) could not have found it, because the invalidator neither
> aggregates nor publishes.

### 4. CLAIMS vs CODE

Is every assertion in the diff's documentation, comments and entry actually **read against the code**?

> `§1c-7`, four occurrences — including a design doc that named a field nobody checked, and (worse) a
> **passing test** that encoded the wrong loop and was therefore trusted for seven days.

### 5. NUMBERS

Any figure quoted without a method? **A claim with no method is not done.** _"It's faster"_ starts an
argument; _"4757.7 ms → 27.2 ms at 1984 walls, per-wall flat at 14–17 µs"_ ends one.

### 6. WEAK GREEN

For each new test: **what would it take for that test to pass while its own title is FALSE?**

> This method found two P3 defects. The rule-4 test failed in the _schema_, before the kernel ran; the
> autosave test never opened a second session. Both were green, and both asserted something weaker than
> their own name.

### 7. RISK

Confirm `pnpm state`'s verdict matches the diff.

- **`RISK: additive`** — no frozen byte, no `SCENE_SCHEMA_VERSION` bump, no field on a frozen shape.
  **You merge it** (with an approving review and green CI).
- **`RISK: contract-touching`** — `tests/freeze-boundary.test.ts` has failed and named the exact field.
  **Approve, then tell the owner it needs their merge.** Do not merge it yourself.

---

## What to do with what you find

| Finding                                  | Action                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **You can prove it with a failing test** | **Fix it on the branch.** Write the test, watch it fail, fix it, note it in the review. Latency zero. |
| **You cannot prove it**                  | It is an opinion. Record it as a review comment. **Never block a PR on an opinion.**                  |
| **It needs an owner ruling**             | Add a row to `open_rulings.md` with a recommendation, and say so in the review.                       |
| **You could not verify it here**         | `unverified here: <claim>` in the PR and the entry's `REVIEW:` line. Escalate if it blocks you.       |

**The ownership rule.** Ownership governs who _designs_ a layer, not who may fix a demonstrated bug in it.
A reviewer may push a proven fix into any package. A reviewer may **not** redesign a layer it does not own
— that is a finding, not a fix.

## Refusals

- **Do not report style.** Formatting, naming taste and _"I would have done it differently"_ are noise
  that buries the finding that matters.
- **Do not re-litigate a settled ruling.** They are in `docs/decisions.md`. ⚠ **But DO report if a ruling
  has been implemented in a way that does not deliver what it was ruled _for_** — that is the review, not
  re-litigation.
- **Do not pad.** Ten findings, eight of them minor, hides the two that count.
- **Do not trust this checklist either.** If you can see a class of failure the seven items miss, hunt it
  anyway and say the checklist was incomplete.
