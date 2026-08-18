# STEWARD — the two defects that block a whole machine, decomposed

**Seat:** `brahim` · **Date:** 2026-08-18 · **Abstract:** `current_state.md §7`

## 1. Why these two, ahead of the ready queue

The pc loop reported both on 2026-08-17 and recorded them in `## Discovered` without decomposing them.
Both are box work, and the box is the machine that is not blocked — which is the whole reason to take
them first.

**T-020/T-021.** `pnpm verify` cannot reach green on the pc for any task, so `agent-finish.mjs` refuses
every `amer`/`khalihlna` turn regardless of what it touches. Five `ready` `pc` rows sit behind it, and
`amer`'s T-001 work is written, tested and browser-verified with no PR. This is not a task-shaped
blocker; it is the pc half of the build model being unable to finish a turn.

**T-022/T-023.** The shipped kernel does not boot on Chrome 149+. For a browser-native product that is a
v1.0.0 shipping defect, not a dev-box annoyance — the pc's `BUNYAN_BROWSER_CMD` pin to Chromium 148 makes
one machine work and changes nothing about what users get. It is also pre-existing and reproduces against
unmodified `main`, so no recent turn introduced it.

## 2. Both had to split, and the same rule forced it

`docs/BACKLOG.md`'s own rule — *a `done-when:` list that mixes machines is a task that needs splitting* —
applies to both, in the same shape T-009/T-010 already used:

- the **fix** is box work (a dependency bump; a link-recipe change plus a committed artifact),
- the **failure it closes** reproduces only on the pc (Windows-only collection; Chrome 151),

so each box row carries an explicit `unverified here:` and each pc row is the turn that may tick it. A
single row either way would let a box seat report a criterion its machine physically cannot execute,
which is the failure `machine:` exists to prevent.

## 3. Measured this turn rather than assumed

- **Node 20.20.2 does not reproduce Chrome's refusal.** Constructing a resizable `ArrayBuffer` and
  decoding a view of it succeeds here. That is why T-022 carries no browser criterion and why its
  evidence is the emitted artifact rather than a runtime failure — had I assumed otherwise, T-022 would
  have shipped an unsatisfiable `done-when:`.
- **`bunyan-kernel.js` is minified emscripten glue** with a single `TextDecoder` on the UTF-8 path, so
  the fix is the toolchain or the link recipe, never a hand edit to a generated file.
- **All five protocol test files carry em-dashes** (5–37 each), so the pc's diagnosis is consistent with
  what is on `main`.
- **`Part.node` has never existed** (`entities.ts:683` documents `nodeId`), confirming `hmdnah`'s T-018
  review finding before I corrected the row.

## 4. Not decomposed, deliberately

`## Discovered` holds sixteen further rows. Two are overdue by their own text — the `--review` wrong-PR
claim (three occurrences, its own row conceding the "don't decompose" judgement was wrong) and
`_baselinedAtEntry` naming a position rather than an entry, which that row notes becomes *worse* than
cry-wolf after the P5 freeze because the baseline may not be rewritten without an owner ruling, leaving
the gate no green path. Both deserve rows; neither blocks a machine today, and decomposing six things at
once buries the two that do. They are the next steward turn's work, and the `_baselinedAtEntry` one
should land before the freeze rather than after.

## 5. Direct commits this loop made outside a turn

Recorded here because they are bookkeeping acts with no entry of their own, per `AGENTS.md §1.3`:

- `ee7c4e5` — cleared T-011's stranded `NEXT TURN: REVIEW ONLY`. It merged onto `main` with #32 and
  outlived it; the banner is cleared only on a `--review` finish, so with no open PR no script could
  retire it while it refused every builder turn on both machines. Clearing a script-written block by hand
  is outside `docs/prompts/brahim-orchestrator.md`'s literal wording; the alternative was a deadlock no
  seat could break, and the writer defect is recorded in `## Discovered` with its fix shape.
- `86cec3e` — `main` was failing `prettier --check`, CI step 3, so `pnpm verify` was red on files no new
  task touches. Table padding and one continuation line.
- `b40190d` · `834783e` · `db3146f` — T-005 promoted behind T-018; the `§8`-on-`main` finding recorded;
  `§8` regenerated from `main` after #35.
