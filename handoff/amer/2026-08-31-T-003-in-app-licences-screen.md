# T-003 — the in-app open-source licences screen

## 1. What this task was

`current_state.md §5` recorded this as unbuilt since Entry 74: `LICENSE`/`CLA.md`/`NOTICE`/`licenses/`
shipped in the repo, but nothing in the running app discharges the OCCT LGPL exception's condition — a
*prominent notice, in supporting documentation* — for someone who never reads the repo.

## 2. What was built

- `apps/web/src/ui/licenseTexts.ts` — re-exports the repo-root `NOTICE` and every `licenses/*.txt` via
  Vite's `?raw` import and `import.meta.glob(..., { eager: true })`. One copy, read at build time; a file
  added under `licenses/` appears here with zero edits — the same "measure the artifact, not a hand list"
  shape `tests/notice-attribution.test.ts` already uses for the same directory.
- `apps/web/src/ui/LicensesScreen.tsx` — a modal reusing the `modal-backdrop`/`modal` shape `Ribbon`'s
  `CommandDialog` already established. Renders the `NOTICE` heading + full text, then one section per
  `licenses/*.txt`, sorted by file name, each showing its own file name so a reader can match it to the
  repo.
- `apps/web/src/App.tsx` — one boolean (`showLicenses`), one header button ("Licences"), one conditional
  render. Touches no document/kernel state.
- `apps/web/src/App.css` — `.header-link-button`, `.modal-wide`, `.license-section`, `.license-text`
  (`white-space: pre-wrap`, monospace, scrollable) — additive classes only.

## 3. Headless verification

`apps/web/src/ui/licenseTexts.test.ts`, 3 tests:

- `NOTICE_TEXT` is byte-identical to the repo-root `NOTICE` file (`readFileSync` comparison, not a
  snapshot);
- the embedded set is exactly `licenses/`'s on-disk file list — none missing, none stale, none extra —
  and every embedded text is byte-identical to its on-disk source;
- non-vacuous guard: both `LICENSE_TEXTS.length > 0` and `NOTICE_TEXT.length > 0`, so a broken glob
  returning nothing would fail loudly instead of passing the two checks above vacuously.

## 4. Browser verification (real Chromium, real dev server)

No project run-skill existed for this repo (per T-002's own note). Reused T-002's own recipe rather than
rediscovering it: `playwright-core` installed into a scratch dir, driving `BUNYAN_BROWSER_CMD`'s Chromium
(`ms-playwright/chromium-1223/chrome-win64/chrome.exe`) against the real dev server on
`127.0.0.1:5300` (Windows excludes TCP 5121–5220; `pnpm --filter @bunyan/web dev -- --port ...`'s arg
passthrough did not apply, so `vite` was invoked directly from `apps/web` instead).

**Method:** booted the app, waited for `Kernel:` to appear in the header (real OCCT kernel boot, not
stubbed), clicked the "Licences" button, waited for the dialog, read its full text back.

- Dialog renders a `NOTICE` heading and the full `NOTICE` text (mentions OCCT/Open CASCADE).
- All 10 `licenses/*.txt` sections present, matching the on-disk set exactly: `fflate`, `js-tokens`,
  `loose-envify`, `OCCT_LGPL_EXCEPTION`, `OCCT-LICENSE_LGPL_21`, `planegcs`, `react-dom`, `react`,
  `scheduler`, `three`.
- Console errors identical before and after opening the screen: one `Failed to load resource: 404` on
  every boot — the same single pre-existing error T-002's own review documented as reproducing on clean
  `main`, unrelated to any branch. The licences screen introduces no new console error.

## 5. Verification

- `pnpm verify` — exit 0, this pc. typecheck/lint/format:check green; `pnpm test` 100 files / 987 tests
  green; `reseed:check` skipped (not a PR); `docs:check` 8 files / 166 tests green.
- `tests/freeze-boundary.test.ts` green inside the full run — this touches no contract surface at all
  (no `SnapKind`, no `Command`, no `scene.json` field); pure UI addition.
- `prettier --write` run on every touched file before the verify above (all reported "unchanged" — the
  files were already formatted).

## 6. What this leaves

Nothing owed to `khalihlna` beyond the standing review of this PR. `CLA.md`'s `<LEGAL ENTITY>` (Q11) and
its lawyer's read (Q12) remain untouched and owner-only, as the task required — this screen answers
neither.
