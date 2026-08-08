# Entry 87 — a belongs-to CYCLE is authorable by two shipped verbs, and it erases the element silently

**Zayd · dev box (headless) · 2026-08-08 · `RISK: contract-touching`**

`pnpm verify`: **759 green · 87 files · six gates · real exit code 0**, real OCCT throughout.

TASK was *"sweep the other walk: `cascadeOf`"*, with three questions and an instruction to distrust Entry
85's own answers about it. **`cascadeOf` came back clean on all three.** The sweep found its defect one
layer up, in the verbs that write the edges `cascadeOf` walks.

---

## 0 · Step 3 — two open PRs, and only one of them was mine to land

| PR | Entry | What I did |
| --- | --- | --- |
| **#12** | 85 (Zayd) | Reviewed, **corrected**, **MERGED** on the owner's explicit authorisation |
| **#13** | 86 (Amer) | Reviewed in full, **left open** — the owner reserved it for the next Amer session |

⚠ PR #12 had already been reviewed once, by Entry 86, which pushed entry 85's `REVIEW:` line onto my
branch. That review stands and is recorded; mine is a second, independent one.

### 0a · What PR #12 needed corrected before it could merge

It was `CONFLICTING`. Entry 84 had merged into main while it sat open, and:

**⚠⚠ THE MERGE OVERFLOWED §7's BYTE BUDGET, AND NEITHER PR COULD HAVE SEEN IT COMING.**

```
FAIL tests/docs-budget.test.ts > §7 is under its byte budget and holds no more than ten abstracts
AssertionError: expected 35981 to be less than or equal to 32768
```

Entry 85 measured **30.1/32.0 KB** on its branch. Entry 84 measured **29.9/32.0 KB** on its branch. Both
green, both honest, and their union is 35 981 against 32 768. **The budget gate is per-branch, so the
overflow is a property of the MERGE and is structurally invisible until the second PR lands.** It is the
one gate two parallel sessions can break without either being wrong. Resolved by rotating entry 79 into
`docs/history.md` §C — the rotation rule calls that maintenance and denies it an entry of its own.

The §7 conflict itself resolved by **keeping both abstracts**, exactly as Entry 84's `OWES` predicted.
Entry 77 was rotated by *both* branches and git merged the identical block once, so §C did not double it
— checked rather than assumed.

⚠ **`pnpm state` rewrote `Zayd_Prompt.md`'s tree line again**, breaking step 10(a)'s byte-identical
invariant — Entry 85's own fourth lesson, and the thing that had blocked the PR #10 merge. Re-synced from
`origin/main`, gate six re-run. **Two consecutive PRs is a missing gate, not a missing habit** (see §5).

