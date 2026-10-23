# STEWARD-cache-restore-batch review — PR #87 — 2026-10-19 — seat: hmdnah

- **implements:** single review turn (`../diwan/docs/REVIEW-PROMPT.md` items 1–7) of PR #87 at head `a1ae04f`
  (brahim; files T-049 from `## Discovered` via `backlog.py add`; docs only, 4 files).
- **changed:** `docs/PHASE_LOG.md` brahim's abstract, `22.56` → `20.11` ms: it credits the figure to PR #86's
  step 2, which recorded 20.11 (`handoff/hmdnah/2026-10-19-T-048-review-step-2.md:29`); 22.56 is brahim's own
  probe (his handoff, Evidence row 3). This record.
- **verdict:** approved; no defect in the T-049 row proven.
- **verified:**
  - item 1, done-when 1's "red on main": a throwaway copy of `tests/geometry-cache-restore-d29.test.ts` with a
    counting `GeometryCacheReader` as `geometryCache.files`, `pnpm vitest run` → red, `expected 20 to be +0`
    (5 roots, 20 `.brep` `read`s, 0 `readMany`). A throwaway `cacherestore.ts` patch, one `readMany(recordEntries)`
    per root inside the `try` → green, 0 reads, 5 `readMany`, 5 roots restored; the three done-when-3 files
    → `Tests 24 passed (24)` with it. Patch and tests removed, `git status --porcelain` empty.
  - item 5: a throwaway vitest probe on T-048's `fullCache16k` (16,001 entries) → 20.63 / 20.95 ms per `read`,
    626 / 609 ms for `readMany` of 16,000 names, two runs; the row's 22.56 ms and 694 ms are within ~10%.
    16,000 × 22.56 ms = 361 s, the row's "~6 min".
  - item 4: `cacherestore.ts:104` (per-part `read`), `:140` (the catch), `document.ts:700` (`readMany`),
    `:1346-1357` (per-root loop), `bnn.ts:305,309,449,455`, `tests/bnn-aggregate-ratio-t048.test.ts:76` (one
    `.brep` per root) all read as cited. `GeometryCacheReader.readMany` exists (`bnn.ts:87`), so "bnn.ts
    unchanged" is satisfiable. Design §4, §5 (12.00 ms/solid, `:168,173`), spec §6 (D29) and §14 (D66) exist.
  - READY: every done-when is a headless vitest/OCCT check or a handoff figure this box ran (the d29 test needs
    no browser), so no `requires:` is right; `cacherestore.ts`/`document.ts` are not `[frozen_surface] watched`.
  - item 7: `node scripts/reserved-classes.mjs --base origin/main` → `none — RISK: additive`. Not owner-gated.
  - `gates.py docs` → `✓ documentation integrity`. Items 2, 3, 6: not applicable (docs only).
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741`. `git var GIT_AUTHOR_IDENT` answers
    `Davidian-Abdo` even under `-c user.name=narutousomaki741`; no `author.*` config exists, so an exported
    `GIT_AUTHOR_*` is the likely cause, and this session may not override it.
- **notes (opinion, non-blocking):** done-when 5 does not say whether "restoring" includes `importBrep`.
- **risk:** normal (STEWARD PR); T-049 itself is `risk: high`.
