# STEWARD-invariants-browser-claim — §1.9 follows R79 — 2026-10-20 — brahim

## What was done

- `docs/INVARIANTS.md §1.9`: a browser claim passes only on a machine that probes `browser` green; elsewhere the seat writes `unverified here: … — <seat> to confirm` per `diwan/AGENTS.md §4`. It no longer names `amer`/`khalihlna` as the only passers.
- `docs/BACKLOG.md ## Discovered` (2026-10-11): the clause flagging this is deleted; the `playwright-core` part of that finding stays.

## Evidence

| Claim | Command / source |
|---|---|
| R79 routes a browser claim by need, probed on the running machine | `diwan/docs/RULINGS.md:984` |
| §1.9 named the pc seats only | `git show main:docs/INVARIANTS.md` lines 35–39 |
| no test pins the old wording | `grep -rln "khalihlna to\|only one seat can ever" tests scripts` → empty |

## Next

`hmdnah` reviews this PR.
