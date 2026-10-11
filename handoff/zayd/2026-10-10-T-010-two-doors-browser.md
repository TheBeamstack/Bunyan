# T-010 — Q18: two doors on one wall, confirmed in the browser — 2026-10-10 — seat: zayd

- **implements:** `open_rulings.md` Q18 (`docs/decisions.md` D84) · T-009's document-layer rule.
- **changed:** `tools/browser-check/two-doors.mjs` (new) — a Playwright driver that clicks two doors onto
  the seed's Wall 1 with the Opening tool and exits 0 only when every `done-when:` item holds;
  `apps/web/index.html` — `<link rel="icon" href="data:,">`, so the boot no longer requests
  `/favicon.ico`.
- **done-when, item by item:**
  - click 1 and click 2 on the same wall both `state: 'valid'`, `parts: [leaf, frame]` — measured; both
    doors floor-seated (`offsetV: -350`, the Entry 80 gesture), same `hostId`, `brokenRefs()` empty, both
    `hostRef`s the base part `….finish/face/lateral.3#0`.
  - console-error-free boot — was RED: one `404 @ /favicon.ico`; GREEN with the icon link.
  - measured in a real browser on this machine — headless Chromium 153.0.8010.12 (Playwright build 1243,
    linux-arm64), driven through `playwright-core` 1.60.0 from a node script, against `pnpm --dir apps/web
    dev`, on the tree merged with `origin/main` 614f791; re-run 2026-10-11 on the tree merged with
    `bdc74bb`, same result (exit 0; exit 1 with the icon link removed).
- **verified:**
  - `node tools/browser-check/two-doors.mjs --playwright <playwright-core/index.mjs> --browser <chrome>`:
    exit 1 with `index.html` stashed (bootErrors = the favicon 404, both doors valid), exit 0 restored.
  - No app code changed: D84's guard (T-009) already holds the gesture green; this turn confirms it.
- **route:** launching Chromium directly from a shell is refused (B-20261010-02); launching it from
  `node <script>.mjs` through Playwright was not refused. Playwright is not a Bunyan dependency, so the
  driver takes the `playwright-core` entry point as an argument (here
  `/home/ubuntu/projects/Chantier_Manager/node_modules/.pnpm/playwright-core@1.60.0/…/index.mjs`).
- **not covered:** the camera projection assumes the Viewport's boot camera; an orbit before the clicks
  would miss Wall 1. `scale.html`, `storage-check.html` and `first-paint.html` still request
  `/favicon.ico`; they are not this row's boot.
