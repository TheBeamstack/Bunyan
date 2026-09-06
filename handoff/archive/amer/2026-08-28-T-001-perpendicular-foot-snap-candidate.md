# T-001 — the perpendicular-foot snap candidate

## 1. What this task was

`docs/design/P4.5_interaction_model_design.md` §4.3 names `'perpendicular'` as a Tier-1 derived snap
kind, already declared in `SnapKind`, with nothing producing it. Q3 rules its priority: `endpoint >
intersection > midpoint > grid > perpendicular/extension > face-plane > free point`.

## 2. What was built (prior session, 2026-08-17)

`apps/web/src/tool/align.ts`:

- `referenceEdges` — pairs endpoint candidates by shared `ref`, never by proximity (the D1 anti-pattern
  one layer up: identity is derivation, not geometric matching).
- `perpendicularFeet` — the foot of the anchor's perpendicular onto a reference edge's line. Unclamped
  (a real perpendicular can land past either end of the visible edge, the same "deferred perpendicular"
  every CAD tool offers) and degeneracy-guarded (a zero-length edge has no direction to be perpendicular
  to).
- `perpendicularCandidates` — carries **no `ref`/`elementId`**, exactly as Entry 84 ruled for the
  alignment guide: a point reached perpendicular to a reference is on no sub-shape, so a hosted-void
  tool must decline it. No `SnapKind` was added — `'perpendicular'` was already declared, so this moved
  no frozen byte.

Wired into `apps/web/src/render/Viewport.ts` (`perpendicularAt`) and
`apps/web/src/render/ViewportCanvas.tsx`'s pointer-move pipeline, alongside the existing alignment guide.

**Headless:** `apps/web/src/tool/align.test.ts`, 12 new tests, one revert-verified (the degeneracy guard:
RED without it, GREEN with it).

**Browser-verified for real** (real OCCT kernel, real tessellated mesh, real pointer events) via a
Playwright driver against Chromium 148 (the newest cached build that could boot the kernel on this
machine at the time — Chrome 151 could not, a pre-existing, branch-unrelated regression, confirmed via
`git stash` against `main`). Candidate OFF: `perpendicularAt` stubbed ⇒ `kind='extension'` (Q3's
next-ranked candidate on this axis-aligned demo geometry), never `perpendicular`. Candidate ON:
`kind='perpendicular'`, point matches the analytic foot, and the committed wall's `end.x` equals its
`start.x` exactly — the perpendicular signature.

## 3. What this turn did (2026-08-28)

The prior session left the branch **implementation-complete and browser-verified**, but unable to close:
`agent-finish.mjs` requires a green `pnpm verify` unconditionally, and 5 `tests/protocol/*.test.ts` files
failed to even collect on this Windows machine (vitest 2.1.9 collection bug, unrelated to this diff —
recorded in the commit body, `415b1c7`). That defect was decomposed and fixed on `main` since: **T-020**
(vitest major bump `2.1.9` → `4.1.10`) plus **T-021** (`pnpm verify` actually reaches green on the pc,
PR #42) — a Windows symlink-extension fix in `agent-start.test.ts`'s own fixture, `vitest.config.ts`
`testTimeout`/`hookTimeout`/`pool`/`maxWorkers` tuning for `tests/protocol/*`'s real per-test subprocess
cost, and `agent-finish.mjs`'s own `execFileSync('pnpm', …)` → `seats.pnpmSpawn` fix (a bare `pnpm`
ENOENTs on Windows with no shell; `pnpm.cmd` EINVALs under Node's CVE-2024-27980 guard).

This turn: **merged `origin/main` into this branch** (`5e1afbf`) to pick those fixes up — one conflict,
in `current_state.md §0b`'s claim baton (HEAD's own live T-001 claim kept over `main`'s stale, already
merged-and-closed T-021 baton). Re-ran `pnpm verify`: full 974/974 across 99 files, `docs:check` (8
files/166 tests) green — confirming T-021's fix holds. One thing T-021 did **not** fully cover for this
seat: `agent-finish.mjs`'s own `pnpm verify` invocation ENOENTs the same way its handoff already
documents unless `BUNYAN_PNPM_CMD` is set for the session — this pc's only bare `pnpm` on `PATH` is a
POSIX shell script (`#!/bin/sh`, unusable by `execFileSync` with no shell), and `pnpm.cmd` needs the
`shell: true` guard the fix exists to avoid. Set
`BUNYAN_PNPM_CMD='["C:/Program Files/nodejs/node.exe","C:/Program Files/nodejs/node_modules/corepack/dist/pnpm.js"]'`
(identical to T-021's own documented value) for this run; no code change needed — this is a per-session
environment variable, not a repo defect.

Also confirmed the two `tests/protocol/*` test flakes seen on an intermediate standalone `docs:check` run
(`agent-start.test.ts`'s "an UNRESOLVABLE identity" test-timeout, `seats.test.ts`'s `beforeEach`
hook-timeout, both at exactly the 30000ms ceiling `vitest.config.ts` already documents as "gave it
headroom without masking a real hang") were **transient, not a regression**: an immediate rerun of
`pnpm docs:check` alone passed clean, 166/166, and the full `agent-finish.mjs` run's own `pnpm verify`
(inside which `docs:check` runs last, under whatever contention the rest of `verify` already created)
also passed clean, 166/166. Real subprocess latency under full-suite contention, exactly as the file's
own header comment already predicts — not chased further.

## 4. Verification

- `pnpm verify` — **exit 0**, this pc. typecheck/lint/format:check green; `pnpm test` 99 files / 974
  tests green (343.91s); `reseed:check` skipped (not a PR); `docs:check` 8 files / 166 tests green
  (166.85s).
- `tests/freeze-boundary.test.ts` stayed green inside the full run (19/19) — no frozen byte moved.
- Browser verification is unchanged from the prior session (still real, still on this exact machine); not
  re-run this turn since no browser-affecting code changed.

## 5. What this leaves

Nothing owed to `khalihlna` beyond the standing review of this PR (a `pc` task, `AGENTS.md §1.2`) — every
claim here is executed and measured on this exact machine, no `unverified here:` marker.

`brahim`/`zayd`: this turn needed `BUNYAN_PNPM_CMD` set by hand to run `agent-finish.mjs` at all, since
this pc's `pnpm` on `PATH` is a shebang script, not a `.cmd`/`.exe` `execFileSync` can spawn directly.
T-021's handoff already documents the exact value that works; nothing in the repo forces a fresh `amer`
session to know to set it before running `agent-finish.mjs` — worth a line in `Amer_Prompt.md` or
`docs/RUNBOOK.md` if this recurs. Not fixed here per invariant 10, only recorded.
