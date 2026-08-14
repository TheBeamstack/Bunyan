# BACKLOG

> **New at Entry 91 (D82).** Before this, "what's next" lived in each builder's own `§2 TASK` — a plan a
> seat wrote for its own successor, which is exactly the coupling `docs/design/handoff_system_design.md`
> found expensive (see `AGENTS.md §1.3`). `brahim` now owns readiness and sequencing here; seats decide
> what they take. `T-nnn` succeeds `Entry N` as the working unit for anything a builder or reviewer does;
> a steward turn carries no `T-nnn` and titles its PR `STEWARD: …` instead (`AGENTS.md §1.3`).

## Task IDs

Flat, monotonic, **allocated once and never reused** — the `PM-nnn`/`INV-nn` lesson mdo's own decisions
record applied to tasks: a stable id is never renumbered even when a task is re-sequenced, split, or
deferred, because re-planning must never invalidate a branch name, a PR title, or a `depends-on:`
reference. Branch: `task/T-014-versioned-entity-pattern`.

## What makes a task READY

All of the below, or it is not ready and **must not be claimed** — fix the entry or raise it in the log:

1. a stable id and a one-sentence outcome;
2. **`implements:`** naming the exact section(s) this task builds against — a `docs/contracts/*.md`
   section, a `docs/design/*.md` document, or a `D`-number in `docs/decisions.md`. Without this a claiming
   seat reads everything or guesses, and `AGENTS.md §2`'s three-tier reading rule cannot work;
3. an explicit **`verify:`** command a cold session can run (usually a `pnpm …` invocation);
4. a **`done-when:`** list that is checkable, not aspirational;
5. **`depends-on:`** listed, even when empty (`—`);
6. an **`area:`** — `kernel | document | apps-web | infra | design`. A reading-profile hint and a
   grouping key. **Not an identity, and not a claim filter** — ownership of a package tree (`apps/web` is
   `amer`'s; everything else is `zayd`'s, per `docs/seats/README.md`) is a separate, standing fact, not
   this field;
7. a **`machine:`** — `any | box | pc`. Where the task must be **executed**. The box is headless, so
   Playwright/WebGL/any browser-only measurement needs `pc`. A task with no `machine:` is refused at claim
   time — see the note below;
8. a **`risk:`** flag (`normal` | `high`) — set at decomposition, and **auto-`high`** when a task touches
   persistent naming (D1), the kernel identity cache (D29), the frozen surface itself, or the invalidator
   in `dependency.ts` (the class of defect `current_state.md §1c-8`'s sweep ledger keeps finding).
   `risk: high` **or** a mechanically-detected `RISK: contract-touching` (`tests/freeze-boundary.test.ts`)
   both make `scripts/agent-finish.mjs` write `NEXT TURN: REVIEW ONLY`, naming the resolved reviewer seat;
9. small enough to reach a green `pnpm verify` in one turn.

### `machine:` — the one that is safety-critical

`any` — neither machine's absence changes the result. `box` — the Hetzner dev box (headless: no
Playwright, no WebGL, no browser-only measurement). `pc` — the owner's local PC, **the only machine here
with a real browser**.

`scripts/agent-start.mjs` refuses to claim a task whose `machine:` the current seat cannot satisfy, and
for `pc` it **probes for a real browser** instead of trusting the label
(`BUNYAN_BROWSER_CMD=/path` overrides by naming an executable, never a boolean bypass). Without the
field, a box session would tick a `done-when:` item it physically could not have checked — the exact
failure `current_state.md AGENTS.md §0`'s invariant 9 exists to prevent.

**A `done-when:` list that mixes machines is a task that needs splitting**, not a `machine:` value
chosen generously.

## Status values

Four, and `done` means **merged** — nothing earlier in the list does.

- **`blocked`** — waiting on `depends-on:` or an `open_rulings.md` answer.
- **`ready`** — every READY criterion above is met, nobody has claimed it, and every id in
  `depends-on:` is `done`.
- **`review`** — a builder finished the work and its PR is open. `scripts/agent-finish.mjs` sets this
  itself; a builder finishing a task with no open item left in its `done-when:` list is refused unless
  the row already reads `review`.
- **`done`** — the PR **merged**. Only a reviewer's `scripts/agent-finish.mjs --review` (additive risk)
  or `brahim`'s readiness sweep (confirming a merge via `gh pr list --state merged`, the backstop for a
  `contract-touching` PR the owner merged) ever writes this.

**Why the extra state.** A dependency is satisfied by `done`, never by `review` — an open PR is not a
merged dependency (`scripts/seats.mjs`'s `canClaim` refuses mechanically on this, not just by
convention). Collapsing `review` into `done` at build-finish time — which is what a plain two-state
`ready`/`done` model does — would let a dependent task start against work nobody has reviewed yet,
exactly the race this field exists to prevent. Independent `ready` rows are never held up by this: only
a row that actually names the pending PR's task in its own `depends-on:` waits.

---

## Backlog

| ID  | Status | Task | Area | Machine | Risk | Depends on |
| --- | ------ | ---- | ---- | ------- | ---- | ---------- |

## Discovered

_(unplanned findings land here — never claimed in the same turn that found them, per `AGENTS.md §3`)_
