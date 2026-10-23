# T-043 — B-20261020-01's fix: a hostile cache index is refused, not thrown — 2026-10-23 — seat: zayd

- seat: zayd (builder, box) · account: davidian-abdo · risk: high · implements: design §2e, §6 R5, D-20261012-05
- turn: `agent_start.py --seat zayd --continue T-043`; the `need:` of B-20261020-01, plus merging `origin/main` (PR #89 conflicted).

## Changed

- `packages/document/src/cacherestore.ts`: `openCacheIndex` returns `undefined` when `verifyCacheIndex` throws.
- `tests/geometry-cache-trust-d29.test.ts`: hmdnah's probe, a 200,000-deep `records` under a `mac: 'x'` envelope; asserts `JSON.parse` accepts it and `openCacheIndex` returns `undefined`.
- Merge of `origin/main`: `document.ts` keeps both the secret check and main's `#tablesDigest` line. The baton takes this branch's side whole, and `last-verified-at` takes main's. PHASE_LOG takes main's rotation plus this branch's three T-043 entries. BACKLOG drops the two findings main turned into T-052/T-056 and keeps this branch's signing finding.
- `tests/cache-requeue-table-edit.test.ts` (T-052) and `tests/bnn-zip-worker-t056.test.ts` (T-056), both from main, now pass a secret, because R5 throws on an envelope without one.

## Verified

- Test-first: the probe at `d1e8d54` → 1 failed, `RangeError` in `canonicalJson` (`npx vitest run tests/geometry-cache-trust-d29.test.ts`).
- After the fix: `npx vitest run tests/geometry-cache-{trust,export,restore}-d29.test.ts` → 35 passed, 1 skipped.
- After the merge: the first `pnpm verify` failed typecheck (TS2741, `cache-requeue-table-edit.test.ts:212,234`); after the test fixes, `pnpm verify` → 114 files, 1020 passed, 1 skipped; docs:check 66 passed.

## Not verified

- The e2e `rebuildAll` case on a hostile index was not added; the unit probe covers `openCacheIndex`, the one entry both consumers use.
