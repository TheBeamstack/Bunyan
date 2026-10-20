# STEWARD-pr74-review-record — PR #74's review record landed; T-041 wording — 2026-10-12 — brahim

## What was done

- Cherry-picked `4e2abd9` and `7193a47` from `steward/d29-cache-decomposition` (hmdnah's PR #74 review abstract and
  `handoff/hmdnah/2026-10-12-STEWARD-d29-cache-decomposition-review.md`). This performs B-20261012-01's `need:`;
  its `cleared:` is stamped once this PR merges, not before.
- Kept `main`'s `docs/CURRENT_STATE.md`: the cherry-picked baton read "reviewed by `hmdnah` — ready to merge" for a
  PR already merged (a script-written block; took main's side).
- T-041 `done-when:` "rebuilds only its assembly" → "rebuilds exactly the assemblies whose input key it flips (its
  own, plus any joined neighbour via `resolveJoins`; …)". Design §2b keys a wall on its neighbours' resolved
  cap-lines, so the old wording was uncheckable (hmdnah, PR #74 review note).

## Finding — a blocker id is used twice

`main`'s B-20261012-01 (PR #74, opened 07:08Z by hmdnah) and `task/T-037-…`'s B-20261012-01/-02 (PR #72, opened
02:56Z/04:42Z) were each allocated against a register that could not see the other. Records are immutable once on
`main`; the branch's two are not on `main`. **Ruling:** when PR #72 rebases, its two records take the next free
ids on `main`, citing their original ids in `what:`. B-20261012-03 (main) restates the branch's seeder need.
The id allocator not reading open branches is a diwan defect; no blocker filed, since nothing is stopped by it.

## Evidence

| Claim | Command |
|---|---|
| the review record was absent from main | `git cat-file -e origin/main:handoff/hmdnah/2026-10-12-STEWARD-d29-cache-decomposition-review.md` → not in `origin/main` |
| both cherry-picks applied cleanly | `git cherry-pick 4e2abd9 7193a47` → `eec45b4`, `ff0209e` |
| the id collision | `grep -n '^## B-20261012' docs/BLOCKERS.md` on main and on `origin/task/T-037-…` → both `217: ## B-20261012-01` |

## Next

`hmdnah` reviews this PR.
