# T-021 — `pnpm verify` reaches green on the pc, confirmed there

**Seat:** `amer` (builder on pc) · **Date:** 2026-08-24 · **Branch:**
`task/T-021-pnpm-verify-reaches-green-on-the-pc-conf` · **Risk:** additive

---

## 1. What the task owed

T-020's own turn bumped vitest to `^4.1.10` believing the major bump fixed Windows collection of the
five `tests/protocol/*.test.ts` files. The 2026-08-23 Discovered entry falsified that: the real causes
were a shebang/Vite-SSR-import-hoist collision and an `execFileSync('gh', …)` PATH-search call site,
both fixed independently of vitest's version (`2a79036`, `9a046e5`). That entry left T-021 "scoped to a
resource-tuning question, not a correctness gap" — this turn's job was to close that gap and get
`pnpm verify` to actually exit 0 on this pc.

## 2. What was still failing, and why

Running `tests/protocol/agent-start.test.ts` alone (no other file, no cross-file contention) at
vitest's default `testTimeout: 5000`/full parallelism: **18 of 33 cases timed out.** This is real
subprocess latency on this machine, not worker contention — each case spawns a throwaway git repo, a
`state.mjs` measurement, then `agent-start.mjs`/`agent-finish.mjs` itself, which spawns `git`/`gh`
again. One defect, one config gap, found and fixed:

**Defect — the "an UNRESOLVABLE identity" test's own `gh`-less PATH fixture never worked on Windows.**
`tests/protocol/agent-start.test.ts` symlinks `process.execPath` to a bare `node` (no extension) inside
an otherwise-empty directory, then sets `PATH` to just that directory, expecting the OUTER
`execFileSync('node', [AGENT_START, …])` call to still resolve `node` while `gh` stays unresolvable.
Direct repro (`symlinkSync` + `execFileSync('node', …, {env:{PATH: dir}})`): a bare-name symlink throws
`ENOENT`; the identical setup with the symlink named `node.exe` succeeds. Windows PATH/PATHEXT search
never matches an extension-less file, even though `symlinkSync` itself succeeds silently — the same
fact the file's own header already documents for the `gh` stand-in (why it spawns `node.exe` rather than
PATH-shadowing `gh`), just not yet applied to this one call site. Fixed:
`tests/protocol/agent-start.test.ts:220`, the symlink target is now `node.exe` on `win32`, `node`
elsewhere.

**Config gap — `vitest.config.ts` carried no `testTimeout`/`pool`/`maxWorkers`, and 5000ms/full
parallelism is not enough headroom for `execFileSync`-heavy suites on this pc.** Measured:

