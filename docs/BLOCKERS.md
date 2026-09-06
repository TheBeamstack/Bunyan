# Blockers

The register named by `.agent.toml [paths] blockers`. Its grammar, its fields and their order, and
the meaning of `scope:` and `need:` are `diwan/AGENTS.md §3.1` — not restated here. Append-only:
`cleared:` is the one field ever edited after a record is written, and git proves the rest.

This is the ONLY writable blocker channel (`diwan/docs/RULINGS.md` R15). `docs/CURRENT_STATE.md`'s
`## BLOCKED` section is rendered from this file by `diwan/scripts/blocked.py` and a hand-edit of it
fails `gates.py docs`. A halt announced there and nowhere else has no id, no `need:` anyone can
perform and no `cleared:` anyone can stamp — which is the state B-20260906-01 below was recovered
from, and the reason it is a record rather than prose.

## B-20260906-01 hmdnah's review credential is named by seat and stored by account
- opened: 2026-09-06T21:00Z
- by: brahim
- scope: item
- item: T-026
- what: `hmdnah` cannot start T-026's step-1 review (PR #48, `risk: high`, D88) on box 2, where the loops run
- why: the credential is PRESENT on both machines and the runbook names a path only box 1 has. `docs/RUNBOOK.md` "Seat credentials" and D87 say `~/.config/bunyan/<seat>.token`; box 1 has `~/.config/bunyan/hmdnah.token` (40 bytes) and box 2 has no `~/.config/bunyan/` at all, while box 2 does hold `~/.config/beamstack/narutousomaki741.token` (40 bytes) — the same secret under the ACCOUNT `hmdnah` holds (diwan R23, `diwan/docs/seats/README.md`). This is a PATH MISMATCH between a per-repo seat-named file and a shared account-named one, not a missing secret. It supersedes the `## BLOCKED` prose this record replaces, which claimed `~/.config/bunyan/` "does not exist on this box at all" — false on box 1, and true of box 2 only.
- evidence: `ls -ld ~/.config/bunyan; ls -l ~/.config/beamstack/` run on box 1 and on box 2 — file names, modes and sizes only; no token was read, copied or moved
- need: resolve a seat's token from `~/.config/beamstack/<account>.token` as well as `~/.config/bunyan/<seat>.token` in `scripts/agent-start.mjs`, correct `docs/RUNBOOK.md` "Seat credentials" to state both, and carry the change on its own `T-nnn` row
- cleared: -
