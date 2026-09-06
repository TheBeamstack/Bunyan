# Entry 82 — the design-options question, walked: the two doors are a 50% silent under-report

**Zayd · Hetzner dev box, headless · 2026-08-06 · `RISK: additive`** (design docs only; no code, no
frozen byte, no verb)

> Q17 was filed as a symmetry complaint — _"two doors onto one reserved collection, opposite policies."_
> Driving those doors through the shipped verbs found something else underneath: **a wall you can create
> today, with real geometry, that `quantities()` measures as `basis: 'exact'`, and that every schedule,
> the roll-up and the Clean Delta silently omit — with `brokenRefs()` and `unbuildable()` both empty.**

---

## 1. What this session did

**Two halves, in the loop's order.**

**Step 3 — Entry 81's PR (#8) reviewed in full and merged.** One real defect proven with a failing test
and fixed on its branch; write-up in that entry's body §7 and in PR #8's comment. Summarised in §2.

**Step 6 — Q17, design-first.** `Zayd_Prompt.md`'s standing constraint is explicit for a
contract-touching task: _the design doc IS the deliverable — write it, put its open questions into
`open_rulings.md`, and stop there._ That is exactly what landed. **No code was written, no shape widened,
no verb registered.**

| | |
| --- | --- |
| `docs/design/P5_step6D_design_options_crud_design.md` | **NEW** — the walk, the measurements, the shape, the test plan, and §7's three questions. |
| `open_rulings.md` | Q17 **replaced** by **Q17a/Q17b/Q17c**; **Q17a moved to 🔴 BLOCKING**, which had been empty for five sessions. |
| `current_state.md` | this entry's abstract; **Entry 75 rotated out** of §7 (its row is already in `docs/history.md` §C). |

### 1a. Verified

`pnpm verify` — **715 green · 84 files · six gates · real exit code 0.** Unchanged by this entry, which
is the point: it adds documents.

---

## 2. Step 3 — the review of Entry 81 (PR #8, merged)

Item 1 re-executed against §2a row 5: the early `process.exit(0)` back into `check-reseed.mjs` ⇒ **3 e2e
RED**, while `reseed-gate.test.ts` stayed **14/14 green including its wiring grep** — Entry 81's §3a
finding reproduced.

**The defect: Q15's fix held for exactly one invocation.** `--rebaseline` was made a qualifier, but the
verdict was still read out of the working-tree baseline the same run had just overwritten:

```
$ node scripts/state.mjs --rebaseline
  newest entry 81 · RISK: contract-touching (re-baselined)     ← correct
$ node scripts/state.mjs
  newest entry 81 · RISK: additive                             ← Q15, one command later
```

…and the second run is the one that survives, because §8 and `FRESH` are rewritten every time. Fixed by
measuring against the baseline **at the merge base**, read from git; `tests/state-risk-e2e.test.ts` now
**executes** the generator (revert-verified RED while `freeze-boundary.test.ts` stayed 10/10 green).
⚠ One of its wiring greps asserted the call's argument list verbatim, so it **failed on the fix and
passed on the bug**. Number corrected: `reseed-gate.test.ts` is +7, not +6.

⚠ **The merge itself was refused by the harness's permission classifier** (`gh pr merge`), as Entry 81
predicted it would be. The review was completed and posted, and the owner ran the merge. Not a protocol
failure.

---

## 3. FOUND

### 3a. ⚠⚠ THE Q17 GAP IS NOT A SYMMETRY COMPLAINT — IT IS A 50.0% SILENT UNDER-REPORT WITH `basis: 'exact'` ON IT

Measured by driving `DocumentContext` through `CORE_COMMANDS` against the real OCCT kernel — i.e. only
what a user or an agent can actually reach. Two identical 6000 × 3000 × 200 blockwork walls, one tagged
`designOptionId: 'opt-b'`, nothing else different, **and no design options in the document at all**:

| asked | answer | correct |
| --- | --- | --- |
| `scene.elements` | **2** | 2 |
| `doc.quantities(tagged)` | `3 600 000 000 mm³ · 6 480 kg · basis: 'exact'` | — |
| `doc.modelElements()` | **1** | 2 |
| whole-model schedule — rows | **1** | 2 |
| whole-model schedule — `quantity:volume` | **3 600 000 000 mm³** | 7 200 000 000 mm³ |
| `schedule.basis` / `schedule.unmeasured` | `'exact'` / `[]` | — |
| `doc.brokenRefs()` / `doc.unbuildable()` | `[]` / `[]` | — |

