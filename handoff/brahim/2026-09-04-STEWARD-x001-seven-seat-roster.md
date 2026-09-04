# STEWARD — the seven-seat roster adopted, and the two gaps adopting it opens

**Seat:** `brahim` (steward on box) · **Date:** 2026-09-04 · **Branch:**
`brahim/2026-09-04-x001-seven-seat-roster`

## 1. Why this turn exists

The owner ratified `TheBeamstack/diwan` `docs/adr/0002-two-box-topology-and-the-capability-model.md` on
2026-09-04. Bunyan's roster files predate it and now disagree with the running design. `diwan`'s `CROSS.md`
tracks this as `X-001`, whose Bunyan child is `docs/seats/README.md` plus `scripts/seats.mjs`'s
three-function `any` collapse.

`X-001`'s own outcome is that no file in the org still asserts a five-seat roster, a per-repo seat, or
`machine:` as a host. The rulings this turn works from, read in the ADR rather than summarised from a
brief:

- **§2.1** — a **task's** `requires:` supersedes its `machine:`, which becomes informational provenance.
- **§2.2** — a **seat's** `machine:` is *not* informational; it becomes an **autonomy class**, `box`
  unattended and `pc` attended. Seven seats, org-wide, and a seat *is* a role. `amer`/`khalihlna` duplicate
  builder/reviewer for the pc, and that is the only duplication, because it is about autonomy rather than
  capability.
- **§2.3** — capability is probed at turn start; a seat lacking one refuses the turn and **leaves the task
  claimable**. Review routing by role + account crossing is unchanged.

## 2. What Bunyan's own protocol required

`node scripts/agent-start.mjs --seat brahim` ran clean (exit 0). The `identityGate` (T-013) resolved
`gh api user` → `Davidian-Abdo` and matched it against the registry's `davidian-abdo` for `brahim`; a
mismatch would have died before anything else happened. It measured the repository against
`current_state.md §8` ("✔ measured state matches claimed state"), printed the live claims, and routed to
the **steward** turn shape: *"You never build. You decide what is ready and which machine it needs; seats
decide what they take."*

**So this turn claims no `T-nnn`.** A steward turn carries none by construction (`AGENTS.md §1.3`), and a
builder could not have taken this work either: there was no `ready` row for it, and minting one is the
steward's act — `agent-start.mjs` refuses a claim rather than let a seat widen a field to make something
claimable (`AGENTS.md §6`). The output's own closing line names the finish: `agent-finish.mjs --seat brahim
<T-nnn|STEWARD-slug>`, and a spec fix is a `STEWARD:`-titled PR reviewed by whoever runs next.

**That is also why `scripts/seats.mjs` is not in this diff.** `brahim` never builds. The `any` collapse is
decomposed into `T-029` instead, with its measurements below so the claiming seat starts from evidence
rather than from this prose.

## 3. What changed

| File | Change |
| --- | --- |
| `docs/seats/README.md` | seven rows; `machine:` restated as an autonomy class; the crossing restated for `mahjob`/`hamadi`; the two live gaps named with their task ids |
| `AGENTS.md` §0 | the roster it "must agree with"; §1's stale *"three shapes, one per role"*; §6's *"Five prompt files"* |
| `current_state.md` §0 | the Actors table, and the two *"five seats"* sentences in §0/§0b |
| `Mahjob_Prompt.md`, `Hamadi_Prompt.md` | NEW — four standing facts each, no state |
| `docs/BACKLOG.md` | `T-029`, `T-030` NEW and `ready`; `T-031` NEW and `blocked`; one `## Discovered` row |

**No `scripts/`, no `packages/`, no snapshot byte, no code.**

### Why all seven rows, not a subset

`diwan`'s roster permits a repo to adopt "the subset it actually uses", so this was a judgement rather than
a transcription. Both new seats reach into Bunyan concretely, and ADR-0001 §8's change manifest for Bunyan
already exercised the judgement and reads *"Add `mahjob`, `hamadi`"*:

- `mahjob` (manager) owns infrastructure and cost org-wide, which here is `bunyan-oracle-runner` — ADR-0002
  §2.10 is a ruling about *this repo's* runner and the sequence that retires it.
