# T-019 — the move-tool gizmo + corner-drag, redone against `main` — 2026-10-11 — seat: zayd

- **implements:** `docs/decisions.md` D80 · `docs/design/P4.5_interaction_model_design.md` §9 ·
  `docs/CURRENT_STATE.md §5` (Amer, item 3).
- **changed:** `apps/web/src/tool/handles.ts` + `handles.test.ts` (new, from closed PR #17);
  `render/Viewport.ts` (`setDragHandles`, `setControlsEnabled`); `render/ViewportCanvas.tsx` (grab,
  rubber band, drop, cancel; merged with main's perpendicular and line-intersection snaps, which now also
  fire during a corner-drag); `App.tsx` (`dragHandles`, `onHandleDrop` under one `transactionId`);
  `tool/drag.ts` (`endpointOf` exported); `tools/browser-check/corner-drag.mjs` (new driver).
- **done-when, item by item:**
  - `baselineHandles` one handle per authored endpoint, pure, projection injected — `handles.test.ts`
    (10 tests); reverting the Level z to 0 fails the elevation test.
  - peer match by full authored position — `drag.test.ts` "does NOT move a wall that shares the 2D corner
    on a DIFFERENT LEVEL", already on main; deleting the `containerId` guard fails it.
  - one `transactionId`, one undo — browser: edits seq 7 and 8 both `corner-drag-1`; one Ctrl+Z restores
    Wall 1 `.end` and Wall 2 `.start` to `[4000, 0]`. Dropping the `{ transactionId }` argument fails
    `oneTransaction` and `oneUndoRestores`.
  - `brokenRefs()`/`unbuildable()` empty before, during, after the drop and after undo — browser.
  - `changeFeed()` growth during the drag: 0 (6 → 6) — browser.
  - fixed world point byte-identical — **NOT MET as worded.** Drift ≤3e-12 px through the gesture; the
    same pointer path with nothing selected orbits 54.1 px. Commenting out `setControlsEnabled(false)`
    moves it 54.1 px and fails the driver. The camera drifts ~5e-13 px/s idle (`Viewport.#tick` calls
    `OrbitControls.update()` every frame), so byte-identity fails without any gesture. Recorded in
    `docs/BACKLOG.md ## Discovered` for the steward; the criterion was not reworded.
- **verified:** `pnpm verify` green (908 + 66 tests); `node tools/browser-check/corner-drag.mjs
  --playwright <Chantier_Manager playwright-core 1.60.0> --browser <chromium-1243 linux-arm64>` exit 0
  against `pnpm --dir apps/web dev --port 5199`, headless Chromium 153.0.8010.12.
- **not covered:** whole-element drag (`dragPlans()` + `dryRun`) is unwired, as the row states. The
  stacked-Level case is headless only; the seed has one Level. The driver reaches the live `Viewport`
  through React's fiber (second hook of `ViewportCanvas`), so a hook reorder breaks the driver, not the app.
