# Entry 88 — the habit three sessions kept performing by hand is a gate, and the hard part was the SKIP

**Zayd · dev box (headless) · 2026-08-08 · `RISK: additive`**

`pnpm verify`: **774 green · 88 files · six gates · real exit code 0**, real OCCT throughout.

TASK was in three parts and all three landed: **review and merge PR #14** (Entry 87's own, on the owner's
authorisation), **review PR #13 without merging it** (Amer's, on the owner's routing), and then **build
the gate three consecutive sessions have needed and none has written.**

---

## 0 · Step 3 — PR #14 reviewed and MERGED

The full review is the PR comment. Three things are worth carrying forward.

### 0a · Item 1, executed both ways

The entry nominated two revert-verifications and I ran both rather than reading them. Deleting the
`wouldCloseBelongsToCycle` call in `core.retargetReference`:

```
× ⚠⚠ `core.retargetReference` REFUSES an element as its own host
× a TWO-NODE hosting cycle is refused — wall hosted on the opening hosted in it
× ⚠⚠ the MIXED cycle — `hostId` one way, `parentElementId` the other — is refused too
  → promise resolved "{ …(7) }" instead of rejecting
Tests  3 failed | 11 passed (14)
```

and, separately, the `core.setElementMetadata` call: **1 failed | 13 passed**. Exactly as claimed.

### 0b · ⚠⚠ THE HALF THAT MATTERED — "IS §3 THE WHOLE POPULATION?" IS A MEASUREMENT

Entry 87 shipped a **refusal**, and nine of its fourteen tests assert that something is refused — so
`return true` from the guard passes every one of them. Its §3 is the mirror, and it is **five hand-picked
graphs**. *"The guard does not over-refuse"* is a claim about a **population**, and five examples cannot
discharge one.

So I did not argue about it. Shipped as §5 of `tests/belongs-to-cycle-guard.test.ts`:

```
20 000 acyclic graphs · 100 000 queries · 43 667 refused / 56 333 allowed · ZERO disagreements
```

against **two oracles that share no line of code with the guard**: an independently written reachability
cycle-check, and — the one that actually matters — **`isElementActive` evaluated on the edit APPLIED**,
which is the product-level erasure the guard exists to prevent. Deterministic LCG, so any disagreement is
reproducible from the seed alone.

⚠ **My first attempt was skewed 99.8% refusals** (a dense 8-node graph), which tests over-refusal hard and
under-refusal barely at all. The shipped version is sparse and deep, and **asserts that both verdicts
exceed 20 000** — without that, "zero disagreements" would be a statement about one half of the guard, and
the test would pass while its own title was false (checklist item 6, turned on itself).

**Verdict: no legitimate authoring act is refused.** I added the case §3 lacked — retargeting onto your own
**sibling** under a shared ancestor, same-edge and mixed.

### 0c · The cost question, answered

The guard walks the closure on every `retargetReference`, so:

| Shape | per call |
| --- | --- |
| **10 000 elements all hosted on one slab (the realistic shape)** | **0.17 µs** |
| chain 100 deep | 0.031 ms |
| chain 1 000 deep | 0.100 ms |
| chain 10 000 deep (no building has this) | 1.65 ms |

The walk is **upward**, so it is bounded by belongs-to **depth**, not by model size. Nothing to fix.

### 0d · Backward sweep — four write sites, not two

`hostId`/`parentElementId` are written by `createElement`, `copy`, `retargetReference` and
`setElementMetadata`. The two unguarded ones are **structurally immune for a reason worth writing down
rather than assuming**: both mint a fresh ULID (`ctx.mintId` → `mintPei`), and an id that does not yet
exist cannot be anybody's ancestor, so the upward walk cannot reach it. The two guarded sites are the
whole set — but the entry's "two writers" is a claim about the population, and the population is four.

### 0e · One finding, correct-by-design, now pinned

**The guard proves *"this edit closes no NEW cycle through `elementId`"*. It does not prove *"`elementId`
is active afterwards."*** Attaching to a subtree that already contains a cycle is allowed, and the element
is inactive at once. **That is right**: the cycle is not this edit's doing, refusing would block the
repair, and a **broken** ancestor already erases identically. But it is the sentence the guard actually
proves, and Entry 87's own lesson says to write that sentence down and read it back — so §5 pins it.

### 0f · Maintenance carried

§7 overflowed on my amendment (**33 433 / 32 768**) — **entry 81 rotated** to `docs/history.md` §C, header
now **54–81**. Entry 87's `759 green` corrected to **762**.

