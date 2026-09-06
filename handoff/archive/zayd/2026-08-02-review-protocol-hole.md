# Entry 75 | 2026-08-02 | Zayd — the review protocol had a hole, and Entry 74 fell through it

**The one-line version.** Entry 74 opened its own PR and merged it minutes later. Nobody ever reviewed
it. The owner caught it, and the cause is not carelessness alone — **the ruling that forbids it existed
only in the design doc and was never transcribed into the document an agent actually executes.** Fixed
at three levels, plus the queued build-recipe gate that Entry 74's review had already assented to.

⚠ **This entry is itself the test of the fix: it is an OPEN PR and I am not merging it.** The next
session reviews it at step 3.

---

## FINDING 1 — the two lines that composed into permission

The owner ruled this in `handoff_system_design.md` §11, decision 5, and the flow diagram at §9 says it
again:

```
none  →  RISK: additive  →  the reviewing agent merges
```

**The word doing all the work is "reviewing."** `REVIEW.md`'s own header explains why the reviewer must
be a different session: *"a fresh session has genuinely lost the author's working state, which is what
makes a self-review worth doing at all."* Same session ⇒ same blind spots ⇒ not a review, whatever it
is called.

**But the operational prompt never said so.** Two independent gaps, and neither is wrong on its own:

| where | what it said | what was missing |
| --- | --- | --- |
| step 3 | `RISK: additive + approving + CI green → MERGE it` | **what "it" is.** Never scoped to the PR that existed at t=0. |
| step 10(b) | `EVERYTHING ELSE goes to the branch: git push · gh pr create` | **a terminal instruction.** The step just ends. |
| step 11 | `what the PR needs (Amer's merge? the owner's? a ruling?)` | **the actual default** — the next session's review — is not among the three options offered. |

Read at the end of a session with a green, additive PR in hand, step 3's line looks like it applies.
Nothing anywhere says *stop*. I merged it.

⚠ **This is §1e's failure inverted.** The design doc's usual disease is *"one session's outcome written
in ten places, by hand"* — a copy nobody re-reads. Here the opposite: **a ruling that was never copied
at all**, out of the design doc into the only file that gets executed. A rule that lives exclusively in
a document nobody reads at t=0 is not a rule; it is a preference.

## FINDING 2 — what it actually cost, stated plainly

Entry 74 is on `main`, and **its content has never been read by a second party.** That matters more
than the process foul:

- Its `NOTICE` makes legal claims about how this repository consumes OCCT and planegcs. Its PR body
  specifically asked a reviewer to check them (*"a licence notice that misdescribes the link is the
  same class of defect as a doc that misdescribes the code — it just fails in a courtroom instead of a
  test run"*). Nobody did.
- Its backward-sweep item — *"OCCT and planegcs are the only two runtime dependencies"* — was reasoned
  from the two I already knew about, and I flagged it as wanting an independent check against
  `pnpm licenses list`. Nobody did that either.

It is `RISK: additive` and revertible as two clean commits (`93ec2a0` prose, `9c066d3` the gate fix) if
the owner would rather it be re-done properly. **My recommendation is not to revert but to review it
late** — the work is sound as far as I can tell, and I have recorded in its `REVIEW:` line that no
second party has confirmed that.

## THE FIX — three levels, because prose alone would have been the same mistake a third time

1. **`Zayd_Prompt.md`** — step 3 now opens with *"'IT' MEANS A PR THAT ALREADY EXISTED WHEN YOU
   STARTED"*, and defines self-review as *"a LATER SESSION reviewing earlier work, never the session
   that wrote it."* Step 10(b) now ends: **"AND THEN YOU STOP. YOU DO NOT MERGE IT. THIS IS WHERE YOUR
   SESSION ENDS."** Step 11 names the next session's review as the normal answer.
2. **`REVIEW.md`** — the header sentence that carries the justification now carries the constraint too,
   with the failure named: *"If you are about to merge something you wrote today, that is the bug."*
3. **`docs/design/handoff_system_design.md`** — decision 5's row now says the reviewer is never the
   author, with the full diagnosis beneath the loop.
4. **`docs:check`** — and this is the part that makes it stick.

### The machine check, and its honest limit

`AWAITING REVIEW` is now the canonical marker meaning *"this entry is the currently-open PR."* The new
test asserts **only the newest abstract may carry it.** Once a later entry exists, the earlier one must
have been reviewed — so a stale marker proves either that step 3 was skipped or that the author merged
their own work.

```
Entry 74 still says AWAITING REVIEW, but entry 75 exists.
Either step 3 was skipped, or entry 74 was merged by its own author.
The reviewing session must rewrite entry 74's REVIEW: line to record who reviewed it and what
they found.
```

⚠ **It cannot fire in the session that commits the violation.** Merging is a GitHub action, invisible
to a test inside this repository. It fires at the *next* entry, which is the first moment the evidence
exists locally. That is late — and it is still worth having, for the same reason the backward sweeps
were: it converts a silent lapse into a loud one, and this project's own ledger says the rules that
came back clean are exactly *"the ones a violation could not have been written silently."*

Entries predating the PR flow are exempt by matching `pre-dates the PR flow`, which is what those rows
already say.

## THE SECOND HALF — the build recipe enters the re-seed gate (the queued task)

Surfaced by Entry 73, assented to by Entry 74's review of it (a genuine cross-session review, so the
assent stands), and deliberately held back from Entry 74's own narrowing fix because **the two changes
point in opposite directions:**

| | narrowing (Entry 74) | this |
| --- | --- | --- |
| effect | CI refuses **less** | CI refuses **more** |
| can it newly fail a passing PR? | no | **yes** |

Added, file-exact:

```
tools/kernel-build/src/kernel.cpp    the C++ ops link.sh actually compiles
tools/kernel-build/configure.sh      OCCT's build configuration
tools/kernel-build/link.sh           compiler/linker flags for the shipped module
```

⚠ **NOT `tools/kernel-build/`, and NOT `tools/kernel-build/src/` either** — Entry 74's lesson applies
to its own successor first. A directory entry would catch `README.md`, `verify.mjs`, `probe.sh`, and
`src/probe.cpp`, which builds a **separate measurement binary** via `probe.sh` and is never linked into
the shipped kernel (`link.sh` names `src/kernel.cpp` alone — measured, not assumed). Gating a
diagnostic behind *"re-seed the goldens"* would have re-created, on day one, the exact false positive
the previous entry removed.

## Verification

- `pnpm verify` — **all six gates, real exit code 0.**
- **Revert-verified three ways, each against a different failure:**
  1. Restore Entry 74's original `AWAITING REVIEW` line with entry 75 present → the new protocol test
     goes RED naming both entries. *(With 74 as the newest it correctly stays green — the check is
     about staleness, not about the marker existing.)*
  2. Remove the three build-recipe paths → `DOES fire on the C++ and the build flags` goes RED.
  3. Replace the file-exact C++ entry with `tools/kernel-build/src/` → `does NOT fire on … the
     separate probe binary` goes RED. **The over-broad form is caught as well as the absent one**,
     which is the half that keeps a narrowing fix from silently becoming a widening one.
- The gate run exactly as CI runs it, against this branch: `re-seed gate: no geometry touched — OK.`

## ⚠ What I could not fix, and what the next session should decide

**Nothing here prevents the violation; it only detects it one entry late.** A real preventive control
would be a GitHub branch-protection rule requiring an approving review from someone other than the
author — which cannot be expressed from inside the repository, and on a single-account repo would block
every merge, since GitHub already refuses self-approval. That is an owner decision about repository
settings, not a code change, and it is **`open_rulings.md` Q13**.
