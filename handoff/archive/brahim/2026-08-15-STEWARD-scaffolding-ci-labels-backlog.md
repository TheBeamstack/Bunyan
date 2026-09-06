# STEWARD-scaffolding — the five-seat scaffolding, finished: CI, the labels, and a backlog that is mostly blocked

**Seat:** `brahim` (steward, box). **Date:** 2026-08-15. **Decision:** D82. **PR:** `STEWARD: …`, this branch.

⚠ **This entry covers TWO sessions.** Phases A and B were built on the pc and pushed as commit `f984e89`
(the mechanics: `scripts/{seats,agent-start,agent-finish}.mjs`, dependency closure, the two orchestrator
loops, the stateless prompt rewrite, `AGENTS.md`, `docs/BACKLOG.md`'s criteria). That commit deliberately
left four things and named them. This session, on the box, did those four. The `§7` abstract and this body
cover the whole turn, because the turn is the unit — not the session.

---

## 1. CI wiring

### 1a. `tests/protocol/` was already in CI, and the step name was lying about it

The thing Phase A listed as "needs wiring" **needed no wiring**. `package.json`'s `docs:check` reads
`vitest run tests/docs-budget.test.ts tests/freeze-boundary.test.ts tests/protocol`, and CI's own step
runs `pnpm docs:check`. Measured, on this box:

```
$ pnpm docs:check
 ✓ tests/protocol/seats.test.ts (15 tests)
 ✓ tests/protocol/agent-start.test.ts
 ✓ tests/protocol/agent-finish.test.ts (6 tests)
 …
 Test Files  6 passed (6)   Tests  69 passed (69)
```

So the suite has run in CI since the moment that path landed. What was wrong was the **step name** —
`Handoff docs + freeze boundary` — which describes two of the three things it runs. That is the same
shape of defect as the re-seed gate that went 73 entries without executing: not a broken step, a step
whose label stops anyone checking. Renamed to `Handoff docs + freeze boundary + seat protocol`, with a
comment saying why the rename is the whole of the fix.

⚠ **I did not add a second CI invocation of `tests/protocol`.** Running it twice would have made the
"wiring" visible in the diff and changed nothing about what executes.

### 1b. The reserved-class labeller — `scripts/reserved-classes.mjs`

Detects `AGENTS.md §5`'s three owner-gated classes and writes them onto the PR as `needs-operator/*`
labels.

| Class               | Decided by                                                                      |
| ------------------- | ------------------------------------------------------------------------------- |
| `contract-touching` | `riskVerdict()` over `diffSurface()` — **the same functions `pnpm state` calls** |
| `legal-figure`      | `CLA.md` changed (`open_rulings.md` Q11/Q12)                                     |
| `freeze`            | `tests/frozen-surface.snapshot.json` changed — a re-baseline                     |

Four decisions inside it are worth reading before changing it:

1. **It reuses `riskVerdict`/`diffSurface` rather than re-deriving the verdict.** A label and a `§8`
   `RISK:` row that can disagree would be worse than having neither — that is the reason `seats.mjs`
   exists as one file, and it applies here identically.
2. **It reads the baseline out of the BASE ref, not the working tree.** This is Q15's defect verbatim,
   and it would have reincarnated here: a PR that re-baselines has rewritten the working-tree snapshot,
   so measuring against it compares the surface with itself and reports `additive` on precisely the PR
   that must not be. `tests/protocol/reserved-classes.test.ts` builds that exact branch and asserts
   `contract-touching` comes back anyway.
3. **`freeze` and `contract-touching` are separate questions and a PR can carry either alone.** A
   metadata-only edit to the snapshot moves no declaration — that is `freeze` with no
   `contract-touching`, and it is the P5 ruling's own case. Collapsing them would drop it. Pinned by a
   test that asserts the second is *absent*.
4. **It does not block, and it does fail when it cannot label.** The owner merges these classes, so a red
   check on the owner's own PR is noise they learn to click past. But a labeller that silently no-ops is
   indistinguishable from an additive PR, which is `§1c-7` again — so failing to apply a label it decided
   on is exit 1, with the `gh label create` lines in the error text.

⚠ **`legal-figure` fires on ANY `CLA.md` change, not only on the placeholder moving**, and the detail
line says which kind it is. `AGENTS.md §5.2` scopes the class to `<LEGAL ENTITY>`; I widened the trigger
because the asymmetry is total — over-labelling a typo fix costs the owner one click, under-labelling
costs what Q11/Q12's own cost-if-deferred column says cannot be cured retroactively.

### 1c. The title/mergeable check — `scripts/pr-ready.mjs`

- **Title routes** (`T-nnn: ` / `STEWARD: `). `agent-finish.mjs` already refuses to *print* a
  non-routing `gh pr create` line — but that binds only a seat that ran it and pasted what it printed.
  `--fill`, a hand-typed title, and `gh pr edit --title` all reach GitHub without passing through it.
  ⚠ **The regex moved to `seats.mjs` as `PR_TITLE_RE`/`titleRoutes`** and `agent-finish.mjs` now calls
  it; two copies would be two gates that can disagree.
- **`gh pr view` reports `MERGEABLE`.** ⚠⚠ **`mergeable` is computed asynchronously and starts as
  `UNKNOWN`** — GitHub kicks off a background merge test on every push. Reading it once, on a push,
  reads `UNKNOWN` most of the time. Treating `UNKNOWN` as green makes the gate decorative; treating it as
  red makes CI flaky on a healthy PR. **It polls, and reports `UNKNOWN` as its own outcome** ("re-run the
  job"), never as either verdict. That is the behaviour the tests pin, by injecting the view seam — the
  one state you cannot ask a live API to hold still in.

### 1d. Where they run

A **separate `pr-shape` job**, `if: github.event_name == 'pull_request'`, with
`permissions: pull-requests: write`. Two reasons and neither is tidiness: the verify job must not carry
a write token to run tests, and the checks are meaningless on a push to `main`. ⚠ It runs **no
`pnpm install`** — both scripts import only Node builtins plus this repo's own `scripts/*.mjs`, and a job
that installs a workspace to run two files goes red when a dependency does. ⚠ `fetch-depth: 0` is
load-bearing here for the same reason it is in `verify`, and its absence would fail **silently**: `git
show` returns empty, the scan falls back to the working-tree baseline, and defect 2 above is live again.

---

## 2. GitHub setup

### 2a. Labels — DONE

All three created on `Davidian-Abdo/Bunyan` and verified present:

```
needs-operator/contract-touching  #B60205
needs-operator/legal-figure       #D93F0B
needs-operator/freeze             #5319E7
```

`tests/protocol/reserved-classes.test.ts` asserts the three strings match `docs/RUNBOOK.md`, so renaming
one in either place is caught by `pnpm docs:check` rather than by a PR going quietly unlabelled months
later.

### 2b. Branch protection — ⚠⚠ NOT DONE, AND NOT BECAUSE I DID NOT TRY

```
$ gh api repos/Davidian-Abdo/Bunyan/branches/main/protection
{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.","status":"403"}
$ gh api repos/Davidian-Abdo/Bunyan/rulesets
{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.","status":"403"}
```

Both APIs — legacy protection **and** rulesets. `Bunyan` is a **private repository on a free personal
plan**, and protection on a private repo is a paid feature. Not a token problem: `repo` + `admin:org`,
`viewerPermission: ADMIN`.

⚠ **This is a NEW blocker on Q13, and it replaces the old one.** Q13 said _"not yet — take it the day
Amer (or anyone) has their own account."_ **That condition is met** — `narutousomaki741` exists with
`push`, and the crossed-account pairing means every builder/reviewer pair already differs by account. The
account objection is gone; a plan/visibility one nobody had measured took its place. Q13 has been
rewritten with the measurement and now asks a different question: **public, or Pro, or neither?**

`docs/RUNBOOK.md §Branch protection` carries the trade table and the exact `gh api` call to run the day
one of them happens. ⚠ **`enforce_admins` is `false` in it, deliberately**, and the RUNBOOK says why at
length: `brahim`'s readiness sweep is a direct commit to `main` by design (`AGENTS.md §1.3`), and the
owner's own merge of a `contract-touching` PR has nobody left to approve it under GitHub's self-approval
refusal. The self-merge Q13 actually cares about is held by
`required_approving_review_count: 1` plus that same refusal, neither of which `enforce_admins` affects
for a `push`-only account.

**Owner action, when you want it:** either make the repo public (⚠ which is what invites the first
external PR, and **Q11/Q12 are still unruled** — that is the contribution `CLA.md` is not ready for), or
upgrade to Pro. Then one `gh api` call from the RUNBOOK.

---

## 3. Backlog decomposition — and the shape of it is the finding

Eleven rows, `T-001`–`T-011`. **Four are `ready`, three of those are `pc`, and one is `box`.**

That is not a thin decomposition; it is what is actually there. Everything else in v1.0.0 is waiting on
one of two things a builder cannot clear:

- **Four owner rulings** — `open_rulings.md` Q17a (BLOCKING), Q17c, Q18, Q19. ⚠ Every one of them is a
  measured silent-under-report reachable through the shipped verbs, and Q19's is the worst on record: **a
  document reporting ZERO total volume with `basis: 'exact'` and every diagnostic empty**, reached by
  deleting a parent element.
- **Two open PRs that predate this system** — **#16** (Entry 90, D66's lazy-build design + measurement)
  and **#17** (Entry 89, the gizmo + the corner-drag `containerId` fix).

⚠⚠ **THE NEXT ACT ON BOTH MACHINES IS A REVIEW, NOT A CLAIM.** #16 and #17 carry `Entry N` titles, so
they get no `T-nnn` row — they are claimed through `agent-start.mjs --review` off the open-PR list, which
is what both orchestrator loops do at step 4 anyway.

**On expressing "waits for PR #16":** `depends-on:` is the *mechanical* field — `canClaim` closes over it
and it can only close over a `T-nnn`. A PR number in there would parse to `[]` and read as *no
dependency*. So those rows carry a separate **`blocked-by:`** line naming the PR, and their status cell is
`blocked`, which `readyFor` already excludes. Nothing silently becomes claimable.

**T-004 is `ready` and the other D66 rows are not, on purpose.** T-004 names only things on `main` today
(`D66`, `§1a`, `tests/document-heap-scale.test.ts`); T-005/T-006 name a design document still on PR #16.
⚠ And T-004 is the row I would defend hardest: Entry 90 measured lazy build on **54 elements** and said
in writing that _"flatness at 54 is not flatness at 10,000"_, while D48's binding target is 10,000+.

**T-009/T-010 are one piece of work split across two rows**, because `docs/BACKLOG.md`'s own rule says a
`done-when:` list that mixes machines is a task that needs splitting. Q18's rule lives in the document
layer (box, headless); the "two doors on one wall" gesture is only checkable in a browser (pc). One row
would have let a box seat tick a criterion it physically could not run — invariant 9, exactly.

---

## 4. What I found that nobody asked me to look for

**`current_state.md` claimed the plan/section unit was BLOCKED in two places while three others said it
SHIPPED.** `§3`'s _"No 2D views — the plan/section unit is designed and blocked on rulings Q1–Q3"_ and
`§5`'s Zayd row 1, _"the moment Q1–Q3 are ruled, and not before"_ — against `§5`'s own ✅ CLOSED list,
`open_rulings.md`'s ✅ RULED section, and the artifact: Q1–Q3 ruled 2026-08-03, unit built in Entry 77,
PR #5 merged, `tests/plan-section.test.ts` (10 tests) and `views` in `scene.ts` on `main`. Verified before
touching either line.

Both fixed here per `AGENTS.md §3` row 1. ⚠ **The class is worth more than the instance:** both stale
rows were phrased as _"blocked on a ruling"_ — a status nobody re-reads once the ruling arrives, because
the arrival gets recorded somewhere else (a ✅ RULED strike, a ✅ CLOSED line) and nothing walks back to
the row that was waiting. Fourteen entries. A steward's readiness sweep is the mechanism that should
catch this class going forward, which is an argument for the sweep existing that I had not had before.

Also recorded in `## Discovered`: **`scripts/state.mjs --rebaseline` crashes when `tests/` does not
exist** (it `writeFileSync`s with no `mkdir`). Unreachable in this repo, reachable from a bare fixture.
Recorded rather than fixed — `AGENTS.md §3` says a finding is not claimed in the turn that found it.

---

## 5. What I did NOT do, and why

- **Branch protection** — §2b. Blocked on a plan decision that is the owner's.
- **A cross-account approval check in CI** as a substitute preventive control. I proposed it; the owner
  declined it and scoped item 1 to the three parts. Recording it here so the next steward does not
  re-propose it as though it were an oversight.
- **`instantiate`, MT (D8), WebGPU, the PWA/Cloudflare deploy, the FSA adapter** — `§5`'s "Later" list is
  post-freeze by ruling and the freeze has not happened. Rows nobody may claim, placed above rows
  somebody must, make the backlog worse.
- **Reviewing or merging PRs #16/#17.** A steward never builds and never reviews a build PR; both route
  to `hmdnah`/`khalihlna` by machine.

## 6. OWES

- **The owner:** rulings on Q17a, Q17c, Q18, Q19 (four rows, four blocked tasks), and the
  public/Pro/neither call on Q13.
- **The next `hmdnah` turn:** PR #16 (box). **The next `khalihlna` turn:** PR #17 (pc).
- ⚠ **Nothing is `ready` for `box` beyond T-004.** If a `zayd` turn finds only T-004 and it is taken,
  `agent-start.mjs` refuses and that is correct behaviour, not a bug — it is the soft-pause path in
  `docs/prompts/brahim-orchestrator.md` step 5.