---

## 1 · Step 3, second PR — #13 reviewed, NOT merged, and its merge advice REPLACED

The owner's routing was unchanged: *"only review; merging is next Amer's."* Amer's branch is byte-identical
to what Entry 87 reviewed — one commit, nothing since. **So I did not re-review the code.** What moved is
`main`, twice, and exactly one part of that review depends on the merge base.

**Entry 87 told Amer his merge would overflow §7's byte budget and to rotate entry 80. That is now wrong,
and acting on it would throw away an abstract for nothing.** I trial-merged `main` into his branch in a
throwaway worktree and ran the gate:

| | §7 as the gate measures it | verdict |
| --- | --- | --- |
| `main` today | 27 555 | ✅ |
| Amer's branch | 32 017 | ✅ |
| **their merge** | **31 411** | ✅ **under by 1 357** |

`tests/docs-budget.test.ts` → **19 passed**. The union is *smaller* than either side because main has
already retired 79/80/81 into history.

⚠⚠ **AND THEN MY OWN ENTRY INVALIDATED THAT, WHICH IS THE LESSON RATHER THAN AN ERRATUM.** Entry 88's
abstract is 3 864 bytes, and Entry 88 is `additive`, so it merges first. Re-measured on the built union:

| `main` when Amer merges | §7 after | verdict |
| --- | --- | --- |
| today, Entry 88 still in its PR | 31 411 | ✅ |
| **after Entry 88 merges** | **35 248** | ❌ **over by 2 480** |
| after Entry 88 merges, **entry 82 rotated** | 30 515 | ✅ |

So the advice is *"rotate entry 82"*, not *"no rotation"* — posted as a third comment. **I was on both
sides of this gate inside one session**: I told Amer his overflow was obsolete because I had absorbed it,
and then re-created it by writing my own abstract. The standing note is exact and I still walked into it:
**the byte budget is per-branch, the overflow is a property of the MERGE, and whichever PR lands second
pays.** ⇒ A parallel-session claim about the byte budget is only true relative to a named `main`, and
must say which one.

⚠ **But a different gate WILL fail, and Entry 87 could not have seen it**: entry 86 is no longer the newest
abstract, so its `AWAITING REVIEW` line is now stale and `docs:check` refuses it —
`AssertionError: Entry 86 still says AWAITING REVIEW, but entry 87 exists.` It went stale the moment 87
landed. Rewriting it is part of Amer's merge.

⚠ **I posted two of those three numbers before I had measured them** and corrected it in a follow-up
comment on the PR. Recording it here rather than quietly: *"a claim with no method is not done"* applies to
review comments too, and a table is exactly the shape that makes an inferred number look measured.

---

## 2 · The gate

### 2a · The three questions TASK asked, and what measuring did to them

**Q1 — what exactly must match, the whole file or only FRESH?** TASK anticipated that a whole-file check is
wrong because a branch legitimately edits `TASK`/`NEW`. It is wrong, and **restricting to FRESH does not
rescue it**: `pnpm state` rewrites FRESH at step 8, which is also before 10(a). ⇒ **There is no region of
the file that is always equal. The invariant is about a MOMENT, not a region** — byte-identity is required
from step 10(a) onward and is *false by design* before it.

**Q2 — can `docs:check` even see `origin/main`?** Answered by **not needing it**. In CI the gate reads the
base **SHA** the workflow already hands the re-seed gate (`github.event.pull_request.base.sha`), so no ref
has to exist and nothing is fetched. `git show origin/main:Zayd_Prompt.md` costs **1.85 ms** (100 calls in
185 ms, a local object read, works offline) and is used **locally only**. ⚠ I could have guessed that
`actions/checkout` with `fetch-depth: 0` leaves `origin/main` present — **this box cannot measure that**,
and Entry 73's whole lesson is what a gate resting on an unmeasured property of the CI checkout does. A
SHA needs no ref.

**Q3 — it must not fire on `main`, nor on Amer's branch.** Both fall out of question 1 below, and both are
pinned against real commits.

### 2b · The design — and the SKIPS are the load-bearing part

Three questions, in order:

| | How | A skip means |
| --- | --- | --- |
| 1. Does this branch **author** the file? | `git diff <merge-base> <head> -- <file>` | not this seat's file — Amer's branch, or `main` itself |
| 2. Is main **contained** in the branch? | `git merge-base --is-ancestor <main> <head>` | a fast-forward — **no conflict is possible** |
| 3. Then: do they **match**? | `git diff <main> <head> -- <file>` | — a non-empty diff here is the defect |

