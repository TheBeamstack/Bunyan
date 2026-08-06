# Entry 85 — the `hostId` edge, swept: the ancestry is a DAG and the walk called it a cycle

**Zayd · dev box, headless · 2026-08-06 · branch `zayd/2026-08-06-e85-hostid-sweep`**

`pnpm verify`: **729 tests, 85 files, six gates.** ⚠ `RISK: contract-touching` — `isElementActive`'s
declaration text moved, so the freeze gate fires by design and **the owner merges this PR**.

---

## 0 · What this session was asked to do, and what it did first

The owner's instruction opened with a merge, not a task: **PR #10 (Entry 83) had been sitting through two
sessions** because it is `contract-touching`, and the owner authorised the merge explicitly. So step 3 was
the whole first half of this session, and it is written up in §1. The `hostId` sweep — §2 onward — is the
`TASK` the prompt handed out, and it needed no ruling, exactly as advertised.

⚠ **PR #11 (Amer, Entry 84) was deliberately not reviewed.** The owner ruled it belongs to the next Amer
session. It is browser work, and its browser-only claims are checklist item 1's named exception anyway.

---

## 1 · Step 3 — Entry 83's PR, re-reviewed and merged

Entry 84 (Amer) had already reviewed PR #10 thoroughly and **found a defect and fixed it on the branch**
(`cba786b`). That is the correct protocol — and it left the repo in a state nobody had checked: **the
reviewer's fix arrived in the same commit that approved the PR, so it had never been read by a second
party.** The whole justification for review in this repo is that an author cannot see their own blind
spots; a reviewer's fix is an author's work. It was worth re-reading.

**Item 1, both halves, re-executed here** (third independent execution of half (a)):

| half | what was done | result |
| --- | --- | --- |
| (a) | restored `view.ts`'s deleted second copy of the option lookup | `design-option-refs` + `plan-section` **15/15 green either way** — behaviour-preserving, as the entry honestly claimed |
| (b) | restored Entry 83's membership test inside `baselineEntryIssues` | **RED, two ways** — `expected [ '76 is not in §7' ] to deeply equal []` |

### ⚠⚠ The finding: the gate was right and the WRITER was wrong

Entry 83 asked its reviewer the weak-green question — *"having loosened the assertion, what can now pass
that should not?"* Entry 84 answered it. **Nobody asked the mirror: what can now FAIL that should not?**