Every step behaves as written. `isElementActive` excludes an element whose option the document does not
define — correctly, and its own comment says _"a BROKEN REFERENCE … a future body surfaces it (domain
rule 3)."_ **That body was never written**, and `core.createElement` is the door that makes the
unsurfaced case reachable: it validates the shape and deliberately not the reference, on the reasoning
that _"inventing referential validation against collections nothing can author yet would refuse every
legitimate call."_ **The reasoning is sound; its conclusion is the defect.**

⇒ It is **D65's own named failure mode, inverted.** D65 froze the exclusion invariant to stop a schedule
**double-counting** — _"a wrong number wearing the `basis: 'exact'` badge."_ What ships is 0.5000× under
instead of 2.0000× over. Same badge, same rule 15, opposite sign — and reachable with no options feature
at all.

⚠ And it fits §1c-8's ledger exactly: **a new rule binds the next consumer and nothing else.** D65 wrote
the consumer rule on 07-23; row Ⓕ added the authoring arg on 07-24; **nobody swept the door against the
rule, because the same reservation wrote both, three days apart.**

### 3b. ⚠⚠ "IS THE PROMOTION ADDITIVE?" HAS TWO ANSWERS, AND THE QUESTION CONFLATED THEM

`Zayd_Prompt.md` set this as the finding worth having — _"if the same trick works here, the promotion may
be additive after all."_ **The trick works and the promotion is still not additive**, because this repo
uses "additive" for two different things that part company here:

- **Data-additive — YES.** D79's materialise-on-first-authoring transfers verbatim: no `emptyScene()`
  entry, **no `SCENE_SCHEMA_VERSION` bump, a document with no options stays byte-identical.**
- **Freeze-additive — NO. Measured**, by widening the union and running the gate:
  `+ packages/document/src/scene.ts :: type SceneCollection`. It is one of 21 watched declarations in
  that file, so the promotion is `RISK: contract-touching` **by construction** and the owner merges it.
  Entry 77 paid this exact price for `views`.

⇒ **The `.bnn` in the field is safe; the freeze boundary is not — and the freeze boundary is what decides
who merges.** Saying "additive" without saying which one is how a contract-touching PR gets agent-merged.

⚠ The compiler then names the remaining work by itself: one `TS2345` in `dependency.ts`'s exhaustive
switch (Entry 33's mechanism). **And the edge it asks for is NOT the "nothing" `schedules` and `views`
each declared** — those rest on _a projection reads the model and the model does not read the
projection_, which does not transfer: an element's option membership is read by the room solver and the
**join resolver** (D68), so an option edit can change a built B-Rep. Declaring "nothing" here would
reproduce **D68's ambiguity flip** — _"a correctly-mitered main-model corner silently loses its miter"_ —
from the authoring side.

### 3c. ⚠ THE ROW DESCRIBING THE DEFECT WAS ITSELF WRONG ABOUT THE CODE

`open_rulings.md` Q17 said `checkDesignOptions` was _"shared by `core.createSchedule` and now
`core.createView`."_ It is not. `core.createView` has **its own second implementation** of the same rule
in `view.ts`, with a different failure code (`REFUSED` vs `NOT_FOUND`) and different semantics (collects
all issues vs stops at the first). **Two descriptions of one rule** — domain rule 10, and the same shape
`optionScopeOf()` was extracted to stop one level down (D68: _"the RULE was shared while the SCOPE THE
RULE IS EVALUATED AGAINST was not"_).

⇒ §1c-7 in its ordinary form: a written artifact describing the code, trusted, and wrong. **A row in the
owner's decision queue is a claim about the code and gets read against it like any other.**

---

## 4. What the frozen surface did

Nothing. Documents only. `freeze-boundary` green, snapshot untouched, `RISK: additive` — so under the
loop's step 3 the **reviewing session** merges this PR.

⚠ The unit this document designs is the opposite: `RISK: contract-touching`, **owner-merged**, and it is
not built here.

---

## 5. What is NOT done

- **Nothing from §7 of the design doc is built.** Q17a decides whether the unit exists; Q17b is a policy
  call between two directions I am deliberately not choosing; Q17c is additive and direction-neutral but
  interacts with Q17b. Design-first means stopping here.
- **Q18** (what a hosted void may host ON — the cut-face half) is untouched and still Amer's question
  with my layer's fix.
- **Q11/Q12** (the CLA) untouched and owner-only.
- No kernel rebuild, no oracle run, no Docker, no container paused.

## 6. RISK

`additive`. Six gates, exit 0, **715 green**. The reviewing session merges it.
