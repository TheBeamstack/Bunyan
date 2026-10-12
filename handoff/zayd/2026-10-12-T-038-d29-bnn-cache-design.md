# T-038 — Q6 — design: the D29 cache in the `.bnn`

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-038-q6-design-the-d29-cache-in-the-bnn`
- task: `docs/BACKLOG.md` T-038 · risk: high · implements: D93 · D29 · `docs/decisions.md` §4j-2

## Changed

- `docs/design/P5_step9_D29_bnn_cache_design.md` (new): the two-level key (envelope; per-assembly input key over
  the element rows, style, datums, grid point, resolved joins, sketch constraints, container elevation, and the
  shared tables whole); `geometry-cache/` layout and its compatibility table; the `#stage` restore path; the
  budget and the lazy save policy; rows R1–R7.
- `docs/OWNER-DECISIONS.md`: `D-20261012-05` (trust: `own`), `-06` (`codeId`: `bundle`), `-07` (autosave: `omit`).
- `docs/BACKLOG.md ## Discovered`: `loadBnn` has no zip decompression or entry-count cap (spec §9).

## Verified

- The key's input list is read from `build.ts` `contextFor` / `voidContextFor` / `buildAssembly` and `bnn.ts`
  `typeVersionsOf` (max per type, so a parameter edit moves nothing): source read, not executed.
- No frozen shape moves: every file the design touches (`bnn.ts`, `build.ts`, `document.ts`) is absent from
  `.agent.toml [frozen_surface] watched`.
- `loadBnn` ignores unknown zip entries and `saveBnn` writes only its four names: `bnn.ts` read.
- §5 arithmetic: `python3 -c "print(6.64*16000/1000, 3817*16000/1e6, 24.86*16000/1000, 12*16000/1000)"` →
  106.24 s, 61.07 MB, 397.76 s, 192.0 s.
- `pnpm verify` — result in the finish output.

## done-when

- Doc exists, under 400 lines (212): yes.
- Names the key that catches a hand-edited `scene.json` and shows a stale entry costs a rebuild (§2b, §2c): yes.
- Additive placement, both compatibility directions, frozen shapes (§3): yes — none moves.
- Budgets 2.07×, 6.64 ms/solid, ~61 MB; save policy is lazy, no option (§5): yes.
- Decomposed into R1–R7 (§6); open questions are `D-` records; no code changes: yes.

## notes

- Not measured: key time at 16k, compressed cache size, re-zip time on save — R1 and R4 measure them.
- Spec §6's tree names `geometry-cache.brep`; R2 amends it to the `geometry-cache/` directory.

## Return 1 — hmdnah step 1 (PR #73 comment 6117292397)

- Defect fixed: §2b now digests `styles` whole, with the other shared tables, and digests every constraint, join
  and sketch-constraint row whose subject starts with `<rootId>:`; a D59 child calls `contextFor` itself
  (`build.ts:753`) with a Type-chosen `styleId` (`build.ts:745`) under `childElementId` (`geometry.ts:82`). R1
  done-when gains the child-only style case.
- §4: restore is load-only (`rebuildAll`/`rebuildOnly` pass `restore`; `document.ts:372,455,497` never do).
- §5 citation: the 60-solid figures are `handoff/archive/zayd/2026-07-30-d29-cache-bodies.md:50-56`.
- Verified by source read only (`build.ts`, `geometry.ts`, `document.ts`); no test run, docs only. hmdnah's
  whole-`styles` GREEN run is theirs (review step 1), not re-run here.
