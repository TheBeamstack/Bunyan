# Seats — the registry

> **This table is the registry.** `AGENTS.md §0` must agree with it; if a script ever parses seat identity
> mechanically (`docs/BACKLOG.md`'s `T-001`), it reads this file, not `AGENTS.md`, so the two cannot drift
> into silently disagreeing sources of truth.

**Identity is role + machine + GitHub account, and nothing else.** Capability comes from a task's
`machine:` field; the reading list comes from its `implements:` field. There are **no work-area agents** —
`apps/web` vs. everything else is a standing fact of the seat's prompt, never a task grant.

<!-- BEGIN SEATS -->

| Seat      | Role     | Machine | GitHub account   | Prompt              |
| --------- | -------- | ------- | ---------------- | ------------------- |
| brahim    | steward  | box     | davidian-abdo    | Brahim_Prompt.md    |
| zayd      | builder  | box     | davidian-abdo    | Zayd_Prompt.md      |
| hmdnah    | reviewer | box     | narutousomaki741 | Hmdnah_Prompt.md    |
| amer      | builder  | pc      | narutousomaki741 | Amer_Prompt.md      |
| khalihlna | reviewer | pc      | davidian-abdo    | Khalihlna_Prompt.md |

<!-- END SEATS -->

## What a machine means

| Value | Meaning                                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| `box` | the Hetzner dev box. Kernel/OCCT toolchain, the full headless test harness — **no browser**                                   |
| `pc`  | the owner's local PC. A real browser, so WebGL rendering, tool/interaction and any browser-only measurement can be _executed_ |
| `any` | _(tasks only)_ neither machine's absence changes the result                                                                   |

A task's `machine:` names where it must be **executed**, not who is interested in it. Ownership of a
_package tree_ (`apps/web` is `amer`'s; everything else is `zayd`'s) is a separate, standing fact — it does
not vary per task the way `machine:` does, because Bunyan's two builders own disjoint trees rather than
sharing a machine-gated pool of interchangeable work.

## Why the GitHub accounts are crossed, not per-machine

A same-machine same-account pairing cannot produce a real GitHub approval: the platform refuses to approve
a PR opened from the account that opened it, and "the other seat on this machine" would still be that same
account if accounts were assigned per machine. So the account follows the **review relationship**, not the
box: `zayd` (box) and `khalihlna` (pc) share `davidian-abdo`; `amer` (pc) and `hmdnah` (box) share
`narutousomaki741`. Every builder's reviewer is, by construction, on the _other_ account — regardless of
which physical machine either of them runs on. This is what lets `git pr review --approve` mean something
here, which it never could under Bunyan's original single-account setup — Entry 74 merged its own PR
minutes after opening it, unread by any second party (`docs/design/handoff_system_design.md` §§3, 7).

`brahim` is not in a builder/reviewer pairing — its PRs are reviewed by whichever seat runs next, per the
general rule (`AGENTS.md §1.1`/§1.3), not by a seat this table names specifically. It is registered under
`davidian-abdo` as a documented default (paired with `zayd`, both box-native); this is the one assignment
in this table that is a judgement call rather than a constraint, and it is written down so it can be
corrected rather than silently assumed a second time.

## The three turn shapes

Set out in full in `AGENTS.md §1`. In one line each:

- **builder** — review the PR found at t=0, claim one `ready` task, push the claim, build it, open a PR.
- **reviewer** — claims **no task**; claims the open PR, and re-executes its claim (revert the fix, paste
  the red output) before anything else. Must therefore sit on a machine that can run it.
- **steward** — never builds. Owns readiness, `machine:` assignment, sequencing, spec integrity,
  `docs/decisions.md` and the owner interface.

## Why these files carry no state

Each prompt at the repo root holds a handful of standing facts — name, role, machine, GitHub account, and
what that machine cannot verify — plus a `§2 DYNAMIC` block that the seat itself rewrites every session
(`FRESH`/`TASK`/`NEW`). The shared mechanics of a turn live in `AGENTS.md §1`, once, so five prompts do not
carry five copies of the same loop. This mirrors why `current_state.md`'s hot core stays small: a fact
that lives in one place is a fact that stays true; a fact copied five times is a fact that drifts once.
