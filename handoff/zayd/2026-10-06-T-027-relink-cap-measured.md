# T-027 — §6's relink cap is measured, not guessed

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-027-6-s-relink-cap-is-measured-not-guessed`
- task: `docs/BACKLOG.md` T-027 · risk: normal

## Changed

- `docs/CURRENT_STATE-reference.md §6` (the recipe moved there from `docs/CURRENT_STATE.md` on
  2026-09-06): the relink `docker run` is capped `--memory=1g --memory-swap=1g`, with a two-line comment
  naming the measurement and the 2g it replaces.
- `docs/BACKLOG.md ## Discovered`: `tools/kernel-build/README.md` step 3 still links at 2g; `probe.sh` and
  README's probe/configure/compile steps carry the same 2g, unmeasured. Recorded, not claimed.
- `docs/OWNER-DECISIONS.md`: one blank line after the D-20261006-01 heading (`prettier --write`), the
  only change. `format:check` was red on `main` at `a837280`; no field was touched, and diwan's
  `protocol.parse_decisions` still reads it `ok`, `pending`, no problems.

## Verified

- Source of the figure: `handoff/archive/hmdnah/2026-08-21-T-022-review-step2.md` §1 —
  `--memory=1g --memory-swap=1g`, `EXIT: 0   LINK SECONDS: 78`, `cmp` identical on both artifacts.
- `pnpm verify`: exit 0 — 100 files / 987 tests, `docs:check` 8 files / 166 tests.

## done-when

- §6's recipe carries the measured cap with the measurement behind it: yes (the inline comment).
- no relink required: none run; the cited run is a second party's execution on this box.

## notes

- `--memory-swap=1g` is added, not only `--memory=1g`: the measured run disabled container swap, and
  without it Docker allows 2x memory as swap, which is not the configuration that was measured.
- The start entrypoint's default pick was T-026 (refused: existing claim; on this cycle's skip list).
  T-029 was not taken: it fixes `scripts/seats.mjs`, which D-20261006-01's finding (live start/finish are
  diwan's `.py`) may also make dead code — a steward question, not raised as a record here.
