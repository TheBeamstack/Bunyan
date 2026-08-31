# T-002 — the two-candidate-line intersection snap

## 1. What this task was

`docs/design/P4.5_interaction_model_design.md` §4.3 names the third derived Tier-1 snap kind — "the
intersection of two candidate lines" — already declared as `'intersection'` in `SnapKind`, ranked by Q3
directly below `'endpoint'`, with nothing producing it. T-001 built the first derived kind
(`'perpendicular'`) in the same module; this task is the second, same identity rule.

## 2. What was built

`apps/web/src/tool/align.ts`:

- `lineIntersections` — the closest-approach point of every pair of candidate lines, within pixel
  tolerance of the cursor. **Not clamped to either segment** (the same "deferred" stance
  `perpendicularFeet` takes — a room's corner is usually past where either wall was actually drawn).
  Guarded three ways: a zero-length line has no direction (`lenA/lenB < 1`); two near-parallel lines have
  no stable crossing (`minAngleDeg`, default 1°, measured as the `sin` of the angle between directions —
  scale-free, unlike the raw denominator); and two genuinely SKEW lines (different levels) are refused
  rather than reporting an invented point (`maxGapMm`, default 5 mm — the display mesh's own chord error,
  §4.1/§4.4's "Tier 1 is approximate" guard-rail applied to two lines instead of one). The reported point
  is the MIDPOINT of the two lines' nearest approach, never one line's point alone.
- `lineIntersectionCandidates` — carries **no `ref`/`elementId`/`nodeId`**, Entry 84's rule applied a
  third time: a crossing is a point on NEITHER line's own edge, so a hosted-void tool must decline it.
- `closestPointsBetweenLines` (internal) — standard two-line closest-point solve; the parallel guard is
  the angle's `sin`, not the solve's own denominator, because the denominator (`|dA×dB|²`) is a length⁴
  quantity with no scale-independent meaning.

Consumes `referenceEdges` unchanged (T-001's ref-grouped, never-proximity-matched edge reconstruction) —
no new identity mechanism, only a new way to combine two already-derived lines.

Wired into `apps/web/src/render/Viewport.ts` (`intersectionsAt`, gathering reference edges around the
CURSOR's own ground point — unlike `perpendicularAt`, there is no gesture anchor a crossing depends on)
and `apps/web/src/render/ViewportCanvas.tsx`'s pointer-move pipeline, alongside the guide and the
perpendicular foot. No new overlay line is drawn for this kind: both lines a crossing is built from are
already-drawn model edges, so a second dashed copy would be redundant — `setSnapMarker` already shows the
winning point.

**Headless:** `apps/web/src/tool/align.test.ts`, 12 new tests — fires at the true crossing; not clamped to
either segment; refuses parallel, near-parallel (`minAngleDeg` boundary), degenerate (zero-length), and
genuinely-skew (`maxGapMm` boundary) pairs; drops a crossing the camera cannot see; carries no
`ref`/`elementId`/`nodeId`; sits in the ruled slot (only `endpoint` beats it, driven — not just ranked —
against both `endpoint` and `midpoint`).

## 3. Browser verification (real kernel, real tessellated mesh, real pointer events)

No `chromium-cli` / project run-skill existed for this repo; installed `playwright-core` into a scratch
dir (network reachable) and drove `BUNYAN_BROWSER_CMD`'s own Chromium
(`ms-playwright/chromium-1223/chrome-win64/chrome.exe`) against the real dev server. Windows reserves TCP
5121–5220 (`netsh interface ipv4 show excludedportrange`) and also refused an IPv6 loopback bind on
5173/5183 — worked around with `--port 5300 --host 127.0.0.1`, outside the excluded range.

**Method** (mirrors T-001's own precedent, `handoff/khalihlna/2026-08-30-T-001-review.md`'s revert
methodology and this seat's T-001 handoff): seeded two NEW walls via `window.bunyan.execute` whose
CENTRELINES cross, extended, at world `[2000, 1000, 0]` — deliberately also an exact grid point (1000 mm
spacing), so `'grid'` is a real, present, lower-ranked competitor at the identical pixel, making the test
discriminative rather than a mere "something snapped". Activated the Wall tool (`snapTo: null`, everything
allowed). Temporarily exposed `viewport`/the last `PointerSample` on `window` (removed before finishing —
`git diff` confirms `App.tsx` is byte-identical to `HEAD`) to compute the exact canvas-pixel projection of
the target and read back the resolved snap after a real `page.mouse.move`.

- **ON** (this turn's code, live): snap at that pixel resolves `kind: 'intersection'`, point
  `[1947.5, 1052.5, 0]` — not the idealized centreline crossing, because the mesh's actual nearby edges are
  the wall's tessellated LAYER faces (200+80+15 mm thick), not the raw baseline; exactly the Tier-1-is-
  approximate behaviour §4.1 documents, and the discriminating fact is the **kind**, not the exact point.
- **OFF** (same session, `window.__viewport.intersectionsAt` stubbed to `() => []`, T-001's own
  verification pattern): the identical pixel resolves `kind: 'grid'`, point `[2000, 1000, 0]` exactly — the
  next-ranked real candidate, confirming Q3's order is what is deciding, not an accident of geometry.
- Re-ran ON once more after restoring the code (`git stash` / `git stash pop`, confirmed byte-identical
  diff before and after) — identical result, twice.

**Console-error-free boot:** one `Failed to load resource: 404` on every boot, **reproduced identically on
clean `main`** (`git stash`, re-ran the boot-only check, same single 404, no URL ever surfaced through
`page.on('response')`/`requestfailed` — almost certainly a request from inside the kernel Worker, which
Playwright's page-level network events do not observe). Pre-existing, branch-unrelated; not chased further
per invariant 10 (nothing here changed it either way).

## 4. Verification

- `pnpm verify` — **exit 0**, this pc. typecheck/lint/format:check green; `pnpm test` **99 files / 984
  tests** green (385.99s); `reseed:check` skipped (not a PR); `docs:check` (8 files / 166 tests) green
  (92.21s).
- `tests/freeze-boundary.test.ts` stayed green inside the full run (19/19) — `'intersection'` was already
  a declared `SnapKind`; no frozen byte moved.
- `prettier --write` run on every touched file before the verify above.

## 5. What this leaves

Nothing owed to `khalihlna` beyond the standing review of this PR (a `pc` task, `AGENTS.md §1.2`) — every
claim here is executed and measured on this exact machine, no `unverified here:` marker.

The design doc's third derived kind is now fully shipped; P4.5 §4.3's Tier-1 candidate set (endpoint,
midpoint, face, grid, level plane, perpendicular, extension, intersection) has a producer for every
declared `SnapKind` except `'vertex'`, which the design itself defers until the kernel exports vertices
(no seam change needed then either).
