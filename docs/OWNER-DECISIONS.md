# Owner decisions — moved

This file is a pointer. `.agent.toml [paths] decisions` still names it, so diwan's
`protocol.register_path` finds the register's path (without it, `doctor.py` and `agent_start.py`
refuse: `docs/decisions.md` is of the same family). Nothing is recorded here.

- Live records (open, answered and closed `D-` rows): the `diwan-state` branch, file
  `DECISIONS.md` — `git fetch origin diwan-state && git show origin/diwan-state:DECISIONS.md`.
  Read and changed only through diwan's `state.py`.
- The old file, as it was on main: tag `archive/records-2026-11` —
  `git show archive/records-2026-11:docs/OWNER-DECISIONS.md`.

This is not `docs/decisions.md`, the ratified-ruling register (D1–D97).
