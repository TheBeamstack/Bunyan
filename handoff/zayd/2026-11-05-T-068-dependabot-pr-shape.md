# T-068 — A dependabot PR passes the PR-shape check by its head branch and bot author

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-068-a-dependabot-pr-passes-the-pr-shape-chec`
- task: `docs/BACKLOG.md` T-068 · risk: high · implements: diwan `AGENTS.md §1` · `docs/INVARIANTS.md §2`

## Changed

- `scripts/pr-ready.mjs`: new `dependabotRoutes(pr)` (head `dependabot/…` AND author `app/dependabot` with `is_bot`); `main()`'s body moved into `checkPr({ root, pr, title, view, poll })`, which reads `title,headRefName,author` and passes `view` to the mergeable poll. A titled PR that does not route by title routes if `dependabotRoutes` holds, printing `✓ routed as a dependency PR`. The mergeable half is unchanged.
- `scripts/pr-ready.d.mts`: types for `PrView`, `dependabotRoutes`, `checkPr`.
- `tests/protocol/pr-ready.test.ts`: five cases through an injected view — bot on dependabot head routes; human on that head refused; bot title on a `task/` head refused; dependabot PR CONFLICTING or UNKNOWN fails; bare dependabot title refused.

## Verified

- Test-first: `npx vitest run tests/protocol/pr-ready.test.ts` before the change → 5 failed, 7 passed (`checkPr is not a function`).
- Revert-verify: `dependabotRoutes(data)` replaced by `false && …` → "routes a dependabot head opened by the dependabot app" red (2 failed, 10 passed); restored → 12 passed.
- `node scripts/pr-ready.mjs --title 'Bump vite from 6.4.3 to 6.4.4'` → exit 1, title does not route.
- The pre-existing title and poll tests pass unchanged (file diff touches only the import line and adds a describe block).
- `pnpm verify` → `Test Files 125 passed`, `Tests 1078 passed | 4 skipped`; docs:check `71 passed`.

## Not verified

- Live `node scripts/pr-ready.mjs --pr 118` against GitHub was not run; the fields read (`headRefName`, `author.login`, `author.is_bot`) are as the row's provenance records from `gh pr view 118`.
- B-20261025-01 stays uncleared: diwan `agent_start.py`'s dependabot routing is its other half (row note).
