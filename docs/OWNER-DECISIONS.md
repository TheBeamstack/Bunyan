# Owner decisions

The register named by `.agent.toml [paths] decisions`, and the only file in this repo the owner
edits. Its grammar — the fields, their order, and the four states — is `diwan/AGENTS.md §3.2`.

This is **not** `docs/decisions.md`, which is the ratified-ruling register (`D1`–`D88`): a record
of rulings already made, in its own grammar, never read by the turn protocol. The name is not
`docs/DECISIONS.md` because the pc runs Windows, where that and `docs/decisions.md` are one file.

## D-20261006-01 T-028 and T-030 fix scripts no entrypoint runs

- opened: 2026-10-06T01:20Z
- by: brahim-loop
- item: T-028
- asks: whether to retire T-028 and T-030, which fix `scripts/agent-finish.mjs` and `scripts/agent-start.mjs` while the live start/finish are diwan's `agent_start.py`/`agent_finish.py` (PR #54 step-1 finding F1; outside tests those two files are named only in a `ci.yml` comment)
- options: retire | keep
- default-if-silent: retire
- expires: 2026-10-13
- ANSWER:
- answered: -