- `hamadi` (custodian) owns the public surface. Bunyan is private today, and the same §2.10 makes it going
  public a sequenced outcome (`brahim` judges readiness, the owner approves the disclosure), not a
  hypothetical.

**The crossing is preserved and was checked row by row.** Both new seats sit on `narutousomaki741` and are
reviewed by `brahim` on `davidian-abdo`. No account is reused in a way that lets a reviewer share an
account with the work it reviews, which on a free-plan org with no branch protection is the only thing
making an approval mean anything (ADR-0001 §1.2). No rows were merged.

## 4. What was verified by running, not by reading

**The three line numbers in the brief and in ADR-0001 §0.1, checked against `HEAD` (`grep -n`):**

| Cited | What is actually there |
| --- | --- |
| `reviewerFor:403` | **exact** — `403` is `m = finishingSeat ? machineOf(root, finishingSeat) : 'box'`, the collapse itself |
| `builderFor:471` | **off by one** — `471` is `if (!m) throw`; the collapse is `472`/`473` |
| `reviewerForBranch:454` | **`reviewerForBranch` has no `any` branch of its own.** `454` is `return { ...reviewerFor(root, m, finishingSeat), reason: null }`, and its `m` comes from `machineOf(root, fromSeat)` — a *seat's* machine, so it is `box` or `pc` and never `any`. It inherits the collapse through the call rather than containing one |

ADR-0002 §2.1's numbers (`392`, `442`, `467`) are the three **function declarations** and are exact.
`T-029` therefore asks the claiming seat to state whether `reviewerForBranch` needed a change at all,
rather than assuming a third edit that may not exist.

**The collapse, on the CLI:**

```
$ node scripts/seats.mjs reviewer-for any          # no finishing seat
hmdnah
$ node scripts/seats.mjs reviewer-for any amer
khalihlna
```

An `any` task with no finishing seat resolves to `hmdnah` — a `box` reviewer, chosen by a hardcoded default
and reported as though it were an answer. Nothing in the returned value says a default was taken.

**The registry parses with seven rows, unchanged:**

```
$ node scripts/seats.mjs list
brahim steward box davidian-abdo Brahim_Prompt.md
zayd builder box davidian-abdo Zayd_Prompt.md
hmdnah reviewer box narutousomaki741 Hmdnah_Prompt.md
amer builder pc narutousomaki741 Amer_Prompt.md
khalihlna reviewer pc davidian-abdo Khalihlna_Prompt.md
mahjob manager box narutousomaki741 Mahjob_Prompt.md
hamadi custodian box narutousomaki741 Hamadi_Prompt.md
```

`seats.mjs`'s header claims *"nothing here hardcodes a seat name; adding a sixth seat is a row plus a
prompt file"* — measured true. `pnpm docs:check` is **166 passed (8 files)** with the seven-seat table,
so the roster change is inert against every gate that reads it. `tests/protocol/*` use their own fixture
registry, which is why nothing went red; `T-029` carries updating that fixture, because a fixture
describing a roster that no longer exists is a test asserting something weaker than its name.

## 5. What this turn found

**Two defects, both measured, both consequences of prose that already ships. Neither is fixed here** —
`AGENTS.md §3` forbids claiming a finding in the turn that found it, and both are code. They are `T-030`.

**(a) A steward cannot take the review limb.** `docs/seats/README.md` now routes `mahjob`'s and `hamadi`'s
PRs to `brahim`, and that routing cannot execute:

```
$ node scripts/agent-start.mjs --seat brahim --review --no-pull
...
5. Turn shape — steward
✖ A steward does not review build work — it never builds or merges.
   exit 1
```

`agent-start.mjs:576`. This is Bunyan's copy of ADR-0001 §0.1 defect 1, which found the identical refusal
at `maitre_d_ouvrage`'s `agent-start.sh:482` blocking the same "reviewed by `brahim`" routing. The fix must
keep the refusal for **builder** work — the `T-028` reasoning behind it is sound there — and open it only
for a `manager` or `custodian` PR.

