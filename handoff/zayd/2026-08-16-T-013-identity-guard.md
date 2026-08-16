# T-013 — the seat identity guard: `gh api user` must match the seat

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-16. **Decisions:** D87. **Task:**
`docs/BACKLOG.md` T-013.

## 1. What was missing

`gh` on box authenticates as exactly one account at a time, global in `~/.config/gh/hosts.yml` — a seat
whose `GH_TOKEN` is unset, mis-set, or expired silently falls back to the box's default identity
(`davidian-abdo`) rather than failing. GitHub's own self-approval refusal ("Can not approve your own pull
request") does not extend to `gh pr merge` — measured 2026-08-15 against `hmdnah`/T-008: the review was
refused, but nothing stopped `gh pr merge` for a repo admin. With no branch protection available on this
private, unprotected repo (Q13/D87), nothing on GitHub's side would have caught a seat merging under the
wrong identity — a self-approval in effect. `scripts/agent-start.mjs` had no check at all.

## 2. The fix

One new pure function plus one call site in `scripts/agent-start.mjs`'s existing step 0 (seat
resolution) — no new numbered step, so the file's step numbering (1–5) is unchanged:

- **`identityGate(seat, expectedAccount, actualLogin)`** (NEW, exported) — pure, given the two strings
  already resolved. `actualLogin === null` (identity unresolvable — `gh` missing, unauthenticated, or
  unreachable) is a refusal, never a skip, per `current_state.md §1d`'s standing lesson that a gate's
  hard part is the skip. A mismatch names BOTH accounts in the refusal text, so the reader knows which
  per-seat token file (`docs/RUNBOOK.md` "Seat credentials") to check. Comparison is case-insensitive —
  GitHub logins are case-preserving, not case-sensitive (`Davidian-Abdo` == `davidian-abdo`).
- **`resolveGhLogin(root)`** (new, private) — `gh api user --jq .login`, trimmed, or `null` on any
  failure (non-zero exit, `gh` not on `PATH`, etc.). Never throws, so `main()` always has an explicit
  "unresolved" value to hand `identityGate` rather than a second `try`/`catch` shape to get wrong.
- **Wired into step 0**, immediately after `seat`/`role`/`machine`/`prompt`/`account` are resolved and
  before anything else runs (before `1. Pulling`) — this fires for every seat and every turn shape
  (builder/reviewer/steward, `--continue`, `--review`), because it is a property of who is running, not
  of what kind of turn this is.

## 3. Verification

`pnpm verify`: **PASS**, exit 0 — `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test &&
pnpm reseed:check && pnpm docs:check`, all six gates green. Main suite: **95 test files, 888 tests,
0 failed** (real OCCT WASM golden-hard-geometry harness included, not the mock kernel).
`tests/freeze-boundary.test.ts` green ⇒ the frozen surface has not moved — `RISK: additive` (this PR
touches only `scripts/agent-start.mjs`, `scripts/agent-start.d.mts`, and
`tests/protocol/agent-start.test.ts`, no frozen byte). `docs:check` subset (18+27+12+38+14+9+8 = 126,
plus the repeated `agent-start`/`freeze-boundary`/`docs-budget` counted once more inside the
`tests/protocol` glob) reports **134 tests, 0 failed**.

**Revert-verified, live.** Commented out the guard's call site (`if (!idGate.ok) die(idGate.reason);` →
a no-op) and re-ran `vitest run tests/protocol/agent-start.test.ts`: **2 of 27 RED** — exactly the two
new end-to-end tests ("REFUSES the whole turn when gh reports an account other than the SEAT's own" and
"an UNRESOLVABLE identity is a hard refusal, never a silent skip"), both failing on `expect(r.code).not
toBe(0)` — i.e. the script proceeded past step 0 with a wrong/absent identity exactly as the task
describes the live defect. Restored the call site: **27/27 green** again. This is the literal shape
T-013's own `done-when:` asks for: "with the guard removed, a fixture seat carrying the wrong account
starts its turn."

Manually exercised the two refusal paths directly against the real repo (not just the fixture) too:

