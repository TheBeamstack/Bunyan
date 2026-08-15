# `REVIEW.md` — the per-PR review checklist

**When you use this.** You are `hmdnah` or `khalihlna`, you have run
`node scripts/agent-start.mjs --seat <you> --review`, and it has checked out a PR. **This checklist is
your whole turn.** You claim no task (`AGENTS.md §1.2`).

⚠⚠ **REWRITTEN 2026-08-15 (D82, Entry 91). READ THIS PARAGRAPH IF YOU REMEMBER THE OLD ONE.** Until
Entry 91 this file opened with _"Step 3 of the session loop: after `git pull`, before your own work.
Every PR gets reviewed — the other agent's, **and your own if you were the last to run**"_ — and then
spent a paragraph fencing off the self-review case that sentence created. **All of that is gone,
because the thing it managed is gone.** Review is no longer an act a builder performs before its own
work (`AGENTS.md §1.1`); it is a seat, on a machine, holding **the GitHub account the author does not
hold** (`docs/seats/README.md`). A `zayd` PR is reviewed by `hmdnah`; an `amer` PR by `khalihlna`.
There is no self-review left to permit, discourage, or carve exceptions into.

**What that changes about this checklist: almost nothing, and that is the point.** Every item below was
written against defects found in this codebase, not against the process that surrounded them. What
changed is who ticks them and with what authority — the seven items are unaltered.

**The Entry 74 failure this arrangement exists to prevent, kept because the reason must outlive the
fix.** Entry 74 opened its PR and merged it minutes later, unread by any second party, and is on `main`
that way. The old rule against it was a sentence in this file that the author had to remember while
holding the only account that could merge. It is now a **structural** refusal: GitHub will not let an
account approve its own PR, and the accounts are crossed precisely so that the reviewer's is never the
author's. ⚠ **A rule enforced by the platform is not a rule you may stop understanding** — if you ever
find yourself able to merge something you wrote, something upstream is misconfigured. Stop and say so.

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

⚠ **MANDATORY on every PR, including every PR of a batch.** A batched review turn
(`docs/prompts/brahim-orchestrator.md` §4c) never skips this item on one PR because the others already
proved the harness works — each PR is its own claim.

⚠ **The one NAMED exception, and it is now MUCH narrower than it used to be:** a **browser-only
measurement** (draw calls, frame time, a console-error-free boot) cannot be re-run on the headless box.
That exception belongs to **`hmdnah` only** — write `unverified here: <claim> — khalihlna to confirm`
into the PR and the entry's `REVIEW:` line, and do not tick the item.

⚠⚠ **`khalihlna` HAS NO SUCH EXCEPTION.** It runs on the pc, with a real browser, which is the entire
reason the seat exists. A rendering or interaction claim reasoned about instead of rendered is the
unexecuted spec this arrangement was built to catch — and a `machine: pc` PR routes to `khalihlna`
precisely so that nobody is ever asked to review a claim they cannot execute
(`node scripts/seats.mjs reviewer-for <T-nnn>` resolves it).

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
  **You approve and merge it, on your own account** — which is never the account that opened it
  (`docs/seats/README.md`). `scripts/agent-finish.mjs --review` prints the exact two commands.
- **`RISK: contract-touching`** — `tests/freeze-boundary.test.ts` has failed and named the exact field.
  **Approve, then tell the owner it needs their merge.** Do not merge it yourself, and note that the
  backlog row stays `review` until the owner actually merges — `brahim`'s sweep flips it, not you.

⚠ **CI has already decided this and put it on the PR.** The `needs-operator/*` labels
(`scripts/reserved-classes.mjs`) are written by the `pr-shape` job from the same `riskVerdict` that
`pnpm state` uses, so the label and `§8`'s `RISK:` row cannot disagree. **Three labels, three
owner-gated classes** (`AGENTS.md §5`): `contract-touching`, `legal-figure` (a `CLA.md` change),
`freeze` (a re-baselined snapshot). ⚠ **Any one of them present ⇒ you do not merge.** An unlabelled PR
is the ordinary additive case — but confirm the job actually ran, because "no label" and "the labeller
never executed" look identical from here.

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