Measured against this repository's own commits, and **a naive `git diff main HEAD` is wrong about three of
the four**:

```
in-sync Zayd PR   (4fd302f vs ec107cb)  contains=false  → PASS
pre-10(a)         (958658d vs 714447d)  contains=true   → SKIP  (question 2 saves it)
Amer's branch     (4fd302f vs 8dcc932)  contains=false  → SKIP  (question 1 saves it)
on main itself    (eb74f43 vs eb74f43)  contains=true   → SKIP  (question 1 gets there first)
```

Question 2's signal deserves a note, because **10(a) commits the file *on main*, so that commit is never
an ancestor of the branch** — `git merge-base --is-ancestor 4fd302f ec107cb` → **NO**, measured. That is
what makes the state decidable from git topology alone, with no parsing of the file's contents.

### ⚠⚠ 2b(i) · Question 2 was WRONG TWICE, and both wrong versions passed all four pinned states

This is the part worth carrying. Question 2 began as *"has a commit touched this file on main that is not
in the branch?"* — `git rev-list <main> ^<head> -- <file>`, the 10(a) push's exact signature. It reads
well, it passed §1, and **a rebase defeats it**: rebasing onto a main that already carries 10(a) makes that
commit an ancestor, the `rev-list` empties, and the gate skips *while telling the next session "step 10(a)
has not pushed yet"* — which by then is false.

I only found it because TASK-writing made me name the experiment, and then I ran it instead of leaving it:

```
A. drifted, not rebased  → {"ok":false, drift:"-Tree: def / +Tree: ghi"}    the gate bites
B. SAME drift, rebased   → {"ok":true,  skipped:"…"}                        the gate skips
   does the rebased branch merge?  →  MERGES CLEANLY (no conflict to prevent)
```

**The skip turned out to be correct and the REASON wrong** — which is its own kind of defect, because the
next session reads the reason. I then tried to separate the two states by who wrote the file last (wrong —
the branch did, in both) and by containment (wrong — main is contained in both) before measuring that
**they are the same situation**: `main ⊆ branch` ⇒ fast-forward ⇒ main simply takes the branch's copy.
⇒ One condition, one true reason, and the implementation got *smaller*: `merge-base --is-ancestor`
replaced the `rev-list` outright.

### 2c · ⚠⚠ The bug I nearly shipped, caught by this repo's own history

My first `mainRef` returned `undefined` — a **skip** — when `BASE_REF` was set but did not resolve. I
noticed while probing it with a bogus value:

```
BASE_REF=deadbeefdeadbeef  →  {"ok":true,"skipped":"no BASE_REF and no origin/main"}
```

**That is the Entry-73 disease, exactly.** An unresolvable ref is the signature of a *shallow checkout* —
the precise condition under which the re-seed gate reported green for 73 entries without executing once.
A gate that turns itself off when its input is broken is worse than no gate, because it reports success.
It now **throws** and names the shallow clone. Revert-verified.

### ⚠⚠ 2c(i) · The second one, and it SURVIVED A GREEN CI RUN

The gate went green on its own first CI run. **It had not run.** `actions/checkout` on a `pull_request`
checks out `refs/pull/N/merge`:

```
git checkout --progress --force refs/remotes/pull/15/merge
HEAD is now at 7fd391f Merge 4a9cd10… into b96c3a3…
```

That merge commit **contains main by construction**, so question 2 (`main ⊆ branch`) is true for every PR
and the gate skipped — green, silent, useless, in the one place it was built for. **Entry 73's disease
from a third direction**, and the check mark said SUCCESS. I only found it by reading the log for the
words `prompt-sync` rather than trusting the tick.

⇒ CI now passes `pull_request.head.sha` (**not** `github.sha`, which *is* the merge commit), the gate has
a `headRef`, and a test builds the merge commit and asserts that the wrong input skips while the right one
looks. ⚠ The re-seed gate's `HEAD_REF: github.sha` is **correct and unchanged** — it diffs `base...head`
with three dots, for which the merge commit gives the right answer.

⚠ **And measuring that forced an honest correction to what the gate is FOR.** There are two kinds of
drift, caught in different places:

| Drift | Merges? | Who catches it |
| --- | --- | --- |
| the same line 10(a) pushed (`pnpm state` rerun) | **conflicts** — GitHub cannot build the merge ref, PR already unmergeable | **the LOCAL run**, which names the fix at step 7 instead of `GraphQL: Pull Request has merge conflicts` at merge time |
| an append / an edit elsewhere after 10(a) | **cleanly** — invisible everywhere | **CI**, and only with the `HEAD_REF` fix |