```
$ node scripts/agent-start.mjs --seat hmdnah --no-pull --no-claim
...
✖ gh is authenticated as 'Davidian-Abdo', but seat 'hmdnah' is 'narutousomaki741'.
  Check which per-seat token file should be exported as GH_TOKEN for this turn ...
  expected 'narutousomaki741', found 'Davidian-Abdo'.

$ PATH=<dir with only a node symlink, no gh> node scripts/agent-start.mjs --seat zayd --no-pull --no-claim
...
✖ could not resolve 'gh api user --jq .login' — gh is not installed, not authenticated, or unreachable.
  An unresolvable identity is a REFUSAL, never a skip: seat 'zayd' must be authenticated as
  'davidian-abdo' before this turn can start (docs/RUNBOOK.md "Seat credentials").
```

Both exit 1.

## 4. What the tests assert

`tests/protocol/agent-start.test.ts`:

- **`identityGate` — pure, no `gh` spawn needed**: a mismatch's refusal text contains BOTH accounts; a
  case-insensitive match (`Davidian-Abdo` vs `davidian-abdo`) is accepted; an unresolvable (`null`)
  login is refused with wording that says "never a skip," not merely "refused."
- **`step 0 — the identity guard, end to end`**: spawns the real CLI. A `gh` stand-in on `PATH`
  (`fakeGhReporting`, forwards every subcommand except `api user` to the REAL `gh`) reports
  `narutousomaki741` while claiming seat `zayd` (`davidian-abdo`) — refused, names both accounts, and
  never reaches step 3 (`measured state matches claimed state` does not appear in the output, proving it
  died in step 0). A `PATH` with no `gh` at all (only a symlinked `node`, so the spawn itself still
  works) — refused with the "never a skip" wording.
- **Every pre-existing test using `hmdnah`/`amer`** (whose account, `narutousomaki741`, is not this
  box's ambient `gh` identity, `Davidian-Abdo`/`davidian-abdo`) now runs through the same
  `fakeGhReporting` stand-in, prepended to `PATH`, so the identity guard passes and the ORIGINAL
  assertion (role/machine/claim refusals, unrelated to identity) is what actually gets exercised. This
  is a `PATH` stand-in, not a bypass flag inside the guard itself — the guard in `scripts/agent-start.mjs`
  has no test-only escape hatch of any kind.

## 5. RUNBOOK.md

Already documents the per-seat token file convention in full — written 2026-08-15 (D87) in anticipation
of this task: path `~/.config/bunyan/<seat>.token`, mode **600**, exported as `GH_TOKEN`, `gh auth
switch` rejected (global `hosts.yml`, concurrent seats on one box). No edit was needed; re-read it in
full to confirm it says nothing this implementation contradicts.

## 6. What this does NOT cover

- **File-mode enforcement.** `docs/RUNBOOK.md` documents that a per-seat token file must be mode 600;
  nothing in this PR checks the mode programmatically (the task's `done-when:` asks only that the
  convention be *documented*, not enforced — matches T-013's own wording).
- **`agent-finish.mjs`** carries no identity check of its own. Every `gh`-touching call it makes (label
  create, PR view/edit, merge instructions it PRINTS but does not run) happens on a branch a `--review`
  turn already passed through `agent-start.mjs --review`'s own identity gate for; adding a second check
  there would be a second gate that can disagree, the exact shape `scripts/seats.mjs`'s own header
  warns against. Not in this task's `done-when:` either.

## 7. Backward sweep (invariant 7)

This is a new admission gate at the very top of `agent-start.mjs`'s `main()`, ahead of everything else
the script does — there is no earlier call site for anything to have bypassed, and no other script
resolves seat identity independently (`agent-finish.mjs` trusts the branch it is already on, which
`agent-start.mjs` gated getting onto in the first place).

## 8. Files

- `scripts/agent-start.mjs` — `identityGate` NEW (exported), `resolveGhLogin` NEW (private); wired into
  step 0; module doc comment updated (two paragraphs).
- `scripts/agent-start.d.mts` — `identityGate` declared.
- `tests/protocol/agent-start.test.ts` — `fakeGhReporting` helper NEW; `identityGate` unit suite (+3);
  `step 0 — the identity guard, end to end` suite (+2); four pre-existing `hmdnah`/`amer` tests updated
  to run through the fake-gh `PATH` stand-in so their ORIGINAL assertions are what gets exercised.
