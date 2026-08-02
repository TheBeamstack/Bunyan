# `handoff_system_design.md` — the handoff, review & coordination system

**What this is.** The design for how Bunyan's two agents (Amer, local PC; Zayd, Hetzner dev box) hand
work to each other, how that work is reviewed before it reaches `main`, and how the documents that carry
context between them are kept small enough to read and accurate enough to trust.

**Why it exists.** The project's _engineering_ discipline is strong and measurable (§2). Its _coordination_
layer grew organically and is now the binding constraint on both efficiency and — less obviously —
accuracy. This document replaces it.

**Status:** DESIGNED, owner-ruled on all twelve decisions (§11). NOT BUILT. The build is one dedicated
session, scoped in §13.

**Author:** analysis session, 2026-07-31. **Owner rulings:** 2026-07-31.

---

## §1 — The measured problem

Every number here is from the repository, not an estimate.

### 1a. The read cost per session

| What                                                                                     | Size                         | Read when                           |
| ---------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------- |
| `current_state.md`                                                                       | **393,645 B**                | every session, in full, both agents |
| `last_session_work.md` (box-local)                                                       | 17,069 B                     | every Zayd session                  |
| `cross_projects_policy.md` (box-local)                                                   | 10,981 B                     | every Zayd session                  |
| **mandatory subtotal**                                                                   | **~421 KB ≈ 105,000 tokens** | **before any work begins**          |
| `core_logic` + `architecture` + `V1.0.0_spec` + `v1.0.0_imp_plan` (the §0 reading order) | 512 KB ≈ 128,000 tokens      | nominally also required             |
| full `.md` corpus                                                                        | 1,578,996 B across 34 files  | —                                   |

### 1b. The growth rate

`current_state.md`, from `git log`:

```
2026-07-19     67 KB   (immediately after a compaction)
2026-07-21     91 KB
2026-07-24    158 KB
2026-07-27    259 KB
2026-07-29    354 KB
2026-07-30    393 KB      ← 5.9× in eleven days
```

### 1c. The rotation rule is expressed in the wrong unit, and has already failed

The standing rule compacts when §7 holds **more than 20 entries**. Entry sizes have roughly doubled since
that rule was written:

```
Entry 54:  5,653 B          Entry 70: 16,153 B
Entry 61:  5,540 B          Entry 71: 22,716 B
Entry 63:  6,673 B          Entry 72: 17,692 B
```

At current sizes twenty entries is ~250 KB of §7 alone. **The evidence it is already failing is in the
git log:** compaction commit `d596142` (2026-07-30) took the file **377 KB → 296 KB**; three entries later
_the same day_ it stood at **393 KB — larger than before the compaction ran.** The maintenance executed
correctly and lost ground within twenty-four hours, because a count-based threshold cannot see an entry
doubling in size.

### 1d. The "static" sections are a second and third append-only log

| Section                  | Size         | Share   |
| ------------------------ | ------------ | ------- |
| §7 Entry log             | 220,355 B    | 56%     |
| **§4 Decisions**         | **58,294 B** | **15%** |
| **§5 Next actions**      | **54,496 B** | **14%** |
| §1 + §2 + §3             | 43,724 B     | 11%     |
| §0, §0a, §6, §6a, header | 10,582 B     | 3%      |

§4a's own column header still reads **"Ruling (one line)"**; D80 is approximately 2,600 words. §5's first
~270 lines are roughly twenty chronological blockquote narratives, each re-telling an entry that is also
present in §7. **Compacting §7 therefore recovers less than it appears to**, because the same content is
re-narrated in §5.

### 1e. One session's outcome is written in ten places, by hand

Entry 72 / D80 appears in: `current_state` §2 (the `Command` row), §4a (D80), §5 item 5e, §5's CLOSED
list, §5's "For Amer" paragraph, §7 (Entry 72) — plus `v1.0.0_imp_plan.md` freeze-gate rows ⓑ and ⓘ,
plus `Zayd_Prompt.md` §2, plus `Amer_Prompt.md` §2. **Ten hand-maintained copies of one fact.**
`transactionId` appears in **ten different markdown files**.

