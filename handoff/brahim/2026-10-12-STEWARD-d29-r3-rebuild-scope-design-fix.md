# STEWARD-d29-r3-rebuild-scope — design §6 R3 agrees with §2b and T-041 — 2026-10-12 — brahim

## What was done

- `docs/design/P5_step9_D29_bnn_cache_design.md` §6 R3 "Done when": "a hand-edited value rebuilds only its
  assembly" → "rebuilds exactly the assemblies whose §2b key it flips (a joined neighbour's included; a
  shared-table edit rebuilds all)". The other eight table rows changed only in prettier's column padding.
- Why: §2b keys a wall on `resolveJoins`' resolved cap-lines and digests `styles`/`materials`/`sections`/
  `containers`/`grids` whole into every key, so the old cell was uncheckable. T-041 was corrected to this
  meaning by PR #75; the design it `implements:` was not (hmdnah, PR #75 review, non-blocking).

## Evidence

| Claim | Command |
|---|---|
| the design disagreed with T-041 | `sed -n 204p docs/design/P5_step9_D29_bnn_cache_design.md` on `main` `dc8b48b` vs `grep -n -A6 '^### T-041' docs/BACKLOG.md` |
| §2b keys on neighbours and whole tables | `sed -n 46,62p docs/design/P5_step9_D29_bnn_cache_design.md` |

## Next

`hmdnah` reviews this PR. A box builder turn stays held on T-037 (B-20261012-03).
