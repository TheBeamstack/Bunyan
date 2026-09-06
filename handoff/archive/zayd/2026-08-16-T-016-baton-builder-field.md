# T-016 — `§0b`'s baton carries the builder separately from the current holder

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-16. **Decisions:** none new; closes the
gap Discovered 2026-08-15. **Task:** `docs/BACKLOG.md` T-016.

## 1. What was missing

`current_state.md §0b`'s baton had only `seat`/`role`/`machine`/`task`/`branch`/`claimed-at`/`status`.
`agent-finish.mjs --review` rewrites all of these to name the REVIEWING seat, so the moment a
`risk: high` or `contract-touching` task enters review, the baton's only notion of "who" becomes the
reviewer — the builder's identity survives nowhere in `current_state.md` itself, only in that branch's
claim commit message (`claim: T-nnn by <seat> (<machine>)`). T-015's `--continue` had already routed
around this by deriving the admitted builder from the task's own `machine:` field (`seats.builderFor`)
rather than trusting the baton at all — a workaround, not a fix, per the owner ruling that opened this
task: "fix the baton itself, not only route around it."

## 2. The fix

- **`renderBaton`/`parseBaton` (`scripts/agent-start.mjs`)** — `renderBaton` now takes a `builder`
  field, rendered right after `seat` in the table (`builder ?? seat` so a pre-T-016 baton with no
  `builder` row still renders identically to before). `parseBaton` needed no change — it already parses
  arbitrary `| field | value |` rows generically.
- **The initial claim (`agent-start.mjs`, the "push the claim before work begins" step)** — writes
  `builder: seat`, since every first claim through this path is a builder claiming its own task. This is
  the ONE place `builder` is ever set from scratch.
- **`agent-finish.mjs`'s baton rewrite, at the end of a turn** — new pure, exported `resolveBuilder(review,
  priorBaton, seat)`: a `--review` finish returns the PRIOR baton's `builder` unchanged (falling back to
  the finishing seat only if the prior baton had none — an unreadable/pre-T-016 baton); a plain finish
  always returns the finishing seat, unchanged from what the code did before this field existed. The
  prior baton is read with `parseBaton` off `current_state.md` as it stood before this finish's rewrite.
- Extracted as a pure function (mirroring `setRowStatus`'s existing pattern in the same file) because the
  baton-write step in `agent-finish.mjs` runs AFTER `pnpm verify`, past what this repo's test fixtures
  can reach (`tests/protocol/agent-finish.test.ts`'s own scope note) — a unit test on the decision itself
  is the only way to test-first and revert-verify it without a fixture that can pass a real `pnpm verify`.

## 3. Verification

`pnpm verify`: **PASS**, exit 0 — **95 test files / 907 tests** in the main `pnpm test` pass, **151
tests** in the `docs:check` subset (`docs-budget`, `freeze-boundary`, `tests/protocol/*` re-run against
the committed docs), `tests/freeze-boundary.test.ts` green ⇒ the frozen surface has not moved. Only
`scripts/` and `tests/protocol/` touched — no `packages/`, no `apps/web`.

**Revert-verified.** Reverted `resolveBuilder`'s body to `return seat;` (the exact pre-fix shape — a
review finish always names the finishing seat) and ran
`vitest run tests/protocol/agent-finish.test.ts -t resolveBuilder`: **1 of 3 RED** —
`expected 'hmdnah' to be 'zayd'` on "a review finish carries the PRIOR builder forward, never the
reviewing seat." Restored the real body: **3/3 green** again, confirmed with a second full run of
`tests/protocol/agent-start.test.ts` + `tests/protocol/agent-finish.test.ts` (50/50 green).

## 4. What the tests assert

`tests/protocol/agent-start.test.ts`:

- "step 5 — a successful claim is pushed before work begins" gained one assertion: the claim's baton
  reads `| builder | \`zayd\` |` alongside the existing `| seat | \`zayd\` |`.
- New describe block "renderBaton/parseBaton — the `builder` field round-trips (T-016)": renders a baton
  with `seat: hmdnah` / `builder: zayd` and confirms both survive `parseBaton` distinctly; confirms
  `renderBaton` with no `builder` argument still renders `| builder | \`zayd\` |` (falling back to
  `seat`) so old code paths that do not know about the field keep working.

`tests/protocol/agent-finish.test.ts`, new describe block "resolveBuilder — the §0b baton `builder`
field survives a review finish (T-016)":

- a review finish (`review: true`) with a prior baton carrying `builder: 'zayd'` returns `'zayd'` even
  though the finishing seat is `'hmdnah'` — the defect this task closes;
- a review finish with no prior `builder` on record (absent baton, or a pre-T-016 baton with no
  `builder` row) falls back to the finishing seat, so an old branch does not crash or silently invent an
  answer;
- a plain (non-review) finish always returns the finishing seat, including the `--continue` case (a
  different seat resuming someone else's incomplete branch is still a BUILD finish, not a review one).

## 5. What this does NOT cover, and why

**No end-to-end test drives a real `--review` finish through to the baton write.** That path runs after
`pnpm verify`, and this repo's fixtures (`tests/protocol/fixture.mjs`) have no real `packages/`/
`apps/web` tree to typecheck/lint/test against — the exact scope limit `agent-finish.test.ts`'s own file
header already states, predating this task. `resolveBuilder`'s unit tests are the load-bearing coverage;
the integration path is exercised for real the next time a `risk: high` or `contract-touching` task
goes through an actual review finish on this repo (T-016 itself is `risk: high`, so its own review will
be the first live exercise — `hmdnah`, check `current_state.md §0b`'s `builder` row still names `zayd`
after your finish).

**`seats.builderFor` / `--continue` were not changed.** T-015's derivation-from-`machine:` still works
and is not weaker for this fix existing alongside it; T-016's `done-when:` asked only that the baton
itself carry the field, not that `--continue`'s admission gate switch to trusting it. Whether a future
task should make `--continue` read `builder` instead of re-deriving it is a simplification, not a
defect — left as-is.

## 6. Files touched

`scripts/agent-start.mjs`, `scripts/agent-start.d.mts`, `scripts/agent-finish.mjs`,
`scripts/agent-finish.d.mts`, `tests/protocol/agent-start.test.ts`, `tests/protocol/agent-finish.test.ts`.
