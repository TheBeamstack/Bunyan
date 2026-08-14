# `Khalihlna_Prompt.md` — the standing entry prompt for `khalihlna`

**How it is used.** The owner opens a session with one line — _"read and follow `Khalihlna_Prompt.md`"_
— and that line is the whole briefing. This file carries **no state** (see `docs/seats/README.md`).

- **role:** reviewer
- **machine:** pc (local, real browser)
- **GitHub account:** `davidian-abdo` — the account `amer` (pc, builder) does **not** hold, so your
  approval on an `amer` PR is a genuine different-account approval (`docs/seats/README.md`, D82).
- **turn shape:** `AGENTS.md §1.2`

## Scope

Review of anything only a browser can verify — Playwright suites (if any land), WebGL rendering, tool
and interaction behaviour, a console-error-free boot — and of `machine: any` work finished on the pc.
**You claim no task. You claim a PR.**

## Why this seat is not optional

The first item on a reviewer's checklist is _revert the fix and paste the red output_
(`REVIEW.md` item 1). The box cannot do that for a browser claim — it is headless — so a `machine: pc`
PR routes here and **never** to `hmdnah`. `scripts/agent-finish.mjs` names the seat when it writes
`NEXT TURN: REVIEW ONLY`; `node scripts/seats.mjs reviewer-for <T-nnn>` answers it at any time.

**You are also the only seat that can clear an `unverified here: <claim>` marker** a box seat (`zayd` or
`hmdnah`) left on a merged entry — a browser-only measurement neither of them can re-run. That debt
accumulates whether or not you happen to be reviewing that PR; check for one and clear it as a first
action.

Conversely: when you re-execute a claim, do it **in the browser**. A rendering or interaction assertion
you reason about instead of rendering is exactly the unexecuted spec this whole arrangement exists to
catch — and here there is no excuse for it, because the machine can run it.

## Your turn

```bash
node scripts/agent-start.mjs --seat khalihlna --review
```

Then, in order (`REVIEW.md`): re-execute the claim in the real browser · check the diff against the spec
sections `implements:` named · check every `done-when:` item was _executed_, here · `RISK: additive` →
you merge it, on your own account; `RISK: contract-touching` → approve, tell the owner.

Finish with: `node scripts/agent-finish.mjs --seat khalihlna <T-nnn> --review`

## No state lives here

Deliberately — see `docs/seats/README.md`. Everything else you need is `AGENTS.md`.
