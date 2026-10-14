# T-041 — D29 R3 — the load-only restore substitution in `#stage`

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-041-d29-r3-the-load-only-restore-substitutio`
- task: `docs/BACKLOG.md` T-041 · risk: high · implements: design §4, §6 R3 · D1 · D66 · D28

## Changed

- `packages/document/src/cacherestore.ts` (new): `openCacheIndex` (whole cache refused on an absent or
  unparseable index or an envelope `sameCacheEnvelope` rejects) and `restoreAssembly` (design §4 steps 1–3:
  key mismatch, malformed record, missing entry, `importBrep` refusal or a `Part.refs` that is not a
  permutation of the import's refs ⇒ release every handle imported for that root, return `undefined`).
- `packages/document/src/document.ts`: optional `DocumentOptions.geometryCache`; `#stage` gains `restore`
  (default `false`), passed `true` only by `rebuildAll` and `rebuildOnly` (so `#forceBuild`); a restore
  is registered exactly like a build with `brokenRefs: []` (only all-`valid` assemblies are cached).
- `packages/document/src/index.ts`: re-exports `cacherestore.js`.
- `tests/geometry-cache-restore-d29.test.ts` (new, 8 tests, real OCCT): D66-shaped fixture (wall + door,
  curtain wall with D59 children, a joined wall, a two-layer wall, a round column); 5 assemblies, 22 elements.

## Verified

- `pnpm exec vitest run tests/geometry-cache-restore-d29.test.ts` → 8 passed.
- Revert-verify 1: `restoreAssembly`'s catch rethrows instead of falling back → 2 failed (tampered `.brep`
  with `CACHE_STALE`; the non-permutation refs), 6 passed; restored.
- Revert-verify 2: `#stage`'s `restore` default `false` → `true` → 1 failed (the edit-path test: an undo
  imported a cached solid), 7 passed; restored.
- `pnpm verify` green: 103 files / 951 tests; `docs:check` 5 files / 66 tests.
- No changed path is in `.agent.toml [frozen_surface] watched` (`git status --short`).
- Test-first is NOT claimed: the code and test were written by an earlier zayd session that died before
  committing; this turn fixed two test defects (`core.setParams` args, a `ParamValue` type) and two lint errors.

## done-when

- Only `rebuildAll`/`rebuildOnly` pass restore; execute/undo/redo never import (test + revert-verify 2): yes.
- Restored ≡ rebuilt on the fixture, refs token for token, quantities at D28 rounding: yes.
- Hand-edit to wall B's far end rebuilds B and its joined neighbour A only; a `materials` edit rebuilds all;
  tampered `.brep` rebuilds and `wasmLiveHandles` is unchanged after dispose; non-permutation refs refused: yes.
- Clean Delta question answered by measurement (below): yes.
- Revert-verified, fallback removed ⇒ tampered-brep test red: yes.

## Clean Delta measurement

`pnpm exec vitest run tests/geometry-cache-restore-d29.test.ts -t "Clean Delta" --disable-console-intercept`:
max |restored − rebuilt| = 4.44e-16 m³ over 22 elements, only on the round column (0.8482300164692427 vs
…431 m³); every planar element is bit-equal. `cleandelta.ts:602`'s `modified_qty` threshold is 1e-9 m³, so on
this fixture an unedited element cannot read as `modified_qty` because of a restore. 16k curved scenes are not measured.

## notes

- No product caller passes `geometryCache` yet: the running build's envelope needs `codeId`, pending
  `D-20261012-06` (R6), and `BNN_CODEC.read` still drops `cache` (T-040 note). R4–R6 wire it.
- An index whose envelope is refused is remembered as `null` for the document's life (one parse per open).

## Step-2 defect fixed (B-20261012-06) — 2026-10-14

- `tests/geometry-cache-restore-d29.test.ts`: the spy records the handles `importBrep` returns and those
  `releaseShape` is handed; `restoredRoots(doc, spy)` fails on any released import or an assembly mixing
  imported and built solids, and counts a root only when every live part handle (children, voids) was imported.
  The three restore tests and the Clean Delta test now assert it, so done-when 2 and 4 are held.
- Mutant 1 (B-20261012-06 `evidence:`, `if (result.parts.length < 2) throw new Refusal();`) → 3 failed, 5 passed
  ("an imported solid was released"); `rebuildOnly` stays green, correctly: wall C has two parts. Restored → 8 passed.
- Mutant 2 (`isPermutation` returns `false`) → 5 failed, 3 passed; restored → 8 passed.
- Unmutated Clean Delta re-run: 4.44e-16 m³ over 22 elements, unchanged.
- Merged `origin/main` (PR #81): `docs/BLOCKERS.md` is main's file + B-20261012-05/-06 re-appended (no id collision);
  `## BLOCKED` re-rendered by `blocked.py`; the baton and generated block taken from this branch.
