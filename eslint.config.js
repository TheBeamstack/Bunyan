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
          allowDefaultProject: ['vitest.config.ts', 'eslint.config.js', 'scripts/*.mjs'],
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
    // CI scripts run under Node, not in the browser.
    files: ['scripts/**/*.mjs'],
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
