# T-006 — D66 §3a/§3b: the keep-live set and a lazy first paint — 2026-10-08 — seat: zayd

- **implements:** `docs/design/P5_step9_D66_lazy_build_design.md` §3a, §3b.
- **changed:** `apps/web/src/view/keepLive.ts` (new) — `recipeBounds`, `keepLiveSet`, `orderByContainer`,
  `buildKeepLive`; `apps/web/src/edit/docLock.ts` (new) — serialises edits and lazy builds;
  `bootstrap.ts` no longer calls `rebuildAll()` on open; `App.tsx` builds the keep-live set whenever the
  camera settles or the selection moves (a `built` counter, not `version`, so a build never autosaves);
  `Viewport.view()` / `onViewChange` and `ViewportCanvas`'s `onViewChange` prop; `first-paint.html` +
  `scale/firstPaint.ts` (the browser instrument); design doc status + §5; three `## Discovered` rows.
- **done-when, item by item:**
  - keep-live from camera/selection/viewport, never persisted — `keepLive.test.ts` "never writes the set
    into the document" compares `saveBnn` bytes before/after; it lives only in React state.
  - first paint calls `rebuildOnly(visible)` by container, camera level first then outward —
    `buildKeepLive` + `orderByContainer`, asserted in `keepLive.test.ts`.
  - no new document API, no frozen byte — only `apps/web/` and docs changed (`git diff --stat origin/main`).
  - measured in the real browser on this machine — below.
  - eviction not built.
- **verified:**
  - `npx vitest run apps/web/src/view/keepLive.test.ts apps/web/src/edit/docLock.test.ts` — 10 passed.
  - revert-verify (scratch `~/.state/zayd-t006-pw/mutate.py`, not committed) drops each of the placement guard, the
    selection add, the unregistered-type rule, the deferred filter and the outward order in turn; every
    mutation turns `keepLive.test.ts` red (exit 1).
  - browser: scratch `~/.state/zayd-t006-pw/measure.mjs` loads `first-paint.html` and reads
    `window.__firstPaintResults` (playwright-core driving
    `ms-playwright/chromium-1243` headless, SwiftShader GL, against `vite --port 5199`). T-018's
    fixture, 88 elements; default camera keeps 11 live (87.5 % deferred). Median first paint over 3 cold
    loads per mode: run 1 `all` 12693 ms / `lazy` 3680 ms (71.0 % removed); run 2 14906 / 3457 ms
    (76.8 %). T-018's headless figures: 89.8 % elements deferred, 85.8 % cold load removed.
  - real app: same script opens `doc/d66-fixture.bnn` through `sessionStorage` + reload;
    `window.bunyan.query({})` reads 11 `valid` / 77 `stale`, and 44 / 44 after an orbit + wide zoom
    (run 1). Screenshot shows level 0 with its three doors and mitered corners drawn.
- **not verified:** first paint on a hardware GPU — `unverified here: lazy first paint on a hardware GPU
  removes a comparable fraction — khalihlna to confirm` (`first-paint.html` is the instrument).
- **notes:**
  - An element the recipe cannot place is kept live: no baseline/height (curtain walls today), a
    non-empty `placement`, an unregistered Type, a missing host. Conservative by design — a skipped
    visible element is a wrong picture; an extra build only costs time.
  - Lazy first paint carries a fixed cost T-018's headless figure does not (tessellation, a WebGL frame,
    SwiftShader), which is why the browser fraction sits below the element fraction.
  - The `all` path ran 2.4 s headless in T-018 and 12.7–14.9 s here; not chased.
- **risk:** normal — app layer only; no frozen surface, no protocol, no `packages/` byte.