This is not only a cost. It is the project's own named trap: §1c-7 is _"a claim written in a plan and
never read against the code,"_ recorded as having bitten **four times**. Every additional copy is another
claim nobody will re-read.

### 1f. No fact in the documents is machine-checked

All of these are typed by hand into prose and can drift silently: `613 green` · `all five gates 0` ·
`21 ops + 3 reserved` · `51 types · 39 commands · 1 codec · 0 views` · `transactionId has ZERO readers
(declared undo.ts:109)` · `SCENE_SCHEMA_VERSION 2` · the `FRESH` entry number in both prompt files.

Meanwhile the two rules that _are_ enforced by tests — `tests/units-rule7.test.ts` and
`d19-boundary.test.ts` — are precisely the two that cannot rot. The documentation system has no
equivalent.

### 1g. Parallel sessions collide, and the workaround costs real commits

Of the last twenty commits, **six carry no content at all**:

```
af8fd48  doc=16   code=0    "Entry 71: record the push"
6580053  doc=585  code=0    "move Entry 70 into current_state.md §7, normalise the prompts"
db71c92  doc=17   code=0    "Entry 70: record the push"
45109d5  doc=16   code=0    "Entry 69: record the push"
7733392  doc=9    code=0    "Entry 68: record the push"
b53a8bf  doc=12   code=0    "Entries 66+67: record the push"
```

**Thirty per cent of commits are bookkeeping.** Entries 70 and 71 had to be written into standalone files
and moved into §7 afterwards because both agents ran on 2026-07-30. Four commits exist only to record
that a push happened — describing git state that git already holds.

### 1h. Both agents read each other's domain in full

Ownership is cleanly split (Amer: `apps/web`; Zayd: everything else), yet both read the same 393 KB.
`Amer_Prompt.md` must carry the warning _"§6 is the DEV BOX's environment, not yours."_ When a prompt has
to instruct an agent to disregard part of a document it has just been made to read in full, the document
is mis-scoped.

### 1i. The owner is a serialization point and the queue is growing

`Zayd_Prompt.md` §2 lists **eight owed rulings, three of which block the next unit.** Entry 71 states
explicitly that it took a ruling-free unit first because the real next task was blocked on Q1–Q3.
_"The freeze remains the owner's act"_ appears **seven times** across Entries 55–72 — roughly seventeen
entries and six days of restatement rather than resolution.

---

## §2 — What is being preserved

This project's engineering practices are its principal asset. Every element of this design is constrained
to leave them intact.

| Practice                                                                             | Evidence of value                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Revert-verify** — _a fix without a test that fails in its absence is an assertion_ | Entry 72 revert-verified fifteen ways. The single highest-value rule here.                                                                                                            |
| **Measure, don't assert**                                                            | 4757.7 ms → 27.2 ms (D73) · 30,700 draw calls → 2 (Entry 63) · 2.07× (D29). Caught the geometry cache being a 2× constant factor rather than the order of magnitude the docs assumed. |
| **The backward sweep** (§1c-8)                                                       | 18 domain rules swept, **9 came back dirty.** No other method here approaches that yield.                                                                                             |
| **Count, don't grep**                                                                | Rule 5's sweep — _51 types · 39 commands · 1 codec · 0 views_ — proved two of four registries were decorative.                                                                        |
| **Design-first for contract-shaping work**                                           | Entry 69 found a false comment inside the frozen protocol before anything was built on it.                                                                                            |
| **Entry number, not commit hash, as the freshness check**                            | The reasoning is sound and is retained.                                                                                                                                               |
| **Owner gate on the freeze and on frozen-contract changes**                          | Correctly gated; the irreversibility argument holds.                                                                                                                                  |
| **The §1c trap list**                                                                | The highest-value page in the repository. Unchanged, and promoted in the reading order.                                                                                               |

---

## §3 — The finding that reframes everything: no code review has ever occurred