| config | `tests/protocol/agent-start.test.ts` alone | full suite (99 files) |
|---|---|---|
| default (5000ms, full parallelism) | 18/33 failed (timeout) | 39 failed (from the prior session's entry) |
| `--pool=forks --maxWorkers=2`, still 5000ms | 4/33 failed (from the prior session's entry) | 13 failed (from the prior session's entry) |
| `pool: forks`, `maxWorkers: 2`, `testTimeout: 20000` | 1/33 failed once (one `--review` case hit the wall) | — |
| `pool: forks`, `maxWorkers: 2`, `testTimeout: 30000` | 0/33 (33/33) | 0 (959/959) |

Set in `vitest.config.ts`: `testTimeout: 30000`, `pool: 'forks'`, `maxWorkers: 2` (Vitest 4's top-level
option — `poolOptions.forks.maxForks`, the vitest-3 shape, is a DEPRECATED no-op under 4.1.10, confirmed
by the exact deprecation warning on a first attempt).

## 3. Verified

`pnpm verify` on this pc: **exit 0.** `typecheck` → `lint` → `format:check` → `test` (**99 files, 959
tests, all green**) → `reseed:check` (skipped — not a PR) → `docs:check` (8 files, 163 tests, green).
Run twice for stability: once right after the `testTimeout: 20000` config (1 flake), once after
`30000` (clean). The five `tests/protocol/*.test.ts` files collect and pass, both standalone
(`tests/protocol/{agent-start,agent-finish,pr-ready,reserved-classes,seats}.test.ts` — 33+17+8+9+46 =
113 tests) and inside the full run.

## 4. Revert-verification — the literal T-020-inherited wording does NOT hold; the real one does

T-021's `done-when:` carries, unchanged from T-020: *"revert-verified: restoring the `^2.1.8` pin
reproduces the collection `SyntaxError`."* Tested directly, honestly, and it does not, as literally
read:

- **Restoring `"vitest": "^2.1.8"` alone** (shebang-removal and gh-spawn fixes both still in place,
  `pnpm install` relinking to `vitest@2.1.9`, the newest patch satisfying that range) — ran
  `tests/protocol` (all 6 files, 121 tests): **all 121 passed.** No `SyntaxError`. This is expected in
  hindsight: the 2026-08-23 entry already established the vitest major bump was never the actual fix,
  so undoing it alone, with the real fix (shebang removal) still present, changes nothing.
- **Reintroducing the shebang** (`#!/usr/bin/env node` at the top of `scripts/agent-start.mjs`) while
  still on `vitest@2.1.9` — ran `tests/protocol/agent-start.test.ts` alone: **1 file failed at
  collection**, `SyntaxError: Invalid or unexpected token`, the identical error string T-020/T-021 exist
  to close. Removed the shebang again immediately after confirming this, restored `package.json`'s
  `^4.1.10` pin, `pnpm-lock.yaml` (an incidental `4.1.10→4.1.11` patch drift from the intermediate
  `pnpm install` was reverted with `git checkout`), then reinstalled with `--frozen-lockfile` — verified
  `npx vitest --version` reports `4.1.10` again before re-running the full `pnpm verify` recorded in §3.

**This is a spec defect in T-021's own `done-when:` prose, not a code defect** (`AGENTS.md §3`): the
bullet was written before the 2026-08-23 finding and still names the wrong revert target. Recorded here
rather than silently reworded in `docs/BACKLOG.md`'s already-published task text — a correction is a new
entry, not an edit to old prose (invariant 10).

## 4b. A second, previously-undiscovered defect — found only by actually finishing the turn

Closing this turn through the sanctioned protocol (`node scripts/agent-finish.mjs`) surfaced a second
defect, the same class as `ghSpawn`'s (`9a046e5`), one call site over: `agent-finish.mjs`'s own
`execFileSync('pnpm', ['verify'], …)` cannot spawn `pnpm` on this pc at all. This machine's only
installed `pnpm` is `%USERPROFILE%\bin\pnpm.cmd` (`Amer_Prompt.md`'s own documented setup) — a bare
`pnpm` ENOENTs (Windows PATH/PATHEXT search never runs for `execFileSync` with no shell) and an explicit
`pnpm.cmd` EINVALs (Node refuses to spawn a `.cmd` without `shell: true`, CVE-2024-27980), both confirmed
by direct repro. Fixed the same way `ghSpawn` was: `scripts/seats.mjs` gets `pnpmSpawn`, honoring
`BUNYAN_PNPM_CMD` (a plain path, or a `[nodeExePath, scriptPath]` pair for a stand-in that is itself a
script — corepack ships `dist/pnpm.js`, directly runnable by `node.exe`, confirmed:
`node "C:\Program Files\nodejs\node_modules\corepack\dist\pnpm.js" --version` → `10.34.5`, matching the
`packageManager` pin). `agent-finish.mjs`'s verify step now calls `seats.pnpmSpawn(['verify'], …)`
instead of the hardcoded `execFileSync`. Three unit tests added (no override / plain override / array
override), confirmed with `-t "pnpmSpawn"` before the full-suite re-run. Importing `pnpmSpawn` by name
from a `.ts` test file surfaced a third, small thing: `typecheck` failed with "has no exported member
'pnpmSpawn'" even though the function plainly exists in `seats.mjs` — `scripts/seats.d.mts` is a
hand-maintained declaration file typecheck resolves `seats.mjs` imports to (confirmed via
`tsc --traceResolution`), and `ghSpawn` had never been imported by name from a `.ts` file before, so it
never needed an entry there either. Added `pnpmSpawn`'s signature to `seats.d.mts`. This turn's own
`agent-finish.mjs` run set `BUNYAN_PNPM_CMD='["C:/Program Files/nodejs/node.exe","C:/Program
Files/nodejs/node_modules/corepack/dist/pnpm.js"]'` (forward slashes — sidesteps a JSON-in-env-var
backslash-escaping issue through this shell, and Windows accepts either separator).

## 5. What this leaves

Nothing owed to `khalihlna` — every claim in this turn (browser-adjacent only in the sense that the pc
is what could reproduce the Windows-only collection failure at all) was executed and measured on this
exact machine; no `unverified here:` marker. `brahim` may want to annotate T-021's `done-when:` bullet
the next time `docs/BACKLOG.md` is touched, since its wording still names the falsified revert target —
not fixed here per invariant 10, only recorded.