I had assumed the CI half was the whole point. It is half the point, and not the half I expected.

### ⚠⚠ 2c(ii) · The third one — and the gate found it by failing on its own session

Question 3 diffed `main..HEAD`: two **commits**. But the drift is *created* by `pnpm state` at step 8 and
sits **uncommitted** while gate six runs right after it. So on this very session:

```
$ git diff --stat origin/main -- Zayd_Prompt.md
 Zayd_Prompt.md | 2 +-          ← a real, live drift
$ pnpm docs:check
      Tests  42 passed (42)     ← the gate built for exactly this said nothing
```

Omitting the second ref makes `git diff` compare against the **working tree**, which is the state the
session can still fix for free. With that, re-run:

```
× §3 — the live gate > every gated prompt file matches main
  → Zayd_Prompt.md has drifted from origin/main.
    FIX:  git checkout origin/main -- Zayd_Prompt.md && pnpm docs:check && git commit
```

**It caught the real bug, on itself, in the wild, and printed the fix — which I then ran.** That is the
end-to-end verification I could not have constructed; the session handed it to me.

⚠ An **explicit** head (CI's `HEAD_REF`, or a test) still compares two commits, because a dirty tree must
not leak into that answer. Pinned both ways.

⇒ **Three defects in this one gate, and all three were the same shape: a SKIP that reported green.**
A gate is not code that checks a condition; it is code that must *refuse to stay silent*, and the failure
mode is never a wrong answer — it is no answer, wearing a tick.

### 2d · Revert-verification — four ways, separately

| Reverted | RED |
| --- | --- |
| skip 1 (does this branch author it?) | **2** — Amer's branch, and `main` itself |
| skip 2 (is main contained in the branch?) | **2** — the pre-10(a) session, and the rebase |
| the comparison itself (`return ok` always) | **1** — §2's constructed drift |
| the unresolvable-`BASE_REF` throw → skip | **1** — the Entry-73 test |

§2 constructs the failure in a throwaway git repo, because **no state in this repository's history can
supply it**: every occurrence so far was caught and fixed by hand before it was committed. The temp repo is
removed in `afterAll` — `/tmp` is a tmpfs here and costs RAM (§1c-2).

### 2e · What it does NOT cover, stated plainly

- **`Amer_Prompt.md` is deliberately not in `GATED`.** The mechanism is identical and Entry 87 warned Amer
  about it — but that file has one writer and it is not this seat, and **PR #13 is open right now with
  `Amer_Prompt.md` still travelling inside it**, so switching this on unilaterally would fail a reviewed
  PR over somebody else's protocol. It is one array entry, and it is Amer's call.
- **Locally the gate only bites once `origin/main` has the 10(a) commit fetched.** A session that never
  runs `git fetch` after 10(a) sees a skip. In CI the base sha makes this unconditional, and CI runs on
  every push to the PR — which is before any merge attempt, so the failure lands earlier than the merge
  conflict it replaces.
- **It says nothing about `Zayd_Prompt.md`'s CONTENT.** A prompt that is byte-identical to main and wrong
  is a gate-green prompt.

### 2f · The one incidental fix

`eslint.config.js`: typescript-eslint caps `allowDefaultProject` at **eight** files and then fails the lint
with an error about its own internals rather than about your code. `scripts/*.mjs` (7) plus the two config
files is nine, and `prompt-sync.mjs` was the ninth. Raised to 20 rather than worked around — the
alternative is excluding a *gate script* from type-aware linting. Lint cost after: **29.3 s**.

---

## 3 · What is owed

- **The PR is `RISK: additive`** ⇒ under standing policy the **reviewing session merges it**, and that is
  the next session, not this one. Its `REVIEW:` line reads `⚠ AWAITING REVIEW — this is the open PR`.
- **Q17a still blocks. Q19 is still the worst defect on the board** — Entry 87 closed the *authoring* road
  into a belongs-to cycle; the **deletion** road is untouched, and is now pinned on purpose by
  `tests/belongs-to-cycle-guard.test.ts`. That pin failing is success.
- **Amer**: the §7 rotation warning on PR #13 is withdrawn (see §1); entry 86's `AWAITING REVIEW` line is
  what will actually fail; `Amer_Prompt.md` in `GATED` is yours to add. Q18 and Q20 are yours.
- **Owner**: nothing new. Q11/Q12 (`CLA.md` ships `<LEGAL ENTITY>`) unchanged.