```
git log --merges      → empty
git branch -a         → main only
merge commits ever    → 0
```

**Seventy-two entries. 613 tests. Approximately 35,000 lines. No branch, no pull request, no second
reader.** Every test was written by the agent that wrote the code it covers. Every _"revert-verified
fifteen ways"_ is a claim in prose that no second party has ever checked.

Set that against the project's own measured defect rate. The backward sweeps ran eighteen domain rules and
**nine came back dirty** — a fifty per cent hit rate on invariants everyone believed were sound. Every one
was found by the same agent, alone, days or weeks later. D68 is the sharpest case: the rule landed
07-23, the two broken consumers were written 07-18, the defect surfaced 07-26 — **eight days of building
on a corrupted B-Rep.**

### 3a. Why cross-agent review is the right pairing despite disjoint ownership

The obvious objection is that Amer (browser) reviewing Zayd's OCCT naming resolver lacks domain depth.
But the defects this codebase actually produces are not of that kind:

| Defect                                                         | Class            | Requires kernel expertise? |
| -------------------------------------------------------------- | ---------------- | -------------------------- |
| D74 — a broken reference outlived the element it named         | reasoning        | no                         |
| D76 — a delta answered from a log that cannot see its baseline | **precondition** | no                         |
| D77 — the invalidator did not reach child elements             | **completeness** | no                         |
| D69 — mid-span T-junction double-counts, 2.8800 vs 2.8320 m³   | domain           | no                         |
| D70 — material identified by display name                      | contract         | no                         |
| D72 — `area` was the total enclosing surface, 94.80 vs 15 m²   | semantic         | no                         |
| D75 — one unmeasurable element bricked the whole take-off      | scope            | no                         |

