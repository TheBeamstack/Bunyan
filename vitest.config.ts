import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const pkg = (name: string): string =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@bunyan/protocol': pkg('protocol'),
      '@bunyan/kernel-core': pkg('kernel-core'),
      '@bunyan/kernel-mock': pkg('kernel-mock'),
      '@bunyan/kernel-occt': pkg('kernel-occt'),
      '@bunyan/kernel-client': pkg('kernel-client'),
      '@bunyan/document': pkg('document'),
      '@bunyan/sketch-solver': pkg('sketch-solver'),
      '@bunyan/types': pkg('types'),
    },
  },
  // The Emscripten modules resolve their own .wasm from `import.meta.url` and read it off disk under
  // Node. Leave them untransformed — Vite would rewrite that URL and the module would fail to find its
  // own binary. `@salusoft89/planegcs` (the sketch solver's WASM, 0d) is the same kind of module.
  optimizeDeps: { exclude: ['@bunyan/kernel-occt', '@salusoft89/planegcs'] },
  test: {
    globals: true,
    // The kernel is transport-agnostic, so the whole seam is testable in plain Node — no browser,
    // no jsdom. That is what lets the headless build box run the same suite CI runs.
    environment: 'node',
    // `tests/**` is the kernel + document suite; `apps/**` is Amer's browser hot path. Both are
    // collected so a test written beside the app it covers actually runs — before P4 step 0 the app
    // could not be tested at all (review_P4.md §2 / Entry 24). App tests that need the DOM opt into
    // jsdom per-file; the pure logic here (the edit runner) runs in plain Node like everything else.
    include: ['tests/**/*.test.ts', 'apps/**/*.test.ts?(x)'],
    // T-021: `tests/protocol/*.test.ts` spawns real subprocesses per test (a throwaway git repo, a
    // `state.mjs` measurement, then `agent-start.mjs`/`agent-finish.mjs` itself spawning `git`/`gh`
    // again) — measured on the pc at 5000ms (vitest's default), 18/33 of one file's own cases timed
    // out with no other suite running concurrently, so this is real subprocess latency on this
    // machine, not cross-file contention. 20000ms cleared that file at `--pool=forks --maxWorkers=2`;
    // kept generous rather than file-scoped since vitest has no per-glob timeout. 20000ms still let
    // one review-routing case (a `pushSteward` git branch + a `--review` `agent-start.mjs` spawn) hit
    // the wall once; 30000ms gave it headroom without masking a real hang (a hang fails on ANY timeout).
    testTimeout: 30000,
    // khalihlna review of PR #42 (T-021): `testTimeout` does not cover `beforeEach`/`afterEach` —
    // vitest times hooks against the separate `hookTimeout`, still its 10000ms default. Reproduced on
    // this pc: a full `pnpm verify` run failed `tests/protocol/seats.test.ts`'s `makeFixture()`
    // `beforeEach` (a git-repo fixture, the same subprocess cost this file already measured) with "Hook
    // timed out in 10000ms" — the same file passed clean in isolation immediately after, confirming
    // full-suite contention, not a hang. Matched to `testTimeout` for the same reason.
    hookTimeout: 30000,
    // Reduces worker-vs-subprocess CPU contention across the full suite (99 files): the pc measured
    // 39 failures at default concurrency vs. 13 at `--pool=forks --maxWorkers=2`, all timeouts, not
    // wrong answers — `tests/protocol/*` and the other `execFileSync`-heavy suites (`reseed-gate-e2e`,
    // `state-risk-e2e`) are the ones that pay for a real subprocess per test. Vitest 4 top-level
    // options, not the removed `poolOptions.forks.*` shape (vitest 3).
    pool: 'forks',
    maxWorkers: 2,
  },
});