**(b) The steward's readiness view lists nothing, and has not for some time.** `agent-start.mjs:755` reads
`/^\| (T-\d{3}) \| ready \|/gm` against a table prettier pads to its widest cell (`| ready  |`, two
spaces). Measured against the committed `docs/BACKLOG.md`:

```
agent-start.mjs:755 regex  -> 0  []
seats.mjs:readyFor regex   -> 8  ["T-006","T-010","T-019","T-023","T-026","T-025","T-028","T-027"]
```

The section prints its heading, *"Ready rows, and which BUILDER seats can satisfy each:"*, and then an
empty list — which reads exactly like "nothing is ready", the same way a CI job that never ran reads
exactly like green (`current_state.md §1c-7`). `seats.mjs`'s own `readyFor` uses `\s*ready\s*` and is
correct; the padded-table defect was fixed there by PR #19 (*"the backlog status regexes never matched the
committed table"*) and never swept back into `agent-start.mjs`. That is invariant 7 — *a new rule binds the
next consumer and nothing else* — caught in the act, in the very script that enforces the protocol.

## 6. What was deliberately left out of scope

**`requires:` is not ported, and that is the ADR's own sequencing rather than a shortfall.** ADR-0002 §5
orders Bunyan's three functions at step **E**, after `maitre_d_ouvrage`'s step **D**, and states it as
*"the proven diff, ported — never simultaneously with D"*. mdo's `T-106` is implementing that mechanism
now, in parallel. Porting a shape that is not yet proven would give the org two disagreeing definitions of
what a seat may claim, which is the failure §2.1 names explicitly. `T-031` records the whole change and is
`blocked`; `brahim` flips it when mdo's PR has merged.

Because of that, **a task's `machine:` still gates a claim in Bunyan today**, and `docs/BACKLOG.md` and
`AGENTS.md §0` both say so plainly rather than describing a mechanism this repo does not have. A seat's
`machine:` *is* now an autonomy class in every file — the two fields have been separated in the prose even
though only one of them has moved in the code.

**`REVIEW.md`'s false self-review claim is recorded, not fixed.** It asserts GitHub itself refuses the
Entry 74 self-merge; GitHub refuses the author's *approval*, not the merge, and what refuses it here is
`identityGate`. ADR-0001 §8 names that correction as Bunyan's, but `CROSS.md` `X-001`'s Bunyan child is the
roster and `seats.mjs` only — it appears in `X-000`, which is labelled EXAMPLE and is not a live row. It is
in `## Discovered`, with a second finding: `ci.yml:91` sets `HEAD_REF`/`BASE_REF` for
`tests/prompt-sync.test.ts`, and no such file exists.

## 7. What could not be verified here

- **`diwan/scripts/roster-check.sh` was not run.** `diwan` is not cloned on this box and this turn read it
  through `gh api`. Its reported drift for Bunyan (`mahjob` and `hamadi` `MISSING`) is taken from the
  brief; what is verified here is that the table now carries the same seven rows, in the same order, with
  the same accounts as `diwan/docs/seats/README.md`, compared row by row.
- **The two new seats have never taken a turn in this repo.** `--seat mahjob` and `--seat hamadi` cannot be
  exercised from here: `identityGate` requires `narutousomaki741` and this session holds `davidian-abdo`.
  What is proven is that the rows parse and that the one routing they need — `brahim` reviewing them — is
  currently refused (§5a). ⚠ `unverified here: a mahjob or hamadi turn starts cleanly — a
  narutousomaki741 session to confirm`.
- **`git remote -v` reads `git@github.com:Davidian-Abdo/Bunyan.git`**, while the repo is
  `TheBeamstack/Bunyan`. GitHub redirects, so it works; ADR-0001 §8 already carries *"Fix every
  `Davidian-Abdo/Bunyan` path — repo already transferred, doc stale"* for `docs/RUNBOOK.md`. Not touched
  here, and not this epic's.
- **CI on `bunyan-oracle-runner` has not been observed for this branch.** The runner is self-hosted, so a
  job starting is not something to assume — check it, do not read "no runs" as green.