None require OCCT knowledge. They require asking _"what must be true for this mechanism to be asked a
meaningful question?"_ and _"what else quantifies over this set?"_ — and an outside reader is **better** at
that than the author, who has already convinced themselves. The review that pays here is **lens-driven**
(running the project's own methods against a diff), not line-by-line correctness checking.

Ranked against the alternatives:

| Reviewer                  | Project context                         | Independence          | Can re-run verification                     | Cost              |
| ------------------------- | --------------------------------------- | --------------------- | ------------------------------------------- | ----------------- |
| **the other agent**       | full (reads `current_state` regardless) | different domain bias | Amer→Zayd yes; Zayd→Amer headless half only | free              |
| a third review-only agent | **none** — must read 1.5 MB first       | highest               | yes                                         | very high         |
| automated review          | none                                    | high                  | no                                          | low               |
| the owner                 | full on intent                          | highest               | no                                          | scarcest resource |

A cold third agent looks appealing and is not: the high-yield lenses _require_ knowing the nineteen rules
and the §1c traps. **Context is the binding constraint, not independence.**

### 3b. The verification asymmetry, recorded because it changes the checklist

- **Amer reviewing Zayd — strong.** The WASM artifact is committed and the entire suite is headless Node,
  so Amer can check out the branch and genuinely re-run any revert-verification.
- **Zayd reviewing Amer — partial.** The dev box is headless. Zayd can fully verify the headless half —
  which, per Amer's own verification split, is everything with logic in it — but **cannot** re-run
  browser-only measurements (draw calls, frame times, a console-error-free boot).

The checklist therefore carries a **named exception** rather than a silent gap (§8, item 1).

---

## §4 — File architecture

```
current_state.md      ~40 KB   ★ READ IN FULL, EVERY SESSION, BOTH AGENTS
decisions.md          ~60 KB     on demand — D1..D80 full rulings
history.md           ~250 KB     on demand — archived entries
open_rulings.md        ~4 KB     the owner's queue, one row per open question
REVIEW.md              ~3 KB     the review checklist
Amer_Prompt.md         ~8 KB     Amer writes, Amer reads
Zayd_Prompt.md         ~8 KB     Zayd writes, Zayd reads
handoff/
  zayd/2026-07-31-shapesig-memview.md     full entry bodies — no number in the filename
  amer/2026-07-30-tool-layer.md
core_logic.md · architecture.md · V1.0.0_spec.md · v1.0.0_imp_plan.md      the contracts
*_design.md          headed  STATUS: LIVE  |  STATUS: APPLIED (rulings D<n>, built Entry <n>)
```

**Nothing is deleted.** Content is relocated to where it is read on demand. The rule that makes this safe
already exists and is unchanged: _a dropped entry's durable lessons are promoted into §1–§5 first._ That
promotion is why compression has always been safe here, and it remains the precondition.

---

## §5 — `current_state.md`

The requirement, stated by the owner: **this file must give an agent everything it needs to take accurate
direction and accurate action, while pointing at the other documents.** It is the only file read in full,
every session, by both agents.

```
§0  Orientation · reading order · ownership · where to go when stuck
§1  Where the build is
      §1a  the scale numbers
      §1b  the method that has found every gap
      §1c  the nine traps a fresh agent must not rediscover     ← highest-value page in the repo
§2  Contract status — STATUS ONLY; the story lives in decisions.md
§3  What exists · what is NOT built
§4  Decision INDEX — genuinely one line each → decisions.md
§5  Live priorities ONLY — no narratives, no chronology
§6  Environment & commands
§7  Entry abstracts — newest 10, fixed schema
§8  GENERATED — machine-written, never hand-edited
```

What moves out, and where:

| Today                                      | Destination        | Rationale                                               |
| ------------------------------------------ | ------------------ | ------------------------------------------------------- |
| §4a's full D-rulings (58 KB)               | `decisions.md`     | needed when a decision is questioned, not every session |
| §5's ~20 chronological narratives (~30 KB) | `history.md`       | each duplicates an entry already in §7                  |
| §7 entries older than 10                   | `history.md`       | existing rotation rule, correct destination             |
| §7's newest 10, full bodies                | `handoff/<agent>/` | replaced in-file by an abstract (§6)                    |

---

## §6 — The entry abstract

Eight mandatory fields, enforced by `docs:check` (§10). Written **from the start** as the entry's own
abstract; the full body is written below it and lives in `handoff/`.

⚠ **The block below is a FORMAT SAMPLE — invented content, an entry number that is not real, and it is
not a record of anything.** It is written that way on purpose: an earlier draft of this section used a
plausible _"Entry 73 | shapeSignature memory view … the 170 embind crossings were 43% of a cached
import"_, and the **real** Entry 73 then measured those crossings at **~1%** and cancelled that unit —
leaving a committed doc that read like a record of work which had never happened and whose headline
number was false. §1c-7's disease, contracted by an example. Keep sample content obviously synthetic.

```
### N | YYYY-MM-DD | <agent> | <the headline — what changed, in one line>
CHANGED:  <the packages and files, and what was deliberately NOT touched>
VERIFIED: <n> green · <k> gates 0 · how it was run · revert-verified <n> ways
FOUND:    <the finding that outlives the entry — or "nothing beyond the task">
OWES:     <the other agent> · <the owner: which rulings> · <next Zayd/Amer>
RISK:     additive                          ← written by `pnpm state`, never by hand
FULL:     handoff/<agent>/YYYY-MM-DD-<slug>.md
REVIEW:   PR #<n> · reviewed by <agent> <date> · <n> findings fixed in-PR
```

**`FOUND`, `OWES` and `REVIEW` do not exist today.** They are the three things a recent entry uniquely
contributes — what is now known that was not, what is owed to whom, and who checked it — and today they
are buried inside twelve to twenty-two kilobytes of prose where an agent can pass over them. Promoting
them to mandatory named fields is an **accuracy gain, not a compression.**

Ten abstracts is approximately 10 KB, read every session. A full body is opened only when an abstract line
touches the reader's task.

---

## §7 — The session loop

Identical for both agents. The owner's prompt remains one line: _"read and follow `<agent>_Prompt.md`."_

```
 1. git checkout main && git pull --ff-only origin main
      ⚠ CHECK OUT MAIN FIRST — left on a previous entry's branch the pull is a SILENT NO-OP.

 2. Read REVIEW.md + current_state §1c            (small — you need the lenses, not the whole file)

 3. OPEN PR?
      ├─ review it against REVIEW.md   (your own PR or the other agent's — both are reviewed)
      ├─ finding provable with a failing test   → write it, watch it fail, fix it on the branch
      ├─ finding not provable                   → review comment; never block on an opinion
      ├─ cannot verify it here (Zayd + a browser-only claim)
      │      ├─ record  REVIEW: "unverified here: <claim> — Amer to confirm"
      │      └─ does it BLOCK your task? → TELL THE OWNER TO RUN AMER NOW
      ├─ RISK: additive + approving review + CI green  → MERGE, then pull again
      └─ RISK: contract-touching                        → approve; tell the owner it needs their merge

 4. Read current_state.md in full. Confirm §8's newest entry matches your prompt's FRESH.

 5. git checkout -b <agent>/<date>-<slug>

 6. Do §2 TASK.

 7. prettier --write every touched file → pnpm verify → READ THE REAL EXIT CODE

 8. pnpm state       (rewrites §8 and YOUR OWN prompt's FRESH; computes RISK; reports diff size)

 9. Write the entry:  handoff/<agent>/<date>-<slug>.md     the full body
                    + current_state.md §7 abstract          the eight fields
                    + YOUR OWN prompt's §2 TASK/NEW         never the other agent's

10. TWO PUSHES:
      (a) the agent's OWN PROMPT goes straight to main, alone — it is the only document read at
          t=0, before step 3 can merge anything, so a prompt travelling in the PR briefs the next
          session from a stale copy. Safe to merge early because it makes NO claim about code
          state (§1 constraints, §2 a plan); everything that DESCRIBES the code stays in the PR.
      (b) everything else · push the branch · open the PR
       title = the abstract headline
       body  = the abstract + REVIEW.md's checklist, unticked

11. Closing summary to the owner: what landed · what the PR needs (reviewer merge? owner merge? a
    ruling?) · what is owed.
```

⚠⚠ **The prompt therefore RUNS AHEAD OF THE REPO.** Between a hand-off and its merge, `FRESH` names
an entry main's code does not yet contain. Step 4 turns that into a signal rather than a trap: a FRESH
higher than §8 means _"merge the open PR first"_, never _"start work"_.

⚠⚠ **THE AUTHOR NEVER MERGES THEIR OWN ENTRY, AND THIS HAD TO BE LEARNED THE EXPENSIVE WAY.**
Decision 5 above says the _reviewing_ agent merges. That word is doing all the work, because **the
reviewer is by construction a LATER SESSION** — `REVIEW.md`'s entire justification is that _"a fresh
session has genuinely lost the author's working state, which is what makes a self-review worth doing
at all."_ Same session ⇒ same blind spots ⇒ not a review, whatever it is called.

**Entry 74 violated this, and the operational prompt is why.** Step 3 said _"RISK: additive +
approving + CI green → MERGE it"_ without scoping "it" to the PR that existed at t=0, and step 10(b)
ended at `gh pr create` with no terminal instruction. Composed, they read as permission — so the entry
was opened and merged minutes later, and it sits on `main` having never been read by a second party.
The ruling forbidding it existed **only here, in the design doc**, and was never transcribed into the
document anybody actually executes. That is §1e's _"a copy is a claim nobody will re-read"_ inverted:
the claim was never copied at all.

⇒ Fixed in Entry 75 at all three levels, because a prose fix alone would have been the same mistake
a third time: the **prompt** now scopes step 3 and terminates step 10(b); **this** decision row names
the constraint; and `docs:check` now **machine-checks** it — an entry carrying `AWAITING REVIEW` while
a newer entry exists fails the build. ⚠ The check necessarily fires one entry late (merging is a
GitHub action, invisible to a test in this repo), which is the honest limit of enforcing a
collaboration rule from inside the artifact.

**Step 3 precedes step 4 deliberately.** The reviewer works from the lenses and the diff — the PR carries
its own abstract — then merges, then reads a `current_state.md` that is actually current. Reading it
before the merge would mean reading a stale file and re-reading it afterwards.

### 7a. Entry numbering, and why it needs no mechanism

**The number is claimed in step 9, inside the PR**, as a §7 abstract row. If two parallel PRs both claim
73, the second to merge produces an **ordinary git merge conflict on one §7 row** — loud, standard,
roughly thirty seconds to renumber. No index file, no reservation protocol, no registry, and no owner
bookkeeping.

This is a direct application of the project's own finding (rules 9 and 10, Entry 62): _a rule holds when
violating it is loud._ The mechanism already required for merging **is** the collision detector.

### 7b. Flow control (owner-ruled)

Whoever runs next reviews the open PR — **including the same agent reviewing its own PR if it ran last.**
A self-review is a complete review (§11, decision 9). Nothing blocks; the project never waits on the other
machine being available.

---

## §8 — `REVIEW.md`

```
Every PR — your own or the other agent's. Tick each item, or state why it does not apply.

[ ] 1. REVERT-VERIFICATION — pick ONE of the author's claims.
       Actually revert the fix. Run the test. Confirm it goes RED. Paste the failure.
       ⚠ MANDATORY on a self-review too. No substitution.
       ⚠ Exception, and it must be NAMED: a browser-only measurement cannot be re-run
         headlessly. Do not tick it — write "unverified here: <claim> — Amer to confirm".

[ ] 2. BACKWARD SWEEP — does this add a rule or an invariant? If so, was every PRE-EXISTING
       site enumerated and checked? (This project's base rate: 9 dirty out of 18.)

[ ] 3. NEW KIND OF THING — if this adds one, what quantifies over "every one of them"?
       Consumers AND the invalidator AND the machinery. (D77 was clean against every
       consumer and dirty against the invalidator; Entry 59's sweep form could not have
       found it.)

[ ] 4. CLAIMS vs CODE — is every assertion in the diff's documentation read against the
       code? (§1c-7, four occurrences — including a design doc naming a field nobody
       checked, and a passing test that encoded the wrong loop.)

[ ] 5. NUMBERS — any figure quoted without a method? A claim with no method is not done.

[ ] 6. WEAK GREEN — for each new test, what would it take for that test to pass while its
       own title is FALSE? (§1b's second method; it found two P3 defects.)

[ ] 7. RISK — confirm `pnpm state`'s verdict matches the diff.
```

Item 1 is the highest-value line in this document. _"Revert-verified fifteen ways"_ is currently a claim
no second party has ever executed; this makes the project's single most important practice externally
confirmed for roughly two minutes of cost per PR.

---

## §9 — `pnpm state` and the generated block

`current_state.md` §8, machine-written:

```
<!-- GENERATED by `pnpm state` — never hand-edit -->
newest entry   73 (Zayd, 2026-07-31)          main tip  f08b7d6
open PRs       #12 zayd/2026-07-31-shapesig
tests          621 green
gates          typecheck 0 · lint 0 · format 0 · test 0 · reseed 0 · docs 0
protocol       21 live ops · 3 reserved (sectionCut, importIfc, instantiate)
registries     51 types · 39 commands · 1 codec · 0 views
schema         SCENE_SCHEMA_VERSION 2
frozen surface unchanged vs baseline          ⇒ RISK: additive
diff size      1,787 lines · 15 files          (reported, not gated — decision 12)
docs budget    current_state 38.2/40 KB · §7 9.8/12 KB · abstracts 10/10
```

Every line above is hand-typed prose today. The `registries` line matters most: the **counting** that
exposed rule 5's defect (`51 · 39 · 1 · 0`) becomes automatic every session, instead of once per sweep.

`pnpm state` also rewrites `FRESH` in the running agent's **own** prompt file, and never the other's.

---

## §10 — The two gates

Both join `pnpm verify` as gate six. `verify` is the CI step list exactly, so both run in CI as well.

### `tests/docs-budget.test.ts`

Fails on: `current_state.md` over budget · §7 over budget or holding more than ten abstracts · an abstract
missing any of the eight fields · §8 stale relative to the repository · an entry body in `handoff/` with
no matching abstract, or an abstract with no body.

The rotation threshold moves from a **count** to a **byte budget**, because §1c demonstrates a count-based
rule cannot see an entry doubling in size.

### `tests/freeze-boundary.test.ts`

A committed snapshot baseline of the frozen surface: `SubShapeRef` · `BimObjectType` (with `BuildContext`,
`VoidBuildContext`, `BuiltPart`) · all 39 `Command.argsSchema` · the `scene.json` entities · `ParamSchema` ·
`UndoableEdit` and `SceneChange` · the `.bnn` manifest · `SCENE_SCHEMA_VERSION`.

```
diff vs baseline?
   none  →  RISK: additive           →  the reviewing agent merges
   any   →  test FAILS, naming the exact field
         →  RISK: contract-touching  →  the OWNER merges (or rules, then updates the baseline)
```

This removes judgement from the one call where a wrong answer is irreversible.

> **The strategic consequence, which is larger than the merge routing.** _This test is the P5 freeze
> mechanism, available immediately._ The freeze has been "the owner's act" for seventeen entries partly
> because it is currently a **prose declaration** with nothing enforcing it. Once this baseline exists,
> freezing becomes a one-line policy change — _the baseline may no longer be updated without an owner
> ruling_ — and a machine holds the line afterwards. The freeze stops being an irreversible leap of
> judgement and becomes a switch, with enforcement.

---

## §11 — Decisions (owner-ruled, 2026-07-31)

| #   | Decision                                            | Ruling                                                                                                                                                  |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | How far the `current_state.md` restructure goes     | **Hot/cold split by audience** → `decisions.md` + `history.md`                                                                                          |
| 2   | How mechanical enforcement is                       | **Budget test + `pnpm state` generator, both gated** in `verify`/CI                                                                                     |
| 3   | Where the newest entries live, and their form       | **Fixed-schema abstract in §7; full body in `handoff/`**                                                                                                |
| 4   | Who may write each prompt file                      | **One writer per file** — each agent writes only its own §2                                                                                             |
| 5   | Who merges a reviewed PR                            | **Split by risk** — reviewer merges additive, owner merges contract-touching. ⚠ **And the reviewer is NEVER the session that wrote the PR** — see below |
| 6   | What a reviewer does with a finding                 | **Fix it in the PR, only with a test that fails without the fix**                                                                                       |
| 7   | What the review is made of                          | **Lens checklist + one independently re-run revert-verification**                                                                                       |
| 8   | Flow control when the same agent runs consecutively | **Whoever runs next reviews**; can't verify → flag for next Amer; blocking → owner runs Amer now                                                        |
| 9   | Does a self-review owe a later cross-review         | **No — a self-review is a complete review**                                                                                                             |
| 10  | How `RISK` is decided                               | **Machine-decided by the frozen-surface snapshot test**                                                                                                 |
| 11  | How the migration is carried out                    | **One dedicated session, its own PR, no feature work**                                                                                                  |
| 12  | Is there a PR size limit                            | **No — units stay whatever size the work is**                                                                                                           |

---

## §12 — Two consequences, recorded so they are not rediscovered

**Decision 9 — self-review is complete.** On recent history (`A A Z Z A Z Z`, Entries 66–72), roughly
half of all changes will be seen only by their author. What contains that exposure: checklist item 1 is
mandatory on a self-review, so the project's most important claim is always re-executed by a session that
has genuinely lost the author's working state; the backward sweeps remain as the retroactive net; and the
frozen-surface test routes every irreversible change to the owner regardless of who reviewed it. **The
exposure is therefore confined to recoverable, non-contract-touching defects.** Recorded because if a
defect class later shows up that a cross-review would plausibly have caught, this is the decision to
revisit — not the review protocol.

**Decision 12 — no size cap.** Real commits here run 600–3,011 lines across up to 23 files (Entries 64+65
were 3,011 lines in a single commit). Large diffs will be reviewed. This is less damaging here than it
would be elsewhere because the review is **lens-driven rather than line-by-line**, and a checklist scales
with diff size far better than reading does. `pnpm state` reports diff size in the PR body without gating
on it, so size stays visible without constraining the unit of work.

---

## §13 — The migration session

One session, no feature work, one PR — per decision 11 and the project's own recorded lesson that
housekeeping gets its own commit (Entries 64+65).

```
current_state.md                 394 KB → ~40 KB, restructured to §5's skeleton
decisions.md                     NEW — §4a's full rulings extracted
history.md                       absorbs §5's ~20 narratives + entries older than 10
handoff/                         NEW — the newest 10 entry bodies extracted, one file each
REVIEW.md                        NEW
open_rulings.md                  NEW — the eight owed questions, one row each
scripts/state.mjs                NEW — the generator
tests/docs-budget.test.ts        NEW
tests/freeze-boundary.test.ts    NEW  + tests/frozen-surface.snapshot baseline
package.json                     + "state", + "docs:check" inside "verify"
.github/workflows/ci.yml         verify gains gate six
Amer_Prompt.md · Zayd_Prompt.md  rewritten to §7's loop
```

**Acceptance:** `pnpm verify` exits 0 with six gates · `current_state.md` under budget · all ten abstracts
carry all eight fields · every abstract has a body and every body an abstract · `pnpm state` reproduces §8
byte-identically on a second run · the frozen-surface baseline matches `main` at the time of the split
(that is, the migration itself is `RISK: additive`).

**Expected outcome:**

|                                                 | Today                   | After                          |
| ----------------------------------------------- | ----------------------- | ------------------------------ |
| mandatory read per session                      | ~105,000 tokens         | ~12,000 tokens                 |
| independent check on any change                 | **none, ever**          | every change, checklist-driven |
| revert-verification confirmed by a second party | **never**               | once per PR, mandatory         |
| facts machine-checked                           | 0                       | ~10, every session, gated      |
| bookkeeping commits                             | 30%                     | ~0 (merge commits carry it)    |
| hand-maintained copies of one fact              | ~10                     | 2                              |
| parallel-agent collision                        | branch-and-split ritual | ordinary merge conflict        |
| rollback of one entry                           | not practical           | `git revert <merge>`           |

Throughput is expected to fall roughly twenty per cent per session. Against a codebase whose own audits
find real defects half the time someone looks with a lens, and where D68 spent eight days building on a
corrupted B-Rep, that trade is not close.

---

## §14 — What does not change

- The kernel, `packages/`, `apps/web`, the test suite, the contracts, the freeze scope.
- `cross_projects_policy.md` and `last_session_work.md` — box-local, not in git, unchanged.
- Box discipline (policy §6/§6a): the live production containers remain out of scope for any pause.
- The owner's interface: still one line, _"read and follow `<agent>_Prompt.md`."_
- Ownership: Amer owns `apps/web`; Zayd owns everything else. Review does not transfer ownership — a
  reviewer may fix a **proven** defect (decision 6), never redesign a layer it does not own.

---

## §15 — Prerequisites

1. **`gh` CLI** — installed 2026-07-31 at `~/bin/gh` (v2.97.0, user-local, no system packages touched).
   ⚠ `~/bin` is not on the default `PATH` on the dev box; the same `export PATH="$HOME/bin:$PATH"` the
   `pnpm` shim already requires covers it (`current_state.md` §6).
2. **`gh` authentication** — SSH auth to `origin` works (verified), which is sufficient for
   `git push`. Opening and merging a PR from the CLI additionally requires `gh auth login`, which is
   interactive and must be run by the owner once per machine. Until then, a pushed branch can be turned
   into a PR through the GitHub web interface.
3. **Amer's machine** needs the same two steps before it can review and merge.

---

## §16 — Open questions

**None.** All twelve design decisions are ruled (§11). This document is ready to execute as §13.
