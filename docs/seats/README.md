# Seats — the registry

> **This table is the registry.** `AGENTS.md §0` must agree with it; if a script ever parses seat identity
> mechanically (`docs/BACKLOG.md`'s `T-001`), it reads this file, not `AGENTS.md`, so the two cannot drift
> into silently disagreeing sources of truth.

**A seat is a role, an autonomy class and a GitHub account.** Seven seats exist org-wide and a seat _is_ a
role — `TheBeamstack/diwan` `docs/seats/README.md` is the canonical roster, and Bunyan adopts it rather
than minting seats of its own (`diwan` `docs/adr/0002-two-box-topology-and-the-capability-model.md` §2.2,
ratified 2026-09-04). Capability comes from a task's `requires:` field, probed at turn start; the reading
list comes from its `implements:`. There are **no work-area agents** — `apps/web` vs. everything else is a
standing fact of the seat's prompt, never a task grant.

<!-- BEGIN SEATS -->

| Seat      | Role      | Machine | GitHub account   | Prompt              |
| --------- | --------- | ------- | ---------------- | ------------------- |
| brahim    | steward   | box     | davidian-abdo    | Brahim_Prompt.md    |
| zayd      | builder   | box     | davidian-abdo    | Zayd_Prompt.md      |
| hmdnah    | reviewer  | box     | narutousomaki741 | Hmdnah_Prompt.md    |
| amer      | builder   | pc      | narutousomaki741 | Amer_Prompt.md      |
| khalihlna | reviewer  | pc      | davidian-abdo    | Khalihlna_Prompt.md |
| mahjob    | manager   | box     | narutousomaki741 | Mahjob_Prompt.md    |
| hamadi    | custodian | box     | narutousomaki741 | Hamadi_Prompt.md    |

<!-- END SEATS -->

All seven rows are registered, not a subset. `mahjob` and `hamadi` are org-wide seats that reach into this
repo rather than optional ones: `mahjob` owns `bunyan-oracle-runner` and its cost (ADR-0002 §2.10), and
`hamadi` owns the public surface Bunyan acquires the moment it stops being private (the same §2.10 makes
that a sequenced outcome, not a hypothetical).

## What a machine means

A **seat's** `machine:` is an **autonomy class**, not a host. It says who may drive the seat's turns.

| Value | Meaning                                                                            |
| ----- | ---------------------------------------------------------------------------------- |
| `box` | **unattended** — always on, so a loop may take its turns without the owner present |
| `pc`  | **attended** — it runs when the owner is at the machine, so no loop drives it      |

This is the only axis on which `amer`/`khalihlna` duplicate `zayd`/`hmdnah`, and it is why the duplication
stops at two: capability moved to the task, so nothing is left for a second per-machine seat row to say.
`hmdnah` is `hmdnah` whichever box it executes on — there is no `hmdnah2`, because none of the three things
a seat _is_ changes when the turn runs on another host.

A **task's** `machine:` is a different field and is being demoted to informational provenance; `requires:`
supersedes it as the claimable one (ADR-0002 §2.1). Bunyan has not ported `requires:` yet — that lands
after `maitre_d_ouvrage` proves the shape (ADR-0002 §5, step E after step D), so a task's `machine:` still
gates here today and `docs/BACKLOG.md` still describes it that way.

⚠ **A seat is never `machine: any`** (`diwan` ADR-0001 §3.2, ratified). A seat that cannot promise which
autonomy class its next turn runs under cannot honestly claim machine-gated work. `scripts/seats.mjs`
does not yet enforce this on the registry it reads — `docs/BACKLOG.md` `T-029`.

## Why the GitHub accounts are crossed, not per-machine

A same-machine same-account pairing cannot produce a real GitHub approval: the platform refuses an
approval from the account that opened the PR, and "the other seat on this machine" would still be that
same account if accounts were assigned per machine. So the account follows the **review relationship**,
not the box: `zayd` (box) and `khalihlna` (pc) share `davidian-abdo`; `amer` (pc) and `hmdnah` (box) share
`narutousomaki741`. Every builder's reviewer is, by construction, on the _other_ account — regardless of
which physical machine either of them runs on. On a free-plan org with no branch protection this crossing
is the only thing making an approval mean anything (`diwan` ADR-0001 §1.2). It is what lets
`gh pr review --approve` mean something here, which it never could under Bunyan's original single-account
setup — Entry 74 merged its own PR minutes after opening it, unread by any second party
(`docs/design/handoff_system_design.md` §§3, 7).

`brahim` reviews `mahjob` and `hamadi` — both `narutousomaki741`, and `brahim` holds `davidian-abdo`, so
the crossing holds. ⚠ `scripts/agent-start.mjs:576` refuses a steward the review limb outright, so that
routing cannot execute yet — `docs/BACKLOG.md` `T-030`. `brahim`'s own PRs are reviewed by whichever seat
runs next, per the general rule (`AGENTS.md §1.1`/§1.3), not by a seat this table names specifically.

## The turn shapes

Set out in full in `AGENTS.md §1`. In one line each:

- **builder** (`zayd`, `amer`) — claim one `ready` task, **push the claim before any work**, build it,
  open a PR, stop. ⚠ Reviews nothing, including the PR open at t=0 (`AGENTS.md §1.1`).
- **reviewer** (`hmdnah`, `khalihlna`) — claims **no task**; claims the open PR, and re-executes its claim
  (revert the fix, paste the red output) before anything else. Must therefore sit where it can run it.
- **steward** (`brahim`) — never builds. Owns readiness, sequencing, spec integrity, `docs/decisions.md`
  and the owner interface, for this repo.
- **manager** (`mahjob`) — org-wide technical authority: cross-repo sequencing (`diwan` `CROSS.md`), all
  infrastructure, cost. Ranks above a repo's steward in ordering only, never in privilege. Never builds,
  never merges its own PR.
- **custodian** (`hamadi`) — public surface: releases, advisories, Dependabot triage. Never builds, never
  merges its own PR. Horizontally scalable: a second custodian is a row here plus a prompt file.

`light_brahim` is **not a seat** — it is an orchestrator loop that claims nothing, so it holds no row.

## Why these files carry no state

Each prompt at the repo root holds a handful of **standing facts** — name, role, autonomy class, GitHub
account, and what its machine cannot verify — and nothing else. The shared mechanics of a turn live in
`AGENTS.md §1`, once, so seven prompts do not carry seven copies of the same loop. A fact that lives in one
place is a fact that stays true; a fact copied seven times is a fact that drifts once.

**Where the state went instead:**

| Question                 | Answered by                                                                     |
| ------------------------ | ------------------------------------------------------------------------------- |
| _What is next?_          | `docs/BACKLOG.md` — the only source, and its `ready` rows are the steward's act |
| _Am I current?_          | `scripts/agent-start.mjs`'s measured-vs-claimed refusal — it measures the repo  |
| _Who is working now?_    | `docs/CURRENT_STATE.md §0b`, the live claim, pushed before work begins               |
| _What did I just learn?_ | the entry's `§7` abstract + `handoff/<seat>/` body; durable traps go to `§1d`   |
