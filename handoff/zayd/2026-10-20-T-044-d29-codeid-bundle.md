# T-044 — D29 R6 — `codeId` is stamped per the owner answer to D-20261012-06

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-044-d29-r6-codeid-is-stamped-per-the-owner-a`
- task: `docs/BACKLOG.md` T-044 · risk: high · implements: design §2d, §6 R6 · D-20261012-06
- answer applied: `bundle`, the expired default (stamped `answered: 2026-10-20T00:33Z`, commit `edc18c8`)

## Changed

- `apps/web/src/codeId.ts` (new): `CODE_ID_PLACEHOLDER`, a 64-character non-hex literal, and `CODE_ID`, which is
  the literal once it reads as 64 hex digits, else `unstamped:<time>:<random>` per load (dev server, tests).
- `apps/web/codeIdPlugin.ts` (new): `bundleCodeId(files)` is sha256 over every emitted file, sorted by name,
  name- and length-prefixed. `codeIdPlugin()` (`apply: 'build'`, `enforce: 'post'`) digests every chunk and asset
  in `generateBundle` with the placeholder in place, then replaces the placeholder at the same length. A build
  that bundles `src/codeId.ts` with no placeholder left fails.
- `apps/web/vite.config.ts` registers the plugin; `apps/web/tsconfig.json` includes `codeIdPlugin.ts`.
- `apps/web/src/storage/cacheEnvelope.ts` (new): `cacheEnvelope(kernelBuildId)` returns the running build's
  `CacheEnvelope` with `codeId: CODE_ID`.
- `apps/web/src/codeId.test.ts` (new, 3 tests): it runs a real `vite build` of a two-file fixture (a main
  entry re-exporting `CODE_ID`, plus a module worker with an unhashed file name) and imports the output.
- Docs: design §2d now records the answer; `cachekey.ts`'s `codeId` comment; `## Discovered`'s
  "no product caller" line now names `cacheEnvelope`.

## Verified

- `npx vitest run apps/web/src/codeId.test.ts` → 3 passed. The built `CODE_ID` equals the stamped 64-hex
  string, the same sources give the same id, and changing the main chunk or the worker changes the id. Each
  changed id fails `sameCacheEnvelope`.
- Revert-verify 1: removing the `replaceAll` → 1 failed (the placeholder is still in the entry chunk); restored → 3 passed.
- Revert-verify 2: digesting chunks only (assets filtered out) → 1 failed (the worker change kept the id); restored → 3 passed.
- That a different `codeId` ignores the whole cache is already tested in `tests/geometry-cache-restore-d29.test.ts`
  ("a different envelope ignores the whole cache").
- `npx vite build --outDir /tmp/bunyan-web-dist` from `apps/web` → built in 5.05 s with the plugin.
- `pnpm verify` green: 108 files, 979 passed and 1 skipped; `docs:check` 66 passed.

## done-when

- The envelope codeId is stamped as D-20261012-06 answered: yes, at build time, over the whole bundle.
  ⚠ No product code imports `cacheEnvelope` yet, so today's app bundle has no placeholder to stamp. Wiring it
  in is the existing `## Discovered` line, not this row.
- Revert-verified, a changed bundle (or changed codeId) discards the cache: yes, see Verified.

## notes

- The digest is taken before the stamp, so it covers the placeholder rather than itself; the replacement has
  the same length, so source maps stay valid.
- In the test, the worker change moves the id even with chunks-only digesting when the worker name is hashed,
  because the main chunk embeds the hashed URL. The fixture uses an unhashed name so that only asset digesting
  can catch it.
