# T-032 — agent edits through `window.bunyan` wait on the document lock — 2026-10-11 — seat: zayd

- **implements:** `docs/decisions.md` D66 · `docs/design/P5_step9_D66_lazy_build_design.md` §2, §3b · D19.
- **changed:** `apps/web/src/edit/agentRefresh.ts` — `withUiRefresh(agent, notify, lock)`; `execute`,
  `undo`, `redo` run inside `lock.run`, then `notify`; `dryRun` runs inside `lock.run` and does not
  notify. `apps/web/src/App.tsx` — the boot effect passes `docLock` (stable, `useMemo`).
  `apps/web/src/edit/agentRefresh.test.ts` — existing tests pass `createDocLock()`; two new tests.
- **done-when, item by item:**
  - held lock task ⇒ `execute`/`undo`/`redo`/`dryRun` do not reach the agent until it settles — new test
    `execute, undo, redo and dryRun do not reach the agent while a lock task is held open`.
  - call order across lock tasks and agent calls, rejected agent call does not jam the lock — new test
    `lock tasks and agent calls run in call order, and a rejected agent call does not jam the lock`
    (log `build:start, build:end, agent:execute, human:edit, agent:undo`; `notify` once).
  - `options` forwarding (incl. arity 3) and notify-only-after-success tests unchanged and green.
  - `App.tsx` passes `docLock` — one line; reviewer to check (not reachable headlessly).
- **verified:** `pnpm --filter ./apps/web exec vitest run src/edit/agentRefresh.test.ts` against main's
  wrapper: 2 failed, 6 passed (`expected [ 'execute', 'undo', 'redo', 'dryRun' ] to deeply equal []`);
  with the fix, `src/edit/`: 16 passed. `pnpm --dir . verify`: typecheck, lint, format, 910 tests,
  docs:check 66 — green.
- **not covered:** no browser run; the ordering is shown on fakes, not on a live kernel heap.