`baselineEntryIssues` closes on a cross-field check — *while the named entry is still resolvable in §7, its
date must agree*. **That check is right.** But the two fields it compares came from **two different
sources**: `_baselinedAtEntry` from the §7 parse (Q15's fix) and `_baselinedAt` from `new Date()`.

⇒ **A rebaseline run on any day other than the authorising entry's own calendar date writes a baseline
that its own gate rejects.** Nothing hand-edited, nothing wrong, gate red.

```
newest §7 entry: 83 dated 2026-08-06
  --rebaseline with clock=2026-08-06  ->  issues: []
  --rebaseline with clock=2026-08-07  ->  issues: ["_baselinedAtEntry 83 is dated 2026-08-06 in §7,
                                                   but _baselinedAt says 2026-08-07"]
```

Not hypothetical: a session crossing UTC midnight (this one began 68 minutes short of it), Amer's `+0100`
box before 01:00 local (`toISOString()` is UTC and the §7 date is not), or an abstract written the day
before its rebaseline. ⚠ **`tests/state-risk-e2e.test.ts`'s own fixture reproduces it every day of the
year but one** — its throwaway repo has a §7 dated `2026-08-05` and rebaselines against the clock, and
nothing had ever looked at what it wrote.

**Fixed by giving the pair one source.** `baselineSnapshot`'s `today` is now `at`, and `state.mjs` passes
`newest.date`. Test-first and **executed rather than grepped** — `freeze-boundary` already greps
`state.mjs` for this very call, which is precisely the assertion that cannot see this:

```
FAIL tests/state-risk-e2e.test.ts > ⚠⚠ writes a baseline its own gate accepts — the date is the ENTRY's, never the clock's
AssertionError: expected '2026-08-06' to be '2026-08-05'
```

⚠ **A second, mechanical lesson from the merge itself.** `gh pr merge 10` was refused with
`GraphQL: Pull Request has merge conflicts` — a **real conflict**, not the harness classifier. Running
`pnpm state` on the branch had rewritten `FRESH`'s `Tree at generation:` line, so the branch's
`Zayd_Prompt.md` no longer matched the copy step 10(a) had already pushed to main, and both sides had
edited the same line. The prompt's own warning, met in the field. Re-synced from main, gate six re-run,
merged.

---

## 2 · The sweep — `hostId`, the edge Entry 83 did not walk

Entry 83 swept `core.createElement`'s three **reserved** args. `hostId` is not reserved: it is live,
shipped, and D39 cascades it — *which is exactly why everyone assumed it was safe.*

### 2.1 · Can `hostId` dangle? — through the verbs, no; through a file, yes and silently

| road in | guarded? |
| --- | --- |
| `core.createElement` | **yes** — `requireElement(ctx.scene, hostId)` |
| `core.retargetReference` | **yes** — `requireElement` on the new host |
| `core.deleteElement` | **yes** — D39's `cascadeOf` walks `hostedBy`, so the hosted element dies WITH its host |
| a `.bnn` / hand-assembled `Scene` | **NO — and this is D43's population** |

Measured on a document whose element names a host that is gone:

```
scene.elements   : 5
modelElements()  : 3        ← the orphan AND the window hosted on it
brokenRefs()     : []
unbuildable()    : []
```

⚠ **`brokenRefs` cannot see it, structurally.** It is built by walking `hostedBy(scene, rootId)` from each
root, so an element whose host does not exist is **never anyone's hosted child** and is never examined.
That is Q19's shape on the `hostId` edge with a narrower population, and it is why Q19's row now says a
reconciliation must cover **both** edges — **(c) SURFACE** is the one that closes both.

### 2.2 · ⚠⚠ The defect: `cascadeOf` and `isElementActive` disagree, and this one is wrong

The hand-off's question was *"do the two walks agree on CYCLES and on an element hanging off BOTH edges at
once — two cycle guards written separately is the D68 shape?"* **They do not, and it is not a ruling.**

Two edges out of one node means the ancestry is a **DAG, not a chain**, so the two routes upward can
**meet**. §5 of `option-cascade-d67.test.ts` already pinned that an element may hang off both edges — but
its `wall-1` and `grp-1` share no ancestor, **so the shape that matters was never built.** Put one outer
group above both and it is a **diamond**, which contains no cycle at all.

The old guard was `if (seen.has(ancestorId)) return false`, with **one set doing two jobs**:

- *"already judged"* — which must be **global**, or the walk is exponential;
- *"on the path I am walking right now"* — which must be **path-scoped**, or a diamond looks like a loop.

The second route into the shared ancestor found it in `seen` and returned `false`.

**Measured through four shipped verbs, on a document with NO design options at all:**

```
----- WITH the diamond — win.hostId=wallA AND win.parentElementId=grpMid -----
  designOptions        : undefined
  scene.elements       : 4
  modelElements()      : 3
  the opening listed?  : false
  brokenRefs()         : []      unbuildable() : []

----- CONTROL — same graph, but the two routes no longer share an ancestor -----
  scene.elements       : 5
  modelElements()      : 5
  the opening listed?  : true
```

The only thing that differs between the two runs is **whether the two paths share a node.** A window that
cuts a real hole in a real wall is absent from every schedule, the Clean Delta, the room solver, the join
resolver and every view — with both diagnostics empty. **D65's failure mode, on a document that has never
heard of a design option**, which is Q17a's framing arriving by a third road.

**The fix** replaces the conflated set with DFS colours: `grey` is the current path and is what a cycle
closes onto; `black` is done-and-fine and is what a diamond hits. The `leaving` frame is pushed **before**
the ancestors so it pops **after** them — the whole sub-walk happens while the node is still `grey`, which
is what makes the cycle test mean what it says.

⚠ **REVERT-VERIFIED:** restore the single `seen` set and **4 of the 6 new tests go RED**, including the
verb-driven one — `expected [ …(3) ] to include 'opening-…'`, i.e. `modelElements()` 3 where 4 is correct.

⚠ **The weak green this section must not have:** three of the new tests assert `true`, so `return true`
would pass all three. **Two more assert `false`** — a real cycle reached *through* a diamond is still
refused and still terminates, and an excluded shared ancestor still excludes both routes — and §4's
existing cycle test is a third.

### 2.3 · The consumers, COUNTED (§1c-8's second mechanical form)

**Six call sites in four files, not five** — the hand-off said five:

`enumerate.ts:188` · `room.ts:413` · `cleandelta.ts:525` · `joins.ts:322`, `:358`, `:416`

All six consume `isElementActive`, so all six inherited the defect and all six are fixed by the one change.
`cascadeOf` needed no change: its `seen` set is a pure visited-memo over a single edge, which is the
correct guard for what it does.

---

## 3 · What is owed

- ⚠⚠ **THE OWNER MERGES THIS PR** — `RISK: contract-touching`, one declaration moved
  (`packages/document/src/designoptions.ts :: function isElementActive`). The baseline is re-generated in
  this PR at entry 85.
- **Q19 still needs its ruling** and now covers both edges. **Q17a is still blocking.** Q11/Q12 (the CLA)
  are unchanged and owner-only.
- **PR #11 is Amer's** — the next Amer session reviews and merges it.
