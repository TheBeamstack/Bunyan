import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.venv/**',
      'tools/**',
      'apps/web/dist/**',
      // Emscripten's generated glue for the OCCT kernel — a build artifact, not source. Its
      // hand-written types live beside it in `bunyan-kernel.d.ts`, and those ARE linted.
      'packages/kernel-occt/wasm/*.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Build/config/CI scripts live outside the typecheck projects.
          //
          // ⚠ A `.d.mts` belongs here ONLY WHEN NOTHING under `tests/**/*.ts` imports its sibling
          // `.mjs` — once something does, the project service finds it THROUGH that import, and
          // listing it here too is a conflict ("included by allowDefaultProject but also found in the
          // project service"). `docs-state.d.mts`/`frozen-surface.d.mts`/`seats.d.mts` are all reached
          // this way (`tests/docs-budget.test.ts`, `tests/freeze-boundary.test.ts`,
          // `tests/protocol/seats.test.ts`). `agent-start.d.mts` is not — nothing under `tests/**`
          // imports `agent-start.mjs` directly, since `agent-start.test.ts` exercises it by SPAWNING
          // it, not importing it (see that file's own header for why) — so it needs listing here.
          allowDefaultProject: [
            'vitest.config.ts',
            'eslint.config.js',
            'scripts/*.mjs',
            'scripts/agent-start.d.mts',
            'tests/protocol/*.mjs',
          ],
          // ⚠ typescript-eslint caps the default project at EIGHT files and then fails the lint with
          // an error about its own internals, not about your code. Entry 88's `prompt-sync.mjs` was
          // the first to tip it over; Entry 91's new scripts and the protocol-test fixture are the
          // second round of the same growth. Raised rather than worked around: these are small, and
          // the alternative is excluding a gate script from type-aware linting — the opposite of what
          // a gate wants.
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 30,
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The kernel boundary deals in `unknown` from postMessage; narrowing is explicit and tested.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
    },
  },
  {
    files: ['**/*.test.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['eslint.config.js'],
    rules: {
      // `tseslint.config` is the supported helper on this version; `defineConfig` is not yet exported.
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
  {
    // CI scripts run under Node, not in the browser. The protocol-test fixture (tests/protocol/*.mjs)
    // is the same shape for the same reason — plain JS, no build step, spawned/imported by the tests
    // that exercise it — so it shares the rule-offs below rather than fighting type-aware linting on
    // code TypeScript necessarily infers `any` for.
    files: ['scripts/**/*.mjs', 'tests/protocol/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
    rules: {
      // ⚠ THESE ARE PLAIN JAVASCRIPT ON PURPOSE. `pnpm state`, the frozen-surface extractor and the
      // re-seed gate must run as `node scripts/…` with no build step, on either machine, before
      // anything is installed — a migration or a freeze check that needs a compiler to run is a
      // check that will not be run.
      //
      // TypeScript therefore infers `any` for everything in them, so the type-aware `no-unsafe-*`
      // rules fire on every line and report NOISE, not risk: they are not describing a weakened
      // type, they are describing the absence of one. The real boundary is where these modules are
      // CONSUMED — `scripts/*.d.mts` gives `tests/docs-budget.test.ts` and
      // `tests/freeze-boundary.test.ts` genuine types, and those files are linted in full.
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
    },
  },
);