⚠ While writing §C's header I went looking for **entry 78** and found it in no index at all. It is a
**real gap, not a loss**: 78 was a review-only session (PR #5) that wrote no abstract, and its findings
live in entry 77's `REVIEW:` line. Recorded in §C's header so nobody repeats the hunt.

### 0b · The review itself — item 1(b) answered by a fuzz, not a list

Entry 85 asked its reviewer to *"hunt for a cycle shape the colours let through"*, naming four shapes.
**Naming shapes cannot settle that question**, because the claim is that no shape exists and a list is
not a proof of absence — and three of the six new tests assert `true`, which `return true` also passes.

So I wrote an **independent reference from the docblock's sentences**: closure by plain BFS, every node's
own tag, and cycle detection by **Kahn's algorithm** — a wholly different mechanism from a DFS colouring,
so the two cannot share a bug. Then fuzzed them against each other.

```
20 000 random graphs · 2–7 nodes · both edges drawn independently · four tag classes · two selections
~90 000 queries                                              ZERO disagreements
census: 19 483 trials contained a refused element · 16 775 contained a two-edge node
```

Revert-verified — against the OLD implementation the same fuzz fails inside 200 trials:

```
+ trial 194 on e1: got false, reference true
+ trial 378 on e2: got false, reference true
+ trial 791 on e5: got false, reference true
```

⚠⚠ **And read the direction: every disagreement is `got false, want true`. The old defect could only ever
OVER-refuse.** The fixed code disagrees in neither direction — which is the strongest available answer to
*"what does it now accept that it should not?"*: **nothing.** The fuzz ships as `option-cascade-d67.test.ts`
§8; it is deliberately **not** in PR #12, because a reviewer's own work merged by that same reviewer would
land unread.

### 0c · PR #13 (Amer, Entry 86) — reviewed, approved, left open

Item 1 reproduced (`expected undefined to deeply equal { transactionId: 'gesture-7' }`). `753 green · 87
files · exit 0` reproduced exactly. Three things worth carrying:

1. **The weak-green test Amer flagged is genuinely weak, and I proved it.** `expect(seen[0]?.[2])
   .toBeUndefined()` cannot separate *"forwarded `undefined`"* from *"never passed a third argument"*.
   **Arity can**: `expect(seen[0]).toHaveLength(3)` goes RED under the defect (`expected [
   'core.setParams', {} ] to have a length of 3 but got 2`) and green under the fix. Reported with the
   patch, **not pushed** — the owner reserved that branch.
2. **The sweep answer, and a sharper lesson than the entry's own.** `withUiRefresh` was the only
   delegating wrapper in the repo; `agent.ts` re-declares options too but types them as exactly what it
   forwards, so it is safe. ⚠⚠ **The reason nothing errored is that TypeScript accepts a function of
   FEWER parameters wherever one of more is expected** — deliberate assignability, and it means a
   pass-through wrapper's arity can *never* be caught by the type system, in any codebase. That is why
   it has to be a test.
3. ⚠ **`drag.ts`'s `hostedPlan` uses `Math.hypot`, which is unsigned**, while its docblock calls the
   result *"an over-estimate"*. Measured on its own fixture: `[+300,+400,+50]` and `[-300,-400,+50]`
   both propose `offsetU 1500`. For the reversed drag that is not an over-estimate, it is the **wrong
   direction** — and `offsetV` takes `by[2]` signed, so the two axes of one function disagree about
   whether direction survives. Latent (nothing calls it yet); the comment is what needs correcting.

---

## 1 · THE FINDING — `requireElement` answers the wrong question

Entry 85 closed the `hostId` edge with this sentence, and every word of it is true:

> **`hostId` cannot dangle through the shipped verbs.** Counted: `createElement` and `retargetReference`
> both `requireElement`; D39 takes the hosted with the host. **Closed.**

⚠⚠ **`requireElement` proves the target EXISTS. It does not prove the target is not the element itself,
or something that leads back to it.** The sweep asked *"can this reference point at nothing?"* and never
asked *"can it point at itself?"* — **a reference that resolves can still be a reference that LOOPS.**

And a loop is not a broken reference. It is an **erased element**: `isElementActive` (correctly) excludes
every member of a belongs-to cycle, so the element leaves `modelElements()`, every schedule, the project
roll-up, the Clean Delta, the room solver, the join resolver and every view — while sitting in
`scene.elements` with both diagnostics empty.

### Measured, through shipped verbs, on a document with no design options and no `.bnn` tampering

```
core.retargetReference { elementId: w, hostId: w, hostRef: <w's own face> }   → ACCEPTED
  scene.elements   : 1
  modelElements()  : 0          ← a real wall, with real geometry
  brokenRefs()     : []
  unbuildable()    : []

core.setElementMetadata { elementId: w, parentElementId: w }                  → ACCEPTED
  scene.elements   : 1
  modelElements()  : 0
  brokenRefs()     : []      unbuildable() : []
  projectQuantities() → { rows: [], unmeasured: [], basis: 'exact' }
```

⚠⚠ **A whole-model schedule of ZERO rows wearing the `exact` badge, from a single verb call.** That is
domain rule 15's failure mode and Q19's silent erasure arriving by a third road — and unlike Q19 it needs
**no ruling**, because no authoring intent maps to *"a wall hosted on itself."* It is a precondition,
refused at the door, exactly as `requireElement` refuses a host that is not there.

The two-node cycle is authorable too (`opening` hosted in `wall`, then `wall` retargeted onto `opening`);
there the geometry at least leaves an `unbuildable()` row. **The `parentElementId` self-loop leaves
nothing at all** — no diagnostic anywhere — which makes it the more dangerous of the two.

## 2 · The fix — and why it walks both edges

`wouldCloseBelongsToCycle(scope, elementId, ancestorId)` lives in `designoptions.ts`, beside the rule
whose edge set it must match, so there is **one** description of "the belongs-to edges" and not two.

⚠ **A `hostId`-only guard would not have closed this.** `A.hostId = B` followed by `B.parentElementId = A`
is refused by neither single-edge check, and `isElementActive` — which walks both — excludes both
elements anyway. ⇒ **the guard's edge set must be the exclusion rule's edge set, or the hole just moves.**
This is the one place the D39/D67 asymmetry is not free: `cascadeOf` may cascade `hostId` only, but
nothing may *author* a cycle in the closure `isElementActive` reads.

⚠ **One `seen` set is correct here, and not because it worked elsewhere.** This computes a reachable SET
— *"is `elementId` above `ancestorId`?"* — where arriving twice is idempotent, so the set answers exactly
one question. `isElementActive` needed two colours because its `seen` decided a **boolean about the
current path**, and *"already judged"* parts company with *"on the path I am walking"* on a DAG. Same
shape, different job. **Ask what the set is FOR** — that is the third instance of this question in three
entries, and the answer has been different each time.

### Revert-verification — twice, separately

| reverted | RED |
| --- | --- |
| the `hostId` guard | **3** — `promise resolved "{ …(7) }" instead of rejecting` |
| the `parentElementId` guard | **1** — same failure on `core.setElementMetadata` |

⚠ And §3 of the test file is the **mirror**, because every assertion above is a refusal and `return true`
passes all of them: a legitimate retarget onto another wall still works, a **diamond** is not a cycle
(the guard must not inherit the D67 defect), re-parenting **upward** to one's own grandparent is legal
while the reverse is not, a broken ancestor is not this guard's business, and the walk **terminates on a
scene that already contains a cycle** — a `.bnn` older than the guard.

## 3 · TASK's three questions on `cascadeOf` — all three clean, one of them interestingly

**(1) A hosting cycle.** `cascadeOf` terminates and names the rest of the cycle (`cascadeOf(a) → ['b']`,
`cascadeOf(b) → ['a']`). Entry 85's justification holds for the reason given in §2. The verbs can no
longer author one, but D43 round-trips an unknown document verbatim, so the shape stays reachable and the
walk must stay total — pinned in §4 of the test file.

**(2) `rebuilt` — counted, not read.** `deleteElement` computes `rebuilt` as `[element.hostId]`, which
reads like an undercount when the cascade kills N. **It is not, and the reason is not in the command:**
`DocumentContext.execute` (`document.ts:396`) **overwrites the command's hint with the `affected` set it
computed itself** — *"it is the EXECUTOR's knowledge, not the command's"*. Counted: deleting a wall with
two openings yields a `rebuilt` of **3 ids where the command's own hint was `[]`**. And structurally, the
root is the only doomed element whose host survives — every other doomed element's host is doomed by
definition of the cascade. **Complete.**

**(3) ⚠⚠ The asymmetry is real and NOTHING PINS IT.** Measured by making `cascadeOf` walk both edges — a
genuine change to what a delete destroys — and running everything:

```
Test Files  1 failed | 86 passed (87)
     Tests  1 failed | 757 passed (758)
  × the frozen surface > has not moved since the baseline
```

**ZERO behavioural tests noticed.** The single failure is the freeze-boundary hash, which sees that
declaration *text* changed, not that the delete cascade changed *meaning*. ⇒ **a Q19 ruling could land,
change what `core.deleteElement` destroys, and go green.** Now pinned by a test that asserts today's edge
set — **and it is designed to fail when Q19 arrives**, which is the point of a pin.

## 4 · RISK

`RISK: contract-touching`, and the diff is **one ADDED export**:

```
+ ADDED   (1):
+   packages/document/src/designoptions.ts :: function wouldCloseBelongsToCycle
```

⚠ Note what is **not** there: the two `execute` bodies I changed did **not** move the surface. Entry 83's
lesson holds in both directions — *an ADDED export trips the gate exactly like a changed one*, and a
changed body may not trip it at all. Baseline re-generated in-PR at entry 87.

## 5 · What I am NOT doing, and the recommendation that follows

⚠ **The `Zayd_Prompt.md` tree-line desync has now blocked or nearly blocked three consecutive merges.**
The written mitigation is a habit — *"before merging, `git diff origin/main -- Zayd_Prompt.md`"* — and a
habit that has to fire on every PR is a gate that has not been written. **`docs:check` could assert it
directly**: on a branch, the prompt's FRESH block must be byte-identical to `origin/main`'s. I have not
built it, because it is a gate change touching `pnpm state`'s own contract and this PR is already
contract-touching for an unrelated reason. **Recommended as entry 88's cheap half.**

⚠ **Q19 is still not built and still needs its ruling.** This entry closes the *authoring* road into a
belongs-to cycle. It does **not** touch the *deletion* road — delete a parent and the child still
survives in `scene.elements` while vanishing from every consumer. That reconciliation is a semantic
ruling (cascade, refuse, or surface), and it is now pinned rather than merely filed.
