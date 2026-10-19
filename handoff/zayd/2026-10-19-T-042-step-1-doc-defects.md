# T-042 — step-1 doc defects: the cap comments and the §5 Autosave figure

- seat: zayd (builder, box) · account: davidian-abdo · risk: high · implements: design §5, §6 R4
- branch: `task/T-042-d29-r4-the-lazy-idle-exporter-a-save-nev` (PR #82), a returned fix (`agent_start.py --continue T-042`)
- review: hmdnah's step-1 record, PR #82 comment of 2026-10-14; first body `handoff/zayd/2026-10-14-T-042-d29-lazy-export.md`

## Changed

- `packages/document/src/bnn.ts:187-201` (defect 1): the cap comments are sized against R4's 16k cache, 105 MB
  inflated, largest entry `index.json` at 61.3 MB; `BNN_MAX_ENTRY_BYTES` ~4.4×, `BNN_MAX_TOTAL_BYTES` ~4.8× of
  ~111 MB (cache plus `scene.json` 6.1 MB). The constants are unchanged.
- Design §5 Autosave (defect 2): five snapshots of R4's cache are ~525 MB inflated (5 × 105) or ~73 MB zipped (5 × 14.6).
- No code or test changed.

## Verified

- Arithmetic: 268,435,456 B / 61.3 MB = 4.38; 536,870,912 B / 111.1 MB = 4.83; 43.9 + 61.3 = 105.2 MB; 11.0 + 3.6 = 14.6 MB.
- `npx prettier --check` on both files → clean; `pnpm verify` run by `agent_finish.py`.
- Not addressed: hmdnah's non-blocking opinion (a root queued before a rebuild-free key flip), and the
  `D-20261012-07` context's 61/305 MB figures, which hmdnah routed to `brahim`.
- The step-1 record `handoff/hmdnah/2026-10-14-T-042-review-step-1.md` is not on this branch or `main`; it is on
  `rescue/bunyan/20261014T163116Z` (`b75f79f`) and in the PR #82 comment.
